import GeoMath from "./GeoMath";
import Globe from "./Globe";
import FlakeCollector from "./FlakeCollector";
import SurfaceMaterial from "./SurfaceMaterial";
import WireframeMaterial from "./WireframeMaterial";
import Viewer from "./Viewer";


/**
 * @summary 1フレーム分のレンダリングを実行
 * @desc
 * {@link mapray.Viewer} インスタンスはフレーム毎にこのクラスのインスタンスを生成してレンダリングを実行する。
 *
 * @memberof mapray
 * @private
 */
class RenderStage {

    /**
     * @param viewer {mapray.Viewer}  所有者である Viewer
     */
    constructor( viewer )
    {
        this._viewer = viewer;
        this._glenv  = viewer.glenv;

        var canvas = viewer.canvas_element;
        this._width  = canvas.width;
        this._height = canvas.height;

        if ( this._width === 0 || this._height === 0 ) {
            // 画素がないのでレンダリングを省略
            this._rendering_cancel = true;
            return;
        }

        var     camera = viewer.camera;
        var renderInfo = camera.createRenderInfo();

        // _view_to_gocs, _gocs_to_view, _view_to_clip, _gocs_to_clip
        this._setupBasicMatrices( renderInfo, camera );

        // カメラ情報
        this._volume_planes = renderInfo.volume_planes;  // 視体積の平面ベクトル配列 (視点空間)
        this._pixel_step    = renderInfo.pixel_step;     // 画素の変化量 (視点空間)

        // モデルシーン
        this._scene = viewer.scene;

        // リソースキャッシュ
        this._globe              = viewer.globe;
        this._tile_texture_cache = viewer.tile_texture_cache;

        // フレーム間のオブジェクトキャッシュ
        if ( !viewer._render_cache ) {
            viewer._render_cache = {
                // 地表マテリアル
                surface_material:   new SurfaceMaterial( viewer ),
                wireframe_material: new WireframeMaterial( viewer )
            };
        }

        // 地表マテリアルの選択
        this._flake_material = (viewer.render_mode === Viewer.RenderMode.WIREFRAME) ? viewer._render_cache.wireframe_material : viewer._render_cache.surface_material;

        // デバッグ統計
        this._debug_stats = viewer.debug_stats;
    }


    /**
     * @private
     */
    _setupBasicMatrices( renderInfo, camera )
    {
        this._view_to_gocs = camera.view_to_gocs;

        this._gocs_to_view = GeoMath.createMatrix();
        GeoMath.inverse_A( this._view_to_gocs, this._gocs_to_view );

        this._view_to_clip = renderInfo.view_to_clip;

        this._gocs_to_clip = GeoMath.createMatrix();
        GeoMath.mul_PzA( this._view_to_clip, this._gocs_to_view, this._gocs_to_clip );
    }


    /**
     * @summary 1フレームのレンダリングを実行
     */
    render()
    {
        if ( this._rendering_cancel )
            return;

        var gl = this._glenv.context;

        // Canvas 全体にビューポートを設定
        gl.viewport( 0, 0, this._width, this._height );

        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        gl.enable( gl.CULL_FACE );
        gl.enable( gl.DEPTH_TEST );
        gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE );  // FB のα値は変えない
        gl.depthFunc( gl.LEQUAL );

        // 地表断片データの収集
        if ( this._globe.status !== Globe.Status.READY ) {
            // まだ基底タイルデータが読み込まれていないので地表をレンダリングできない
            return;
        }

        var flake_list;
        if ( this._viewer.getVisibility( Viewer.Category.GROUND ) ) {
            var  collector = new FlakeCollector( this );
            flake_list = collector.traverse();
        }
        else {
            // 地表が非表示のときは地表断片が 0 個として処理
            flake_list = [];
        }

        // すべての地表断片を描画
        gl.enable( gl.BLEND );
        gl.depthMask( true );

        for ( var i = 0; i < flake_list.length; ++i ) {
            this._drawFlake( flake_list[i] );
        }

        // モデルシーン描画
        if ( this._viewer.getVisibility( Viewer.Category.ENTITY ) ) {
            this._scene.draw( this );
        }

        // 描画地表断片数を記録
        var stats = this._debug_stats;
        if ( stats !== null ) {
            stats.num_drawing_flakes = flake_list.length;
        }

        // フレーム終了処理
        this._globe.endFrame();
        this._tile_texture_cache.endFrame();
        this._viewer.layers.endFrame();
    }


    /**
     * @param {mapray.RenderFlake} rflake  地表断片データ
     * @private
     */
    _drawFlake( rflake )
    {
        var     mesh = rflake.findMesh();
        var material = this._flake_material;

        var num_drawings = material.numDrawings();
        for ( var i = 0; i < num_drawings; ++i ) {
            material.bindProgram();
            if ( material.setFlakeParameter( this, rflake, mesh, i ) ) {
                mesh.draw( material );
            }
        }

        // 描画地表断頂点数を記録
        var stats = this._debug_stats;
        if ( stats !== null ) {
            stats.num_drawing_flake_vertices += mesh.num_vertices;
        }
    }

}

export default RenderStage;
