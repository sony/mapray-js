import GeoMath from "./GeoMath";
import Globe from "./Globe";
import Entity from "./Entity";
import FlakeCollector from "./FlakeCollector";
import SurfaceMaterial from "./SurfaceMaterial";
import WireframeMaterial from "./WireframeMaterial";
import PointCloudBoxCollector from "./PointCloudBoxCollector";
import PointCloud from "./PointCloud";
import Viewer from "./Viewer";
import PickTool from "./PickTool";



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
class AbstractRenderStage {

    /**
     * @param {mapray.Viewer} viewer        所有者である Viewer
     * @param {mapray.Camera} camera        カメラ
     * @param {object} [renderInfo]         レンダリング領域
     * @param {number} [renderInfo.sx]      レンダリング領域のx位置(ビューポート中央を0, 右方向を正とする)
     * @param {number} [renderInfo.sy]      レンダリング領域のy位置(ビューポート中央を0, 上方向を正とする)
     * @param {number} [renderInfo.swidth]  レンダリング領域の幅
     * @param {number} [renderInfo.sheight] レンダリング領域の高さ
     */
    constructor( viewer, camera, renderInfo )
    {
        this._viewer = viewer;
        this._glenv  = viewer.glenv;

        this._width = camera.canvas_size.width;
        this._height = camera.canvas_size.height;

        if ( this._width === 0 || this._height === 0 ) {
            // 画素がないのでレンダリングを省略
            this._rendering_cancel = true;
            return;
        }

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

        // 地形
        this._flake_material = null;
        this._flake_list = null;

        // 半透明化モード
        this._translucent_mode = false;

        // フレーム間のオブジェクトキャッシュ
        const render_cache = viewer._render_cache || (viewer._render_cache = {});
        if ( !render_cache.surface_material ) {
            render_cache.surface_material = new SurfaceMaterial( viewer );
            render_cache.surface_pick_material = new SurfaceMaterial( viewer, { ridMaterial: true } );
            render_cache.wireframe_material = new WireframeMaterial( viewer );
        }

        // デバッグ統計
        this._debug_stats = viewer.debug_stats;
    }

    /**
     * 半透明化モードを取得。エンティティモデルを半透明化して描画する。
     * Sceneがエンティティへ"半透明化モード"を伝達するのに用いる。
     * @see mapray.Entity#anchor_mode
     * @return {boolean}
     * @private
     */
    getTranslucentMode() {
        return this._translucent_mode;
    }

    /**
     * @summary 半透明化モードを設定。
     * @see getTranslucentMode()
     * @parm {boolean} transparent_mode
     * @private
     */
    setTranslucentMode( translucent_mode ) {
        this._translucent_mode = translucent_mode;
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
     * @type {RenderTarget}
     * @abstract
     */
    getRenderTarget() {
        throw new Error("not implemented");
    }

    /**
     * @summary Sceneがレンダリングを確定したことを通知
     * pick_objectは、primitiveがpickされたときに返却すべきオブジェクトを指定する。
     * @param {Primitive} primitive
     * @param {mapray.Entity} [pick_object]
     * @abstract
     */
    onPushPrimitive( primitive, pick_object ) {
    }

    /**
     * @summary 1フレームのレンダリングを実行
     * @abstract
     */
    render() {
        throw new Error("not implemented");
    }

    /**
     * @summary 1フレームのレンダリングを実行
     * @abstract
     * @private
     */
    _render() {
        const gl = this._glenv.context;

        // 描画領域全体にビューポートを設定
        gl.viewport( 0, 0, this._width, this._height );
        gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
        gl.depthMask( true );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        if ( this._rendering_cancel )
            return;

        // 地表断片データの収集
        if ( this._globe.status !== Globe.Status.READY ) {
            // まだ基底タイルデータが読み込まれていないので地表をレンダリングできない
            this._rendering_cancel = true;
            return;
        }

        gl.enable( gl.CULL_FACE );
        gl.enable( gl.DEPTH_TEST );
        gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE );  // FB のα値は変えない
        gl.depthFunc( gl.LEQUAL );

        const collector = new FlakeCollector( this );
        this._flake_list = collector.traverse();

        let vis_ground = this._viewer.getVisibility( Viewer.Category.GROUND );
        let vis_entity = this._viewer.getVisibility( Viewer.Category.ENTITY );

        // すべての地表断片を描画
        this._prepare_draw_flake();

        for ( let rflake of this._flake_list ) {
            let fro = rflake.getRenderObject();
            if ( vis_ground ) {
                this._draw_flake_base( rflake, fro.getBaseMesh() );
            }
            if ( vis_entity ) {
                this._draw_entities_on_flake( fro );
            }
        }

        this._draw_point_cloud();

        // すべての B3D タイルの描画
        this._viewer.b3d_collection.draw( this );

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
        this._viewer.b3d_collection.endFrame();
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
        const gl = this._glenv.context;
        const material = this._flake_material;

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
                if ( this.getRenderTarget() === RenderTarget.SCENE ) {
                    gl.enable( gl.BLEND );
                }
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

        // 透明色のマテリアルであっても、RID描画時は gl.BLEND を無効にする。
        let setBlend;
        if ( this.getRenderTarget() === RenderTarget.SCENE ) {
            setBlend = (enable) => {
                if (enable) gl.enable( gl.BLEND );
                else        gl.disable( gl.BLEND );
            };
        }
        else {
            gl.disable( gl.BLEND );
            setBlend = () => {};
        }

        for ( let i = 0; i < num_entities; ++i ) {
            let { primitive, entity } = fro.getEntityPrimitive( i, this );

            setBlend( primitive.isTranslucent( this ) );

            this.onPushPrimitive( primitive, entity );
            primitive.draw( this );
        }

        gl.depthMask( true );
        gl.disable( gl.POLYGON_OFFSET_FILL );
    }


     _draw_point_cloud()
     {
     }
}



/**
 * @summary 1フレーム分のレンダリングを実行
 * @desc
 * {@link mapray.Viewer} インスタンスはフレーム毎にこのクラスのインスタンスを生成してレンダリングを実行する。
 *
 * @memberof mapray
 * @private
 */
class RenderStage extends AbstractRenderStage {
    /**
     * @param viewer {mapray.Viewer}  所有者である Viewer
     */
    constructor( viewer )
    {
        super( viewer, viewer.camera, viewer.camera.createRenderInfo() );

        // 地表マテリアルの選択
        this._flake_material = (
            viewer.render_mode === Viewer.RenderMode.WIREFRAME ?
            viewer._render_cache.wireframe_material :
            viewer._render_cache.surface_material
        );
    }


    /**
     * @type {RenderTarget}
     * @override
     */
    getRenderTarget() {
        return RenderTarget.SCENE;
    }


    /**
     * @summary 1フレームのレンダリングを実行
     * @override
     */
    render()
    {
        this._render();
        if ( this._rendering_cancel ) return;

        // 描画地表断片数を記録
        var stats = this._debug_stats;
        if ( stats !== null ) {
            stats.num_drawing_flakes = this._flake_list.length;
        }

        // フレーム終了処理
        this._globe.endFrame();
        this._tile_texture_cache.endFrame();
        this._viewer.layers.endFrame();
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



/**
 * @summary マウスピック用に1フレーム分のレンダリングを実行
 * @desc
 * {@link mapray.Viewer} のpick関数内でインスタンスが生成されレンダリングが実行される。
 *
 * @memberof mapray
 * @private
 */
class PickStage extends AbstractRenderStage {

    /**
     * @param {mapray.Viewer} viewer  所有者である Viewer
     * @param {number} size オフスクリーン幅 = オフスクリーン高さ
     * @param {mapray.Vector2} screen_pos スクリーン上のピクセル位置
     */
    constructor( viewer, screen_pos )
    {
        const pick_tool = viewer.pick_tool_cache || (viewer.pick_tool_cache = new PickTool( viewer.glenv ));
        const camera = pick_tool.pickCamera( viewer.camera, screen_pos );
        const renderInfo = camera.createRenderInfo(
            +screen_pos[0] - viewer.camera.canvas_size.width  / 2,
            -screen_pos[1] + viewer.camera.canvas_size.height / 2
        );

        super( viewer, camera, renderInfo );

        // 地表マテリアルの選択
        this._flake_material = viewer._render_cache.surface_pick_material;

        this._pick_tool = pick_tool;
        this._rid_map = [ null ]; // rid == 0 は要素なしを意味する

        this._pick_result = {};
    }


    /**
     * @override
     */
    onPushPrimitive( primitive, pick_object ) {
        primitive.rid = this._rid_map.length;
        this._rid_map.push(pick_object);
    }


    /**
     * @type {RenderTarget}
     * @override
     */
    getRenderTarget() {
        return RenderTarget.RID;
    }


    /**
     * スクリーンの任意の点における三次元位置や描画対象に関する情報を取得します。
     * @return 位置情報や描画対象に関する情報
     * @override
     */
    render() {
        const pick_tool = this._pick_tool;
        pick_tool.beforeRender();

        const gl = this._glenv.context;
        gl.disable( gl.DITHER );

        this._render();

        gl.enable( gl.DITHER );

        if ( this._rendering_cancel ) {
            pick_tool.renderCanceled();
            return;
        }

        pick_tool.afterRender();

        const rid = pick_tool.readRid();
        if ( rid > 0 ) {
            const pick_object = this._rid_map[ rid ];
            if ( pick_object instanceof Entity ) {
                this._pick_result.entity = pick_object;
            }
        }

        this._pick_result.point = pick_tool.readDepth( this._view_to_clip, this._view_to_gocs );
    }


    /**
     * @type {mapray.Viewer.PickResult}
     */
    get pick_result() {
        return this._pick_result;
    }
}



export default RenderStage;
export { PickStage, RenderTarget };
