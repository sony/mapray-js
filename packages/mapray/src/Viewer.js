import Camera from "./Camera";
import GLEnv from "./GLEnv";
import RenderStage, { PickStage } from "./RenderStage";
import StandardImageProvider from "./StandardImageProvider";
import StandardDemProvider from "./StandardDemProvider";
import LayerCollection from "./LayerCollection";
import Globe from "./Globe";
import TileTextureCache from "./TileTextureCache";
import NullRenderCallback from "./NullRenderCallback";
import GeoMath from "./GeoMath";
import Scene from "./Scene";
import SceneLoader from "./SceneLoader";
import EasyBindingBlock from "./animation/EasyBindingBlock";

// マウス・Attribution開発
import LogoController from "./LogoController";
import AttributionController from "./AttributionController";
import ContainerController from "./ContainerController";

/**
 * @summary 表示管理
 * @classdesc
 * <p>mapray の表示を管理するクラスである。</p>
 * @memberof mapray
 */
class Viewer {

    /**
     * @param {string|Element}                  container                           コンテナ (ID または要素)
     * @param {object}                          [options]                           生成オプション
     * @param {mapray.DemProvider}              [options.dem_provider]              DEM プロバイダ
     * @param {mapray.ImageProvider}            [options.image_provider]            画像プロバイダ
     * @param {array}                           [options.layers]                    地図レイヤー情報の配列
     * @param {boolean}                         [options.ground_visibility=true]    地表の可視性
     * @param {boolean}                         [options.entity_visibility=true]    エンティティの可視性
     * @param {mapray.RenderCallback}           [options.render_callback]           レンダリングコールバック
     * @param {mapray.Viewer.RenderMode}        [options.render_mode]               レンダリングモード
     * @param {mapray.DebugStats}               [options.debug_stats]               デバッグ統計オブジェクト
     * @param {mapray.LogoController}           [options.logo_controller]           ロゴ表示制御オブジェクト
     * @param {mapray.AttributionController}    [options.attribution_controller]    著作権表示制御オブジェクト
     */
    constructor( container, options )
    {
        var container_element;
        if ( typeof container == "string" ) {
            // コンテナを ID 指定したとき
            container_element = document.getElementById( container );
        }
        else {
            // コンテナを直接要素で指定のとき
            container_element = container;
        }

        var canvas = this._createCanvas( container_element );

        // インスタンス変数
        this._container_element  = container_element;
        this._canvas_element     = canvas;
        this._glenv              = new GLEnv( canvas );
        this._camera             = new Camera( canvas );
        this._animation          = this._createAnimationBindingBlock();
        this._dem_provider       = this._createDemProvider( options );
        this._image_provider     = this._createImageProvider( options );
        this._layers             = this._createLayerCollection( options );
        this._globe              = new Globe( this._glenv, this._dem_provider );
        this._tile_texture_cache = new TileTextureCache( this._glenv, this._image_provider );
        this._scene              = new Scene( this, this._glenv );
        this._ground_visibility  = Viewer._getBoolOption( options, "ground_visibility", true );
        this._entity_visibility  = Viewer._getBoolOption( options, "entity_visibility", true );
        this._render_mode        = (options && options.render_mode) || RenderMode.SURFACE;
        this._debug_stats        = (options && options.debug_stats) || null;
        this._render_callback    = this._createRenderCallback( options );
        this._frame_req_id       = 0;
        this._previous_time      = undefined;
        this._is_destroyed       = false;

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
     * @summary インスタンスを破棄
     *
     * @desc
     * <p>次の順番で処理を行い、インスタンスを破棄する。</p>
     *
     * <ol>
     *   <li>アニメーションフレームを止める。(this.{@link mapray.Viewer#render_callback render_callback} の {@link mapray.RenderCallback#onUpdateFrame onUpdateFrame()} が呼び出されなくなる)</li>
     *   <li>this.{@link mapray.Viewer#render_callback render_callback} の {@link mapray.RenderCallback#onStop onStop()} を呼び出す。({@link mapray.RenderCallback#onStart onStart()} がすでに呼び出されている場合)</li>
     *   <li>{@link mapray.RenderCallback} インスタンスを this から切り離す。({@link mapray.RenderCallback#viewer} プロパティは null を返すようになる)</li>
     *   <li>this.{@link mapray.Viewer#canvas_element canvas_element} を this.{@link mapray.Viewer#container_element container_element} から取り外す。(キャンバスは表示されなくなる)</li>
     *   <li>データプロバイダのリクエスト、シーンデータのロードの取り消しを試みる。</li>
     * </ol>
     *
     * <p>このメソッドを呼び出した後は this に直接的または間接的にアクセスすることはできない。ただし {@link mapray.Viewer#destroy destroy()} の呼び出しは除く。</p>
     *
     * <p>このメソッドは {@link mapray.RenderCallback} のメソッドから呼び出してはならない。</p>
     */
    destroy()
    {
        if ( this._is_destroyed ) {
            // すでに this は破棄済み
            return;
        }

        // フレームを止める
        if ( this._frame_req_id != 0 ) {
            window.maprayCancelAnimationFrame( this._frame_req_id );
            this._frame_req_id = 0;
        }

        // RenderCallback の取り外し
        this._render_callback.detach();
        this._render_callback = this._createRenderCallback();  // NullRenderCallback

        // キャンバスをコンテナから外す
        this._container_element.removeChild( this._canvas_element );

        // DemProvider のリクエストを取り消す
        this._globe.cancel();

        // ImageProvider のリクエストを取り消す
        this._tile_texture_cache.cancel();

        // 各レイヤーの のリクエストを取り消す
        this._layers.cancel();

        // 各 SceneLoader の読み込みを取り消す
        this._scene.cancelLoaders();

        // マウス・Attribution開発
        this._logo_controller._destroy();
        this._attribution_controller._destroy();
        this._attribution_controller = null;

        // ロゴ・著作権用コンテナの削除
        this._deleteLogoAttributionContainer();

        // 破棄確定
        this._is_destroyed = true;
    }


    /**
     * キャンバス要素を生成
     * @param  {Element}           container
     * @return {HTMLCanvasElement}
     * @private
     */
    _createCanvas( container )
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
     * @private
     */
    _createDemProvider( options )
    {
        if ( options && options.dem_provider )
            return options.dem_provider;
        else
            return new StandardDemProvider( "/dem/", ".bin" );
    }


    /**
     * animation.BindingBlock を生成
     * @private
     */
    _createAnimationBindingBlock()
    {
        let abb = new EasyBindingBlock();
        abb.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        return abb;
    }


    /**
     * ImageProvider を生成
     * @private
     */
    _createImageProvider( options )
    {
        if ( options && options.image_provider )
            return options.image_provider;
        else
            return new StandardImageProvider( "http://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 0, 18 );
    }


    /**
     * LayerCollection を生成
     * @private
     */
    _createLayerCollection( options )
    {
        var layers = (options && options.layers) ? options.layers : {};
        return new LayerCollection( this._glenv, layers );
    }


    /**
     * RenderCallback を生成
     * @private
     */
    _createRenderCallback( options )
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
     * @summary ロゴ・著作権表示用コンテナの作成
     *
     * @memberof Viewer
     */
    _createLogoAttributionContainer()
    {
        for ( var position of Viewer._positions )
        {
            var container = document.createElement( "div" );
            container.className = position
            this._container_element.appendChild( container );
        }
    }

    /**
     * @summary ロゴ・著作権表示用コンテナの削除
     *
     * @memberof Viewer
     */
    _deleteLogoAttributionContainer()
    {
        for ( var position of Viewer._positions )
        {
            var container = document.getElementById( position );

            if ( container ) { this._container_element.removeChild( position ); }
        }
    }

    /**
     * ブール値のオプションを取得
     * @private
     */
    static
    _getBoolOption( options, name, defaultValue )
    {
        return (options && (options[name] !== undefined)) ? options[name] : defaultValue;
    }


    /**
     * @summary コンテナ要素 (キャンバス要素を保有する)
     * @type {Element}
     * @readonly
     */
    get container_element() { return this._container_element; }


    /**
     * @summary キャンバス要素
     * @type {Element}
     * @readonly
     */
    get canvas_element() { return this._canvas_element; }


    /**
     * @summary アニメーションパラメータ設定
     * @type {mapray.animation.BindingBlock}
     * @readonly
     */
    get animation() { return this._animation; }


    /**
     * DEM データプロバイダ
     * @type {mapray.DemProvider}
     * @readonly
     */
    get dem_provider() { return this._dem_provider; }


    /**
     * @summary 画像プロバイダ
     * @type {mapray.ImageProvider}
     * @readonly
     */
    get image_provider() { return this._image_provider; }


    /**
     * @summary 地図レイヤー管理
     * @type {mapray.LayerCollection}
     * @readonly
     */
    get layers() { return this._layers; }


    /**
     * @summary レンダリングコールバック
     * @type {mapray.RenderCallback}
     * @readonly
     */
    get render_callback() { return this._render_callback; }


    /**
     * @summary レンダリングモード
     * @type {mapray.RenderMode}
     * @readonly
     */
    get render_mode() { return this._render_mode; }


    /**
     * @summary レンダリングモードを設定
     * @type {mapray.RenderMode}
     */
    set render_mode( val ) { this._render_mode = val; }


    /**
     * @summary デバッグ統計オブジェクト
     * @type {?mapray.DebugStats}
     * @readonly
     */
    get debug_stats() { return this._debug_stats; }


    /**
     * @summary カメラ
     * @type {mapray.Camera}
     * @readonly
     */
    get camera() { return this._camera; }


    /**
     * @summary モデルシーン
     * @type {mapray.Scene}
     * @readonly
     */
    get scene() { return this._scene; }


    /**
     * 内部的に実装で使用される WebGL レンダリングコンテキスト情報
     * @type {mapray.GLEnv}
     * @readonly
     * @package
     */
    get glenv() { return this._glenv; }


    /**
     * @type {mapray.Globe}
     * @readonly
     * @package
     */
    get globe() { return this._globe; }


    /**
     * 内部的に実装で使用される地図画像タイル管理
     * @type {mapray.TileTextureCache}
     * @readonly
     * @package
     */
    get tile_texture_cache() { return this._tile_texture_cache; }

    /**
     *
     * @type {mapray.LogoController}
     * @readonly
     * @memberof Viewer
     */
    get logo_controller() { return this._logo_controller; }

    /**
     *
     * @type {mapray.AttributionController}
     * @readonly
     * @memberof Viewer
     */
    get attribution_controller() { return this._attribution_controller; }    

    /**
     * @summary 可視性を設定
     * @desc
     * <p>target に属するオブジェクトを表示するかどうかを指定する。</p>
     * <p>可視性は Viewer の構築子の ground_visibility と entity_visibility オプションでも指定することができる。</p>
     *
     * @param {mapray.Viewer.Category} target      表示対象
     * @param {boolean}                visibility  表示するとき true, 表示しないとき false
     *
     * @see {@link mapray.Viewer#getVisibility}
     */
    setVisibility( target, visibility )
    {
        switch ( target ) {
        case Category.GROUND:
            this._ground_visibility = visibility;
            break;
        case Category.ENTITY:
            this._entity_visibility = visibility;
            break;
        default:
            throw new Error( "invalid target: " + target );
        }
    }


    /**
     * @summary 可視性を取得
     * @desc
     * <p>target に属するオブジェクトを表示するかどうかを取得する。</p>
     *
     * @param  {mapray.Viewer.Category} target  表示対象
     * @return {boolean}  表示するとき true, 表示しないとき false
     *
     * @see {@link mapray.Viewer#setVisibility}
     */
    getVisibility( target, visibility )
    {
        switch ( target ) {
        case Category.GROUND:
            return this._ground_visibility;
        case Category.ENTITY:
            return this._entity_visibility;
        default:
            throw new Error( "invalid target: " + target );
        }
    }


    /**
     * @summary 指定位置の標高を取得
     * @desc
     * <p>緯度 lat, 経度 lon が示す場所の標高を返す。</p>
     * <p>現在メモリに存在する DEM データの中で最も正確度が高いデータから標高を計算する。</p>
     * <p>さらに正確度が高い DEM データがサーバーに存在すれば、それを非同期に読み込む。そのため時間を置いてこのメソッドを呼び出すと、さらに正確な値が取得できることがある。</p>
     * @param  {number} lat  緯度 (Degrees)
     * @param  {number} lon  経度 (Degrees)
     * @return {number}      標高 (Meters)
     */
    getElevation( lat, lon )
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
     * @summary 現行の標高を取得
     *
     * @desc
     * <p>現在メモリーにある最高精度の標高値を取得する。</p>
     * <p>まだ DEM データが存在しない、または経度, 緯度が範囲外の場所は標高を 0 とする。</p>
     *
     * <p>このメソッドは DEM のリクエストは発生しない。また DEM のキャッシュには影響を与えない。</p>
     *
     * <p>一般的に画面に表示されていない場所は標高の精度が低い。</p>
     *
     * @param  {mapray.GeoPoint} position  位置 (高度は無視される)
     * @return {number}                    標高
     *
     * @see mapray.Viewer#getExistingElevations
     */
    getExistingElevation( position )
    {
        const array = [position.longitude, position.latitude, 0];

        this._globe.getExistingElevations( 1, array, 0, 3, array, 2, 3 );

        return array[2];
    }


    /**
     * @summary 現行の標高 (複数) を取得
     *
     * @desc
     * <p>現在メモリーにある最高精度の標高値を一括で取得する。</p>
     * <p>まだ DEM データが存在しない、または経度, 緯度が範囲外の場所は標高を 0 とする。</p>
     *
     * <p>このメソッドは DEM のリクエストは発生しない。また DEM のキャッシュには影響を与えない。</p>
     *
     * <p>一般的に画面に表示されていない場所は標高の精度が低い。</p>
     *
     * @param  {number}   num_points  入出力データ数
     * @param  {number[]} src_array   入力配列 (経度, 緯度, ...)
     * @param  {number}   src_offset  入力データの先頭インデックス
     * @param  {number}   src_stride  入力データのストライド
     * @param  {number[]} dst_array   出力配列 (標高, ...)
     * @param  {number}   dst_offset  出力データの先頭インデックス
     * @param  {number}   dst_stride  出力データのストライド
     * @return {number[]}             dst_array
     *
     * @see mapray.Viewer#getExistingElevation
     */
    getExistingElevations( num_points, src_array, src_offset, src_stride, dst_array, dst_offset, dst_stride )
    {
        return this._globe.getExistingElevations( num_points, src_array, src_offset, src_stride, dst_array, dst_offset, dst_stride );
    }


    /**
     * @summary レイと地表の交点を取得
     * @desc
     * <p>ray と地表の最も近い交点を取得する。ただし交点が存在しない場合は null を返す。</p>
     * @param  {mapray.Ray}      ray  レイ (GOCS)
     * @return {?mapray.Vector3}      交点または null
     */
    getRayIntersection( ray )
    {
        var globe = this._globe;

        if ( globe.status !== Globe.Status.READY ) {
            // Globe の準備ができていない
            return null;
        }

        var distance = globe.root_flake.findRayDistance( ray, Number.MAX_VALUE );
        if ( distance === Number.MAX_VALUE ) {
            // 交点が見つからなかった
            return null;
        }

        // P = Q + distance V
        var p = GeoMath.createVector3();
        var q = ray.position;
        var v = ray.direction;

        p[0] = q[0] + distance * v[0];
        p[1] = q[1] + distance * v[1];
        p[2] = q[2] + distance * v[2];

        return p;
    }


    /**
     * 次のフレーム更新を要求する。
     * @private
     */
    _requestNextFrame()
    {
        this._frame_req_id = window.maprayRequestAnimationFrame( () => this._updateFrame() );
    }


    /**
     * フレーム更新のときに呼び出される。
     * @private
     * @see mapray.RenderStage
     */
    _updateFrame()
    {
        var delta_time = this._updateTime();
        this._requestNextFrame();

        this._updateCanvasSize();

        this._render_callback.onUpdateFrameInner( delta_time );

        if ( this._debug_stats !== null ) {
            this._debug_stats.clearStats();
        }

        var stage = new RenderStage( this );
        stage.render();

        this._finishDebugStats();
    }


    /**
     * 現在のビューにおいて指定されたスクリーン位置の情報を取得します
     * @param {Vector2} screen_position
     * @return {object}
     */
    pick(screen_position) {
        const stage = new PickStage( this, screen_position );
        stage.render();
        return stage.pick_result;
    }


    /**
     * @summary 時間の更新
     * @return {number}  前フレームからの経過時間 (秒)
     * @private
     */
    _updateTime()
    {
        var   now_time = window.maprayNow();
        var delta_time = (this._previous_time !== undefined) ? (now_time - this._previous_time) / 1000 : 0;
        this._previous_time = now_time;

        return delta_time;
    }


    /**
     * @summary Canvas サイズを更新
     * @private
     */
    _updateCanvasSize()
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
     * @summary デバッグ統計の最終処理
     * @private
     */
    _finishDebugStats()
    {
        var stats = this._debug_stats;
        if ( stats === null ) {
            // 統計オブジェクトは指定されていない
            return;
        }

        // 統計値の取得
        stats.num_wait_reqs_dem = this._globe.getNumDemWaitingRequests();
        stats.num_wait_reqs_img = this._tile_texture_cache.getNumWaitingRequests();

        // 統計の更新を通知
        stats.onUpdate();
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     *
     * @private
     */
    _unbindDescendantAnimations()
    {
        this._scene.animation.unbindAllRecursively();
    }

}


/**
 * @summary 表示対象の列挙型
 * @desc
 * <p>{@link mapray.Viewer#setVisibility} と {@link mapray.Viewer#getVisibility} メソッドの target 引数に指定する値の型である。</p>
 * @enum {object}
 * @memberof mapray.Viewer
 * @constant
 */
var Category = {

    /**
     * 地表 (レイヤーも含む)
     */
    GROUND: { id: "GROUND" },


    /**
     * エンティティ
     */
    ENTITY: { id: "ENTITY" }

};


/**
 * @summary レンダリングモードの列挙型
 * @desc
 * {@link mapray.Viewer} の構築子の options.render_mode パラメータ、または {@link mapray.Viewer#render_mode} プロパティに指定する値の型である。
 * @enum {object}
 * @memberof mapray.Viewer
 * @constant
 */
var RenderMode = {

    /**
     * ポリゴン面 (既定値)
     */
    SURFACE: { id: "SURFACE" },


    /**
     * ワイヤーフレーム
     */
    WIREFRAME: { id: "WIREFRAME" }

};

// クラス定数の定義
{
    Viewer.Category   = Category;
    Viewer.RenderMode = RenderMode;

    // マウス・Attribution開発
    Viewer.ContainerPosition = ContainerController.ContainerPosition;

    // ロゴ・著作権表示用コンテナ名称
    Viewer._positions = ["control-top-left", "control-top-right", "control-bottom-left", "control-bottom-right"];
}


export default Viewer;
