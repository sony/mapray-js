const {
    Viewer,
    SceneLoader, GeoJSONLoader,
    TextEntity, MarkerLineEntity, PinEntity, ModelEntity, PolygonEntity, ImageIconEntity,
    MaprayApi,
    GeoMath, GeoPoint,
    CredentialMode, AltitudeMode, DebugStats, Orientation
} = mapray;
const { StandardUIViewer } = maprayui;


function containsMaprayConfig(key) {
    return maprayConfig[key] !== undefined;
};
function getMaprayConfig(key) {
    if (maprayConfig[key] === undefined) {
        throw new Error("maprayConfig: missing parameter: " + key);
    }
    return maprayConfig[key];
};



class App extends StandardUIViewer {

    constructor( container, options={} ) {
        let BINGMAP_TOKEN = null;
        if (containsMaprayConfig("BINGMAP_ACCESS_TOKEN") && getMaprayConfig("BINGMAP_ACCESS_TOKEN") !== "<BINGMAP_ACCESS_TOKEN>") {
            BINGMAP_TOKEN = getMaprayConfig("BINGMAP_ACCESS_TOKEN");
        }
        super( container, getMaprayConfig("MAPRAY_ACCESS_TOKEN"), {
                debug_stats: new DebugStats(),
                image_provider: (
                    BINGMAP_TOKEN ?
                    new BingMapsImageProvider( {
                            uriScheme: "https",
                            key: BINGMAP_TOKEN
                    } ):
                    new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 5, 18 )
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

        this._render_mode = Viewer.RenderMode.SURFACE;
        this._gis = {
            flag: false,
            loaded: false
        };
        this._bing = {
            flag: false,
            loaded: false
        };
        this._pre_mouse_position = GeoMath.createVector2f();                // 直前のマウス位置
    }

    onKeyDown( event )
    {
        switch ( event.key ) {
            case "m": case "M": {
                this._render_mode = (
                    this._render_mode === Viewer.RenderMode.SURFACE ?
                    Viewer.RenderMode.WIREFRAME :
                    Viewer.RenderMode.SURFACE
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
        if (event.shiftKey) {
            this._pick(pickResult => {
                    if (pickResult.entity instanceof PinEntity) {
                        // pickResult.entity.setSize(200, 200);
                        pickResult.entity.setFGColor( [1, 0, 0] );
                    }
                    else if (pickResult.entity instanceof TextEntity) {
                        // pickResult.entity.setFGColor( [1, 0, 0] );
                        pickResult.entity.setBackgroundColor([0, 0, 1]);
                        pickResult.entity.setEnableBackground(true);
                    }
                    else if (pickResult.entity instanceof ImageIconEntity) {
                        pickResult.entity.setSize( [50, 30] );
                    }
                    else if (pickResult.entity instanceof ModelEntity) {
                        this._cache_scale = this._cache_scale === 2 ? 1 : 2;
                        pickResult.entity.setScale( [this._cache_scale, this._cache_scale, this._cache_scale] );
                    }
                    else if (pickResult.entity instanceof MarkerLineEntity) {
                        pickResult.entity.setColor( [0, 0, 1] );
                    }
                    else if (pickResult.entity instanceof PolygonEntity) {
                        pickResult.entity.setColor( [1, 0, 0] );
                        pickResult.entity.setOpacity( 1 );
                    }
                    else {
                        console.log(pickResult.entity);
                    }
            }, true);
        }
        else if (event.ctrlKey) {
            this._pick(pickResult => {
                    if (pickResult.point) {
                        var pin = new PinEntity( this.viewer.scene );
                        const p = new GeoPoint();
                        p.setFromGocs( pickResult.point );
                        if (!pickResult.entity) {
                            pin.altitude_mode = AltitudeMode.RELATIVE;
                            p.altitude = 0;
                        }
                        pin.addMakiIconPin( "car-15", p);
                        this.addEntity( pin );
                    }
            }, true);
        }
        super.onMouseDown( point, event );
    }

    onMouseMove( point, event )
    {
        super.onMouseMove( point, event );

        GeoMath.copyVector2(point, this._pre_mouse_position);

        if (this._enable_ui.checked) {
            this._pick(pickResult => {
                    if (pickResult.point) {
                        const p = new GeoPoint();
                        p.setFromGocs( pickResult.point );
                        this._mouse_log.innerHTML = (
                            p.longitude.toFixed(13) + ", " + p.latitude.toFixed(13) + ", " + p.altitude.toFixed(13) +
                            "\n" +
                            (pickResult.entity ? pickResult.entity.constructor.name : "&nbsp;")
                        );
                    }
            });
        }
    }

    onMouseUp( point, event )
    {
        super.onMouseUp( point, event );
    }

    onUpdateFrame( delta_time ) {
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

        if (this._pick_handler) {
            const start = Date.now();
            const pickResult = this._viewer.pick(this._pre_mouse_position);
            const end = Date.now();
            // console.log("Pick: " + (end-start) + "ms", pickResult);
            this._pick_handler(pickResult);
            this._pick_handler = null;
        }
    }

    _pick(pick_handler, force) {
        if (force || !this._pick_handler) {
            this._pick_handler = pick_handler;
        }
    }

    loadGIS() {
        // 文字の追加
        var entity = new TextEntity( this.viewer.scene );
        var text_position = { longitude: 138.727363, latitude: 35.360626, height: 4000 };
        var text_geoPoint = new GeoPoint( text_position.longitude, text_position.latitude, text_position.height );
        entity.addText( "Mt.Fuji", text_geoPoint, { color: [1, 0, 0], font_size: 25 } );
        entity.setBackgroundColor([1, 1, 1]);
        entity.setEnableBackground(false);
        this.addEntity( entity );

        // 線の追加
        entity = new MarkerLineEntity( this.viewer.scene );
        var line_position = { latitude: 35.360626, longitude: 138.727363, height: 3600 };
        var position_array = [text_position.longitude, text_position.latitude, text_position.height,
        line_position.longitude, line_position.latitude, line_position.height];
        entity.addPoints( position_array );
        this.addEntity( entity );

        /*
        entity = new ImageIconEntity( this.viewer.scene );
        entity.addImageIcon("../resources/image/icon.png", new GeoPoint(142.619, 43.017), { origin: [ 0.5, 1.0 ] });
        this.addEntity( entity );
        */

        var pin = new PinEntity( this.viewer.scene );
        pin.addMakiIconPin( "car-15", new GeoPoint(137.597922, 34.691897));
        pin.addMakiIconPin( "car-15", new GeoPoint(137.856824, 35.174877));
        pin.addTextPin( "8", new GeoPoint(138.5, 36.0));
        pin.addTextPin( "9", new GeoPoint(139.0+(50.0/60.0), 36.0));
        pin.addMakiIconPin( "car-15", new GeoPoint(137.724919, 34.711773));
        // pin.addMakiIconPin( "car-15", new GeoPoint(130.68516536594, 32.245060734108));
        pin.altitude_mode = AltitudeMode.CLAMP;
        this.addEntity(pin);

        const line = new MarkerLineEntity( this.viewer.scene );
        line.setColor([1.0, 0.0, 0.0]);
        line.altitude_mode = AltitudeMode.CLAMP;
        line.setLineWidth( 3.0 );
        line.addPoints([
            137.63671875, 34.597041518, 0.0,
            137.63671875, 34.7416125007, 0.0,
            137.8125,     34.7416125007, 0.0,
            137.8125,     34.597041518, 0.0,
            137.63671875, 34.597041518, 0.0
        ]);
        this.addEntity(line);

        this._gis.loaded = true;
    }


    unloadGIS() {
        this._viewer.scene.clearEntities();
        this._gis.loaded = false;
    }


    loadBing() {
        this._bing.loaded = true;
    }


    unloadBing() {
        this._bing.loaded = false;
    }

}
