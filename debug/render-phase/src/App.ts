import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";


const SCENE_3D_URL = "https://resource.mapray.com/assets/www/model/mapray-box-with-texture/scene.json";



class App extends maprayui.StandardUIViewer {

    private _tools: HTMLElement;

    private _mouse_log: HTMLElement;

    private _enable_ui: HTMLInputElement;

    private _render_mode: mapray.Viewer.RenderMode;

    private _pre_mouse_position2: mapray.Vector2;

    private _time: number;

    private _override_mouse_event: boolean;

    private _cache_scale: number;

    private _pick_handler?: App.PickHandler;

    private _path_list?: mapray.PathEntity[];

    private _gis: {
        flag: boolean,
        loading: boolean,
        loaded: boolean
    };


    constructor( container: string | HTMLElement, options: App.Option ) {
        super( container, process.env.MAPRAY_ACCESS_TOKEN as string, {
                debug_stats: new mapray.DebugStats(),
        });

        const init_camera = {
            longitude: 137.724919, //138.339704796544,
            latitude: 34.711773, //36.26726586368221,
            height: 2500//000
        };
        const lookat_position = {
            longitude: 137.724919, //138.339704796544,
            latitude: 34.711773, //36.267265864,
            height: 0
        };
        this.setCameraPosition( init_camera );
        this.setLookAtPosition( lookat_position );
        // this.setCameraParameter( init_camera );
        this._tools = options.tools;
        const mouse_log = this._tools.querySelector("pre");
        if ( !mouse_log ) throw new Error( "couldn't find pre in tools" );
        this._mouse_log = mouse_log;
        const enable_ui = this._tools.querySelector("div.options>input[name=log-mouse-position]");
        if ( !enable_ui ) throw new Error( "couldn't find div.options>input[name=log-mouse-position] in tools" );
        this._enable_ui = enable_ui as HTMLInputElement;

        this._render_mode = mapray.Viewer.RenderMode.SURFACE;
        this._gis = {
            flag: false,
            loading: false,
            loaded: false
        };
        this._pre_mouse_position2 = mapray.GeoMath.createVector2f();                // 直前のマウス位置
        this._time = 0;
        this._override_mouse_event = false;
        this._cache_scale = 1;
    }

    onKeyDown( event: KeyboardEvent )
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
            default: {
                super.onKeyDown( event );
            }
        }
    }

    onMouseDown( point: [number, number], event: MouseEvent )
    {
        if (event.shiftKey) {
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
        else if (event.ctrlKey) {
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

        if ( !this._override_mouse_event ) {
            super.onMouseDown( point, event );
        }
    }


    onMouseMove( point: [number, number], event: MouseEvent )
    {
        if ( !this._override_mouse_event ) {
            super.onMouseMove( point, event );
        }
        mapray.GeoMath.copyVector2(point, this._pre_mouse_position2);

        if ( this._enable_ui.checked ) {
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
            }, false);
        }
    }


    onMouseUp( point: [number, number], event: MouseEvent )
    {
        this._override_mouse_event = false;
        super.onMouseUp( point, event );
    }


    onUpdateFrame( delta_time: number ) {
        this._time += delta_time;
        super.onUpdateFrame( delta_time );

        const viewer = this.viewer;
        if ( viewer.render_mode !== this._render_mode ) {
            viewer.render_mode = this._render_mode;
        }
        if ( this._gis.loaded !== this._gis.flag ) {
            if (this._gis.flag) {
              if (!this._gis.loading) {
                this._gis.loading = true;
                this.loadGIS();
              }
            }
            else this.unloadGIS();
        }

        if ( this._pick_handler ) {
            const start = Date.now();
            const pickResult = this.viewer.pick(this._pre_mouse_position2);
            const end = Date.now();
            // console.log("Pick: " + (end-start) + "ms", pickResult);
            this._pick_handler(pickResult);
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


    _pick(pick_handler: App.PickHandler, force: boolean) {
        if ( force || !this._pick_handler ) {
            this._pick_handler = pick_handler;
        }
    }


    async loadGIS() {
        const text_position = { longitude: 138.727363, latitude: 35.360626, height: 4000 };
        {
            // 文字の追加
            const entity = new mapray.TextEntity( this.viewer.scene );
            const text_geoPoint = new mapray.GeoPoint( text_position.longitude, text_position.latitude, text_position.height );
            entity.addText( "Mt.Fuji", text_geoPoint, { color: [1, 0, 0], font_size: 25 } );
            entity.setBackgroundColor([1, 1, 1]);
            entity.setEnableBackground(false);
            this.addEntity( entity );
        }

        {
            // 線の追加
            const entity = new mapray.MarkerLineEntity( this.viewer.scene );
            const line_position = { latitude: 35.360626, longitude: 138.727363, height: 3600 };
            const position_array = [text_position.longitude, text_position.latitude, text_position.height,
            line_position.longitude, line_position.latitude, line_position.height];
            entity.addPoints( position_array );
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

        await new mapray.SceneLoader( this.viewer.scene, sceneResource, {
                onEntity: (loader, entity, props) => {
                    const position = new mapray.GeoPoint(137.724919, 34.711773, 100);
                    if ( entity instanceof mapray.ModelEntity ) {
                        entity.setPosition(position);
                    }
                    loader.scene.addEntity(entity);
                }
        } ).load();

        new mapray.SceneLoader( this.viewer.scene, sceneResource, {
                onEntity: (loader, entity, props) => {
                    const position = new mapray.GeoPoint(137.724, 34.711, 200);
                    if ( entity instanceof mapray.ModelEntity ) {
                        // @ts-ignore
                        entity.setAnchorMode(true);
                        entity.setPosition(position);
                    }
                    loader.scene.addEntity(entity);
                }
        } ).load();

        this._gis.loaded = true;
        this._gis.loading = false;
    }


    unloadGIS() {
        this.viewer.scene.clearEntities();
        this._gis.loaded = false;
    }


}



namespace App {


export interface Option {
    tools: HTMLElement;
}


export type PickHandler = (pickResult: mapray.Viewer.PickResult) => void;



} // namespace App



export default App;
