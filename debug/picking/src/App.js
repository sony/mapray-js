import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";

import BingMapsImageProvider from "./BingMapsImageProvider";



const BINGMAP_TOKEN = "?";

const MAPRAY_ACCESS_TOKEN = "?";

const ICON_URL = "https://storage.googleapis.com/inou-dev-mapray-additional-resources/2d/image/mapray.png";
const SCENE_3D_URL = "https://storage.googleapis.com/inou-dev-mapray-additional-resources/3d/gltf/mapray-box-with-texture/scene.json";




export default class App extends maprayui.StandardUIViewer {

    constructor( container, options={} ) {
        super( container, MAPRAY_ACCESS_TOKEN, {
                debug_stats: new mapray.DebugStats(),
                image_provider: (
                    BINGMAP_TOKEN ?
                    new BingMapsImageProvider( {
                            uriScheme: "https",
                            key: BINGMAP_TOKEN,
                            maxLevel: 19
                    } ): undefined
                ),
        } );

        const init_camera = {
            longitude: 138.339704796544,
            latitude: 36.26726586368221,
            height: 2500000
        };
        const lookat_position = {
            longitude: 138.339704796544,
            latitude: 36.267265864,
            height: 0
        };
        this.setCameraPosition( init_camera );
        this.setLookAtPosition( lookat_position );
        this.setCameraParameter( init_camera );
        this._tools = options.tools;
        this._mouse_log = this._tools.querySelector("pre");
        this._enable_ui = this._tools.querySelector("div.options>input[name=log-mouse-position]");

        this._render_mode = mapray.Viewer.RenderMode.SURFACE;
        this._gis = {
            flag: false,
            loaded: false
        };
        this._bing = {
            flag: false,
            loaded: false
        };
        this._pre_mouse_position = mapray.GeoMath.createVector2f();                // 直前のマウス位置
        this._time = 0;
        this._override_mouse_event = false;
    }

    onKeyDown( event )
    {
        switch ( event.key ) {
            case "m": case "M": {
                this._render_mode = (
                    this._render_mode === mapray.Viewer.RenderMode.SURFACE ?
                    mapray.Viewer.RenderMode.WIREFRAME :
                    mapray.Viewer.RenderMode.SURFACE
                );
            } break;
            case "g": case "G": {
                this._gis.flag = !this._gis.flag;
            } break;
            case "b": case "B": {
                this._bing.flag = !this._bing.flag;
            } break;
            default: {
                super.onKeyDown( event );
            }
        }
    }

    onMouseDown( point, event )
    {
        if ( event.shiftKey ) {
            this._override_mouse_event = true;
            this._pick(pickResult => {
                    if (pickResult.entity instanceof mapray.PinEntity) {
                        // pickResult.entity.setSize(200, 200);
                        pickResult.entity.setFGColor( [1, 0, 0] );
                    }
                    else if (pickResult.entity instanceof mapray.TextEntity) {
                        // pickResult.entity.setFGColor( [1, 0, 0] );
                        pickResult.entity.setBackgroundColor([0, 0, 1]);
                        pickResult.entity.setEnableBackground(true);
                    }
                    else if (pickResult.entity instanceof mapray.ImageIconEntity) {
                        pickResult.entity.setSize( [50, 30] );
                    }
                    else if (pickResult.entity instanceof mapray.ModelEntity) {
                        this._cache_scale = this._cache_scale === 2 ? 1 : 2;
                        pickResult.entity.setScale( [this._cache_scale, this._cache_scale, this._cache_scale] );
                    }
                    else if (pickResult.entity instanceof mapray.MarkerLineEntity) {
                        pickResult.entity.setColor( [0, 0, 1] );
                    }
                    else if (pickResult.entity instanceof mapray.PathEntity) {
                        pickResult.entity.setColor( [0, 0, 1] );
                    }
                    else if (pickResult.entity instanceof mapray.PolygonEntity) {
                        pickResult.entity.setColor( [0, 0, 1] );
                        pickResult.entity.setOpacity( 1 );
                    }
                    else {
                        console.log(pickResult.entity);
                    }
            }, true);
        }
        else if ( event.ctrlKey ) {
            this._override_mouse_event = true;
            this._pick(pickResult => {
                    if (pickResult.point) {
                        var pin = new mapray.PinEntity( this.viewer.scene );
                        const p = new mapray.GeoPoint();
                        p.setFromGocs( pickResult.point );
                        if (!pickResult.entity) {
                            // pin.altitude_mode = mapray.AltitudeMode.RELATIVE;
                            // p.altitude = 0;
                        }
                        pin.addMakiIconPin( "car-15", p);
                        this.addEntity( pin );
                    }
            }, true);
        }
        else if ( !this._enable_ui.checked ) {
            this._updateMousePos();
        }

        if ( !this._override_mouse_event ) {
            super.onMouseDown( point, event );
        }
    }


    onMouseMove( point, event )
    {
        /*
        if (!this.tmp) this.tmp = [];
        else this.tmp.push(performance.now());
        if (this.tmp.length > 1000) {
            console.log(this.tmp);
            this.tmp = [];
        }
        */

        if ( !this._override_mouse_event ) {
            super.onMouseMove( point, event );
        }
        mapray.GeoMath.copyVector2(point, this._pre_mouse_position);

        if ( this._enable_ui.checked ) {
            this._updateMousePos();
        }
    }


    _updateMousePos() {
        this._pick(pickResult => {
                if (pickResult.point) {
                    const p = new mapray.GeoPoint();
                    p.setFromGocs( pickResult.point );
                    this._mouse_log.innerHTML = (
                        "Ctrl + Click to put PinEntity\n" +
                        "Shift + Click Entity to chnge some property\n" +
                        p.longitude.toFixed(13) + ", " + p.latitude.toFixed(13) + ", " + p.altitude.toFixed(13) +
                        "\n" +
                        (pickResult.entity ? "Entity: " + pickResult.entity.constructor.name : "&nbsp;")
                    );
                }
        });
    }


    onMouseUp( point, event )
    {
        this._override_mouse_event = false;
        super.onMouseUp( point, event );
    }


    onUpdateFrame( delta_time ) {
        this._time += delta_time;
        super.onUpdateFrame( delta_time );

        const viewer = this._viewer;
        if ( viewer.render_mode !== this._render_mode ) {
            viewer.render_mode = this._render_mode;
        }
        if ( this._gis.loaded !== this._gis.flag ) {
            if (this._gis.flag) this.loadGIS();
            else this.unloadGIS();
        }
        if ( this._bing.loaded !== this._bing.flag ) {
            if (this._bing.flag) this.loadBing();
            else this.unloadBing();
        }

        if ( this._pick_handler ) {
            const start = Date.now();
            const pickResult = this._viewer.pick(this._pre_mouse_position);
            const end = Date.now();
            // console.log("Pick: " + (end-start) + "ms", pickResult);
            this._pick_handler(pickResult);
            this._pick_handler = null;
        }

        if ( this._path_list ) {
            const t = 0.1 * this._time;
            const p = 2.0 * (t - (t|0));
            for ( let i=0; i<this._path_list.length; i++ ) {
                this._path_list[i].setLowerLength( Math.max(0.0, p-1) );
                this._path_list[i].setUpperLength( Math.min(1.0, p) );
            }
        }
    }


    _pick(pick_handler, force) {
        if ( force || !this._pick_handler ) {
            this._pick_handler = pick_handler;
        }
    }


    loadGIS() {
        // 文字の追加
        var entity = new mapray.TextEntity( this.viewer.scene );
        var text_position = { longitude: 138.727363, latitude: 35.360626, height: 4000 };
        var text_geoPoint = new mapray.GeoPoint( text_position.longitude, text_position.latitude, text_position.height );

        entity.addText( "Mt.Fuji", text_geoPoint, { color: [1, 0, 0], font_size: 25 } );
        entity.setBackgroundColor([1, 1, 1]);
        entity.setEnableBackground(false);
        this.addEntity( entity );

        // 線の追加
        entity = new mapray.MarkerLineEntity( this.viewer.scene );
        var line_position = { latitude: 35.360626, longitude: 138.727363, height: 3600 };
        var position_array = [text_position.longitude, text_position.latitude, text_position.height,
        line_position.longitude, line_position.latitude, line_position.height];
        entity.addPoints( position_array );
        this.addEntity( entity );

        /*
        entity = new mapray.ImageIconEntity( this.viewer.scene );
        entity.addImageIcon( "../resources/image/mapray.png", new mapray.GeoPoint(142.619, 43.017), { origin: [ 0.5, 1.0 ] });
        this.addEntity( entity );
        //*/

        const sceneResource = new mapray.URLResource( SCENE_3D_URL, {
                transform: ( url, type ) => {
                    if (type.id === "IMAGE" ) {
                        return { url, init: { crossOrigin: mapray.CredentialMode.SAME_ORIGIN.credentials } };
                    }
                    else return { url }
                }
        });
        const loader = new mapray.SceneLoader( this.viewer.scene, sceneResource );
        loader.load()
        .catch(error => {
                console.log(error);
        });

        var pin = new mapray.PinEntity( this.viewer.scene );
        pin.addMakiIconPin( "car-15", new mapray.GeoPoint(137.597922, 34.691897));
        pin.addMakiIconPin( "car-15", new mapray.GeoPoint(137.856824, 35.174877));
        pin.addTextPin( "8", new mapray.GeoPoint(138.5, 36.0));
        pin.addTextPin( "9", new mapray.GeoPoint(139.0+(50.0/60.0), 36.0));
        pin.addMakiIconPin( "car-15", new mapray.GeoPoint(137.724919, 34.711773));
        // pin.addMakiIconPin( "car-15", new mapray.GeoPoint(130.68516536594, 32.245060734108));
        pin.altitude_mode = mapray.AltitudeMode.CLAMP;
        this.addEntity(pin);

        const line = new mapray.MarkerLineEntity( this.viewer.scene );
        line.setColor([1.0, 0.0, 0.0]);
        line.altitude_mode = mapray.AltitudeMode.CLAMP;
        line.setLineWidth( 5.0 );
        line.addPoints([
            137.63671875, 34.597041518, 0.0,
            137.63671875, 34.7416125007, 0.0,
            137.8125,     34.7416125007, 0.0,
            137.8125,     34.597041518, 0.0,
            137.63671875, 34.597041518, 0.0
        ]);
        this.addEntity(line);

        const polygon = new mapray.PolygonEntity( this.viewer.scene );
        polygon.setColor([ 1.0, 0.2, 0.2 ]);
        polygon.setOpacity( 0.6 );
        polygon.altitude_mode = mapray.AltitudeMode.CLAMP;
        polygon.addOuterBoundary([
                137.63671875, 34.597041518, 0.0,
                137.63671875, 34.7416125007, 0.0,
                137.8125,     34.7416125007, 0.0,
                137.8125,     34.597041518, 0.0
        ].map((v,index) => (index%3===1 ? v + 0.4 : v)));
        this.addEntity(polygon);

        this._path_list = [];
        for ( let i=0; i<2; i++ ) {
            const path = new mapray.PathEntity( this.viewer.scene );
            path.setColor([ 1.0, 0.0, 0.0 ]);
            if ( i === 1 ) path.altitude_mode = mapray.AltitudeMode.CLAMP;
            path.setLineWidth( 10.0 );
            const ps = i === 0 ? [
                138.6, 35.36, 3000,
                138.8, 35.36, 3000
            ]:
            [
                138.6, 35.37, 3000,
                138.8, 35.37, 3000
            ];
            const ls = [ 0.0, 1.0 ];
            path.addPoints(ps, ls);
            path.setLowerLength( 0.0 );
            path.setUpperLength( 1.0 );
            this.addEntity( path );
            this._path_list.push( path );
            const pin = new mapray.PinEntity( this.viewer.scene );
            pin.addMakiIconPin( "car-15", new mapray.GeoPoint(ps[0], ps[1], ps[2]));
            pin.addMakiIconPin( "car-15", new mapray.GeoPoint(ps[3], ps[4], ps[5]));
            if ( i === 1 ) pin.altitude_mode = mapray.AltitudeMode.CLAMP;
            this.addEntity( pin );
        }

        this._gis.loaded = true;
    }


    unloadGIS() {
        this._viewer.scene.clearEntities();
        this._gis.loaded = false;
    }

}

window.App = App;
