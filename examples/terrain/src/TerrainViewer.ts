import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import { default_config, getCameraInfoFromLocation, updateDateInterface } from "./config";
import BingMapsImageProvider from "./BingMapsImageProvider"
import * as SunCalc from 'suncalc';
import { DateTime } from "luxon";

const MAPRAY_ACCESS_TOKEN = "<your access token here>";

export type InitValue = {
    location: string,
    surface: string,
    enable_atmosphere: boolean,
    date_time: {
        year: number,
        month: number,
        day: number,
        hour: number,
        minute: number
    },
    sun_speed: number
}

const defaultUpdateCallback = ( year: number, month: number, day: number, hour: number, minute: number ) => {}

class TerrainViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _current_date!: DateTime;

    private _current_location: string;

    private _updateSunAnimation!: updateDateInterface;

    private _enable_sun_animation: boolean;

    private _sun_speed: number

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement, initvalue: InitValue )
    {
        let imageProvider = null;
        switch( initvalue.surface ) {
            case "bingmaps":
                imageProvider = new BingMapsImageProvider( {
                    uriScheme: "https",
                    key: "<your Bing Maps Key here>"
                });
                break;
            case "satellite":
                imageProvider = new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 );
                break;
            case "street":
                imageProvider = new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 5, 18 );
                break;
        }

        super( container, MAPRAY_ACCESS_TOKEN, {
            debug_stats: new mapray.DebugStats(),
            image_provider: imageProvider!,
            atmosphere: new mapray.Atmosphere(),
            sun_visualizer: new mapray.SunVisualizer( 32 ),
        });

        this._container = container;

        this._init_camera_parameter = {
            fov: 84.0,
        };

        this._enable_sun_animation = false;

        this._current_location = initvalue.location;

        this._sun_speed = initvalue.sun_speed;

        const i = getCameraInfoFromLocation( initvalue.location );
        if ( i < 0 ) {
            return;
        }
        this._setCurrentDateTime( initvalue.date_time.year, initvalue.date_time.month, initvalue.date_time.day, initvalue.date_time.hour, initvalue.date_time.minute, default_config[i].timezone);

        this._updateSunAnimation = defaultUpdateCallback;

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

        this._getAttribution( initvalue.surface ).forEach( attr => {
            this._viewer?.attribution_controller.addAttribution(attr);
        });

    }

    onUpdateFrame( delta_time: number )
    {
        if ( !this._viewer ) {
            return;
        }

        if ( this._enable_sun_animation ) {
            this._animateSun( delta_time );
        }

        super.onUpdateFrame( delta_time );
    }

    selectLocation( location: string ) {
        const i = getCameraInfoFromLocation( location );
        if ( i < 0 ) {
            return;
        }

        this._current_location = location;

        const targetpos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, default_config[i].target_altitude );
        // end_altitude:  camera height
        // end_from_lookat: the distance of camera position from iscs_end
        this.startFlyCamera( { time: 0.1, iscs_end: targetpos, end_altitude: default_config[i].cam_altitude , end_from_lookat: default_config[i].cam_distance } );

        const sunpos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, 0.0 );

        const dt = this._setCurrentDateTime( default_config[i].year, default_config[i].month, default_config[i].day, default_config[i].hour, default_config[i].minute, default_config[i].timezone );

        this._setSunDirection( sunpos, dt, default_config[i].ray_leigh, default_config[i].mie );
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
        if ( this._viewer && this._viewer.atmosphere ) {
            if ( enable ) {
                this._viewer.atmosphere.setSkyVisibility( true );
                this._viewer.atmosphere.setGroundVisibility( true );
            } else{
                this._viewer.atmosphere.setSkyVisibility( false );
                this._viewer.atmosphere.setGroundVisibility( false );
            }
        }
    }

    sunAnimation( start: boolean, year: number, month: number, day: number, hour: number, minute: number, location: string, callback: updateDateInterface ) {
        // init
        if ( start ) {
            const i = getCameraInfoFromLocation( location );
            if (i < 0) {
                return;
            }
            this._setCurrentDateTime( year, month, day, hour, minute, default_config[i].timezone )
            this._updateSunAnimation = callback;
        } else {
            this._updateSunAnimation = defaultUpdateCallback;
        }

        this._enable_sun_animation = start;
    }

    selectDateTime( year: number, month: number, day: number, hour: number, minute: number, location: string ) {
        const i = getCameraInfoFromLocation( location );
        if ( i < 0 ) {
            return;
        }

        const sunbasepos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, 0.0 );
        const dt = this._setCurrentDateTime( year, month, day, hour, minute, default_config[i].timezone );
        this._setSunDirection( sunbasepos, dt, default_config[i].ray_leigh, default_config[i].mie );
    }

    changeSunAnimationSpeed( factor: number ) {
        this._sun_speed = factor;
    }

    _setSunDirection( pos: mapray.GeoPoint, dt: DateTime, ray_leigh: number, mie: number ) {

        // set general atomosphere's setting.
        this._viewer?.atmosphere?.setRayleigh( ray_leigh );
        this._viewer?.atmosphere?.setMie( mie );

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

    _setCurrentDateTime( year: number, month: number, day: number, hour: number, minute: number, timezone: string ) {
        // get Sun direction from date and time
        const dt = DateTime.fromObject( {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute
        }, {
            zone: timezone
        } );

        if( !dt.isValid ) {
            throw new Error( "check the date and zone format" );
        }

        this._current_date = dt;

        return dt;
    }

    _animateSun( dt: number ) {
        console.log(dt);
        const newdt = this._current_date.plus( { minute: dt/60.0 * this._sun_speed } );

        const i = getCameraInfoFromLocation( this._current_location );
        if ( i < 0 ) {
            return;
        }

        const sunpos = new mapray.GeoPoint( default_config[i].target_lng, default_config[i].target_lat, 0.0 );
        this._setSunDirection( sunpos, newdt, default_config[i].ray_leigh, default_config[i].mie );

        this._current_date = newdt;

        this._updateSunAnimation( this._current_date.year, this._current_date.month, this._current_date.day, this._current_date.hour, this._current_date.minute );
    }

    _getAttribution( surface: string ) : mapray.AttributionController.Attribution[] {
        let attr : mapray.AttributionController.Attribution[] = [];
        switch( surface ) {
            case "satellite":
                attr = [{
                    display: "国土地理院",
                    link: "http://maps.gsi.go.jp/development/ichiran.html"
                }];
                break;
            case "bingmaps":
                attr = [{
                    display: "© 2018 Microsoft Corporation",
                    link: ""
                },{
                    display: "©CNES (2018) Distribution Airbus DS",
                    link: ""
                },{
                    display: "© 2018 SK telecom/NGII",
                    link: ""
                },{
                    display: "Earthstar Geographics SIO",
                    link: ""
                }];
                break;
            case "standard":
                attr = [{
                    display: "国土地理院",
                    link: "http://maps.gsi.go.jp/development/ichiran.html"
                }];
                break;
        }
        return attr;
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }
}

export default TerrainViewer;
