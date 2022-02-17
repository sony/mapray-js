import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

const targetPos = new mapray.GeoPoint(138.727500, 35.360833, 3900);
const initPos = new mapray.GeoPoint(136.937714, 35.621582, 60000);

class SampleTemplate extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera: mapray.GeoPointData;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _lookat_position: mapray.GeoPointData;


    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
            debug_stats: new mapray.DebugStats()
          }
        );

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

        // Set camera
        this.setCameraPosition( this._init_camera );

        this.setLookAtPosition( this._lookat_position );

        this.setCameraParameter( this._init_camera_parameter );
        //

        // Enable URL hasg
        this.setURLUpdate( true );
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
}

export default SampleTemplate;
