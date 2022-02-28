import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import BingMapsImageProvider from "./BingMapsImageProvider"

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

export type InitValue = {
    location: string,
    surface: string,
    enable_atmosphere: boolean
}


const option_config = [
    {
        name: "Fuji",
        target_lng: 138.727484,
        target_lat: 35.3606158,
        target_altitude: 3700,
        cam_distance: 25000,
        cam_altitude: 1500,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: -200,
        sun_y_angle: -200,
        sun_z_angle: 0
    },
    {
        name: "NorthernAlps",
        target_lng: 137.555378,
        target_lat: 36.3055625,
        target_altitude: 3000,
        cam_distance: 10000,
        cam_altitude: 6000,
        ray_leigh: 0.003,
        mie: 0.001,
        // sun_x_angle: 60,
        // sun_y_angle: 110,
        sun_x_angle: 102,//phi
        sun_y_angle: 36.3055625 - 80,// theta
        sun_z_angle: 0
    },
    {
        name: "GrandCanyon",
        target_lng: -112.143933,
        target_lat: 36.105581,
        target_altitude: 2000,
        cam_distance: 6000,
        cam_altitude: 3000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: -200,
        sun_y_angle: -200,
        sun_z_angle: 0
    },
    {
        name: "Everest",
        target_lng: 86.9136453,
        target_lat: 27.9863758,
        target_altitude: 4000,
        cam_distance: 12000,
        cam_altitude: 10000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: -200,
        sun_y_angle: -200,
        sun_z_angle: 0
    },
    {
        name: "AyersRock",
        target_lng: 131.037146,
        target_lat: -25.345657,
        target_altitude: 0,
        cam_distance: 5000,
        cam_altitude: 1000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: -200,
        sun_y_angle: -200,
        sun_z_angle: 0
    },
    {
        name: "TableMountain",
        target_lng: 18.4250663,
        target_lat: -33.9830228,
        target_altitude: 1000,
        cam_distance: 5000,
        cam_altitude: 500,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: 200,
        sun_y_angle: 200,
        sun_z_angle: 0
    },
    {
        name: "Taranaki",
        target_lng: 174.0546231,
        target_lat: -39.2967528,
        target_altitude: 5000,
        cam_distance: 5000,
        cam_altitude: 3500,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: 200,
        sun_y_angle: 200
    },
    {
        name: "LakeMcDonald",
        target_lng: -113.8670045609,
        target_lat: 48.6096768230,
        target_altitude: 0,
        cam_distance: 3000,
        cam_altitude: 1000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: 200,
        sun_y_angle: 200
    },
    {
        name: "Darvaza",
        target_lng: 58.4422051896,
        target_lat: 40.2514796768,
        target_altitude: 0,
        cam_distance: 1000,
        cam_altitude: 1000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: 200,
        sun_y_angle: 200
    },
    {
        name: "StHelens",
        target_lng: -122.1781366795,
        target_lat: 46.1982293962,
        target_altitude: 1000,
        cam_distance: 10000,
        cam_altitude: 6000,
        ray_leigh: 0.003,
        mie: 0.001,
        sun_x_angle: 200,
        sun_y_angle: 200
    }
]
class TerrainViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement, initvalue: InitValue )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
            debug_stats: new mapray.DebugStats(),
            image_provider: new BingMapsImageProvider( {
                uriScheme: "https",
                key: "<your Bing Maps Key here>"
            }),
            atmosphere: new mapray.Atmosphere(),
            sun_visualizer: new mapray.SunVisualizer( 32 ),
        });

        this._container = container;

        this._init_camera_parameter = {
            fov: 84.0,
        };

        this.selectLocation( initvalue.location );

        // setting for camera
        this.setCameraParameter( this._init_camera_parameter );
        //

        // Enable URL hash
        this.setURLUpdate( true );

        if ( initvalue.enable_atmosphere === false ) {
            this.enableAtmosphere( false );
        }

        //
        this.selectSurface( initvalue.surface );

        this.selectLocation( initvalue.location );
    }

    onUpdateFrame( delta_time: number )
    {
        if ( !this._viewer ) {
            return;
        }
        super.onUpdateFrame( delta_time );
    }

    selectLocation( location: string ) {
        const i = this._getCameraInfoFromLocation( location );
        if ( i < 0 ) {
            return;
        }

        const targetpos = new mapray.GeoPoint( option_config[i].target_lng, option_config[i].target_lat, option_config[i].target_altitude );
        // end_altitude:  camera height
        // end_from_lookat: the distance of camera position from iscs_end
        this.startFlyCamera( { time: 0.1, iscs_end: targetpos, end_altitude: option_config[i].cam_altitude , end_from_lookat: option_config[i].cam_distance });

        this._setSun( i );
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

    enableAtmosphere( enable: boolean ) {
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

    _setSun( index: number ) {
        if ( index < 0 ) {
            return;
        }


        this._viewer?.atmosphere?.setRayleigh( option_config[index].ray_leigh );
        this._viewer?.atmosphere?.setMie( option_config[index].mie );

        // Set sun
        const phi = option_config[index].sun_x_angle *  mapray.GeoMath.DEGREE;
        const theta = option_config[index].sun_y_angle * mapray. GeoMath.DEGREE;
        const x = Math.cos(phi) * Math.sin(theta);
        const y = Math.sin(theta) * Math.sin(phi);
        const z = Math.cos(theta);
        this._viewer?.sun.setSunDirection( [ x, y, z ] );
        this._viewer?.sunVisualizer?.setVisibility(true);
        this._viewer?.sunVisualizer?.setRadius(4);
        //

    }

    _getCameraInfoFromLocation( location: string ) {
        const i = option_config.findIndex(p => p.name == location);
        if ( i < 0 ) {
            return -1;
        }
        return i;
    }

    _getSun( year: string, month: string, day: string ) {

        // Reference from
        const to_date = new Date(year + "/" + month + "/" + day );
        const from_date = new Date(year + "/01/01" );
        const days = Math.floor((to_date.getTime() - from_date.getTime()) / 86400000 ) + 0.5;
        const date_param = 2 * Math.PI / 365.0;
        const date_omega = date_param * days;
        const declination_sun = 0.33281 - 22.984 * Math.cos( date_omega ) - 0.34990 * Math.cos( 2 * date_omega ) - 0.13980 * Math.cos(3 * date_omega ) + 3.7872 * Math.sin( date_omega ) + 0.03250 * Math.sin(2 * date_omega ) + 0.07187 * Math.sin(3 * date_omega );

        const e = 0.0072 * Math.cos( date_omega ) - 0.0528 * Math.cos(2 * date_omega ) - 0.0012 * Math.cos( 3 * date_omega ) - 0.1229 * Math.sin( date_omega ) - 0.1565 * Math.sin( 2 * date_omega ) - 0.0041 * Math.sin( 3 * date_omega )

        T = Ts + (θ - 135)/15 + e
        t = 15T - 180

        sinA = cos(δ)sin(t)/cos(h)
        cosA = (sin(h)sin(φ) - sin(δ))/cos(h)/cos(φ)
        A = atan2(Math.cos(declination_sun) * Math.sin(), cosA) + π


    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }
}

export default TerrainViewer;
