import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";


import BingMapsImageProvider from "./BingMapsImageProvider";


const ICON_URL =     "https://resource.mapray.com/assets/www/logo/mapray.png";
const SCENE_3D_URL = "https://resource.mapray.com/assets/www/model/mapray-box-with-texture/scene.json";



interface Option {
    tools?: HTMLElement;
}

type PickHandler = (pickResult: mapray.Viewer.PickResult | undefined) => void;


export default class App extends maprayui.StandardUIViewer {

    private _tools?: HTMLElement;
    private _mouse_log?: HTMLElement;
    private _enable_ui?: HTMLInputElement;
    private _enable_dem_debug?: HTMLInputElement;
    private _pins: mapray.PinEntity[] = [];
    private _targetPin?: mapray.PinEntity;
    private _log_locations_button?: HTMLButtonElement;


    private _gis: {
        flag: boolean;
        loaded: boolean;
    };

    private _bing: {
        flag: boolean;
        loaded: boolean;
    };

    private _pre_mouse_position_app: any;

    private _time: number;

    private _override_mouse_event: boolean;

    private _render_mode: mapray.Viewer.RenderMode;

    private _pick_handler?: PickHandler;

    private _path_list: mapray.PathEntity[];

    private _cache_scale: number;


    constructor( container: string, options: Option = {} ) {
        super( container, process.env.MAPRAY_ACCESS_TOKEN as string, {
                debug_stats: new mapray.DebugStats(),
                image_provider: (
                    process.env.BINGMAP_ACCESS_TOKEN ?
                    new BingMapsImageProvider( {
                            uriScheme: "https",
                            key: process.env.BINGMAP_ACCESS_TOKEN,
                            maxLevel: 19
                    } ): undefined
                ),
                // dem_provider: new mapray.CloudDemProvider( process.env.MAPRAY_ACCESS_TOKEN as string ),
                // dem_provider: new mapray.FlatDemProvider(),
                // north_pole: { color: [0, 0.07, 0.12], },
                // south_pole: { color: [0.88, 0.89, 0.94], },
        } );

        this.enableURLUpdate( true );

        /*
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
        */

        const tools = this._tools = options.tools;
        if ( tools ) {
            this._mouse_log = tools.querySelector("pre") || undefined;
            this._enable_ui = tools.querySelector("div.options input[name=log-mouse-position]") as HTMLInputElement || undefined;
            this._enable_dem_debug = tools.querySelector("div.options input[name=log-dem-debug]") as HTMLInputElement || undefined;
            this._log_locations_button = tools.querySelector("div.locations button[name=log]") as HTMLButtonElement || undefined;
            if ( this._log_locations_button ) {
                this._log_locations_button.onclick = event => {
                    if ( this._pins.length === 0 ) {
                        console.log("no pins");
                    }
                    else {
                        console.log(this._pins.map( pin => {
                                    const position = pin.getEntry("pos")?.position;
                                    return ( position ?
                                        `${position.longitude}, ${position.latitude}, ${position.altitude},`:
                                        "?"
                                    );
                        } ).join("\n"));
                    }
                };
            }
        }

        this._render_mode = mapray.Viewer.RenderMode.SURFACE;
        this._gis = {
            flag: false,
            loaded: false
        };
        this._bing = {
            flag: false,
            loaded: false
        };
        this._pre_mouse_position_app = mapray.GeoMath.createVector2f();                // 直前のマウス位置
        this._time = 0;
        this._override_mouse_event = false;
        this._path_list = [];
        this._cache_scale = 1;
    }

    override onKeyDown( event: KeyboardEvent )
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

    override onMouseDown( point: [x: number, y: number], event: MouseEvent )
    {
        if ( event.shiftKey ) {
            this._override_mouse_event = true;
            this._pick(pickResult => {
                    if ( !pickResult ){
                        console.log("none")
                        return;
                    }
                    console.log( pickResult );
                    if ( pickResult.entity instanceof mapray.PinEntity) {
                        console.log("pin");
                        // pickResult.entity.setSize(200, 200);
                        pickResult.entity.setFGColor( [1, 0, 0] );
                    }
                    else if (pickResult.entity instanceof mapray.TextEntity) {
                        console.log("text");
                        // pickResult.entity.setFGColor( [1, 0, 0] );
                        pickResult.entity.setBackgroundColor([0, 0, 1]);
                        pickResult.entity.setEnableBackground(true);
                    }
                    else if (pickResult.entity instanceof mapray.ImageIconEntity) {
                        console.log("ImageIcon");
                        pickResult.entity.setSize( [50, 30] );
                    }
                    else if (pickResult.entity instanceof mapray.ModelEntity) {
                        console.log("Model");
                        this._cache_scale = this._cache_scale === 2 ? 1 : 2;
                        pickResult.entity.setScale( [this._cache_scale, this._cache_scale, this._cache_scale] );
                    }
                    else if (pickResult.entity instanceof mapray.MarkerLineEntity) {
                        console.log("MarkerLineEntity");
                        pickResult.entity.setColor( [0, 0, 1] );
                    }
                    else if (pickResult.entity instanceof mapray.PathEntity) {
                        console.log("PathEntity");
                        pickResult.entity.setColor( [0, 0, 1] );
                    }
                    else if (pickResult.entity instanceof mapray.PolygonEntity) {
                        console.log("PolygonEntity");
                        pickResult.entity.setColor( [0, 0, 1] );
                        pickResult.entity.setOpacity( 1 );
                    }
                    else {
                        // console.log( pickResult.entity );
                    }
            }, true);
        }
        else if ( event.ctrlKey ) {
            this._override_mouse_event = true;
            this._pick(pickResult => {
                    if ( !pickResult ) return;
                    let eventConsumed = false;
                    if (pickResult.entity instanceof mapray.PinEntity) {
                        const index = this._pins.indexOf( pickResult.entity );
                        if ( index !== -1 ) {
                            this._targetPin = this._pins[index];
                            return
                        }
                    }
                    if ( !eventConsumed ) {
                        if ( pickResult.position ) {
                            const pin = new mapray.PinEntity( this.viewer.scene );
                            const p = new mapray.GeoPoint();
                            p.setFromGocs( pickResult.position );
                            if ( !pickResult.entity ) {
                                // pin.altitude_mode = mapray.AltitudeMode.RELATIVE;
                                // p.altitude = 0;
                            }
                            pin.addMakiIconPin( "car-15", p, { id: "pos" } );
                            this.addEntity( pin );
                            this._pins.push( pin );
                        }
                    }
            }, true);
        }
        else if ( this._enable_ui && !this._enable_ui.checked ) {
            this._updateMousePos();
        }

        if ( !this._override_mouse_event ) {
            super.onMouseDown( point, event );
        }

        if ( this._enable_dem_debug && this._enable_dem_debug.checked ) {
            const ray = this.viewer.camera.getCanvasRay( this._pre_mouse_position_app );
            // @ts-ignore (calls internal api)
            this.viewer.globe.setupDebugPickInfo();
            //const point = this.viewer.getRayIntersection(ray);
            // @ts-ignore (calls internal api)
            const debugPickInfo = this.viewer.globe.popDebugPickInfo();

            if (debugPickInfo) {
                const gp = new mapray.GeoPoint();
                const position = debugPickInfo.ray.position;
                const direction = debugPickInfo.ray.direction;
                const distance = debugPickInfo.distance;

                [[0, distance], [distance, 20000000]].forEach((ds, index) => {
                        const ray = new mapray.MarkerLineEntity( this.viewer.scene );
                        gp.setFromGocs([
                                position[0] + direction[0] * ds[0],
                                position[1] + direction[1] * ds[0],
                                position[2] + direction[2] * ds[0],
                        ]);
                        ray.addPoints([gp.longitude, gp.latitude, gp.altitude]);
                        gp.setFromGocs([
                                position[0] + direction[0] * ds[1],
                                position[1] + direction[1] * ds[1],
                                position[2] + direction[2] * ds[1],
                        ]);
                        ray.addPoints([gp.longitude, gp.latitude, gp.altitude]);
                        if (index === 0) {
                            ray.setColor([1.0, 0.0, 0.0]);
                            ray.setLineWidth( 3.0 );
                        }
                        else {
                            ray.setColor([0.5, 0.5, 0.5]);
                            ray.setLineWidth( 1.0 );
                        }
                        this.addEntity( ray );
                });

                // @ts-ignore (uses internal api)
                debugPickInfo.quads.forEach(ps => {
                        const polygon = new mapray.MarkerLineEntity( this.viewer.scene );
                        polygon.setColor([1.0, 0.0, 0.0]);
                        polygon.setLineWidth( 3.0 );
                        [ps[0], ps[1], ps[3], ps[2], ps[0]].forEach(p => {
                                gp.setFromGocs(p as [x:number, y:number, z:number]);
                                polygon.addPoints([gp.longitude, gp.latitude, gp.altitude]);
                        });
                        this.addEntity( polygon );
                });

                // @ts-ignore (uses internal api)
                debugPickInfo.trace.forEach(flake => {
                        console.log( flake );
                });
            }
            this._enable_dem_debug.checked = false;
        }
    }


    override onMouseMove( point: [x: number, y: number], event: MouseEvent )
    {
        /*
        if (!this.tmp) this.tmp = [];
        else this.tmp.push(performance.now());
        if (this.tmp.length > 1000) {
            console.log(this.tmp);
            this.tmp = [];
        }
        */

        if ( this._targetPin ) {
            const targetPin = this._targetPin;
            this._pick( pickResult => {
                    if ( !pickResult ) return;
                    if ( pickResult.position ) {
                        const p = new mapray.GeoPoint();
                        p.setFromGocs( pickResult.position );
                        targetPin.getEntry( "pos" )?.setPosition( p );
                    }
            }, true);
        }
        else {
            if ( !this._override_mouse_event ) {
                super.onMouseMove( point, event );
            }
        }
        mapray.GeoMath.copyVector2(point, this._pre_mouse_position_app);

        if ( this._enable_ui && this._enable_ui.checked ) {
            this._updateMousePos();
        }
    }


    _updateMousePos() {
        // this._pick(pickResult => {
        //         if ( !pickResult ) return;
        //         if (pickResult.position) {
        //             const p = new mapray.GeoPoint();
        //             p.setFromGocs( pickResult.position );
        //             if (this._mouse_log) {
        //                 this._mouse_log.innerHTML = (
        //                     "Ctrl + Click to put PinEntity\n" +
        //                     "Shift + Click Entity to chnge some property\n" +
        //                     p.longitude.toFixed(13) + ", " + p.latitude.toFixed(13) + ", " + p.altitude.toFixed(13) +
        //                     "\n" +
        //                     (pickResult.entity ? "Entity: " + pickResult.entity.constructor.name : " ")
        //                 );
        //             }
        //         }
        // }, false);
    }


    override onMouseUp( point: [x: number, y: number], event: MouseEvent )
    {
        this._override_mouse_event = false;
        this._targetPin = undefined;
        super.onMouseUp( point, event );
    }


    override onUpdateFrame( delta_time: number ) {
        this._time += delta_time;
        super.onUpdateFrame( delta_time );

        const viewer = this.viewer;
        if ( viewer.render_mode !== this._render_mode ) {
            viewer.render_mode = this._render_mode;
        }
        if ( this._gis.loaded !== this._gis.flag ) {
            if (this._gis.flag) this.loadGIS();
            else this.unloadGIS();
        }
        /*
        if ( this._bing.loaded !== this._bing.flag ) {
            if (this._bing.flag) this.loadBing();
            else this.unloadBing();
        }
        */

        const pick_handler = this._pick_handler;
        if ( pick_handler ) {
            const start = Date.now();
            const pickResult = this.viewer.pick( this._pre_mouse_position_app );
            const end = Date.now();
            // console.log("Pick: " + (end-start) + "ms", pickResult);
            pick_handler( pickResult );
            this._pick_handler = undefined;
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


    _pick(pick_handler: PickHandler, force: boolean) {
        if ( force || !this._pick_handler ) {
            this._pick_handler = pick_handler;
        }
    }


    loadGIS() {
        {// 文字の追加
            const entity = new mapray.TextEntity( this.viewer.scene );
            var text_position = { longitude: 138.727363, latitude: 35.360626, height: 4000 };
            var text_geoPoint = new mapray.GeoPoint( text_position.longitude, text_position.latitude, text_position.height );

            entity.addText( "Mt.Fuji", text_geoPoint, { color: [1, 0, 0], font_size: 25 } );
            entity.setBackgroundColor([1, 1, 1]);
            entity.setEnableBackground(false);
            this.addEntity( entity );
        }

        {// 線の追加
            const entity = new mapray.MarkerLineEntity( this.viewer.scene );
            var line_position = { latitude: 35.360626, longitude: 138.727363, height: 3600 };
            var position_array = [text_position.longitude, text_position.latitude, text_position.height,
            line_position.longitude, line_position.latitude, line_position.height];
            entity.addPoints( position_array );
            this.addEntity( entity );
        }

        {// Icon
            const entity = new mapray.ImageIconEntity( this.viewer.scene );
            const url = ICON_URL;
            entity.addImageIcon( url, new mapray.GeoPoint(142.619, 43.017), { origin: [ 0.5, 1.0 ] });
            this.addEntity( entity );
        }

        const sceneResource = new mapray.URLResource( SCENE_3D_URL, {
                transform: ( url, type ) => {
                    if (type.id === "IMAGE" ) {
                        return { url, init: { crossOrigin: mapray.CredentialMode.SAME_ORIGIN } };
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

        const path_option_list = [
            {
                altitude_mode: mapray.AltitudeMode.CLAMP,
                points: [
                    138.6, 35.36, 3000,
                    138.8, 35.36, 3000
                ]
            },
            {
                altitude_mode: mapray.AltitudeMode.ABSOLUTE,
                points: [
                    138.6, 35.37, 3000,
                    138.8, 35.37, 3000
                ]
            },
            {
                altitude_mode: mapray.AltitudeMode.RELATIVE,
                points: [
                    138.6, 35.38, 3000,
                    138.8, 35.38, 3000
                ]
            }
        ];

        path_option_list.forEach( path_option => {
            const path = new mapray.PathEntity( this.viewer.scene );
            path.setColor([ 1.0, 0.0, 0.0 ]);
            path.altitude_mode = path_option.altitude_mode;
            path.setLineWidth( 10.0 );
            const ps = path_option.points;
            const ls = [ 0.0, 1.0 ];
            path.addPoints( ps, ls );
            path.setLowerLength( 0.0 );
            path.setUpperLength( 1.0 );
            this.addEntity( path );
            this._path_list.push( path );

            const pin = new mapray.PinEntity( this.viewer.scene );
            pin.addMakiIconPin( "car-15", new mapray.GeoPoint(ps[0], ps[1], ps[2]));
            pin.addMakiIconPin( "car-15", new mapray.GeoPoint(ps[3], ps[4], ps[5]));
            pin.altitude_mode = path_option.altitude_mode;
            this.addEntity( pin );
        });

        this._gis.loaded = true;
    }


    unloadGIS() {
        this.viewer.scene.clearEntities();
        this._gis.loaded = false;
    }

}


// @ts-ignore
window.mapray = mapray;
