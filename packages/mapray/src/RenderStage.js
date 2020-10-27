import GeoMath from "./GeoMath";
import Globe from "./Globe";
import FlakeCollector from "./FlakeCollector";
import SurfaceMaterial from "./SurfaceMaterial";
import WireframeMaterial from "./WireframeMaterial";
import PointCloudBoxCollector from "./PointCloudBoxCollector";
import PointCloud from "./PointCloud";
import Viewer from "./Viewer";


/**
 * @summary 描画対象
 * @enum {object}
 * @memberof mapray.AbstractRenderStage
 * @constant
 * @private
 */
const RenderTarget = {

    /**
     * 通常のシーン描画
     */
    SCENE: {
        id: "SCENE"
    },

    /**
     * マウスピックなど、RID取得を目的とした描画
     */
    RID: {
        id: "RID"
    }
};




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
        this._globe                  = viewer.globe;
        this._tile_texture_cache     = viewer.tile_texture_cache;
        this._point_cloud_collection = viewer.point_cloud_collection;

        // フレーム間のオブジェクトキャッシュ
        const render_cache = viewer._render_cache || (viewer._render_cache = {});
        if ( !render_cache.surface_material ) {
            render_cache.surface_material = new SurfaceMaterial( viewer );
            render_cache.surface_pick_material = new SurfaceMaterial( viewer, { ridMaterial: true } );
            render_cache.wireframe_material = new WireframeMaterial( viewer );
        }

        // 地表マテリアルの選択
        this._flake_material = (viewer.render_mode === Viewer.RenderMode.WIREFRAME) ? viewer._render_cache.wireframe_material : viewer._render_cache.surface_material;
        this._flake_pick_material = viewer._render_cache.surface_pick_material;

        // デバッグ統計
        this._debug_stats = viewer.debug_stats;
    }

    getRenderTarget() {
        return RenderTarget.SCENE;
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

        let  collector = new FlakeCollector( this );
        let flake_list = collector.traverse();

        let vis_ground = this._viewer.getVisibility( Viewer.Category.GROUND );
        let vis_entity = this._viewer.getVisibility( Viewer.Category.ENTITY );

        // すべての地表断片を描画
        this._prepare_draw_flake();

        for ( let rflake of flake_list ) {
            let fro = rflake.getRenderObject();

            if ( vis_ground ) {
                this._draw_flake_base( rflake, fro.getBaseMesh() );
            }
            if ( vis_entity ) {
                this._draw_entities_on_flake( fro );
            }
        }

        this._draw_point_cloud();

        // モデルシーン描画
        if ( vis_entity ) {
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
     * @summary 地表断片を描画する前の準備
     *
     * @private
     */
    _prepare_draw_flake()
    {
        // RenderFlake#getRenderObject() の前に必要な処理
        let producers = this._scene.getFlakePrimitiveProducers();
        this._globe.putNextEntityProducers( producers );
    }


    /**
     * @summary 地表とレイヤーを描画
     *
     * @param {mapray.RenderFlake} rflake  地表断片データ
     * @param {mapray.FlakeMesh}   mesh    地表断片メッシュ
     *
     * @private
     */
    _draw_flake_base( rflake, mesh )
    {
        let gl = this._glenv.context;
        var material = this.getRenderTarget() === RenderTarget.RID ? this._flake_pick_material : this._flake_material;

        material.bindProgram();

        var num_drawings = material.numDrawings();

        // 一番下の不透明地表
        if ( material.setFlakeParameter( this, rflake, mesh, 0 ) ) {
            gl.disable( gl.BLEND );
            gl.depthMask( true );
            mesh.draw( material );
        }

        // レイヤーの地表 (半透明の可能背あり)
        for ( var i = 1; i < num_drawings; ++i ) {
            if ( material.setFlakeParameter( this, rflake, mesh, i ) ) {
                gl.enable( gl.BLEND );
                gl.depthMask( false );
                mesh.draw( material );
            }
        }

        // 描画地表断頂点数を記録
        var stats = this._debug_stats;
        if ( stats !== null ) {
            stats.num_drawing_flake_vertices += mesh.num_vertices;
        }
    }


    /**
     * @summary 地表断片上のエンティティを描画
     *
     * @param {mapray.FlakeRenderObject} fro  FlakeRenderObject インスタンス
     *
     * @private
     */
    _draw_entities_on_flake( fro )
    {
        let num_entities = fro.num_entities;

        if ( num_entities == 0 ) {
            // エンティティなし
            return;
        }

        let gl = this._glenv.context;

        gl.enable( gl.POLYGON_OFFSET_FILL );
        gl.depthMask( false );  // 地表に張り付いていることが前提なので深度は変更しない

        // todo: 仮のポリゴンオフセット
        // 実験で得た適切な値 (Windows, GeForce GT750)
        //   Chrome+ANGLE: -8, -8
        //   Chrome+EGL: -40, -40
        gl.polygonOffset( -8, -8 );

        for ( let i = 0; i < num_entities; ++i ) {
            let { entity, primitive } = fro.getEntityPrimitive( i, this );

            if ( primitive.isTranslucent( this ) ) {
                gl.enable( gl.BLEND );
            }
            else {
                gl.disable( gl.BLEND );
            }

            primitive.draw( this );
        }

        gl.depthMask( true );
        gl.disable( gl.POLYGON_OFFSET_FILL );
    }


    /**
     * @summary 点群を描画
     *
     * @private
     */
    _draw_point_cloud() {
        // const debug_handlers = PointCloud.getDebugHandlers() || {};
        const traverseDataRequestQueue = PointCloud.getTraverseDataRequestQueue();
        const traverseData = traverseDataRequestQueue.length === 0 ? null : [];
        const s = PointCloud.getStatistics() || {};
        // const statistics = ;
        if ( s.statistics_obj ) s.statistics_obj.clear();

        for ( let i=0; i<this._point_cloud_collection.length; ++i ) {
            if ( s.statistics_obj ) s.statistics_obj.start();

            const point_cloud = this._point_cloud_collection.get( i );
            const load_limit = Math.max(0, 10 - point_cloud.provider.getNumberOfRequests());

            const pcb_collector = new PointCloudBoxCollector( this, load_limit );
            const traverse_result = pcb_collector.traverse( point_cloud, s.statistics_obj );
            if ( s.statistics_obj ) s.statistics_obj.doneTraverse();

            if (point_cloud.provider.isReady()) {
                for ( const ro of traverse_result.load_boxes ) {
                    ro.box.load();
                }
            }

            for ( const ro of traverse_result.visible_boxes ) {
                ro.draw( this, s.statistics_obj );
            }

            point_cloud.provider.flushQueue();

            if ( traverseData ) {
                traverseData.push({point_cloud, pcb_collection: traverse_result.visible_boxes});
            }

            if ( s.statistics_obj ) s.statistics_obj.done();
        }

        if ( traverseData ) {
            for (let i=0; i<traverseDataRequestQueue.length; i++) {
                traverseDataRequestQueue[i](traverseData);
            }
        }

        if ( s.statistics_handler ) {
            s.statistics_handler( s.statistics_obj );
        }
    }
}

export default RenderStage;
export { RenderTarget };
