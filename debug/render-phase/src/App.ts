import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";


const ICON_URL =     "https://resource.mapray.com/assets/www/logo/mapray.png";
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

    private _path_list: mapray.PathEntity[];

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
        this._path_list = [];
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
                    if (pickResult.position) {
                        var pin = new mapray.PinEntity( this.viewer.scene );
                        const p = new mapray.GeoPoint();
                        p.setFromGocs( pickResult.position );
                        if (!pickResult.entity) {
                            // pin.altitude_mode = mapray.AltitudeMode.RELATIVE;
                            // p.altitude = 0;
                        }
                        pin.addMakiIconPin( "car-15", p);
                        this.addEntity( pin );
                    }
            }, true);
        }
        else if (event.altKey) {
            this._override_mouse_event = true;
            this._pick(pickResult => {
                // @ts-ignore
                pickResult.entity.setAnchorMode(!pickResult.entity.anchor_mode);
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
                    if (pickResult.position) {
                        const p = new mapray.GeoPoint();
                        p.setFromGocs( pickResult.position );
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
            if ( pickResult ){
                this._pick_handler( pickResult );
            }
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

        { // Icon: transparent image
            const entity = new mapray.ImageIconEntity( this.viewer.scene );
            entity.addImageIcon( ICON_URL, new mapray.GeoPoint(141.6, 43.017), { origin: [ 0.5, 1.0 ] });
            entity.altitude_mode = mapray.AltitudeMode.CLAMP;
            entity.setSize( [200, 120] );
            this.addEntity( entity );
        }
        { // Icon: transparent image but disable alpha clipping
            const entity = new mapray.ImageIconEntity( this.viewer.scene, { alpha_clipping: false } );
            entity.addImageIcon( ICON_URL, new mapray.GeoPoint(142.6, 43.017), { origin: [ 0.5, 1.0 ] });
            entity.altitude_mode = mapray.AltitudeMode.CLAMP;
            entity.setSize( [200, 120] );
            this.addEntity( entity );
        }
        { // Icon: opaque image and mask
            const entity = new mapray.ImageIconEntity( this.viewer.scene, { mask_color: [200, 200, 200] } );
            const url = "./data/mapray-gray.png";
            entity.addImageIcon( url, new mapray.GeoPoint(143.6, 43.017), { origin: [ 0.5, 1.0 ] });
            entity.altitude_mode = mapray.AltitudeMode.CLAMP;
            entity.setSize( [200, 120] );
            this.addEntity( entity );
        }

        await this.loadPointTests( new mapray.GeoPoint( 137.8, 34.703 ) );

        const box1 = await this.loadBox( new mapray.GeoPoint( 137.724919, 34.711773, 100 ) );
        const box2 = await this.loadBox( new mapray.GeoPoint( 137.724, 34.711, 200 ) );
        // @ts-ignore
        box2.setAnchorMode( true );

        // line
        const line_points = [
            137.71, 34.703, 10.0,
            137.71, 34.722, 10.0,
            137.74, 34.722, 10.0,
            137.74, 34.703, 10.0,
            137.71, 34.703, 10.0
        ];

        const labels = new mapray.TextEntity( this.viewer.scene );
        labels.setColor( [1, 1, 1] );
        labels.setFontSize( 15 );
        labels.setBackgroundColor( [0, 0, 0] );
        labels.setEnableBackground(true);
        // @ts-ignore
        labels.setAnchorMode(true);
        this.addEntity( labels );

        {
            const line = new mapray.MarkerLineEntity( this.viewer.scene );
            line.setColor([ 0.2, 1.0, 0.2 ]);
            line.setLineWidth( 10.0 );
            line.altitude_mode = mapray.AltitudeMode.CLAMP;
            line.addPoints(line_points);
            this.addEntity(line);
            const ps = line.getPointAt(0);
            if ( ps ) {
              labels.addText( " Clamped (altitude:0m) ", new mapray.GeoPoint( ps[0], ps[1], 0.0 ), {} );
            }
        }

        {
            const line = new mapray.MarkerLineEntity( this.viewer.scene );
            line.setColor([ 1.0, 0.2, 0.2 ]);
            line.setLineWidth( 10.0 );
            line.addPoints(line_points.map((v, index) => (
                  index % 3 === 0 ? v +0.005 :
                  index % 3 === 1 ? v +0.005 :
                  index % 3 === 2 ? v -100 :
                  v
            )));
            this.addEntity(line);
            const ps = line.getPointAt(0);
            if ( ps ) {
              labels.addText( " Absolute (altitude:-100m) ", new mapray.GeoPoint( ...ps ), {} );
            }
        }

        {
            const line = new mapray.MarkerLineEntity( this.viewer.scene );
            line.setColor([ 0.2, 0.2, 1.0 ]);
            line.setLineWidth( 10.0 );
            // @ts-ignore
            line.setAnchorMode(true);
            line.addPoints(line_points.map((v, index) => (
                  index % 3 === 0 ? v -0.005 :
                  index % 3 === 1 ? v -0.005 :
                  index % 3 === 2 ? v -200 :
                  v
            )));
            this.addEntity(line);
            const ps = line.getPointAt(0);
            if ( ps ) {
              labels.addText( " Absolute & Anchor (altitude:-200m) ", new mapray.GeoPoint( ...ps ), {} );
            }
        }


        // polygon
        const polygon_points = [
            137.63671875, 34.597041518, 0.0,
            137.63671875, 34.7416125007, 0.0,
            137.8125,     34.7416125007, 0.0,
            137.8125,     34.597041518, 0.0
        ].map((v,index) => (index%3===1 ? v + 0.4 : v));

        {
            const polygon = new mapray.PolygonEntity( this.viewer.scene );
            polygon.setColor([ 1.0, 0.2, 0.2 ]);
            polygon.setOpacity( 0.6 );
            polygon.addOuterBoundary(polygon_points);
            polygon.altitude_mode = mapray.AltitudeMode.CLAMP;
            this.addEntity(polygon);
            const ps = polygon.getBoundaryAt(0).points;
            labels.addText( " Clamp (altitude:0m) ", new mapray.GeoPoint( ...ps ), {} );
        }

        {
            const polygon = new mapray.PolygonEntity( this.viewer.scene );
            polygon.setColor([ 0.2, 1.0, 0.2 ]);
            polygon.setOpacity( 0.6 );
            polygon.addOuterBoundary(polygon_points.map((v, index) =>(
                  index % 3 === 0 ? v + 0.05:
                  index % 3 === 1 ? v + 0.05:
                  index % 3 === 2 ? v + 100:
                  v
            )));
            this.addEntity(polygon);
            const ps = polygon.getBoundaryAt(0).points;
            labels.addText( " Absolute (altitude:100m) ", new mapray.GeoPoint( ...ps ), {} );
        }

        {
            const polygon = new mapray.PolygonEntity( this.viewer.scene );
            polygon.setColor([ 0.2, 0.2, 1.0 ]);
            polygon.setOpacity( 0.6 );
            // @ts-ignore
            polygon.setAnchorMode(true);
            polygon.addOuterBoundary(polygon_points.map((v, index) => (
                  index % 3 === 0 ? v -0.05:
                  index % 3 === 1 ? v -0.05:
                  index % 3 === 2 ? v -100:
                  v
            )));
            this.addEntity(polygon);
            const ps = polygon.getBoundaryAt(0).points;
            labels.addText( " Absolute & Anchor  (altitude:-100m) ", new mapray.GeoPoint( ...ps ), {} );
        }

        // path
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
        this._gis.loading = false;
    }


    private async loadPointTests( basePosition: mapray.GeoPoint ): Promise<mapray.Entity[]>
    {
        const entities: mapray.Entity[] = [];

        const altitudes = [100, -500];
        const types = ["icon", "text", "simple-text", "pin"];
        const anchorModes = [true, false];

        for ( let k=0; k<altitudes.length; k++ ) {
            const altitude = altitudes[k];
            for ( let i=0; i<types.length; i++ ) {
                const type = types[i];
                for ( let j=0; j<anchorModes.length; j++ ) {
                    const anchorMode = anchorModes[j];
                    const position = new mapray.GeoPoint(
                        basePosition.longitude + i * 0.02,
                        basePosition.latitude  + k * 0.05 + j * 0.02,
                        altitude
                    );
                    let pointEntity: mapray.ImageIconEntity | mapray.TextEntity | mapray.PinEntity;
                    if ( type === "icon" ) {
                        const entity = pointEntity = new mapray.ImageIconEntity( this.viewer.scene );
                        entity.addImageIcon( ICON_URL, position, { origin: [ 0.5, 1.0 ] });
                        entity.setSize( [200, 120] );
                    }
                    else if ( type === "text" || type === "simple-text" ) {
                        const entity = pointEntity = new mapray.TextEntity( this.viewer.scene );
                        entity.addText( " test ", position, { origin: [ 0.5, 1.0 ] });
                        entity.setFontSize( 20 );
                        entity.setColor( [0, 0, 1] );
                        if ( type === "text" ) {
                            entity.setEnableBackground( true );
                            entity.setBackgroundColor([ 1, 0, 0 ]);
                        }
                    }
                    else { // type === "pin"
                        const entity = pointEntity = new mapray.PinEntity( this.viewer.scene );
                        entity.addPin( position );
                    }
                    this.addEntity( pointEntity );
                    // @ts-ignore
                    pointEntity.setAnchorMode( anchorMode );
                    entities.push( pointEntity );
                }
            }
        }

        this.loadBox( new mapray.GeoPoint( basePosition.longitude + 0.02, basePosition.latitude - 0.01, 5000 ), [5, 5, 5] );
        return entities;
    }


    async loadBox( position: mapray.GeoPoint, scale: mapray.Vector3 = [1, 1, 1] ) {
        return await new Promise( onSuccess => {
            new mapray.SceneLoader( this.viewer.scene, new mapray.URLResource( SCENE_3D_URL ), {
                    onEntity: (loader, entity, props) => {
                        if ( entity instanceof mapray.ModelEntity ) {
                            entity.setPosition( position );
                            entity.setScale( scale );
                        }
                        loader.scene.addEntity( entity );
                        onSuccess( entity );
                    }
            } ).load();
        });
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
