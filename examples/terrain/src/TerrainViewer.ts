import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import { default_config, getCameraInfoFromLocation } from "./config";
import BingMapsImageProvider from "./BingMapsImageProvider"
import * as SunCalc from 'suncalc';
import { DateTime } from "luxon";


const MAPRAY_ACCESS_TOKEN = "<your access token here>";

export type InitValue = {
    location: string,
    surface: string,
    enable_atmosphere: boolean
}

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
        const i = getCameraInfoFromLocation( location );
        if ( i < 0 ) {
            return;
        }

        const targetpos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, default_config[i].target_altitude );
        // end_altitude:  camera height
        // end_from_lookat: the distance of camera position from iscs_end
        this.startFlyCamera( { time: 0.1, iscs_end: targetpos, end_altitude: default_config[i].cam_altitude , end_from_lookat: default_config[i].cam_distance } );

        const sunpos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, 0.0 );
        this._setSunDirection( sunpos, default_config[i].year, default_config[i].month, default_config[i].day, default_config[i].hour, default_config[i].minute, default_config[i].timezone, default_config[i].ray_leigh, default_config[i].mie );
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

    selectDateTime( year: number, month: number, day: number, hour: number, minute: number, location: string ) {
        const i = getCameraInfoFromLocation( location );
        if ( i < 0 ) {
            return;
        }

        const sunbasepos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, 0.0 );
        this._setSunDirection( sunbasepos, year, month, day, hour, minute, default_config[i].timezone, default_config[i].ray_leigh, default_config[i].mie );
    }

    _setSunDirection( pos: mapray.GeoPoint, year: number, month: number, day: number, hour: number, minute: number, timezone: string, ray_leigh: number, mie: number ) {

        // set general atomosphere's setting.
        this._viewer?.atmosphere?.setRayleigh( ray_leigh );
        this._viewer?.atmosphere?.setMie( mie );

        // get Sun direction from date and time
        const dt = DateTime.fromObject( {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute
        }, {
            zone: timezone
        });

        if( !dt.isValid ) {
            throw new Error( "check the date and zone format" );
        }

        // getPosition can get position local spherical coordinates, called SunCalc Spherical Coordinates in this code.
        // - sun azimuth in radians (direction along the horizon, measured from south to west), e.g. 0 is south and Math.PI * 3/4 is northwest
        // - sun altitude above the horizon in radians, e.g. 0 at the horizon and PI/2 at the zenith (straight over your head)
        const positionResult = SunCalc.getPosition( new Date( dt.toString() ), pos.latitude, pos.longitude );

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
        const geoPoint = new mapray.GeoPoint( pos.longitude, pos.latitude, 0 );
        const mtog_mat = geoPoint.getMlocsToGocsMatrix( mapray.GeoMath.createMatrix() );
        // translate direction.
        const gocs_xyz = mapray.GeoMath.transformDirection_A( mtog_mat,  mapray.GeoMath.createVector3f([x, y, z] ), mapray.GeoMath.createVector3() );
        const n_gocs_xyz = mapray.GeoMath.normalize3( mapray.GeoMath.createVector3f([gocs_xyz[0], gocs_xyz[1], gocs_xyz[2]] ) , mapray.GeoMath.createVector3() );

        this._viewer?.sun.setSunDirection( [ n_gocs_xyz[0], n_gocs_xyz[1], n_gocs_xyz[2] ] );
        this._viewer?.sunVisualizer?.setVisibility(true);
        this._viewer?.sunVisualizer?.setRadius(4);
        //
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }
}

export default TerrainViewer;
