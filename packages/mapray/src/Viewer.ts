import Camera from "./Camera";
import GLEnv from "./GLEnv";
import Ray from "./Ray";
import Entity from "./Entity";
import DebugStats from "./DebugStats";
import RenderCallback from "./RenderCallback";
import NullRenderCallback from "./NullRenderCallback";
import RenderStage from "./RenderStage";
import StandardImageProvider from "./StandardImageProvider";
import StandardDemProvider from "./StandardDemProvider";
import Layer from "./Layer";
import LayerCollection from "./LayerCollection";
import Globe from "./Globe";
import DemProvider from "./DemProvider";
import ImageProvider from "./ImageProvider";
import PointCloudCollection from "./PointCloudCollection";
import PointCloud from "./PointCloud";
import TileTextureCache from "./TileTextureCache";
import GeoMath, { Vector2, Vector3 } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Scene from "./Scene";
import SceneLoader from "./SceneLoader";
import B3dProvider from "./B3dProvider";
import B3dCollection from "./B3dCollection";
import B3dScene from "./B3dScene";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import BindingBlock from "./animation/BindingBlock";
import Util from "./util/Util";
import Dom from "./util/Dom";
import Sun from "./Sun";
import Atmosphere from "./Atmosphere";
import SunVisualizer from "./SunVisualizer";
import Moon from "./Moon";
import MoonVisualizer from "./MoonVisualizer";
import CloudVisualizer from "./CloudVisualizer";

// マウス・Attribution開発
import LogoController from "./LogoController";
import AttributionController from "./AttributionController";
import ContainerController from "./ContainerController";



/**
 * 表示管理
 *
 * mapray の表示を管理するクラスである。
 */
class Viewer {

    private _container_element: HTMLElement;

    private _canvas_element: HTMLCanvasElement;

    private _glenv: GLEnv;

    private _camera: Camera;

    private _animation: BindingBlock;

    private _dem_provider: DemProvider<any>;

    private _north_pole?: Globe.PoleOption;

    private _south_pole?: Globe.PoleOption;

    private _image_provider: ImageProvider;

    private _layers: LayerCollection;

    private _globe: Globe;

    private _tile_texture_cache: TileTextureCache;

    private _b3d_collection: B3dCollection;

    private _scene: Scene;

    private _ground_visibility: boolean;

    private _entity_visibility: boolean;

    private _b3d_scene_visibility: boolean;

    private _render_mode: Viewer.RenderMode;

    private _debug_stats?: DebugStats;

    private _point_cloud_collection: PointCloudCollection;

    private _render_callback: RenderCallback;

    private _frame_req_id: number = 0;

    private _previous_time?: number;

    private _is_destroyed: boolean = false;

    private _sun: Sun;

    private _moon: Moon;

    private _postProcesses: Viewer.PostProcess[] = [];

    private _logo_controller: LogoController;

    private _attribution_controller: AttributionController;

    private _atmosphere?: Atmosphere;

    private _sunVisualizer?: SunVisualizer;

    private _moonVisualizer?: MoonVisualizer;

    private _cloudVisualizer?: CloudVisualizer;

    private _load_status: Viewer.LoadStatus;

    /** @internal */
    _render_cache?: any;


    /**
     * container コンテナ (ID または要素)
     * options   生成オプション
     */
    constructor( container: string | HTMLElement, options: Viewer.Option = {} )
    {
        var container_element: HTMLElement;
        if ( typeof container === "string" ) {
            // コンテナを ID 指定したとき
            const tmp = document.getElementById( container );
            if ( tmp ) {
                container_element = tmp;
            }
            else {
                throw new Error( "element couldn't be found: " + container );
            }
        }
        else if ( container instanceof HTMLElement ) {
            // コンテナを直接要素で指定のとき
            container_element = container;
        }
        else {
            throw new Error( "unsupported type: " + container );
        }

        var canvas = this._createCanvas( container_element );

        // インスタンス変数
        this._container_element  = container_element;
        this._canvas_element     = canvas;
        this._glenv              = new GLEnv( canvas );
        this._camera             = new Camera( canvas );
        this._animation          = this._createAnimationBindingBlock();
        this._dem_provider       = this._createDemProvider( options );
        this._north_pole         = options.north_pole;
        this._south_pole         = options.south_pole;
        this._image_provider     = this._createImageProvider( options );
        this._layers             = this._createLayerCollection( options );
        this._globe              = new Globe( this._glenv, this._dem_provider, options.north_pole, options.south_pole );
        this._tile_texture_cache = new TileTextureCache( this._glenv, this._image_provider );
        this._b3d_collection     = new B3dCollection( this );
        this._scene              = new Scene( this, this._glenv );
        this._ground_visibility  = Viewer._getBoolOption( options, "ground_visibility", true );
        this._entity_visibility  = Viewer._getBoolOption( options, "entity_visibility", true );
        this._b3d_scene_visibility = Viewer._getBoolOption( options, "b3d_scene_visibility", true );
        this._render_mode        = options.render_mode || Viewer.RenderMode.SURFACE;
        this._debug_stats        = options.debug_stats;
        this._point_cloud_collection = this._createPointCloudCollection( options );
        this._render_callback    = this._createRenderCallback( options );
        this._sun                = new Sun();
        this._moon               = new Moon();
        this._load_status        = {
            dem_loading: 0,
            img_loading: 0,
            b3d_loading: 0,
            pc_loading: 0,
            total_loading: 0,
        };

        const atmosphere = options.atmosphere;
        if ( atmosphere ) {
            this._atmosphere = atmosphere;
            atmosphere.init( this );
        }

        const sunVisualizer = options.sun_visualizer;
        if ( sunVisualizer ) {
            this._sunVisualizer = sunVisualizer;
            sunVisualizer.init( this );
        }

        const moonVisualizer = options.moon_visualizer;
        if ( moonVisualizer ) {
            this._moonVisualizer = moonVisualizer;
            moonVisualizer.init( this );
        }

        const cloudVisualizer = options.cloud_visualizer;
        if ( cloudVisualizer ) {
            this._cloudVisualizer = cloudVisualizer;
            cloudVisualizer.init( this );
        }

        // マウス・Attribution開発
        this._logo_controller = ( options && options.logo_controller ) || new LogoController( this._container_element );
        this._attribution_controller = ( options && options.attribution_controller ) || new AttributionController( this._container_element );

        // ロゴ・著作権表示用コンテナの作成
        this._createLogoAttributionContainer()

        this._logo_controller.createContainer();
        this._attribution_controller.createContainer();

        // 最初のフレームの準備
        this._requestNextFrame();
        this._updateCanvasSize();
    }


    /**
     * インスタンスを破棄
     *
     * 次の順番で処理を行い、インスタンスを破棄する。
     *
     * 1. アニメーションフレームを止める。(this.[[render_callback]] の [[RenderCallback.onUpdateFrame onUpdateFrame()]] が呼び出されなくなる)
     * 2. this.[[render_callback]] の [[RenderCallback.onStop onStop()]] を呼び出す。([[RenderCallback.onStart onStart()]] がすでに呼び出されている場合)
     * 3. [[RenderCallback]] インスタンスを this から切り離す。([[RenderCallback.viewer]] プロパティは null を返すようになる)
     * 4. [[canvas_element]] を [[container_element]] から取り外す。(キャンバスは表示されなくなる)
     * 5. データプロバイダのリクエスト、シーンデータのロードの取り消しを試みる。
     *
     * このメソッドを呼び出した後は this に直接的または間接的にアクセスすることはできない。ただし [[destroy destroy()]] の呼び出しは除く。
     * このメソッドは [[RenderCallback]] のメソッドから呼び出してはならない。
     */
    destroy()
    {
        if ( this._is_destroyed ) {
            // すでに this は破棄済み
            return;
        }

        // フレームを止める
        if ( this._frame_req_id != 0 ) {
            Util.maprayCancelAnimationFrame( this._frame_req_id );
            this._frame_req_id = 0;
        }

        // RenderCallback の取り外し
        this._render_callback.detach();
        this._render_callback = this._createRenderCallback( {} );  // NullRenderCallback

        // キャンバスをコンテナから外す
        this._container_element.removeChild( this._canvas_element );

        // DemProvider のリクエストを取り消す
        this._globe.cancel();

        // ImageProvider のリクエストを取り消す
        this._tile_texture_cache.cancel();

        // 各レイヤーの のリクエストを取り消す
        this._layers.cancel();

        // すべての B3dScene インスタンスを削除
        this._b3d_collection.clearScenes();

        // 各 SceneLoader の読み込みを取り消す
        this._scene.cancelLoaders();

        // マウス・Attribution開発
        // @ts-ignore
        this._logo_controller._destroy();
        // @ts-ignore
        this._attribution_controller._destroy();
        // @ts-ignore
        this._attribution_controller = null;

        // ロゴ・著作権用コンテナの削除
        this._deleteLogoAttributionContainer();

        // 破棄確定
        this._is_destroyed = true;
    }


    /**
     * キャンバス要素を生成
     * @param  container
     */
    private _createCanvas( container: Element ): HTMLCanvasElement
    {
        var canvas = document.createElement( "canvas" );
        canvas.className = "mapray-canvas";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild( canvas );
        return canvas;
    }


    /**
     * DemProvider を生成
     */
    private _createDemProvider( options: Viewer.Option ): DemProvider<any>
    {
        if ( options.dem_provider )
            return options.dem_provider;
        else
            // @ts-ignore
            return new StandardDemProvider( "/dem/", ".bin" );
    }


    /**
     * animation.BindingBlock を生成
     */
    private _createAnimationBindingBlock(): BindingBlock
    {
        let abb = new EasyBindingBlock();
        abb.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        // @ts-ignore
        return abb;
    }


    /**
     * ImageProvider を生成
     */
    private _createImageProvider( options: Viewer.Option ): ImageProvider
    {
        if ( options.image_provider )
            return options.image_provider;
        else {
            // @ts-ignore
            return new StandardImageProvider( "http://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 0, 18 );
        }
    }


    /**
     * LayerCollection を生成
     */
    private _createLayerCollection( options: Viewer.Option )
    {
        var layers = (options.layers) ? options.layers : undefined;
        return new LayerCollection( this, layers );
    }


    /**
     * PointCloudCollection を生成
     */
    private _createPointCloudCollection( options: Viewer.Option )
    {
        // const point_cloud_providers = (options.point_cloud_providers) ? options.point_cloud_providers : {};
        return new PointCloudCollection( this._scene );
    }


    /**
     * RenderCallback を生成
     */
    private _createRenderCallback( options: Viewer.Option )
    {
        var callback;
        if ( options && options.render_callback )
            callback = options.render_callback;
        else
            callback = new NullRenderCallback();

        callback.attach( this );

        return callback;
    }


    /**
     * ロゴ・著作権表示用コンテナの作成
     */
    private _createLogoAttributionContainer()
    {
        for ( var position of Viewer._positions )
        {
            var container = document.createElement( "div" );
            container.className = position
            this._container_element.appendChild( container );
        }
    }


    /**
     * ロゴ・著作権表示用コンテナの削除
     */
    private _deleteLogoAttributionContainer()
    {
        for ( var position of Viewer._positions )
        {
            var container = document.getElementById( position );

            if ( container ) { this._container_element.removeChild( container ); }
        }
    }


    /**
     * ブール値のオプションを取得
     */
    private static _getBoolOption( options: Viewer.Option, name: string, defaultValue: boolean ): boolean
    {
        // @ts-ignore
        const value = options[name] as boolean | undefined;
        return (value !== undefined) ? value : defaultValue;
    }


    /**
     * コンテナ要素 (キャンバス要素を保有する)
     */
    get container_element(): HTMLElement { return this._container_element; }


    /**
     * キャンバス要素
     */
    get canvas_element(): HTMLCanvasElement { return this._canvas_element; }


    /**
     * アニメーションパラメータ設定
     */
    get animation(): BindingBlock { return this._animation; }


    /**
     * DEM データプロバイダ
     */
    get dem_provider(): DemProvider<any> { return this._dem_provider; }


    /** @internal */
    get north_pole(): Globe.PoleOption | undefined { return this._north_pole; }


    /** @internal */
    get south_pole(): Globe.PoleOption | undefined { return this._south_pole; }


    /**
     * 画像プロバイダ
     */
    get image_provider(): ImageProvider { return this._image_provider; }


    /**
     * 地図レイヤー管理
     */
    get layers(): LayerCollection { return this._layers; }


    /**
     * 点群管理
     */
    get point_cloud_collection(): PointCloudCollection { return this._point_cloud_collection; }


    /**
     * B3dScene 管理
     */
    get b3d_collection(): B3dCollection { return this._b3d_collection; }


    /**
     * レンダリングコールバック
     */
    get render_callback(): RenderCallback { return this._render_callback; }


    /**
     * レンダリングモード
     */
    get render_mode(): Viewer.RenderMode { return this._render_mode; }


    /**
     * レンダリングモードを設定
     */
    set render_mode( val: Viewer.RenderMode ) { this._render_mode = val; }


    /**
     * デバッグ統計オブジェクト
     */
    get debug_stats(): DebugStats | undefined { return this._debug_stats; }


    /**
     * カメラ
     */
    get camera(): Camera { return this._camera; }


    /**
     * モデルシーン
     */
    get scene(): Scene { return this._scene; }


    /**
     * 内部的に実装で使用される WebGL レンダリングコンテキスト情報
     * @internal
     */
    get glenv(): GLEnv { return this._glenv; }


    /**
     * @internal
     */
    get globe(): Globe { return this._globe; }


    /**
     * 内部的に実装で使用される地図画像タイル管理
     * @internal
     */
    get tile_texture_cache(): TileTextureCache { return this._tile_texture_cache; }


    /**
     *
     */
    get logo_controller(): LogoController { return this._logo_controller; }

    /**
     *
     */
    get attribution_controller(): AttributionController { return this._attribution_controller; }


    /**
     */
    get load_status(): Viewer.LoadStatus { return this._load_status; }


    /**
     */
    get sun(): Sun { return this._sun; }


    /**
     */
    get moon(): Moon { return this._moon; }


    /**
     */
    get atmosphere() { return this._atmosphere; }
 
 
    /**
     */
    get sunVisualizer() { return this._sunVisualizer; }


    /**
     */
    get moonVisualizer() { return this._moonVisualizer; }


    /**
     */
    get cloudVisualizer() { return this._cloudVisualizer; }


    /**
     * 可視性を設定
     *
     * target に属するオブジェクトを表示するかどうかを指定する。
     * 可視性は Viewer の構築子の ground_visibility, entity_visibility,
     *    b3d_scene_visibility オプションでも指定することができる。
     *
     * @param target      表示対象
     * @param visibility  表示するとき true, 表示しないとき false
     * @see [[getVisibility]]
     */
    setVisibility( target: Viewer.Category, visibility: boolean )
    {
        switch ( target ) {
        case Viewer.Category.GROUND:
            this._ground_visibility = visibility;
            break;
        case Viewer.Category.ENTITY:
            this._entity_visibility = visibility;
            break;
        case Viewer.Category.B3D_SCENE:
            this._b3d_scene_visibility = visibility;
            break;
        default:
            throw new Error( "invalid target: " + target );
        }
    }


    /**
     * 可視性を取得
     *
     * target に属するオブジェクトを表示するかどうかを取得する。
     *
     * @param  target  表示対象
     * @return 表示するとき true, 表示しないとき false
     *
     * @see [[setVisibility]]
     */
    getVisibility( target: Viewer.Category ): boolean
    {
        switch ( target ) {
        case Viewer.Category.GROUND:
            return this._ground_visibility;
        case Viewer.Category.ENTITY:
            return this._entity_visibility;
        case Viewer.Category.B3D_SCENE:
            return this._b3d_scene_visibility;
        default:
            throw new Error( "invalid target: " + target );
        }
    }


    /**
     * 指定位置の標高を取得
     *
     * 緯度 lat, 経度 lon が示す場所の標高を返す。
     * 現在メモリに存在する DEM データの中で最も正確度が高いデータから標高を計算する。
     * さらに正確度が高い DEM データがサーバーに存在すれば、それを非同期に読み込む。そのため時間を置いてこのメソッドを呼び出すと、さらに正確な値が取得できることがある。
     * @param  lat  緯度 (Degrees)
     * @param  lon  経度 (Degrees)
     * @return      標高 (Meters)
     */
    getElevation( lat: number, lon: number ): number
    {
        // 正規化緯経度 (Degrees)
        var _lon = lon + 180 * Math.floor( (90 - lat) / 360 + Math.floor( (90 + lat) / 360 ) );
        var nlat = 90 - Math.abs( 90 - lat + 360 * Math.floor( (90 + lat) / 360 ) );  // 正規化緯度 [-90,90]
        var nlon = _lon - 360 - 360 * Math.floor( (_lon - 180) / 360 );               // 正規化緯度 [-180,180)

        // 単位球メルカトル座標
        var xm = nlon * GeoMath.DEGREE;
        var ym = GeoMath.invGudermannian( nlat * GeoMath.DEGREE );

        // 基底タイル座標 (左上(0, 0)、右下(1, 1))
        var dPI = 2 * Math.PI;
        var  xt = xm / dPI + 0.5;
        var  yt = 0.5 - ym / dPI;

        if ( yt < 0 || yt > 1 ) {
            // 緯度が Web メルカトルの範囲外 (極に近い)
            return 0;
        }

        // 正確度が最も高い DEM タイルの取得
        var globe = this._globe;
        var dem   = globe.findHighestAccuracy( xt, yt );
        if ( dem === null ) {
            // まだ標高を取得することができない
            return 0;
        }

        // 標高をサンプル
        var   ρ = globe.dem_provider.getResolutionPower();
        var size = 1 << ρ;               // 2^ρ
        var  pow = Math.pow( 2, dem.z );  // 2^ze
        var   uf = size * (pow * xt - dem.x);
        var   vf = size * (pow * yt - dem.y);
        var   ui = GeoMath.clamp( Math.floor( uf ), 0, size - 1 );
        var   vi = GeoMath.clamp( Math.floor( vf ), 0, size - 1 );

        var heights = dem.getHeights( ui, vi );
        var h00 = heights[0];
        var h10 = heights[1];
        var h01 = heights[2];
        var h11 = heights[3];

        // 標高を補間
        var    s = uf - ui;
        var    t = vf - vi;
        return (h00 * (1 - s) + h10 * s) * (1 - t) + (h01 * (1 - s) + h11 * s) * t;
    }


    /**
     * 現行の標高を取得
     *
     * 現在メモリーにある最高精度の標高値を取得する。
     * まだ DEM データが存在しない、または経度, 緯度が範囲外の場所は標高を 0 とする。
     *
     * このメソッドは DEM のリクエストは発生しない。また DEM のキャッシュには影響を与えない。
     *
     * 一般的に画面に表示されていない場所は標高の精度が低い。
     *
     * @param position  位置 (高度は無視される)
     * @return          標高
     *
     * @see [[getExistingElevations]]
     */
    getExistingElevation( position: GeoPoint ): number
    {
        const array = [position.longitude, position.latitude, 0];

        this._globe.getExistingElevations( 1, array, 0, 3, array, 2, 3 );

        return array[2];
    }


    /**
     * 現行の標高 (複数) を取得
     *
     * 現在メモリーにある最高精度の標高値を一括で取得する。
     * まだ DEM データが存在しない、または経度, 緯度が範囲外の場所は標高を 0 とする。
     *
     * このメソッドは DEM のリクエストは発生しない。また DEM のキャッシュには影響を与えない。
     *
     * 一般的に画面に表示されていない場所は標高の精度が低い。
     *
     * @param  num_points  入出力データ数
     * @param  src_array   入力配列 (経度, 緯度, ...)
     * @param  src_offset  入力データの先頭インデックス
     * @param  src_stride  入力データのストライド
     * @param  dst_array   出力配列 (標高, ...)
     * @param  dst_offset  出力データの先頭インデックス
     * @param  dst_stride  出力データのストライド
     * @return             dst_array
     *
     * @see [[getExistingElevation]]
     */
    getExistingElevations( num_points: number, src_array: Float64Array|number[], src_offset: number, src_stride: number, dst_array: Float64Array|number[], dst_offset: number, dst_stride: number ): number[]
    {
        // @ts-ignore
        return this._globe.getExistingElevations( num_points, src_array, src_offset, src_stride, dst_array, dst_offset, dst_stride );
    }


    /**
     * レイとの交点を取得
     *
     * ray と最も近いオブジェクトとの交点の情報を取得する。ただし交差が存在しない場合は
     *    null を返す。
     *
     * options.extra_info が false のとき、交差があればその交点の位置 (GOCS) を返す。
     *
     * options.extra_info が true のとき、交差があれば次の形式のオブジェクトを返す。
     *
     * @param ray    レイ (GOCS)
     * @param options  オプション
     *
     * @return 交点情報または null
     */
    getRayIntersection( ray: Ray, opts: Viewer.RayIntersectionOption = {} ): Vector3 | Viewer.RayIntersectionInfo | null
    {
        const limit      = (opts.limit      !== undefined) ? opts.limit      : Number.MAX_VALUE;
        const extra_info = (opts.extra_info !== undefined) ? opts.extra_info : false;

        let category;
        let distance = limit;

        // B3D
        const b3d_info = this._b3d_collection.getRayIntersection( ray, distance );

        if ( b3d_info ) {
            category = Viewer.Category.B3D_SCENE;
            // @ts-ignore
            distance = b3d_info.distance;
        }

        // 地表
        if ( this._ground_visibility && (this._globe.status === Globe.Status.READY) ) {
            const globe_dist = this._globe.findRayDistance( ray, distance );
 
            if ( globe_dist !== distance ) {
                // 地表と交差した
                category = Viewer.Category.GROUND;
                distance = globe_dist;
            }
        }

        // 交差の有無を確認
        if ( category === undefined ) {
            // 交差なし
            return null;
        }

        // 位置 P = Q + distance V
        const p = GeoMath.createVector3();
        const q = ray.position;
        const v = ray.direction;

        for ( let i = 0; i < 3; ++i ) {
            p[i] = q[i] + distance * v[i];
        }

        // 結果を返す
        if ( extra_info ) {
            // 位置以外の情報も返す
            const ex_info: Viewer.RayIntersectionInfo = {
                category,
                distance,
                position: p
            };

            // B3D 専用の情報を追加
            if ( category === Viewer.Category.B3D_SCENE ) {
                // @ts-ignore
                ex_info.b3d_scene  = b3d_info!.b3d_scene;
                // @ts-ignore
                ex_info.feature_id = b3d_info!.feature_id;
            }

            return ex_info;
        }
        else {
            // 位置のみを返す
            return p;
        }
    }


    /**
     * Canvas画面のキャプチャ
     *
     * @param  {object}  options  オプション
     * @return {blob}             データ
     */
    async capture( options: Viewer.CaptureOption = { type: 'jpeg' } ): Promise<Blob>
    {
       if ( !this._canvas_element ) {
         throw new Error('Canvas is null.');
       }

       const mime_type = options.type === 'png' ? 'image/png' : 'image/jpeg';

       let context: CanvasRenderingContext2D;
       if ( options.sync ) {
         let counter = 0; // フレーム安定カウンタ
         context = await new Promise<CanvasRenderingContext2D>( resolve => {
             this._postProcesses.push( () => {
                 if ( this.load_status.total_loading > 0 ) {
                   counter = 0;
                   return true;
                 }
                 if ( counter++ < 4 ) {
                   return true;
                 }
                 OFFSCREEN_CONTEXT = Dom.copyTo2dCanvasContext( this._canvas_element, OFFSCREEN_CONTEXT );
                 resolve( OFFSCREEN_CONTEXT );
                 return false;
             });
         });
       }
       else {
         context = await new Promise<CanvasRenderingContext2D>( resolve => {
             this._postProcesses.push( () => {
                 OFFSCREEN_CONTEXT = Dom.copyTo2dCanvasContext( this._canvas_element, OFFSCREEN_CONTEXT );
                 resolve( OFFSCREEN_CONTEXT );
                 return false;
             });
         });
       }

       await this._post_render_for_capture( context, options );

       const blob = await new Promise<Blob | null>( resolve => {
               context.canvas.toBlob( resolve, mime_type );
       });

       if ( !blob ) {
         throw new Error("failed to capture image");
       }

       return blob;
    }


   /**
    * キャプチャ画像にロゴやアノテーションを描画する
    * @param context 書き込む2Dキャンバスコンテキスト
    * @param options オプション
    */
    private async _post_render_for_capture( context: CanvasRenderingContext2D, options: Viewer.CaptureOption ): Promise<void>
    {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const h_margin = 20;
        const v_margin = 16;
        let text_width = 0;
        let text_height = 0;

        if ( options.attribution_text ) {
            context.font = '12px Noto Sans JP,sans-serif';
            context.textBaseline = 'bottom';
            context.textAlign = 'left';

            const metrics = context.measureText( options.attribution_text );
            text_width = metrics.width;
            text_height = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;

            // fill bg-rect
            context.fillStyle = 'rgba(255,255,255,0.5)';
            context.fillRect(
                width  - text_width  - h_margin,
                height - text_height - v_margin,
                text_width  + h_margin,
                text_height + v_margin
            );

            // text
            context.fillStyle = 'rgba(0,0,0,1)';
            context.fillText(
                options.attribution_text,
                width - text_width - h_margin/2,
                height - v_margin/2
            );
        }

        {
            const img = await this.logo_controller.getLogoImage({
                    mini: width - text_width - h_margin < 180
            });
            context.drawImage( img, 6, height - img.height - 4, img.width, img.height );
        }
    }


    /**
     * 次のフレーム更新を要求する。
     */
    private _requestNextFrame()
    {
        this._frame_req_id = Util.maprayRequestAnimationFrame( () => this._updateFrame() );
    }


    /**
     * フレーム更新のときに呼び出される。
     * @see [[RenderStage]]
     */
    private _updateFrame()
    {
        var delta_time = this._updateTime();
        this._requestNextFrame();

        this._updateCanvasSize();

        this._render_callback.onUpdateFrameInner( delta_time );

        if ( this._debug_stats ) {
            this._debug_stats.clearStats();
        }

        var stage = new RenderStage.SceneRenderStage( this );
        stage.render();

        this._postProcess();

        this._updateLoadStatus();

        this._finishDebugStats();
    }


    /**
     * 読み込み状況を集計
     */
    private _updateLoadStatus() {
        const load_status = this._load_status;

        load_status.dem_loading = this._globe.getNumDemWaitingRequests();
        load_status.img_loading = this._tile_texture_cache.getNumWaitingRequests();

        load_status.b3d_loading = 0;
        const it = this._b3d_collection.getIterator();
        // @ts-ignore
        while ( it.value ) {
            // @ts-ignore
            load_status.b3d_loading += Math.max( 0, it.value._num_tile_requesteds );
            // @ts-ignore
            it.next();
        }

        // @ts-ignore
        const s = PointCloud.getStatistics() || {};
        load_status.pc_loading = s.statistics_obj?.loading_boxes || 0;

        load_status.total_loading = (
            load_status.dem_loading +
            load_status.img_loading +
            load_status.b3d_loading +
            load_status.pc_loading
        );
    }

    /**
     * 現在のビューにおいて指定されたスクリーン位置の情報を取得します
     * @param screen_position スクリーン位置（キャンバス左上を原点としたピクセル座標）
     * @return ピック結果
     */
    pick( screen_position: Vector2 ): Viewer.PickResult {
        const stage = new RenderStage.PickRenderStage( this, screen_position );
        stage.render();
        return stage.pick_result;
    }


    /**
     * 時間の更新
     * @return 前フレームからの経過時間 (秒)
     */
    private _updateTime(): number
    {
        // @ts-ignore
        var   now_time = Util.maprayNow();
        var delta_time = (this._previous_time !== undefined) ? (now_time - this._previous_time) / 1000 : 0;
        this._previous_time = now_time;

        return delta_time;
    }


    /**
     * Canvas サイズを更新
     */
    private _updateCanvasSize()
    {
        var canvas = this._canvas_element;

        // 要素のサイズとキャンバスのサイズを一致させる
        if ( canvas.width != canvas.clientWidth ) {
            canvas.width = canvas.clientWidth;
        }
        if ( canvas.height != canvas.clientHeight ) {
            canvas.height = canvas.clientHeight;
        }
    }


    /**
     * ポストプロセスを実行
     */
    private _postProcess()
    {
        if ( this._postProcesses.length === 0 ) {
            return;
        }
        const nextProcesses: Viewer.PostProcess[] = [];
        this._postProcesses.forEach( item => {
                if ( item() ) {
                    nextProcesses.push( item );
                }
        });
        this._postProcesses = nextProcesses;
    }


    /**
     * デバッグ統計の最終処理
     */
    private _finishDebugStats()
    {
        var stats = this._debug_stats;
        if ( !stats ) {
            // 統計オブジェクトは指定されていない
            return;
        }

        const load_status = this._load_status;

        // 統計値の取得
        stats.num_wait_reqs_dem = load_status.dem_loading;
        stats.num_wait_reqs_img = load_status.img_loading;

        // 統計の更新を通知
        stats.onUpdate();
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     */
    private _unbindDescendantAnimations()
    {
        this._scene.animation.unbindAllRecursively();
    }
}



// hidden properties
let OFFSCREEN_CONTEXT: CanvasRenderingContext2D | undefined = undefined;



namespace Viewer {



export interface Option {
     /** DEMプロバイダ */
    dem_provider?: DemProvider<any>;

    /** 実験的な機能です。 */
    north_pole?: Viewer.PoleOption;

    /** 実験的な機能です。 */
    south_pole?: Viewer.PoleOption;

    /** 画像プロバイダ */
    image_provider?: ImageProvider;

    /** 地図レイヤー情報の配列 */
    layers?: (Layer.Option | ImageProvider)[];

    /** 地表の可視性 */
    ground_visibility?: boolean;

    /** エンティティの可視性 */
    entity_visibility?: boolean;

    /** B3D シーンの可視性 */
    b3d_scene_visibility?: boolean;

    /** レンダリングコールバック */
    render_callback?: RenderCallback;

    /** レンダリングモード */
    render_mode?: RenderMode;

    /** デバッグ統計オブジェクト */
    debug_stats?: DebugStats;

    /** ロゴ表示制御オブジェクト */
    logo_controller?: LogoController;

    /** 著作権表示制御オブジェクト */
    attribution_controller?: AttributionController;

    atmosphere?: Atmosphere;

    sun_visualizer?: SunVisualizer;

    moon_visualizer?: MoonVisualizer;

    cloud_visualizer?: CloudVisualizer;
}



export interface RayIntersectionOption {
    /** 制限距離 (ray.direction の長さが単位) */
    limit?: number;

    /** 交点位置以外の情報も返すとき true */
    extra_info?: boolean;
}



export interface RayIntersectionInfo {
    /** 交差したオブジェクトの種類 */
    category:   Viewer.Category,

    /** 交点した位置 (GOCS) */
    position:   Vector3,

    /** 交点までの距離 (ray.direction の長さが単位) */
    distance:   number,

    /**
     * 交差したオブジェクトのインスタンス
     * (種類が Viewer.Category.B3D_SCENE のとき、追加されるプロパティ)
     */
    b3d_scene?:  B3dScene,

    /** feature ID (uint32 は 0 から 2^32 - 1 の整数値)
     * (種類が Viewer.Category.B3D_SCENE のとき、追加されるプロパティ)
     */
    feature_id?: [number, number],
}



/**
 * 読み込み状況を格納する型
 */
export interface LoadStatus {
    dem_loading: number;
    img_loading: number;
    b3d_loading: number;
    pc_loading: number;
    total_loading: number;
}



export interface PoleOption {
    color: Vector3;
}


export interface CaptureOption {
    type: "jpeg" | "png",
    sync?: boolean,
    attribution_text?: string,
}

/**
 * レンダリング直後に実行する処理を表現する型です。
 * 戻り値により、処理を完了するか次のフレームでも実行するかを制御します。
 * @return 処理を引き続き実行する場合 `true` を返却する
 * @internal
 */
export type PostProcess = () => boolean;



/**
 * ピック結果
 * 関数型 {@link mapray.Viewer.pick} の戻り値のオブジェクト構造である。
 * @property point ピックした3次元位置。ピックした画面上位置と、地形やエンティティと交差した位置です。空をピックした場合は `undefined` になります。
 * @property entity ピックしたエンティティ。ピック位置にエンティティがない場合は `undefined` になります。
 */
export interface PickResult {
    point?: Vector3,
    entity?: Entity,
}



/**
 * 表示対象の列挙型
 *
 * {@link mapray.Viewer.setVisibility} と {@link mapray.Viewer.getVisibility} メソッドの target 引数に指定する値の型である。
 */
export enum Category {

    /**
     * 地表 (レイヤーも含む)
     */
    GROUND,


    /**
     * エンティティ
     */
    ENTITY,



    /**
     * B3D シーン
     */
    B3D_SCENE,

};


/**
 * レンダリングモードの列挙型
 *
 * {@link mapray.Viewer} の構築子の options.render_mode パラメータ、または {@link mapray.Viewer.render_mode} プロパティに指定する値の型である。
 */
export enum RenderMode {

    /**
     * ポリゴン面 (既定値)
     */
    SURFACE,


    /**
     * ワイヤーフレーム
     */
    WIREFRAME,

}


/** マウス・Attribution開発 */
export const ContainerPosition = ContainerController.ContainerPosition;

/** ロゴ・著作権表示用コンテナ名称 */
export const _positions = ["control-top-left", "control-top-right", "control-bottom-left", "control-bottom-right"];


} // namespace Viewer



export default Viewer;
