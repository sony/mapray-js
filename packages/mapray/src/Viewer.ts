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
import ImageLayer from "./ImageLayer";
import ContourLayer from "./ContourLayer";
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
import B3dCollection from "./B3dCollection";
import B3dScene from "./B3dScene";
import { StyleManager } from "./vectile/style_manager";
import { registerLayerTypes } from "./vectile/style_layers/_register";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import BindingBlock from "./animation/BindingBlock";
import Util from "./util/Util";
import Sun from "./Sun";
import Atmosphere from "./Atmosphere";
import SunVisualizer from "./SunVisualizer";
import Moon from "./Moon";
import MoonVisualizer from "./MoonVisualizer";
import CloudVisualizer from "./CloudVisualizer";
import StarVisualizer from "./StarVisualizer";
import SurfaceMaterial from "./SurfaceMaterial";

// マウス・Attribution開発
import LogoController from "./LogoController";
import AttributionController from "./AttributionController";
import ContainerController from "./ContainerController";
import Capture from "./Capture";


/**
 * すべての `StyleLayer` の型を登録する。
 */
registerLayerTypes();


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

    private _dem_provider: DemProvider;

    private _image_provider: ImageProvider;

    /**
     * 北側と南側の極地に関する情報
     */
    private _pole_info: Viewer.PoleInfo;

    private _layers: LayerCollection;

    private _globe: Globe;

    private _tile_texture_cache: TileTextureCache;

    private _b3d_collection: B3dCollection;

    private _vectile_manager: StyleManager | null;

    private _scene: Scene;

    private _ground_visibility: boolean;

    private _entity_visibility: boolean;

    private _point_cloud_visibility: boolean;

    private _b3d_scene_visibility: boolean;

    private _vectile_visibility: boolean;

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

    private _starVisualizer?: StarVisualizer;

    private _ω_limit: number;

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

        this._ω_limit = 6;  // default omega limit

        var canvas = this._createCanvas( container_element );

        const pole_info = new Viewer.PoleInfo( options.pole );

        // インスタンス変数
        this._container_element  = container_element;
        this._canvas_element     = canvas;
        this._glenv              = new GLEnv( canvas );
        this._camera             = new Camera( canvas );
        this._animation          = this._createAnimationBindingBlock();
        this._dem_provider       = this._createDemProvider( options );
        this._image_provider     = this._createImageProvider( options );
        this._pole_info          = pole_info;
        this._tile_texture_cache = new TileTextureCache( this._glenv, this._image_provider, { pole_info } );
        this._layers             = this._createLayerCollection( options );
        this._globe              = new Globe( this._glenv, this._dem_provider, { pole_info } );
        this._b3d_collection     = new B3dCollection( this );
        this._vectile_manager    = null;
        this._scene              = new Scene( this, this._glenv );
        this._ground_visibility  = options.ground_visibility ?? true;
        this._entity_visibility  = options.entity_visibility ?? true;
        this._point_cloud_visibility = options.point_cloud_visibility ?? true;
        this._b3d_scene_visibility = options.b3d_scene_visibility ?? true;
        this._vectile_visibility = options.vectile_visibility ?? true;
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

        const starVisualizer = options.star_visualizer;
        if ( starVisualizer ) {
            this._starVisualizer = starVisualizer;
            starVisualizer.init( this );
        }

        // マウス・Attribution開発
        this._logo_controller = options.logo_controller ?? new LogoController();
        // Viewer にデフォルトで生成される著作権情報コンテナ
        this._attribution_controller = options.attribution_controller ?? new AttributionController({
            is_default: true,
            position: AttributionController.ContainerPosition.BOTTOM_RIGHT
        });

        // ロゴ・著作権表示用コンテナの作成
        this._createLogoAttributionContainer()

        this._logo_controller.init( this );
        this._attribution_controller.init( this );

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

        // ベクトルタイルの後処理
        this._vectile_manager?.__cancel( this._globe );

        // DemProvider のリクエストを取り消す
        this._globe.dispose();

        // ImageProvider のリソースを破棄
        this._tile_texture_cache.dispose();

        // 各レイヤーのリソースを破棄
        this._layers.dispose();

        // すべての B3dScene インスタンスを削除
        this._b3d_collection.clearScenes();

        // 各 SceneLoader の読み込みを取り消す
        this._scene.cancelLoaders();

        // マウス・Attribution開発
        this._logo_controller.destroy();
        this._attribution_controller.destroy();
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
    private _createDemProvider( options: Viewer.Option ): DemProvider
    {
        if ( options.dem_provider )
            return options.dem_provider;
        else
            return new StandardDemProvider( "/dem/", ".bin" );
    }


    /**
     * animation.BindingBlock を生成
     */
    private _createAnimationBindingBlock(): BindingBlock
    {
        let abb = new EasyBindingBlock();
        abb.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
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
    get dem_provider(): DemProvider { return this._dem_provider; }


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
     * ベクトルタイルを管理するオブジェクト
     *
     * @defaultValue `null`
     *
     * @see [[setVectileManager]],
     *      [[Category.VECTILE]]
     */
    get vectile_manager(): StyleManager | null
    { return this._vectile_manager; }


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
     */
     get starVisualizer() { return this._starVisualizer; }


     /**
     * 可視性を設定
     *
     * `target` に属するオブジェクトを表示するかどうかを指定する。
     *
     * 可視性は [[Viewer.constructor]] の `ground_visibility`,
     * `entity_visibility`, `b3d_scene_visibility`,
     * `vectile_visibility`オプションでも指定することができる。
     *
     * @param target      表示対象
     * @param visibility  表示するとき true, 表示しないとき false
     * @see [[getVisibility]]
     */
    setVisibility( target: Viewer.Category, visibility: boolean ): void
    {
        switch ( target ) {
        case Viewer.Category.GROUND:
            this._ground_visibility = visibility;
            break;
        case Viewer.Category.ENTITY:
            this._entity_visibility = visibility;
            break;
        case Viewer.Category.POINT_CLOUD:
            this._point_cloud_visibility = visibility;
            break;
        case Viewer.Category.B3D_SCENE:
            this._b3d_scene_visibility = visibility;
            break;
        case Viewer.Category.VECTILE:
            this._vectile_visibility = visibility;
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
        case Viewer.Category.POINT_CLOUD:
            return this._point_cloud_visibility;
        case Viewer.Category.B3D_SCENE:
            return this._b3d_scene_visibility;
        case Viewer.Category.VECTILE:
            return this._vectile_visibility;
        default:
            throw new Error( "invalid target: " + target );
        }
    }


    /**
     * ベクトルタイルの管理オブジェクトを設定
     *
     * `StyleManager` インスタンス `manager` を設定し、そのベクトルタ
     * イルをレンダリングできるようにする。
     *
     * 以前に別の `StyleManager` インスタンスを設定していた場合は、そ
     * のベクトルタイルはレンダリングされなくなる。
     *
     * `manager` に `null` を指定したとき、ベクトルタイルはレンダリン
     * グされなくなる。
     *
     * 設定された値は [[vectile_manager]] により参照することができる。
     *
     * @see [[vectile_manager]],
     *      [[Category.VECTILE]],
     *      [[StyleManager.viewer]]
     */
    setVectileManager( manager: StyleManager | null ): void
    {
        if ( manager === this._vectile_manager ) {
            // オブジェクトが変更されないときは何もしない
            return;
        }

        if ( manager && manager.viewer !== this ) {
            // manager は this のために生成されたインスタンスではない
            throw new Error( "The given StyleManager instance was not created for this Viewer instance" );
        }

        // 以前のオブジェクトは、処理を停止する
        this._vectile_manager?.__cancel( this._globe );

        // 新しいオブジェクトに切り替える
        this._vectile_manager = manager;
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
     * レイとの交点情報を取得
     *
     * ray と最も近いオブジェクトとの交点の情報を取得する。ただし交差が存在しない場合は
     *    undefined を返す。
     *
     * @param ray    レイ (GOCS)
     * @param options  オプション
     *
     * @return 交点情報または undefined
     */
    pickWithRay( ray: Ray, opts: Viewer.PickOption = {} ):  Viewer.PickResult | undefined
    {
        const limit      = (opts.limit      !== undefined) ? opts.limit      : Number.MAX_VALUE;

        let category;
        let distance = limit;
        let b3d_info;

        if ( (opts.exclude_category?.indexOf( Viewer.Category.B3D_SCENE ) ?? -1) === -1 ) {
            // B3D
            b3d_info = this._b3d_collection.getRayIntersection( ray, distance );

            if ( b3d_info ) {
                category = Viewer.Category.B3D_SCENE;
                // @ts-ignore
                distance = b3d_info.distance;
            }
        }


        // 地表
        // ignore this._ground_visibility at this version.
        // if ( this._ground_visibility && (this._globe.status === Globe.Status.READY) ) {
        if ( (opts.exclude_category?.indexOf( Viewer.Category.GROUND ) ?? -1) === -1 ) {
            if ( this._globe.status === Globe.Status.READY ) {
                const globe_dist = this._globe.findRayDistance( ray, distance );
                if ( globe_dist !== distance  ) {
                    // 地表と交差した
                    category = Viewer.Category.GROUND;
                    distance = globe_dist;
                }
            }
        }


        // 交差の有無を確認
        if ( category === undefined ) {
            // 交差なし
            return undefined;
        }

        // 位置 P = Q + distance V
        const p = GeoMath.createVector3();
        const q = ray.position;
        const v = ray.direction;

        for ( let i = 0; i < 3; ++i ) {
            p[i] = q[i] + distance * v[i];
        }

        // 結果を返す
        const ex_info: Viewer.PickResult = {
            category,
            distance,
            position: p
        };

        // B3D 専用の情報を追加
        if ( category === Viewer.Category.B3D_SCENE ) {
            if ( b3d_info ) {
                // @ts-ignore
                ex_info.b3d_scene  = b3d_info.b3d_scene;
                // @ts-ignore
                ex_info.feature_id = b3d_info.feature_id;
            }
        }

        return ex_info;
    }


    /**
     * _postProcessesに実行する処理を追加
     *
     * @internal
     */
    addPostProcess( process: Viewer.PostProcess )
    {
        this._postProcesses.push( process );
    }


    /**
     * Canvas画面のキャプチャ
     *
     * @param  {object}  options  オプション
     * @return {blob}             キャプチャ画像Blob
     */
    async capture( options: Capture.Option ): Promise<Blob>
    {
        const capture = new Capture( this, options );
        return await capture.shoot();
    }


    /**
     * 画像プロバイダを設定
     *
     * `clear_cache` を指定することで、切り替え時に画像キャッシュをクリアするかを指定することができます。
     * 切り替え時に画像キャッシュをクリアすると瞬間的に画面全体が無地になります。
     * キャッシュをクリアしない場合は、画像を入手するまでは切り替え前の画像が表示されます。
     *
     * @param provider          画像プロバイダ
     * @param clear_cache       切り替え時にキャッシュをクリアするか
     */
    setImageProvider( provider: ImageProvider, clear_cache: boolean = true ): void
    {
        this._image_provider = provider;
        if ( clear_cache ) {
            this._tile_texture_cache.dispose();
        }
        this.tile_texture_cache.setImageProvider( provider );
    }


    /**
     * 北極・南極情報を設定
     *
     * @param pole_option       極地オプション
     */
    setPole( pole_option?: Viewer.PoleOption ): void
    {
        const prev_pole_info = this._pole_info;
        this._pole_info = new Viewer.PoleInfo( pole_option );

        if ( !prev_pole_info.imageEquals( this._pole_info ) ) {
            this.tile_texture_cache.setPole( this._pole_info );
        }

        if ( !prev_pole_info.demEquals( this._pole_info ) ) {
            this._globe.setPole( this._pole_info );
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
        const s = PointCloud.getStatistics();
        load_status.pc_loading = s?.statistics_obj?.loading_boxes ?? 0;

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
     * @param pickOption ピックオプション
     * @return ピック結果
     */
    pick( screen_position: Vector2, pickOption: Viewer.PickOption = {} ): Viewer.PickResult | undefined
    {
        const stage = new RenderStage.PickRenderStage( this, screen_position, pickOption );
        stage.render();
        const pick_result = stage.pick_result;

        if ( pick_result && pick_result.category === Viewer.Category.B3D_SCENE ) {
            const ray = this._camera.getCanvasRay( screen_position );
            const b3d_info = this.pickWithRay( ray, pickOption );
            pick_result.b3d_scene = b3d_info?.b3d_scene;
            pick_result.feature_id = b3d_info?.feature_id;
        }

        return pick_result;
    }


    /**
     * ω limitの設定
     * @param val  0 から 6 の値が設定できる
     */
    setOmagaLimit( val: number )
    {
        this._ω_limit = Math.min( 6, Math.max( 0, Math.floor( val ) ) );
    }


    /**
     * ω limitの取得
     */
    getOmegaLimit(): number
    {
        return this._ω_limit;
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



namespace Viewer {



export interface Option {
     /** DEMプロバイダ */
    dem_provider?: DemProvider;

    /** 画像プロバイダ */
    image_provider?: ImageProvider;

    /** 地図レイヤー情報の配列 */
    layers?: ( ImageLayer.Option | ContourLayer.Option | ImageProvider )[];

    /** 地表の可視性 */
    ground_visibility?: boolean;

    /** 点群の可視性 */
    point_cloud_visibility?: boolean;

    /** エンティティの可視性 */
    entity_visibility?: boolean;

    /** B3D シーンの可視性 */
    b3d_scene_visibility?: boolean;

    /** ベクトルタイルの可視性 */
    vectile_visibility?: boolean;

    /**
     * 極地に関連するオプション
     *
     * オプションを指定すると、北側と南側の極地に関する、地表の表示と交差判定の有効性が有効となり、通常領域以外に北側と南側の極地を表示することができる。
     * 省略時は極地に関する表示と交差判定は無効となる。
     *
     * ただし現在は、[[LayerCollection]] のレイヤー画像、高度モード
     * ([[Entity.altitude_mode]]) が [[AltitudeMode.ABSOLUTE]] 以外の
     * エンティティは、通常領域にしか表示することができない。
     */
    pole?: PoleOption;

    /** レンダリングコールバック */
    render_callback?: RenderCallback;

    /** レンダリングモード */
    render_mode?: RenderMode;

    /** デバッグ統計オブジェクト */
    debug_stats?: DebugStats;

    /** ロゴ表示制御オブジェクト */
    logo_controller?: LogoController;

    /** Mapray デフォルトの著作権表示制御オブジェクト */
    attribution_controller?: AttributionController;

    atmosphere?: Atmosphere;

    sun_visualizer?: SunVisualizer;

    moon_visualizer?: MoonVisualizer;

    cloud_visualizer?: CloudVisualizer;

    star_visualizer?: StarVisualizer;
}


/**
 * 北側と南側の極地に関するオプションの型
 *
 * @see [[Option.pole]], [[Viewer.constructor]], [[PoleInfo]]
 */
export interface PoleOption {

    /**
     * 北側極地の標高
     *
     * @defaultValue 0.0
     */
    north_height?: number;

    /**
     * 南側極地の標高
     *
     * @defaultValue 0.0
     */
    south_height?: number;

    /**
     * 北側極地の表示色
     *
     * @defaultValue `[0.8, 0.8, 0.8]`
     */
    north_color?: Vector3;

    /**
     * 南側極地の表示色
     *
     * @defaultValue `[0.8, 0.8, 0.8]`
     */
    south_color?: Vector3;

}


/**
 * 北側と南側の極地に関する情報
 *
 * 各プロパティの意味は [[PoleOption]] の同名のプロパティの説明を参照
 * のこと。
 *
 * @see [[Viewer.pole_info]], [[PoleOption]]
 */
export class PoleInfo {

    readonly enabled: boolean;
    readonly north_height: number;
    readonly south_height: number;
    readonly north_color: Vector3;
    readonly south_color: Vector3;

    /**
     * @internal
     */
    constructor( options?: PoleOption )
    {
        const default_height = 0.0;
        const default_color: Vector3 = [0.8, 0.8, 0.8];

        if ( options ) {
            this.enabled      = true;
            this.north_height = options.north_height ?? default_height;
            this.south_height = options.south_height ?? default_height;
            this.north_color  = GeoMath.createVector3( options.north_color ?? default_color );
            this.south_color  = GeoMath.createVector3( options.south_color ?? default_color );
        }
        else {
            this.enabled      = false;
            this.north_height = default_height;
            this.south_height = default_height;
            this.north_color  = default_color;
            this.south_color  = default_color;
        }
    }

    /**
     * @internal
     */
    imageEquals( info: PoleInfo ): boolean
    {
        if ( this.enabled !== info.enabled ) {
            return false;
        }

        if ( !this.enabled ) {
            return true;
        }

        return (
            this.north_color[0] === info.north_color[0] &&
            this.north_color[1] === info.north_color[1] &&
            this.north_color[2] === info.north_color[2] &&
            this.south_color[0] === info.south_color[0] &&
            this.south_color[1] === info.south_color[1] &&
            this.south_color[2] === info.south_color[2]
        );
    }

    /**
     * @internal
     */
    demEquals( info: PoleInfo ): boolean
    {
        if ( this.enabled !== info.enabled ) {
            return false;
        }

        if ( !this.enabled ) {
            return true;
        }

        return (
            this.north_height === info.north_height &&
            this.south_height === info.south_height
        );
    }
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



/**
 * レンダリング直後に実行する処理を表現する型です。
 * 戻り値により、処理を完了するか次のフレームでも実行するかを制御します。
 * @return 処理を引き続き実行する場合 `true` を返却する
 * @internal
 */
export type PostProcess = () => boolean;


/**
 * ピックオプション
 * 
 * {@link mapray.Viewer.pick} の引数として設定し、ピックする対象を指定する場合に使用する。
 */
export interface PickOption {
    /** 制限距離 (ray.direction の長さが単位 / pick の時はm) */
    limit?: number;

    /** pick対象外とするCategory pickWithRayでは一部Categoryのみ対象*/
    exclude_category?: Viewer.Category[];
}



/**
 * ピック結果
 *
 * 関数型 {@link mapray.Viewer.pick} の戻り値のオブジェクト構造である。
 */
export interface PickResult {
    /**
     * ピックしたオブジェクトの種類
     */
    category:   Viewer.Category,

    /** ピックした位置 (GOCS) */
    position:   Vector3,

    /** ピックした位置までの距離 (ray.direction の長さが単位 / pick の時はm) */
    distance:   number,

    /**
     * ピックしたエンティティ。ピック位置にエンティティがない場合は `undefined` になります。
     */
    entity?: Entity,

    /**
     * ピックした点群。
     * ピック位置に点群がない場合は `undefined` になります。
     */
    point_cloud?: PointCloud,

    /**
     * ピックしたB3dオブジェクトのインスタンス
     * (種類が Viewer.Category.B3D_SCENE のとき、追加されるプロパティ)
     * ピック位置にB3dがない場合は `undefined` になります。
     */
    b3d_scene?:  B3dScene,

    /** feature ID (uint32 は 0 から 2^32 - 1 の整数値)
     * (種類が Viewer.Category.B3D_SCENE のとき、追加されるプロパティ)
     * @internal
     * @experimental
     */
    feature_id?: [number, number],
}


/**
 * 表示対象の列挙型
 *
 * [[Viewer.setVisibility]] と [[Viewer.getVisibility]] メソッドの
 * target 引数に指定する値の型である。
 *
 * @see [[PickResult.category]]
 */
export const enum Category {

    /**
     * 地表 (レイヤーも含む)
     */
    GROUND = "@@_Viewer.Category.GROUND",


    /**
     * エンティティ
     */
    ENTITY = "@@_Viewer.Category.ENTITY",


    /**
     * 点群
     */
    POINT_CLOUD = "@@_Viewer.Category.POINT_CLOUD",


    /**
     * B3D シーン
     */
    B3D_SCENE = "@@_Viewer.Category.B3D_SCENE",


    /**
     * ベクトルタイル
     *
     * @see [[setVectileManager]],
     *      [[vectile_manager]]
     */
    VECTILE = "@@_Viewer.Category.VECTILE",

};


/**
 * レンダリングモードの列挙型
 *
 * [[Viewer.constructor]] の `options.render_mode` パラメータ、または
 * [[Viewer.render_mode]] プロパティに指定する値の型である。
 */
export const enum RenderMode {

    /**
     * ポリゴン面 (既定値)
     */
    SURFACE = "@@_Viewer.RenderMode.SURFACE",


    /**
     * ワイヤーフレーム
     */
    WIREFRAME = "@@_Viewer.RenderMode.WIREFRAME",

}


/** マウス・Attribution開発 */
export const ContainerPosition = ContainerController.ContainerPosition;

/** ロゴ・著作権表示用コンテナ名称 */
export const _positions = ["control-top-left", "control-top-right", "control-bottom-left", "control-bottom-right"];


} // namespace Viewer


type PoleInfo = Viewer.PoleInfo;

export type { PoleInfo };  // 低レベル層から型だけ取り込む目的
export default Viewer;
