import mapray, { PointCloud } from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

export type InitValue = {
    location: string,
    surface: string,
    style: string,
    size: string
}

const option_config = [
    {
        name: "Aogaku",
        urls: [
            { url: "https://opentiles.mapray.com/pc/raw/dronebird/aoyamagakuin2" }
        ]
    },
    {
        name: "Melbourne",
        urls: [
            { url: "https://opentiles.mapray.com/pc/raw/melbourne/003-006" },
            { url: "https://opentiles.mapray.com/pc/raw/melbourne/007-010" },
            { url: "https://opentiles.mapray.com/pc/raw/melbourne/011-014" },
            { url: "https://opentiles.mapray.com/pc/raw/melbourne/015-018" },
            { url: "https://opentiles.mapray.com/pc/raw/melbourne/019-020" }
        ]
    }
]

class PointCloudTileViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _current_point_cloud?: mapray.PointCloud; // cache for assigned point cloud resources

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement, initvalue: InitValue )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
            debug_stats: new mapray.DebugStats()
          }
        );

        this._container = container;

        this._init_camera_parameter = {
            fov: 60.0
        };

        this.selectLocation( initvalue.location );

        // setting for camera
        this.setCameraParameter( this._init_camera_parameter );
        //

        // Enable URL hash
        this.setURLUpdate( true );

        //
        this.selectSurface( initvalue.surface );
        this.selectPointCloudRenderStyle( initvalue.style );
        this.selectPointCloudSize( initvalue.size );
    }

    onUpdateFrame( delta_time: number )
    {
        if ( !this._viewer ) {
            return;
        }
        super.onUpdateFrame( delta_time );
    }

    selectLocation( location: string ) {
        const urls = this._getPointCloudResourcesFromLocation( location );
        if ( urls && urls.length > 0 ) {
            urls.forEach( (value, index, array) => {
                let isDelete = false;
                let isMove = false;

                if ( index === 0 ) {
                    isDelete = true;
                }
                if ( index === array.length - 1 ) {
                    isMove = true;
                }
                this._addRawPointCloud( value.url, isMove, isDelete );
            } );
        }
    }

    selectSurface( surface: string ) {
        if (this._viewer) {
            switch ( surface ) {
                case "wireframe":
                    this._viewer.setVisibility( mapray.Viewer.Category.GROUND, true );
                    this._viewer.render_mode = mapray.Viewer.RenderMode.WIREFRAME;
                    break;
                case "hidden":
                    this._viewer.setVisibility( mapray.Viewer.Category.GROUND, false );
                    break;
                case "texture":
                    this._viewer.setVisibility( mapray.Viewer.Category.GROUND, true );
                    this._viewer.render_mode = mapray.Viewer.RenderMode.SURFACE;
                    break;
            }
        }
    }

    selectPointCloudRenderStyle( style: string ) {
        if ( this._viewer ) {
            let newStyle = mapray.PointCloud.PointShapeType.CIRCLE;
            switch (style) {
                case "rectangle":
                    newStyle = mapray.PointCloud.PointShapeType.RECTANGLE;
                    break;
                case "circle":
                    newStyle = mapray.PointCloud.PointShapeType.CIRCLE;
                    break;
                case "circle-with-boarder":
                    newStyle = mapray.PointCloud.PointShapeType.CIRCLE_WITH_BORDER;
                    break;
                case "gradient":
                    newStyle = mapray.PointCloud.PointShapeType.GRADIENT_CIRCLE;
                    break;
            }

            for (let i = 0; i < this._viewer.point_cloud_collection?.length; i++) {
                this._viewer.point_cloud_collection?.get(i).setPointShape(newStyle)
            }
        }
    }

    selectPointCloudSize( size: string ) {
        if ( this._viewer ) {
            let unit = mapray.PointCloud.PointSizeType.PIXEL;
            let value = 1.0;

            if ( size.endsWith( "px" ) ) {
                unit = mapray.PointCloud.PointSizeType.PIXEL;
                value = parseFloat(size.slice(0, -2));
            }
            else if ( size.endsWith( "mm" ) ) {
                unit = mapray.PointCloud.PointSizeType.MILLIMETERS;
                value = parseFloat(size.slice(0, -2));
            }
            else {
                unit = mapray.PointCloud.PointSizeType.FLEXIBLE;
            }

            for (let i = 0; i < this._viewer.point_cloud_collection?.length; i++) {
                this._viewer.point_cloud_collection?.get(i).setPointSizeType( unit );
                if ( value ) {
                    this._viewer.point_cloud_collection?.get(i).setPointSize( value );
                }
            }
        }
    }

    _addRawPointCloud(　url: string, isMove: boolean, isDelete: boolean　) {
        const infojson = url + "/info.json";
        if( isMove ) {
            this._moveCamera(infojson);
        }
        if (　isDelete && this._current_point_cloud　) {
            this._removePointCloud(　this._current_point_cloud　);
        }
        this._current_point_cloud = this.viewer.point_cloud_collection.add(　new mapray.RawPointCloudProvider( {　url: infojson　} ) );
    }

    _removePointCloud(　resource: PointCloud　) {
        this.viewer.point_cloud_collection.remove(　resource　);
    }

    _getPointCloudResourcesFromLocation(　location: string　) {
        const i = option_config.findIndex(　p => p.name == location)　;
        if (　i < 0　) {
            return null;
        }
        return option_config[i].urls;
    }

    async _moveCamera(　infojsonURL: string　) {
        const center = await this._getCenter(　infojsonURL　);
        const endPos = new mapray.GeoPoint(　center[1],  center[0], center[2]　);
        this.startFlyCamera( {　time:3.0, iscs_end: endPos, end_altitude: 1200, end_from_lookat: 2500 });
    }

    async _getCenter( infojsonURL: string ): Promise<[number, number, number]> {
        let response;
        let lat = 0.0;
        let lng = 0.0;
        let height = 0.0;
        try {
            response = await fetch( infojsonURL );
            let box = await response.json();
            lat = (box.bbox[4] + box.bbox[1])/2.0;
            lng = (box.bbox[3] + box.bbox[0])/2.0;
            height = (box.bbox[2] + box.bbox[5])/2.0;
        }
        catch ( error ) {
            throw new Error("point cloud data not founded : " + error);
        }
        return [ lat, lng, height ];
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }
}

export default PointCloudTileViewer;
