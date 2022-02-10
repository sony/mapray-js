import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

// Tokyo Tower
//const targetPos = new mapray.GeoPoint(139.744518, 35.659102, 200);
//const initPos = new mapray.GeoPoint(139.7348163, 35.653906, 1000);

// 新宿
const targetPos = new mapray.GeoPoint(139.697738, 35.691734, 200);
const initPos = new mapray.GeoPoint(139.7348163, 35.653906, 1000);

class B3dTileViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera: mapray.GeoPointData;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _lookat_position: mapray.GeoPointData;

    private _b3d_scene: mapray.B3dScene[];

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
                debug_stats: new mapray.DebugStats(),
                atmosphere: new mapray.Atmosphere(),
                sun_visualizer: new mapray.SunVisualizer( 32 )
            }
        );

        this._b3d_scene = []; // b3dTiles scene object


        this._container = container;

        this._init_camera = {
            latitude: initPos.latitude,
            longitude: initPos.longitude,
            height: initPos.altitude
        };

        this._init_camera_parameter = {
            fov: 46.0,
        };

        this._lookat_position = {
            latitude: targetPos.latitude,
            longitude: targetPos.longitude,
            height: targetPos.altitude
        };

        // Add PLATEAU Bilding data from mapray opendata site
        this._addB3d( [
            "https://opentiles.mapray.com/3dcity/tokyo_n/",
            "https://opentiles.mapray.com/3dcity/tokyo_s/",
        ] );

        // Set camera
        this.setCameraPosition( this._init_camera );

        this.setLookAtPosition( this._lookat_position );

        this.setCameraParameter( this._init_camera_parameter );
        //

        // Enable URL hasg
        this.setURLUpdate( true );
        this.setLodFactor("0.1");


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

    setLodFactor(value: string) {
        this._b3d_scene?.forEach( scene => {
            const factor = Number(value);
            if (factor) {
                console.log(factor);
                scene.setLodFactor(factor);
            }
        })
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
}

export default B3dTileViewer;
