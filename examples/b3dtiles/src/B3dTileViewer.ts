import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

export type InitValue = {
    enable_atmosphere: boolean,
    camera_area: string
}

const option_config = [
    {
        name: "TokyoTower",
        target_lng: 139.744518,
        target_lat: 35.659102,
        target_altitude: 200,
        cam_distance: 1500,
        cam_altitude: 1000
    },
    {
        name: "Shinjuku",
        target_lng: 139.697738,
        target_lat: 35.691734,
        target_altitude: 200,
        cam_distance:1000,
        cam_altitude: 400
    },
    {
        name: "Haneda",
        target_lng: 139.786629,
        target_lat: 35.549705,
        target_altitude: 20,
        cam_distance: 8000,
        cam_altitude: 4000
    },
    {
        name: "All",
        target_lng: 139.766067,
        target_lat: 35.651141,
        target_altitude: 0,
        cam_distance: 10000,
        cam_altitude: 5000
    }
]

class B3dTileViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _b3d_scene: mapray.B3dScene[];

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement, initvalue: InitValue )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
                debug_stats: new mapray.DebugStats(),
                atmosphere: new mapray.Atmosphere()
            }
        );

        this._b3d_scene = []; // b3dTiles scene object

        this._container = container;

        this._init_camera_parameter = {
            fov: 46.0,
        };

        // Add PLATEAU Bilding data from mapray opendata site
        this._addB3d( [
            "https://opentiles.mapray.com/3dcity/tokyo_n/",
            "https://opentiles.mapray.com/3dcity/tokyo_s/",
        ] );

        // Set camera
        this.setCameraParameter( this._init_camera_parameter );
        //

        // Enable URL hasg
        this.setURLUpdate( true );

        if (initvalue.enable_atmosphere === false) {
            this.enableAtmosphere(false);
        }

        this.moveCameraPosition(initvalue.camera_area);
    }

    onUpdateFrame( delta_time: number )
    {
        if (!this._viewer) {
            return;
        }
        super.onUpdateFrame( delta_time );
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }

    enableAtmosphere(enable: boolean) {
        if (this._viewer && this._viewer.atmosphere) {
            if (enable) {
                this._viewer.atmosphere.setSkyVisibility(true);
                this._viewer.atmosphere.setGroundVisibility(true);
            } else{
                this._viewer.atmosphere.setSkyVisibility(false);
                this._viewer.atmosphere.setGroundVisibility(false);
            }
        }
    }

    moveCameraPosition(areaName: string) {
        const i = this._getCameraFromArea(areaName);
        if (i<0) {
            return;
        }

        const targetpos = new mapray.GeoPoint(option_config[i].target_lng, option_config[i].target_lat, option_config[i].target_altitude);
        // end_altitude:  camera height
        // end_from_lookat: the distance of camera position from iscs_end
        this.startFlyCamera( {time:3.0, iscs_end: targetpos, end_altitude: option_config[i].cam_altitude , end_from_lookat: option_config[i].cam_distance });

    }

    _addB3d( urls: string[] )
    {
        const scenes = urls.map(url => {
            const provider = new mapray.StandardB3dProvider(url, ".bin");
            return this.viewer.b3d_collection.createScene( provider );
        });
        this._b3d_scene = scenes;
        return scenes;
    }

    /**
     * B3Dの全削除
     */
   _removeB3d()
    {
        if (this._b3d_scene) {
            this._b3d_scene.forEach( scene => {
                this.viewer.b3d_collection.removeScene( scene );
            });
        }
        this._b3d_scene = [];
    }

    _getCameraFromArea(area: string) {
       const i = option_config.findIndex(p => p.name == area);
       if (i<0) {
           return -1;
       }
       return i;
    }
}

export default B3dTileViewer;
