// import * as SunCalc from 'suncalc';
import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import BingMapsImageProvider from "./BingMapsImageProvider"
// import { getPosition } from "suncalc";
// import * as SunCalc from "suncalc";
import * as SunCalc from 'suncalc';
import { DateTime } from "luxon";


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
        sun_z_angle: 0,
        year: 2022,
        month: 2,
        day: 14,
        hour: 16,
        minute: 27,
        timezone: "Asia/Tokyo"
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
        sun_z_angle: 0,
        year: 2020,
        month: 8,
        day: 1,
        hour: 11,
        minute: 50,
        timezone: "Asia/Tokyo"
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
        sun_z_angle: 0,
        year: 2022,
        month: 8,
        day: 12,
        hour: 6,
        minute: 30,
        timezone: "America/Denver"
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
        sun_z_angle: 0,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "Asia/Kathmandu"
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
        sun_z_angle: 0,
        year: 2022,
        month: 10,
        day: 12,
        hour: 12,
        minute: 32,
        timezone: "Australia/Darwin"
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
        sun_z_angle: 0,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "Africa/Johannesburg"
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
        sun_y_angle: 200,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "Pacific/Auckland"
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
        sun_y_angle: 200,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "America/Denver"
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
        sun_y_angle: 200,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "Asia/Ashgabat"
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
        sun_y_angle: 200,
        year: 2022,
        month: 10,
        day: 12,
        hour: 14,
        minute: 55,
        timezone: "America/Los_Angeles"
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

        this._setSunDirection( i );
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

    _setSunDirection( index: number ) {
        if ( index < 0 ) {
            return;
        }

        // set general atomosphere's setting.
        this._viewer?.atmosphere?.setRayleigh( option_config[index].ray_leigh );
        this._viewer?.atmosphere?.setMie( option_config[index].mie );

        // get Sun direction from date and time
        const dt = DateTime.fromObject( {
            year: option_config[index].year,
            month: option_config[index].month,
            day: option_config[index].day,
            hour: option_config[index].hour,
            minute: option_config[index].minute
        }, {
            zone: option_config[index].timezone
        });

        if( !dt.isValid ) {
            throw new Error( "check the date and zone format" );
        }

        // getPosition can get position local spherical coordinates, called SunCalc Spherical Coordinates in this code.
        // - sun azimuth in radians (direction along the horizon, measured from south to west), e.g. 0 is south and Math.PI * 3/4 is northwest
        // - sun altitude above the horizon in radians, e.g. 0 at the horizon and PI/2 at the zenith (straight over your head)
        const positionResult = SunCalc.getPosition( new Date( dt.toString() ), option_config[index].target_lat, option_config[index].target_lng );

        // Convert from SunCalc Spherical Coordinates to Mapray Local Spherical Coordinates
        // The definition of Mapray Local Spherical Coordinates as follows.
        // The origin is a point 'P' on the earth that is defined by Longitude and Latitude
        // Upward on the z-axis (opposite to the center of the earth)
        // Northward y-axis (vertical to z-axis)
        // the x-axis in the right-handed system defined by y and z-axis, x-axis is east
        // - phi: Define phi to be the azimuthal angle in the xy-plane from the x-axis with 0<=phi<2pi A coordinate system in which the angle increases from the X axis toward the Y axis. e.g.  Math.PI * 1/2 is northeast
        // - theta: Theta to be the polar angle from the positive z-axis with 0<=theta<=pi
        const phi =　Math.PI * 3/2 - positionResult.azimuth; //φ
        const theta = Math.PI * 0.5 - positionResult.altitude; //θ

        // Convert from Mapray Local Spherical Coordinates to  Mlocs coordinate.
        const x = Math.sin( theta ) * Math.cos( phi );
        const y = Math.sin( theta ) * Math.sin( phi );
        const z = Math.cos( theta );

        // convert from Mlocs to GOCS because mapray.sunvisualizer supported GOCS coordinate when set sun's direction.
        const geoPoint = new mapray.GeoPoint( option_config[index].target_lng, option_config[index].target_lat, 0 );
        const mtog_mat = geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );
        // translate direction.
        const gocs_xyz = mapray.GeoMath.transformDirection_A( mtog_mat,  mapray.GeoMath.createVector3f([x, y, z] ), mapray.GeoMath.createVector3() );
        const n_gocs_xyz = mapray.GeoMath.normalize3( mapray.GeoMath.createVector3f([gocs_xyz[0], gocs_xyz[1], gocs_xyz[2]] ) , mapray.GeoMath.createVector3() );

        this._viewer?.sun.setSunDirection( [ n_gocs_xyz[0], n_gocs_xyz[1], n_gocs_xyz[2] ] );
        this._viewer?.sunVisualizer?.setVisibility(true);
        this._viewer?.sunVisualizer?.setRadius(4);
        //
    }

    _getCameraInfoFromLocation( location: string ) {
        const i = option_config.findIndex( p => p.name == location );
        if ( i < 0 ) {
            return -1;
        }
        return i;
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }
}

export default TerrainViewer;
