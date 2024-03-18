import mapray, { RenderCallback, URLResource, Viewer } from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import StatusBar from "./StatusBar";
import Commander from "./Commander";
import BingMapsImageProvider from "./BingMapsImageProvider";

import TOption, { TDomTool } from "./TOption";

import Module from "./module/Module";
import PointCloudModule from "./module/PointCloudModule";
import B3dTileModule from "./module/B3dTileModule";
import AtmosphereModule from "./module/AtmosphereModule";
import Dataset2dModule from "./module/Dataset2dModule";
import Dataset3dModule from "./module/Dataset3dModule";



// Attirbute
const GSI_ATTRIBUTE = "国土地理院";



class DebugViewer extends maprayui.StandardUIViewer {

    private _commander: Commander;

    private _statusbar: StatusBar;

    private _init_camera: mapray.GeoPointData;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _lookat_position: mapray.GeoPointData;

    private _is_gis: boolean;

    private _is_initialized: boolean;

    private _layer_transparency: number;

    private _pin_entity_list: mapray.PinEntity[];

    private _text_entity_list: mapray.TextEntity[];

    private _geojson_list: mapray.Entity[];

    private _model_3d_list: mapray.ModelEntity[];

    private _point_cloud_list: mapray.PointCloud[];

    private _b3d_scene: mapray.B3dScene[];

    private _debug_ui: HTMLElement | undefined;

    private _fps: number[];
    private _fps_count: number;

    private _modules: Module[];

    private _active_module?: Module;

    private _cloudApi?: mapray.cloud.CloudApi;

    private _ui_cache: {
        tools: HTMLElement,
        tools_header: HTMLElement,
        tools_body: HTMLElement,
        load_button: HTMLButtonElement,
        unload_button: HTMLButtonElement,
    };


    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     * @param options
     */
    constructor( containerOrId: string | HTMLElement, options: DebugViewer.Option )
    {
        const container = (
          typeof(containerOrId) === "string" ? document.getElementById( containerOrId ) :
          containerOrId
        );

        if ( !container ) throw new Error( "element not found: " + containerOrId );

        const super_options = options;
        super_options.debug_stats = new mapray.DebugStats(),
        super_options.image_provider = (
            options.bingmap_token ?
            new BingMapsImageProvider( {
                    uriScheme: "https",
                    key: options.bingmap_token,
                    maxLevel: 19
            } ): undefined
        ),

        super( container, options.mapray_access_token, super_options );

        this._addEventListenerForTouchEvent();

        this._modules = [];

        this._commander = new Commander( this.viewer );
        const statusbarNode = (
          !options.statusbar ? null:
          typeof( options.statusbar ) === "string" ? document.getElementById( options.statusbar ) :
          options.statusbar
        )
        this._statusbar = new StatusBar( this.viewer, statusbarNode, GSI_ATTRIBUTE );

        const targetPos = new mapray.GeoPoint(137.7238014361, 34.7111256306);

        this._init_camera = {
            latitude: targetPos.latitude,
            longitude: targetPos.longitude,
            height: targetPos.altitude + 1000000,
        };

        this._init_camera_parameter = {
            fov: 46.0,
        };

        this._lookat_position = {
            latitude: targetPos.latitude,
            longitude: targetPos.longitude,
            height: targetPos.altitude
        };

        // カメラ位置
        this.setCameraPosition( this._init_camera );

        // 注視点
        this.setLookAtPosition( this._lookat_position );

        // カメラパラメータ
        this.setCameraParameter( this._init_camera_parameter );

        const camera_options = { camera_position: this._init_camera, lookat_position: this._lookat_position, url_update: true };

        this.enableURLUpdate( true );

        // DEMOコンテンツ
        this._is_gis = false;
        this._layer_transparency = 10; //layer

        // make tools div
        const tools = document.getElementById("tools") || (()=>{
            const tools = document.createElement( "div" );
            tools.setAttribute( "class", "tool-item" );
            if ( container ) {
                container.appendChild(tools);
            }
            return tools;
        })();

        const tools_header = tools.firstChild as (HTMLElement | undefined) ?? (() => {
            const header = document.createElement( "div" );
            tools.appendChild( header );
            return header;
        })();

        const tools_body = tools_header.nextSibling as (HTMLElement | undefined) ?? (() => {
            const body = document.createElement( "div" );
            tools.appendChild( body );
            return body;
        })();

        const load_button = TDomTool.createButton("Load", {
            onclick: async event => {
                await this._active_module?.loadData();
            },
        });

        const unload_button = TDomTool.createButton("Unload", {
            onclick: async event => {
                await this._active_module?.unloadData();
            },
        });

        this._ui_cache = {
            tools, tools_header, tools_body,
            load_button, unload_button
        };

        this._pin_entity_list = [];
        this._text_entity_list = [];
        this._geojson_list = [];
        this._model_3d_list = [];
        this._point_cloud_list = [];
        this._b3d_scene = [];

        this._fps = [];
        this._fps_count = 240;
        for ( let i=0; i<this._fps_count; i++ ) {
            this._fps.push(0);
        }

        this._is_initialized = false;
    }


    setCloudApi( cloudApi: mapray.cloud.CloudApi ): void
    {
        this._cloudApi = cloudApi;
    }


    get cloudApi(): mapray.cloud.CloudApi | undefined
    {
        return this._cloudApi;
    }


    override destroy() {
        super.destroy();
        this._is_gis = false;
        this._layer_transparency = 10;
    }


    get commander(): Commander { return this._commander; }

    get statusBar(): StatusBar { return this._statusbar; }

    get pinEntityList(): mapray.PinEntity[] { return this._pin_entity_list; }
    set pinEntityList( list:mapray.PinEntity[] ) { this._pin_entity_list = list; }

    get textEntityList(): mapray.TextEntity[] { return this._text_entity_list; }
    set textEntityList( list:mapray.TextEntity[] ) { this._text_entity_list = list; }

    get geoJsonList(): mapray.Entity[] { return this._geojson_list; }
    set geoJsonList( list:mapray.Entity[] ) { this._geojson_list = list; }

    get model3DList(): mapray.ModelEntity[] { return this._model_3d_list; }
    set model3DList( list:mapray.ModelEntity[] ) { this._model_3d_list = list; }

    get pointCloudList(): mapray.PointCloud[] { return this._point_cloud_list; }
    set pointCloudList( list:mapray.PointCloud[] ) { this._point_cloud_list = list; }

    get b3dScene(): mapray.B3dScene[] { return this._b3d_scene; }
    set b3dScene( scene: mapray.B3dScene[] ) { this._b3d_scene = scene; }


    public async init(): Promise<void>
    {
        const modules: Module[] = [];
        this.populateModules( modules );
        for ( const module of modules ) {
            await this.installModule( module );
        }
        if ( !this._active_module ) {
            this._active_module = modules[0];
        }
        this._is_initialized = true;
        this._updateHeader();
    }


    /**
     * インストール済みのモジュールリストを取得します。
     */
    protected get modules(): Module[]
    {
        return this._modules;
    }


    /**
     * モジュールリストを生成します。
     */
    protected populateModules( modules: Module[] ): void
    {
    }


    /**
     * モジュールをインストールします。
     */
    public async installModule( module: Module ): Promise<void>
    {
        this._modules.push( module );
        await module.init( this );
        this._updateHeader();
    }


    /**
     * GIS情報の表示
     */
    async loadGISInfo()
    {
        console.log('loadGISInfo');
    }


    /**
     * GIS情報の非表示
     */
    async clearGISInfo()
    {
        console.log('clearGISInfo');
    }


    override onMouseDown( point: [x: number, y: number], event: MouseEvent ): void
    {
        let consumed = false;
        if ( this._active_module?.isLoaded() ) {
            consumed = this._active_module.onMouseDown( point, event );
        }
        if ( !consumed ) {
            super.onMouseDown( point, event );
        }
    }


    override onMouseUp( point: [x: number, y: number], event: MouseEvent ): void
    {
        let consumed = false;
        if ( this._active_module?.isLoaded() ) {
            consumed = this._active_module.onMouseUp( point, event );
        }
        if ( !consumed ) {
            super.onMouseUp( point, event );
        }
    }


    override onMouseMove( point: [x: number, y: number], event: MouseEvent ): void
    {
        let consumed = false;
        if ( this._active_module?.isLoaded() ) {
            consumed = this._active_module.onMouseMove( point, event );
        }
        if ( !consumed ) {
            super.onMouseMove( point, event );
        }
    }


    /**
     * onUpdateFrame
     * @param delta_time 
     */
    override onUpdateFrame( delta_time: number )
    {
        if (!this._viewer) {
            return;
        }

        super.onUpdateFrame( delta_time );

        const layer = this._commander.getLayer();

        this._updateRenderMode();
        this._updateLayerParams(layer);
        this._updateGISMode();
        this._updateNumKey();
        this._updateCapture();

        const camera_position = this.getCameraPosition();
        const elevation = this.viewer.getElevation( camera_position.latitude, camera_position.longitude );

        const camera_matrix = this.viewer.camera.view_to_gocs;
        const direction = mapray.GeoMath.createVector3( [ camera_matrix[4], camera_matrix[5], camera_matrix[6] ]);
        const camera_parameter = this.getCameraParameter();
        const pitch = this.getCameraAngle().pitch - 90;

        // ステータスバーを更新
        const statusbar = this._statusbar;
        statusbar.setCameraPosition( camera_position );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        statusbar.setFovAngle( camera_parameter.fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer( this._layer_transparency );

        const fps = 1.0 / delta_time;
        this._fps.shift();
        this._fps.push(fps);
        let ave_fps = 0;
        for ( let i=0; i<this._fps_count; i++ ) {
            ave_fps += this._fps[i];
        }
        statusbar.setFps( ave_fps / this._fps_count );

        // this._updateSpace( delta_time );

        for ( let module of this._modules ) {
            module.updateFrame( delta_time );
        }

        this._commander.endFrame();
    }


    /**
     * キーダウンイベント
     * @param event 
     */
    override onKeyDown( event: KeyboardEvent )
    {
        let consumed = false;
        if ( this._active_module?.isLoaded() ) {
            consumed = this._active_module.onKeyDown( event );
        }
        if ( !consumed ) {
            super.onKeyDown( event );
            this._commander.OnKeyDown( event );
        }
    }

    /**
     * PinEntityの追加
     * @param pos 
     * @param options 
     */
    addPinEntity( pos: mapray.GeoPoint, options = {} )
    {
        this._addPinEntity( pos, '', options, 
        (pin:mapray.PinEntity, str:string, pos:mapray.GeoPoint, options:{} ) => {
            pin.addPin (pos, options) 
        } );
    }

    /**
     * IconPinEntityの追加
     * @param pos 
     * @param id 
     * @param options 
     */
    addIconPinEntity( pos: mapray.GeoPoint, id: string, options = {} )
    {
        this._addPinEntity( pos, id, options, 
        (pin:mapray.PinEntity, str:string, pos:mapray.GeoPoint, options:{} ) => {
            pin.addMakiIconPin (str, pos, options) 
        } );
    }

    /**
     * TextPinEntityの追加
     * @param pos 
     * @param text 
     * @param options 
     */
    addTextPinEntity( pos: mapray.GeoPoint, text: string, options = {} )
    {
        this._addPinEntity( pos, text, options, 
        (pin:mapray.PinEntity, str:string, pos:mapray.GeoPoint, options:{} ) => {
            pin.addTextPin (str, pos, options) 
        } );
    }

    /**
     * PinEntity生成
     * @param pos 
     * @param str 
     * @param options 
     * @param addFunc
     * @private 
     */
    private _addPinEntity( pos: mapray.GeoPoint, str: string,
        options: mapray.PinEntity.TextPinEntryOption |
        mapray.PinEntity.MakiIconPinEntryOption |
        mapray.PinEntity.AbstractPinEntryOption,
        addFunc: any )
    {
        const pin = new mapray.PinEntity( this.viewer.scene );
        pin.altitude_mode = mapray.AltitudeMode.CLAMP;
        addFunc( pin, str, pos, options );
        this.addEntity(pin);
        this._pin_entity_list.push( pin );
    }

    /**
     * PinEntityListの削除
     */
    removePinEntity()
    {
        if (this._pin_entity_list) {
            this._pin_entity_list.forEach( entity => {
                this.viewer.scene.removeEntity( entity );
            });
        }
        this._pin_entity_list = [];
    }


    /**
     * TextEntityの追加
     * @param pos 
     * @param text 
     * @param options 
     */
    async addTextEntity( pos: mapray.GeoPoint, text: string, options: {} )
    {
        const entity = new mapray.TextEntity( this.viewer.scene );
        entity.addText( text, pos, options );
        this.addEntity(entity);
        this._text_entity_list.push( entity );
    }

    /**
     * TextEntityListの削除
     */
    removeTextEntity()
    {
        this._text_entity_list.forEach( entity => {
                this.viewer.scene.removeEntity( entity );
        });
        this._text_entity_list = [];
    }

    /**
     * GeoJsonEntityの追加
     * @param dataset_id 
     */
     async addGeoJson( dataset_id: string )
     {
         const entities: mapray.Entity[] = [];
         const cloudApi = this.cloudApi as mapray.cloud.CloudApi;
         const resource = cloudApi.getDatasetAsResource( dataset_id );
         const loader = new mapray.GeoJSONLoader( this.viewer.scene, resource, {
             onEntity: ( loader, entity, prop ) => {
                 entities.push( entity );
                 this._geojson_list.push( entity );
                 loader.scene.addEntity( entity );
             }
         } );
         await loader.load();
         return entities;
     }

    /**
     * GeoJsonListの削除
     */
    removeGeoJson()
    {
        this._geojson_list.forEach( entity => {
                this.viewer.scene.removeEntity( entity );
        });
        this._geojson_list = [];
    }

     /**
     * ModelEntityの追加
     * @param dataset_id 
     */
    async addModelEntity( dataset_id: string ): Promise<mapray.ModelEntity>
    {
        const cloudApi = this.cloudApi as mapray.cloud.CloudApi;
        const resource = cloudApi.get3DDatasetAsResource( [dataset_id] );
        let loadedEntity: mapray.ModelEntity | undefined;
        const loader = new mapray.SceneLoader( this.viewer.scene, resource, {
            onEntity: ( loader, entity, prop ) => {
                if ( entity instanceof mapray.ModelEntity) {
                    this._model_3d_list.push( entity );
                    loader.scene.addEntity( entity );
                    loadedEntity = entity;
                }
                else {
                    throw new Error( "created entity is not ModelEntity" );
                }
            }
        } );
        await loader.load();
        if ( !loadedEntity ) {
            throw new Error( "failed to load ModelEntity" );
        }
        return loadedEntity;
    }

    /**
     * ModelEntitiyListの削除
     */
    removeModelEntity()
    {
        this._model_3d_list.forEach( modelEntity => {
                this.viewer.scene.removeEntity( modelEntity );
        });
        this._model_3d_list = [];
    }

    /**
     * 点群の追加
     */
    async addPointCloud( dataset_id: string ): Promise<mapray.PointCloud>
    {
        const cloudApi = this.cloudApi as mapray.cloud.CloudApi;
        const point_cloud_collection = this.viewer.point_cloud_collection;
        const resource = cloudApi.getPointCloudDatasetAsResource( dataset_id );
        const point_cloud = point_cloud_collection.add( new mapray.RawPointCloudProvider( resource ) );

        const datasets = await cloudApi.loadPointCloudDatasets();
        console.log( datasets );
        const dataset = await cloudApi.loadPointCloudDataset( dataset_id );
        console.log( dataset );

        this.pointCloudList.push( point_cloud );
        return point_cloud;
    }

    /**
     * 点群の削除
     */
    removePointCloud()
    {
        const point_cloud_collection = this.viewer.point_cloud_collection;
        if (this._point_cloud_list) {
            this._point_cloud_list.forEach( pointCloud => {
                    point_cloud_collection.remove(pointCloud);
            });
        }
        this._point_cloud_list = [];
    }

    /**
     * B3Dの追加
     * @param urls 
     * @returns 
     */
    addB3d( urls: string[] ): mapray.B3dScene[]
    {
        const scenes = urls.map(url => {
                const provider = new mapray.StandardB3dProvider(url, ".bin");
                return this.viewer.b3d_collection.createScene( provider );
        });
        this._b3d_scene.push( ...scenes );
        return scenes;
    }

    /**
     * B3Dの全削除
     */
    removeB3d()
    {
        if (this._b3d_scene) {
            this._b3d_scene.forEach( scene => {
                    this.viewer.b3d_collection.removeScene( scene );
            });
        }
        this._b3d_scene = [];
    }


    setControllable( flag: boolean ) {
        super.setControllable( flag );
    }

    private _updateHeader(): void
    {
        if ( !this._is_initialized ) return;
        const { tools_header, load_button, unload_button } = this._ui_cache;
        while ( tools_header.firstChild ) tools_header.firstChild.remove();
        if ( this._modules.length === 0 ) return;
        const toption = TOption.create({
            "module": {
                type: "select",
                description: "Module",
                keyValues: this._modules.map( module => TOption.keyValue( module.name, module ) ),
                value: this._active_module ?? this._modules[0],
            },
        });
        tools_header.appendChild( TDomTool.createSelectOption( toption.getProperty( "module" ) ));
        toption.onChange( "module", event => {
            this.setActiveModule( event.value );
        } );

        if ( this._active_module ) {
            const tool_bar = this._active_module.getToolBar()
            tools_header.appendChild(tool_bar);
        }
    }

    /**
     * DegugUIをセット
     * @param ui 
     */
    setDebugUI( target: HTMLElement | Module ): HTMLElement
    {
        this._updateHeader();
        const { tools_body } = this._ui_cache;
        while ( tools_body.firstChild ) tools_body.firstChild.remove();
        let ui: HTMLElement;
        if ( target instanceof HTMLElement ) {
            ui = target;
        }
        else {
            ui = target.createUI();
        }
        this._debug_ui = ui;
        tools_body.appendChild( ui );
        return ui;
    }


     /**
      * DebugUIを削除
      */
     clearDebugUI()
     {
         const ui = this._debug_ui
         if ( ui && ui.parentElement ) {
             ui.parentElement.removeChild(ui);
             delete this._debug_ui;
         }
     }


    /**
     * Viewer のレンダリングモードを更新
     */
    private _updateRenderMode()
    {
        if ( this._commander.isRenderModeChanged() ) {
            const     viewer = this.viewer;
            const      rmode = viewer.render_mode;
            if ( rmode === mapray.Viewer.RenderMode.SURFACE ) {
                viewer.render_mode = mapray.Viewer.RenderMode.WIREFRAME;
            }
            else {
                viewer.render_mode = mapray.Viewer.RenderMode.SURFACE;
            }
        }
    }


    /**
     * 画面のキャプチャ
     */
    private async _updateCapture()
    {
        if ( this._commander.isCapture() ) {
            const is_png = false;
            const options: mapray.Capture.Option = is_png ? {type: 'png'} : {type: 'jpeg'};
            const blob = await this.viewer.capture( options );
            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = is_png ? 'download.png' : 'download.jpg';
            a.click();
        }
    }


    /**
     * Layerパラメータ更新
     * @param value 
     */
    private _updateLayerParams( value: number )
    {
        if ( value != 0 ){
            this._layer_transparency = this._layer_transparency + value;
            if ( this._layer_transparency > 10 ) {
                this._layer_transparency = 10;
            } else if ( this._layer_transparency < 0 ) {
                this._layer_transparency = 0;
            }
            const d = ( this._layer_transparency ) / 10.0;
            if (this.viewer.layers && this.viewer.layers.getLayer(0)) {
                this.viewer.layers.getLayer(0).setOpacity(d);
            }
        }
    }


    /**
     * GISMode
     */
    private _updateGISMode()
    {
        if ( this._commander.isGISModeChanged() ) {
            if ( this._is_gis ) {
                this._is_gis = false;
                this.clearGISInfo();
            } else {
                this._is_gis = true;
                this.loadGISInfo();
            }
        }
    }


    /**
     * 数字キー
     */
    private _updateNumKey()
    {
        const numKey = this._commander.getNumKey();
        if ( numKey !== -1 ) {
            const module = this._modules[ numKey - 1 ];
            if ( module ) {
                this._active_module = module;
                this.setDebugUI( module );
            }
            else {
                this._active_module = undefined;
                this.clearDebugUI();
            }
        }
    }


    public setActiveModule( module: Module ): void
    {
        this._active_module = module;
        this.setDebugUI( module );
    }


    // タッチイベント暫定対応（テスト用）
    // @ts-ignore
    private _addEventListenerForTouchEvent() {
        const canvas = this.viewer.canvas_element;
        const getTouchInfo = ( touches: TouchList ) => {
            const o = {
                position: [0, 0],
                distance: 0,
                count: touches.length,
            };
            for (let i=0; i<touches.length; i++) {
                o.position[0] += touches[i].clientX;
                o.position[1] += touches[i].clientY;
            }
            o.position[0] /= touches.length;
            o.position[1] /= touches.length;
            for (let i=0; i<touches.length; i++) {
                const dx = touches[i].clientX - o.position[0];
                const dy = touches[i].clientY - o.position[1];
                o.distance += Math.sqrt( dx*dx + dy*dy );
            }
            o.distance /= touches.length;
            return o;
        };

        const context = {
            position: [0, 0],
            distance: 0,
            count: 0,
        };

        canvas.addEventListener( "touchstart", event => {
                event.preventDefault();
                event.stopPropagation();
                // @ts-ignore
                const o = getTouchInfo( event.touches );
                context.position = o.position;
                context.distance = o.distance;
                // @ts-ignore
                event.button = event.touches.length === 1 ? 0 : 1;
                // @ts-ignore
                this.onMouseDown(o.position, event);
        }, { passive: false } );
        canvas.addEventListener( "touchmove", event => {
                event.preventDefault();
                event.stopPropagation();
                // @ts-ignore
                const o = getTouchInfo( event.touches );
                context.position = o.position;
                // @ts-ignore
                if (o.count < context.count) {
                }
                else {
                    if (　Math.abs(　o.distance - context.distance　) > 1　) {
                        // @ts-ignore
                        this._zoom_wheel += (o.distance - context.distance) / 10;
                    }
                    {
                        // @ts-ignore
                        event.button = event.touches.length === 1 ? 0 : 1;
                        // @ts-ignore
                        this.onMouseMove(o.position, event);
                    }
                }
                context.distance = o.distance;
                context.count = o.count;
        }, { passive: false } );
        canvas.addEventListener( "touchend", event => {
                event.preventDefault();
                event.stopPropagation();
                // @ts-ignore
                event.button = event.touches.length === 1 ? 0 : 1;
                // @ts-ignore
                this.onMouseUp(　context.position, event　);
        }, { passive: false } );
    }

}



namespace DebugViewer {



export interface Option extends mapray.Viewer.Option {
    mapray_access_token: string,
    bingmap_token?: string,
    statusbar?: string | HTMLElement,
}



}



export default DebugViewer;
