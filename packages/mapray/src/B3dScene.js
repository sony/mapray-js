import GeoMath from "./GeoMath";
import Ray from "./Ray";
import Mesh from "./Mesh";
import Viewer from "./Viewer";
import B3dNative from "./B3dNative";
import B3dBinary from "./B3dBinary";
import B3dMaterial from "./B3dMaterial";
import B3dCubeMaterial from "./B3dCubeMaterial";
import WasmTool from "./WasmTool";
import b3dtile_factory from "./wasm/b3dtile.js";
import RenderStage from "./RenderStage";


/**
 * @summary b3dtile シーン
 *
 * @classdesc
 * <p>特定の {@link mapray.B3dProvider B3dProvider} インスタンスに対応するシーンデータを表示する。</p>
 *
 * <p>このクラスのインスタンスは {@link mapray.B3dCollection#createScene createScene()}
 *    メソッドにより生成する。</p>
 *
 * <p>{@link mapray.B3dScene#visibility visibility} プロパティが false のときは、this
 *    のシーンは表示せず、交差は判定されない。</p>
 *
 * @see {@link mapray.B3dProvider}
 * @see {@link mapray.B3dCollection#createScene}
 *
 * @memberof mapray
 * @hideconstructor
 * @public
 */
class B3dScene {

    /**
     * @param {mapray.B3dCollection}  owner  this の所有者
     * @param {mapray.B3dProvider} provider  B3D データプロバイダ
     */
    constructor( owner, provider )
    {
        this._owner      = owner;
        this._provider   = provider;
        this._glenv      = owner.viewer.glenv;
        this._status     = TreeState.NOT_READY;
        this._native     = null;
        this._root_cube  = null;
        this._visibility = true;

        // 幾何計算関連
        this._rho          = undefined;
        this._a0cs_to_gocs = undefined;
        this._gocs_to_a0cs = undefined;
        this._lod_factor   = B3dScene.DEFAULT_LOD_FACTOR;

        // キャッシュ処理関連
        this._frame_counter   = 0;  // 現行フレーム番号

        this._num_tree_cubes  = 0;  // ツリー上の B3dCube インスタンス数
        this._num_touch_cubes = 0;  // 現行フレームでのアクセス B3dCube 数 (祖先含む)
        this._hist_stats = new HistStats();  // _num_touch_cubes の履歴

        this._num_tree_meshes  = 0;  // ツリー上の MeshNode インスタンス数
        this._num_touch_meshes = 0;  // 現行フレームでのアクセス MeshNode 数

        this._num_tile_requesteds = 0;  // 現在の REQUESTED 状態の数

        // 初期用の特殊プロパティ
        this._b3d_req_id = undefined;

        // リクエストキュー
        // - 常にPriority順にソート済み
        // - サイズは B3dScene.MAX_TILE_REQUESTEDS を超えない
        this._request_queue = [];

        if ( owner.getWasmModule() ) {
            this._startInitialization( owner.getWasmModule() );
        }
    }


    /**
     * @summary B3D データプロバイダ
     *
     * @type {mapray.B3dProvider}
     * @readonly
     */
    get provider() { return this._provider; }


    /**
     * @summary 可視性フラグを取得
     *
     * @type {boolean}
     * @default true
     * @readonly
     *
     * @see {@link mapray.B3dScene#setVisibility}
     */
    get visibility() { return this._visibility; }


    /**
     * @summary 表示詳細度のためのパラメータ
     *
     * @type {number}
     * @default 2.0
     * @readonly
     *
     * @see {@link mapray.B3dScene#setLodFactor}
     */
    get lod_factor() { return this._lod_factor; }


    /**
     * @summary 可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     *
     * @see {@link mapray.B3dScene#visibility}
     */
    setVisibility( visibility )
    {
        this._visibility = visibility;
    }


    /**
     * @summary 表示詳細度のためのパラメータを設定
     *
     * @desc
     * <p>このパラメータの値は、小さいと表示の詳細度が高くなり、大きいと低くなる。</p>
     *
     * <p>注意: 現在は実験的なパラメータである。</p>
     *
     * @param {number} lod_factor  パラメータ値
     *
     * @see {@link mapray.B3dScene#lod_factor}
     */
    setLodFactor( lod_factor )
    {
        this._lod_factor = lod_factor;
    }


    /**
     * @summary wasm モジュールがロードされたことを通知
     *
     * this._owner の wasm モジュールがロードされたときに呼び出される。
     *
     * @package
     */
    onLoadWasmModule()
    {
        if ( this._status === TreeState.FAILED ) {
            return;
        }

        this._startInitialization( this._owner.getWasmModule() );
    }


    /**
     * @summary リクエストの取り消しを試みる
     *
     * @package
     */
    cancel()
    {
        if ( this._status === TreeState.NOT_READY ) {
            // 準備中のリクエストを取り消す
            if ( this._b3d_req_id ) {
                this._provider.cancelRequest( this._b3d_req_id );
                this._b3d_req_id = undefined;
            }
        }
        else if ( this._status === TreeState.READY ) {
            // ツリー上の REQUESTED をキャンセル
            for ( let cube of this._root_cube.getCubesFlattened() ) {
                cube.cancelTileRequest();
            }
        }

        console.assert( this._num_tile_requesteds == 0 );

        this._status = TreeState.FAILED;
    }


    /**
     * @summary 描画処理
     *
     * @param {mapray.RenderStage} stage
     *
     * @package
     */
    draw( stage )
    {
        if ( this._status !== TreeState.READY ) {
            // 描画できる状態ではない
            return;
        }

        if ( !this._visibility || !this._owner.viewer.getVisibility( Viewer.Category.B3D_SCENE ) ) {
            // 可視性が false のときは表示しない
            return;
        }

        (new B3dStage( this, stage )).render();
    }


    /**
     * @summary フレーム終了処理
     *
     * @package
     */
    endFrame()
    {
        if ( this._num_touch_cubes == 0 ) {
            // 描画時にトラバースされなかった、理由は以下のどれか
            //
            // - B3dScene の状態が TreeState.READY でない
            // - B3dScene の可視性が無効
            // - Viewer の B3D_SCENE の可視性が無効
            return;
        }

        console.assert( this._num_tree_cubes >= this._num_touch_cubes );
        console.assert( this._num_tree_meshes >= this._num_touch_meshes );

        this._reduceCubesIfNecessary();
        this._reduceMeshesIfNecessary();

        // 次のフレームのカウンターを準備
        this._num_touch_cubes  = 0;
        this._num_touch_meshes = 0;
        this._num_cube_createds = 0;
        this._request_queue = [];
        ++this._frame_counter;
    }


    /**
     * @summary B3D シーンとレイとの交点を探す
     *
     * @desc
     * <p>線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離
     * 未満にある点) と this 全体の三角形との交点の中で、始点から最も近い交点の情
     * 報を返す。ただし線分と交差する三角形が見つからないときは null を返す。</p>
     *
     * <p>戻り値のオブジェクト形式は次のようになる。ここで uint32 は 0 から
     *    2^32 - 1 の整数値である。</p>
     *
     * <pre>
     * {
     *     distance:   number,
     *     feature_id: [uint32, uint32]
     * }
     * </pre>
     *
     * <p>戻り値のオブジェクトと、そこから参照できるオブジェクトは変更しても問
     *    題ない。</p>
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (GOCS)
     * @param {number}   limit  制限距離 (ray.direction の長さを単位)
     *
     * @return {?object}  交点の情報
     *
     * @package
     */
    getRayIntersection( ray, limit )
    {
        if ( this._status !== TreeState.READY ) {
            // 準備ができていないときは見つけられない
            return null;
        }

        if ( !this._visibility ) {
            // 可視性が false のときは交差しない仕様
            return null;
        }

        const ray_a0cs = Ray.transform_A( this._gocs_to_a0cs, ray, new Ray() );

        if ( this._root_cube.isAreaCross( ray_a0cs, limit ) ) {
            return this._root_cube.getRayIntersectionOnTree( ray_a0cs, limit );
        }
        else {
            // 最上位タイルの空間全体と交差しない
            return null;
        }
    }


    /**
     * @summary 初期化を開始
     *
     * @param {WebAssembly.Module} wa_module
     *
     * @private
     */
    async _startInitialization( wa_module )
    {
        try {
            const meta_data = await this._getMetaData();
            this._setupMetadata( meta_data );

            const [tile_data,
                   em_module] = await Promise.all( [this._getRootTileArray(),
                                                    WasmTool.createEmObjectByModule( wa_module,
                                                                                     b3dtile_factory )] );

            this._native = new B3dNative( em_module );

            // 基底 Cube のタイルを設定
            const b3d_binary = await B3dBinary.create( this._glenv, this._native, tile_data );
            this._root_cube = new B3dCube( null, -1 );
            this._root_cube.$$setupRootNode( this, b3d_binary );

            this._status = TreeState.READY;
        }
        catch ( e ) {
            console.error( "b3dtile error: " + e.message );
            this._status = TreeState.FAILED;
        }

        this._b3d_req_id = undefined;
    }


    /**
     * @brief b3dtile のメタデータを取得
     *
     * ※ 最初に this._b3d_req_id にリクエスト ID が設定される。
     *
     * @return {Promise.<object>}  metadata を解決する Promise
     *
     * @private
     */
    _getMetaData()
    {
        return new Promise( (resolve, reject) => {
            this._b3d_req_id = this._provider.requestMeta( data => {
                if ( data !== null )
                    resolve( data );
                else
                    reject( new Error( "failed to get metadata for b3dtile" ) );
            } );
        } );
    }


    /**
     * @brief b3dtile の最上位タイルデータを取得
     *
     * ※ 最初に this._b3d_req_id にリクエスト ID が設定される。
     *
     * @return {Promise.<ArrayBuffer>}  data を解決する Promise
     *
     * @private
     */
    _getRootTileArray()
    {
        return new Promise( (resolve, reject) => {
            this._b3d_req_id = this._provider.requestTile( 0, [0, 0, 0], data => {
                if ( data !== null )
                    resolve( data );
                else
                    reject( new Error( "failed to get a tile data for b3dtile" ) );
            } );
        } );
    }


    /**
     * @summary メタデータの設定
     *
     * @param {object} metadata  "tile-index.json" の内容
     *
     * @private
     */
    _setupMetadata( metadata )
    {
        let tile_format = 1;

        if ( (metadata.format === undefined) || (metadata.format > 2) ) {
            // 認識できないメタデータ形式
            throw Error( "unrecognized b3dtile metadata format" );
        }

        // タイルデータの形式
        if ( metadata.tile_format !== undefined ) {
            tile_format = metadata.tile_format;
        }

        if ( tile_format <= 1 ) {
            throw Error( "tile_format " + tile_format + " is no longer supported" );
        }
        else if ( tile_format > 2 ) {
            throw Error( "tile_format " + tile_format + " is unrecognized" );
        }

        // メタデータを取得
        this._rho          = metadata.rho;
        this._a0cs_to_gocs = GeoMath.createMatrix( metadata.transform );
        this._gocs_to_a0cs = GeoMath.inverse_A( this._a0cs_to_gocs, GeoMath.createMatrix() );
    }


    /**
     * @summary 必要なら B3dCube インスタンスを削減
     *
     * @private
     */
    _reduceCubesIfNecessary()
    {
        const max_touch_cubes = this._hist_stats.getMaxValue( this._num_touch_cubes );

        if ( this._num_tree_cubes <= B3dScene.CUBE_REDUCE_THRESH * max_touch_cubes ) {
            // 最近使用した cube 数に対してツリー上の cube 数はそれほど
            // 多くないので、まだ削減しない
            return;
        }

        // B3dCube を集めて、優先度で整列
        const tree_cubes = this._root_cube.getCubesFlattened();
        console.assert( tree_cubes.length == this._num_tree_cubes );

        tree_cubes.sort( (a, b) => a.compareForReduce( b ) );

        // 優先度の低い B3dCube を削除
        const num_tree_cubes = Math.floor( B3dScene.CUBE_REDUCE_FACTOR * max_touch_cubes );

        for ( let cube of tree_cubes.slice( num_tree_cubes ) ) {
            cube.dispose();
        }
        console.assert( this._num_tree_cubes == num_tree_cubes );
    }


    /**
     * @summary 必要なら MeshNode インスタンスを削減
     *
     * @private
     */
    _reduceMeshesIfNecessary()
    {
        if ( this._num_tree_meshes <= B3dScene.MESH_REDUCE_LOWER ) {
            // ツリー上のメッシュの絶対数がそれほど多くないので、
            // まだ削減しない
            return;
        }

        if ( this._num_tree_meshes <= B3dScene.MESH_REDUCE_THRESH * this._num_touch_meshes ) {
            // 現行フレームで使用したメッシュ数に対してツリー上のメッシュは
            // それほど多くないので、まだ削減しない
            return;
        }

        // MeshNode を集めて、優先度で整列
        const tree_meshes = this._root_cube.getMeshesFlattened();
        console.assert( tree_meshes.length == this._num_tree_meshes );
        tree_meshes.sort( (a, b) => a.compareForReduce( b ) );

        // 優先度の低い MeshNode を削除
        const num_tree_meshes = Math.floor( B3dScene.MESH_REDUCE_FACTOR * this._num_touch_meshes );

        for ( let mesh_node of tree_meshes.slice( num_tree_meshes ) ) {
            mesh_node.dispose();
        }
        console.assert( this._num_tree_meshes == num_tree_meshes );
    }

}


/**
 * @summary B3dScene のレンダリングサブステージ
 *
 * @memberof mapray.B3dScene
 * @private
 */
class B3dStage {

    /**
     * @param {mapray.B3dScene}    tree    クライアント B3dScene
     * @param {mapray.RenderStage} pstage  親レンダリングステージ
     */
    constructor( tree, pstage )
    {
        this._provider = tree._provider;
        this._glenv    = pstage._glenv;
        this._native   = tree._native;
        this._debug    = tree._owner.$debug;
        this._shader_cache = tree._owner.shader_cache;
        this._render_target = pstage.getRenderTarget();

        // 変換行列
        this._a0cs_to_view = GeoMath.mul_AA( pstage._gocs_to_view, tree._a0cs_to_gocs, GeoMath.createMatrix() );
        this._a0cs_to_clip = GeoMath.mul_PzA( pstage._view_to_clip, this._a0cs_to_view, GeoMath.createMatrix() );

        // 視体積の平面ベクトル配列 (A0CS)
        this._volume_planes = [];
        for ( let view_plane of pstage._volume_planes ) {
            // view から A0CS へ平面を変換
            let a0cs_plane = GeoMath.transformPlane_A( this._a0cs_to_view, view_plane, GeoMath.createVector4() );
            this._volume_planes.push( a0cs_plane );
        }

        // 深度距離を計算するための平面
        this._depth_plane = GeoMath.transformPlane_A( this._a0cs_to_view, [0, 0, -1, 0], GeoMath.createVector4() );
        GeoMath.normalizePlane( this._depth_plane, this._depth_plane );

        // レベル計算のための基準 LOD
        //
        // level = -log2(lod_factor * pixel_step * depth) - rho
        //       = lod_offset - log2(depth)
        //
        const lod_factor = Math.max( tree.lod_factor, B3dScene.MIN_LOD_FACTOR );
        this._lod_offset = -Math.log2( lod_factor * pstage._pixel_step ) - tree._rho;

        // トラバース用の情報
        this._root_cube  = tree._root_cube;
        this._mesh_node_list = null;
    }


    /**
     * @summary レンダリング処理
     */
    render()
    {
        this._traverse();
        this._draw_meshes();
    }


    /**
     * @summary 全体ををトラバース
     *
     * this._mesh_node_list に MeshNode インスタンスを追加する。
     *
     * @private
     */
    _traverse()
    {
        const scene = this._root_cube._owner;

        this._mesh_node_list = [];
        this._traverse_recur( this._root_cube );

        // traverse中に追加されたリクエストを実行する
        for ( const request of scene._request_queue ) {
            if ( scene._num_tile_requesteds > B3dScene.MAX_TILE_REQUESTEDS ) {
                break;
            }
            const node = request.node;
            if ( node._b3d_state === B3dState.NONE ) {
                node._requestTile();
            }
        }

        // console.log( "B3dCube.created: " + scene._num_cube_createds + "  Tile.Requested: " + scene._num_tile_requesteds );
    }


    /**
     * @summary cube とその子孫をトラバース
     *
     * @param {mapray.B3dScene.B3dCube} cube
     *
     * @private
     */
    _traverse_recur( cube )
    {
        // cube を使ったことにする
        cube.touch();

        if ( this._isInvisible( cube ) ) {
            // 視体積に入らないので無視
            return;
        }

        const target_level = this._get_tile_target_level( cube );

        if ( target_level < 0 ) {
            const tile_data = cube.getTileData();

            for ( let which = 0; which < 8; ++which ) {
                if ( (tile_data !== null) && tile_data.isVoidArea( which ) ) {
                    // 何もない子領域なので描画をスキップ
                    continue;
                }

                this._traverse_recur( cube.newChild( which ) );
            }
        }
        else {
            // cube に対応するメッシュ情報を取得
            const mesh_node = cube.getMeshNode( target_level );

            // メッシュ情報をリストに追加
            if ( mesh_node.hasGeometry() ) {
                this._mesh_node_list.push( mesh_node );
            }
        }
    }


    /**
     * @summary cube の領域の可視性を検査
     *
     * @desc
     * cube の領域が画面上に現れるか不明のときは false, そうでないときは
     * true を返す。
     *
     * @param {mapray.B3dScene.B3dCube} cube
     *
     * @return {boolean}
     *
     * @private
     */
    _isInvisible( cube )
    {
        const s = cube.area_size;
        const c = cube.area_origin;

        for ( let plane of this._volume_planes ) {
            let is_invisible = true;

            for ( let i = 0; i < 8; ++i ) {
                // ある角の座標 (A0CS)
                const p0 = c[0] + s * (i        & 1);
                const p1 = c[1] + s * ((i >> 1) & 1);
                const p2 = c[2] + s * ((i >> 2) & 1);

                // 平面からの符号付き距離
                const dist = p0*plane[0] + p1*plane[1] + p2*plane[2] + plane[3];

                // 位置の判定
                if ( dist >= 0 ) {
                    // plane に対して表側に点があるので不可視でないかも知れない
                    is_invisible = false;
                    break;
                }
            }

            if ( is_invisible ) {
                // 角がすべて plane の裏側にあるので不可視が確定
                return true;
            }
        }

        // 不明
        return false;
    }


    /**
     * @summary 現在の視点で cube に適したタイルのレベルを取得
     *
     * @desc
     * cube に適したタイルの整数レベル (>= 0) を返す。
     * ただし分割が必要なときは負数を返す。
     *
     * 常に (戻り値) <= cube.level が成り立つ。
     *
     * @param {mapray.B3dScene.B3dCube} cube
     *
     * @return {number}
     *
     * @private
     */
    _get_tile_target_level( cube )
    {
        const h = cube.area_size / 2;  // 半分の寸法
        const c = cube.area_origin;

        // cube の中心位置 (A0CS)
        const p0 = c[0] + h;
        const p1 = c[1] + h;
        const p2 = c[2] + h;

        // 視点から cube の中心までの深度距離 (A0CS)
        const plane = this._depth_plane;
        const depth = p0*plane[0] + p1*plane[1] + p2*plane[2] + plane[3];

        // cube を内包する球の半径 (A0CS)
        const radius = h * B3dScene.RADIUS_FACTOR;

        // 視点から cube までの最小深度距離 (A0CS)
        const min_depth = depth - radius;

        if ( min_depth <= 0 ) {
            // 視点と同じか後方に cube の点が存在する可能性がある
            // LOD が計算できないので分割
            return -1;
        }

        // cube 内のタイルのレベルの最小値と最大値 (連続値)
        const min_level = this._lod_offset - GeoMath.maprayLog2( depth + radius );
        const max_level = this._lod_offset - GeoMath.maprayLog2( min_depth );

        if ( max_level - min_level >= B3dScene.LEVEL_INTERVAL ) {
            // cube 内のレベルの差が大きすぎるので cube を分割
            return -1;
        }

        // cube に対するタイルの代表レベル (整数値 >= 0)
        const tile_level = Math.max( Math.round( (min_level + max_level) / 2 ), 0 );

        // タイルの寸法のほうが小さいとき、cube を分割
        return (tile_level <= cube.level) ? tile_level : -1;
    }


    /**
     * @summary すべてのメッシュを描画
     *
     * this._mesh_node_list のメッシュを描画する。
     *
     * @private
     */
    _draw_meshes()
    {
        let material = this._getMaterial( this._render_target );

        material.bindProgram();

        for ( let mesh_node of this._mesh_node_list ) {

            // TEST
            this._clip_flag = mesh_node.isClipped();

            material.setParameters( this, mesh_node.getTransform(), mesh_node.getTileTexture() );

            let mesh = mesh_node.getTileMesh();
            mesh.draw( material );
        }

        if ( this._debug.render_mode == 1 && this._render_target == RenderStage.RenderTarget.SCENE ) {
            // 立方体空間の表示
            let cube_mtl = this._getCubeMaterial();
            cube_mtl.bindProgram();

            let area_color = [1, 0, 0];
            for ( let mesh_node of this._mesh_node_list ) {
                cube_mtl.setParameters( this, mesh_node.getTransform(), area_color );
                let mesh = mesh_node.getAreaMesh( this._glenv );
                mesh.draw( cube_mtl );
            }
        }
    }


    /**
     * @summary マテリアルを取得
     *
     * @private
     */
     _getMaterial( render_target )
     {
         let cache = this._shader_cache;
         if ( render_target === RenderStage.RenderTarget.SCENE ) {
             if ( cache._B3dMaterial === undefined ) {
                 this._debug.ridMaterial = false;
                 cache._B3dMaterial = new B3dMaterial( this._glenv, this._debug);
             }
             return cache._B3dMaterial;
         }
         else if ( render_target === RenderStage.RenderTarget.RID ) {
             if ( cache._B3dPickMaterial === undefined ) {
                 this._debug.ridMaterial = true;
                 cache._B3dPickMaterial = new B3dMaterial( this._glenv, this._debug );
             }
             return cache._B3dPickMaterial;
         }
         else {
             throw new Error("unknown render target: " + render_target);
         }
     }


    /**
     * @summary マテリアルを取得
     *
     * @private
     */
    _getCubeMaterial()
    {
        let cache = this._shader_cache;

        if ( cache._B3dCubeMaterial === undefined ) {
            cache._B3dCubeMaterial = new B3dCubeMaterial( this._glenv );
        }

        return cache._B3dCubeMaterial;
    }

}


/**
 * @summary B3dScene の立方体ノード
 *
 * @memberof mapray.B3dScene
 * @private
 */
class B3dCube {

    /**
     * @param {?mapray.B3dScene.B3dCube} parent  親ノード (最上位の場合は null)
     * @param {number}                   which   子インデックス (最上位の場合は無視)
     */
    constructor( parent, which )
    {
        this._owner      = undefined;  // B3dScene
        this._parent     = parent;     // B3dCube
        this._children   = null;  // 配列は必要になってから生成
        this._b3d_state  = B3dState.NONE;
        this._b3d_data   = null;  // B3dBinary または cancel ID または null
        this._mesh_nodes = null;  // Map<int, MeshNode>
        this._has_tile_in_descendants = false;  // ある子孫ノードが B3dBinary インスタンスを持っているか？
        this._aframe     = -1;

        /**
         *  @summary 領域の原点 (A0CS)
         *
         *  ※ 誤差なしの厳密値を想定している。
         *
         *  @member mapray.B3dScene.B3dCube#area_origin
         *  @type {number[]}
         */
        this.area_origin = undefined;

        /**
         *  @summary 領域の寸法 (A0CS)
         *
         *  ※ 誤差なしの厳密値を想定している。
         *
         *  @member mapray.B3dScene.B3dCube#area_size
         *  @type {number}
         */
        this.area_size = undefined;

        /**
         *  @summary レベル
         *
         *  最上位を 0 とする整数レベルを表す。
         *
         *  実際には -log2( this.area_size ) と同じだが、
         *  利便性のためにプロパティとしている。
         *
         *  @member mapray.B3dScene.B3dCube#level
         *  @type {number}
         */
        this.level = undefined;


        if ( parent === null ) {
            /* 最上位の領域 */

            // this._owner は $$setupRootNode() で設定

            this.area_size   = 1;
            this.area_origin = [0, 0, 0];
            this.level       = 0;

            // this._owner._num_tree_cubes は $$setupRootNode() でカウント
        }
        else {
            this._owner = parent._owner;

            this.area_size   = parent.area_size / 2;
            this.area_origin = new Array( 3 );

            for ( let i = 0; i < 3; ++i ) {
                // which == u + 2*v + 4*w
                const d = (which >> i) & 1;
                this.area_origin[i] = parent.area_origin[i] + d * this.area_size;
            }

            this.level = parent.level + 1;

            ++this._owner._num_tree_cubes;
        }
    }


    /**
     * @summary 子ノードを生成または取得
     *
     * @param {number} which  子インデックス (u + 2*v + 4*w)
     *
     * @return {mapray.B3dScene.B3dCube}
     */
    newChild( which )
    {
        if ( this._children === null ) {
            this._children = new Array( 8 );
            this._children.fill( null );
        }

        let child = this._children[which];

        if ( child === null ) {
            // 子供がいなければ新規に生成
            child = new B3dCube( this, which );
            this._owner._num_cube_createdd++;
            this._children[which] = child;
        }

        return child;
    }


    /**
     * @summary タイルデータを取得
     *
     * @return {?mapray.B3dBinary}  B3dBinary インスタンス、存在しなければ null
     */
    getTileData()
    {
        return (this._b3d_state === B3dState.LOADED) ? this._b3d_data : null;
    }


    /**
     * @summary メッシュ情報を取得
     *
     * @pre tile_level <= this.level
     *
     * @param {number} tile_level  希望のタイルのレベル
     *
     * @return {mapray.B3dScene.MeshNode}  メッシュ情報
     */
    getMeshNode( tile_level )
    {
        console.assert( tile_level <= this.level );

        // このノードのタイルを使えるのが理想
        const target_node = this._find_target_node( tile_level );

        // いくつかの直近ノードを検索 (tile_level のノードとその祖先の中から)
        let loaded_node = null;  // B3dState.LOADED
        let failed_node = null;  // B3dState.FAILED ノード (B3dState.LOADED までで)

        for ( let node = target_node; node !== null; node = node._parent ) {
            if ( node._b3d_state === B3dState.LOADED ) {
                loaded_node = node;
                break;
            }
            else if ( node._b3d_state === B3dState.FAILED ) {
                if ( failed_node === null ) {
                    failed_node = node;
                }
            }
        }

        // loaded_node に実際に使えるタイルがある
        console.assert( loaded_node );

        // すでにキャッシュにメッシュ情報が存在すれば取得
        if ( this._mesh_nodes === null ) {
            this._mesh_nodes = new Map();  // Map<int, MeshNode>
        }
        let mesh_node = this._mesh_nodes.get( loaded_node.level );

        // キャッシュに存在しなければ、メッシュ情報を生成して登録
        if ( mesh_node === undefined ) {
            mesh_node = new MeshNode( this, loaded_node );
            this._mesh_nodes.set( loaded_node.level, mesh_node );
        }

        // タイルのリクエストを試みる
        target_node._tryRequestTile( loaded_node, failed_node, tile_level );

        // メッシュを使ったことにする
        mesh_node.touch();

        return mesh_node;
    }


    /**
     * getMeshNode() のサブルーチン
     * @private
     */
    _find_target_node( target_level )
    {
        let node = this;

        // tile_level のノードを検索
        for ( let i = 0; i < this.level - target_level; ++i ) {
            node = node._parent;
        }
        console.assert( node.level == target_level );

        return node;
    }


    /**
     * @summary タイルのリクエストを試みる
     *
     * それぞれのパラメータの意味は getMeshNode() の実装を参照のこと。
     *
     * loaded_node, failed_node は this または this の祖先で、次の条件が成り立つ。
     *
     *  - loaded_node.level <= this.level
     *  - failed_node == null || loaded_node.level < failed_node.level
     *
     * @param {mapray.B3dScene.B3dCube}  loaded_node  現状で this に最も近い (タイルを持つ) ノード
     * @param {?mapray.B3dScene.B3dCube} failed_node
     *
     * @private
     */
    _tryRequestTile( loaded_node,
                     failed_node,
                     tile_level )
    {
        console.assert( loaded_node );

        if ( this === loaded_node ) {
            // this 自身が loaded_node なのでリクエストは不要
            return;
        }

        console.assert( loaded_node.level < this.level );

        if ( loaded_node._b3d_data.isLeaf() ) {
            // 子孫タイルは存在しないのでリクエストは不要
            return;
        }

        // 世代順のノード配列 (loaded_node, this]
        const node_routes = this._create_node_routes( loaded_node );
        console.assert( node_routes.length >= 1 );

        // loaded_node._b3d_data の既知の子孫タイルで、最も高いレベルのタイルと
        // 一致するノードを (loaded_node, this] から検索
        let cand_node = B3dCube._find_request_candidate_node( loaded_node, node_routes );
        if ( cand_node === null ) {
            // this を包含する子タイルがプロバイダに存在しない
            // リクエストするタイルがないので終了
            return;
        }

        // failed_node があるときの処理
        if ( failed_node !== null ) {
            if ( node_routes[0] === failed_node ) {
                // (loaded_node, cand_node] の先頭が failed_node なら何もしない
                // ※ 失敗したタイルの子孫は、その情報がなくなるまで取得しない方針
                return;
            }

            // 残りから failed_node の親を探しそれを候補とする
            // 見つからなければ候補はそのまま
            for ( let i = 1; i < node_routes[i]; ++i ) {
                const node = node_routes[i];
                if ( node === failed_node ) {
                    // failed_node の親を候補に変更
                    cand_node = node_routes[i - 1];
                    break;
                }
                else if ( node === cand_node ) {
                    // 候補はそのまま
                    break;
                }
            }
        }

        if ( cand_node._b3d_state === B3dState.REQUESTED ) {
            // 最終的な候補がすでにリクエスト中なので何もしない
            return;
        }
        console.assert( cand_node._b3d_state === B3dState.NONE );

        // 最終候補ノードのタイルをリクエスト
        this._push_request_queue( cand_node, { diff: tile_level - loaded_node.level, level: loaded_node.level });
    }


    /**
     * リクエストキューに追加する
     */
    _push_request_queue( node, priority ) {
        const isAscendingDirection = (a, b) => (
            a.diff > b.diff ? true:
            a.diff < b.diff ? false:
            a.level < b.level // ascending order by level if diff is the same
        );
        let index = -1;
        let old_node = null;
        const request_queue = this._owner._request_queue;
        for ( let i=request_queue.length-1; i>=0; i-- ) {
            const request = request_queue[i];
            const hasHigherPriority = isAscendingDirection( priority, request.priority );
            if ( hasHigherPriority ) {
                index = i;
            }
            if ( request.node === node ) { // the node is already queued
                if ( hasHigherPriority ) {
                    // remove the older node from the queue and update priority value
                    old_node = request_queue.splice( i, 1 )[0];
                    old_node.priority = priority;
                }
                else {
                    // newer node has lower priority
                    return;
                }
            }
        }

        if ( index === -1 ) {
            if ( B3dScene.MAX_TILE_REQUESTEDS < request_queue.length ) {
                return;
            }
            request_queue.push( old_node ?? { node, priority });
        }
        else {
            if ( B3dScene.MAX_TILE_REQUESTEDS <= index ) {
                return;
            }
            // insert the node at index
            request_queue.splice( index, 0, old_node ?? { node, priority });
        }
    }


    /**
     * _tryRequestTile() のサブルーチン
     *
     * @param {mapray.B3dScene.B3dCube} loaded_node
     *
     * @return {mapray.B3dScene.B3dCube[]}
     *
     * @private
     */
    _create_node_routes( loaded_node )
    {
        // 世代順ノード配列 (loaded_node, this]
        const node_routes = new Array( this.level - loaded_node.level );

        let node = this;
        for ( let i = node_routes.length - 1; i >= 0; --i ) {
            node_routes[i] = node;
            node = node._parent;
        }

        return node_routes;
    }


    /**
     * _tryRequestTile() のサブルーチン
     *
     * @param {mapray.B3dScene.B3dCube}   loaded_node  タイルデータを持つノード
     * @param {mapray.B3dScene.B3dCube[]} node_routes  (loaded_node, this]
     *
     * @return {?mapray.B3dScene.B3dCube}
     *
     * @private
     */
    static
    _find_request_candidate_node( loaded_node,
                                  node_routes )
    {
        const tgt_node = node_routes[node_routes.length - 1];

        // tgt_node.area_origin (A0CS) を loaded_node の座標系 (ALCS) の位置 Pa に変換
        //
        // Pa = 2^L Po - C
        //    = (1 / loaded_node.area_size) tgt_node.area_origin - loaded_node.area_origin / loaded_node.area_size
        //    = (tgt_node.area_origin - loaded_node.area_origin) / loaded_node.area_size
        //
        // ここで
        //   Po = tgt_node.area_origin
        //   L  = loaded_node.level
        //   C  = loaded_node.area_origin / loaded_node.area_size
        //
        // 文献 LargeScale3DScene の「A0CS と ALCS との間の座標変換」を参照

        const tgt_Pa = new Array( 3 );

        for ( let i = 0; i < 3; ++i ) {
            tgt_Pa[i] = (tgt_node.area_origin[i] - loaded_node.area_origin[i]) / loaded_node.area_size;
        }

        // tgt_node 領域を包含する、loaded_node タイルの子孫タイルの深さ (既知の最大深度)
        const depth = loaded_node._b3d_data.getDescendantDepth( tgt_Pa, node_routes.length );

        if ( depth > 0 ) {
            // tgt_node 以下のレベルのタイルの子孫が存在
            const index = depth - 1;
            return node_routes[Math.min( index, B3dScene.MAX_SKIP_NODES )];
        }
        else {
            // tgt_node の位置に子孫タイルは存在しない
            return null;
        }
    }


    /**
     * @summary タイルをプロバイダにリクエスト
     *
     * @private
     */
    _requestTile()
    {
        console.assert( this._b3d_state === B3dState.NONE );

        const tree = this._owner;

        const tile_coords = new Array( 3 );
        for ( let i = 0; i < 3; ++i ) {
            tile_coords[i] = this.area_origin[i] / this.area_size;
        }

        this._b3d_data = tree._provider.requestTile( this.level, tile_coords, async data => {
            if ( this._b3d_state !== B3dState.REQUESTED ) {
                // キャンセルまたは this は破棄されている
                return;
            }

            if ( data !== null ) {
                // タイルの読み込みに成功
                const b3d_binary = await B3dBinary.create( tree._glenv, tree._native, data );

                if ( this._b3d_state !== B3dState.REQUESTED ) {
                    // タイルのデコード中に、キャンセルまたは this が破棄された
                    return;
                }
                // タイルのデコードに成功

                this._b3d_state = B3dState.LOADED;
                this._b3d_data  = b3d_binary;
                this._update_tile_in_descendants_for_load();
            }
            else {
                // タイルの読み込みに失敗
                this._b3d_state = B3dState.FAILED;
                this._b3d_data  = null;
            }

            console.assert( tree._num_tile_requesteds > 0 );
            --tree._num_tile_requesteds;
        } );

        ++tree._num_tile_requesteds;
        this._b3d_state = B3dState.REQUESTED;
    }


    /**
     * @summary タイルのリクエストを取り消す
     *
     * リクエスト中ならリクエストを取り消し、状態を B3dState.NONE にする。
     */
    cancelTileRequest()
    {
        if ( this._b3d_state === B3dState.REQUESTED ) {
            const tree = this._owner;

            tree._provider.cancelRequest( this._b3d_data );
            this._b3d_state = B3dState.NONE;
            this._b3d_data  = null;

            console.assert( tree._num_tile_requesteds > 0 );
            --tree._num_tile_requesteds;
        }
    }


    /**
     * @summary アクセスフレームを更新
     */
    touch()
    {
        const owner = this._owner;

        if ( this._aframe !== owner._frame_counter ) {
            this._aframe = owner._frame_counter;
            ++owner._num_touch_cubes;
        }
    }


    /**
     * @summary 立方体とレイとの交差の有無
     *
     * @desc
     * this の立方体と線分 (ray.position を始点とし、そこから ray.direction
     * 方向に limit 距離未満にある点) が交差するかどうかを返す。
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (A0CS)
     * @param {number}   limit  制限距離
     *
     * @return {boolean}  交差の有無
     */
    isAreaCross( ray, limit )
    {
        const distance = findCubeRayDistance( this.area_origin, this.area_size, ray, limit );

        return distance != limit;
    }


    /**
     * @summary B3dCube ツリーとレイとの交点を探す
     *
     * @desc
     * <p>仕様は基本的に B3dScene#getRayIntersection() と同じである。</p>
     *
     * <p>ただし ray の座標系は A0CS で、this の立方体と線分 [ray, limit] は必ず
     *    交差していることが前提になっている。</p>
     */
    getRayIntersectionOnTree( ray, limit )
    {
        if ( this._has_tile_in_descendants ) {
            for ( let cinfo of this._children_in_crossing_order( ray, limit ) ) {
                let xinfo;  // 交差情報

                if ( cinfo instanceof B3dCube ) {
                    // 交差する子ノードがある場合は再帰する
                    xinfo = cinfo.getRayIntersectionOnTree( ray, limit );
                }
                else {
                    // そうでない場合は、自己または祖先のタイルとの交点を探す
                    xinfo = this._getRayIntersectionByPath( ray, limit, cinfo );
                }

                if ( xinfo !== null ) {
                    // 交点が見つかったので、全体の処理を終了
                    return xinfo;
                }
            }

            return null;  // 交差はなかった
        }
        else {
            /* this は末端のタイルを持か、子孫も含めてタイルを持たない */
            return this._getRayIntersectionByPath( ray, limit, this );
        }
    }


    /**
     * @summary getRayIntersectionOnTree() のサブルーチン
     *
     * @desc
     * this または this の祖先ノードで this に最も近くの (タイルを保有する) ノー
     * ドを N とする。
     *
     * ノード N のタイルとレイとの最も近い交点の情報を返す。ただし交点が見つから
     *  なければ null を返す。
     *
     * 戻り値のオブジェクトは B3dScene#getRayIntersection() と同じ形式である。
     *
     * 以上の交点検索の範囲は rect の領域に制限される。
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (A0CS)
     * @param {number}   limit  制限距離
     * @param {object}         rect              制限立方体
     * @param {mapray.Vector3} rect.area_origin  立方体の原点 (A0CS)
     * @param {number}         rect.area_size    立方体の寸法 (A0CS)
     *
     * @return {?object}  交点の情報
     *
     * @private
     */
    _getRayIntersectionByPath( ray, limit, rect )
    {
        let tnode;  // タイルを持つ直近ノード
        for ( tnode = this; tnode.getTileData() === null; tnode = tnode._parent ) {}

        console.assert( tnode !== null && tnode.getTileData() !== null );

        // ray を A0CS から tnode での ALCS に変換 -> tray
        const tray = new Ray();
        for ( let i = 0; i < 3; ++i ) {
            tray.position[i]  = (ray.position[i] - tnode.area_origin[i]) / tnode.area_size;
            tray.direction[i] = ray.direction[i] / tnode.area_size;
        }

        // rect を A0CS から tnode での ALCS に変換 -> trect_*
        const trect_origin = GeoMath.createVector3();
        const trect_size   = rect.area_size / tnode.area_size;
        for ( let i = 0; i < 3; ++i ) {
            trect_origin[i] = (rect.area_origin[i] - tnode.area_origin[i]) / tnode.area_size;
        }

        // タイルに処理を任せる
        const tile = tnode.getTileData();
        return tile.getRayIntersection( tray, limit, trect_origin, trect_size );
    }


    /**
     * レイと交差する this の子領域情報の列挙可能オブジェクトを取得する。
     *
     * 子領域情報はレイの視点から交差する位置が近い順に列挙される。
     *
     * 子領域情報は B3dCube インスタンスまたは、立方体情報オブジェクトのどちらか
     * である。
     *
     * 立方体情報オブジェクトはその子領域を表す area_origin プロパティと
     * area_size プロパティを持つ (このプロパティは B3dCube インスタンスも持つ)。
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (A0CS)
     * @param {number}   limit  制限距離
     *
     * @return {iterable.<object>}
     *
     * @private
     */
    _children_in_crossing_order( ray, limit )
    {
        const child_origin = GeoMath.createVector3();
        const   child_size = this.area_size / 2;

        const order_list = [];

        for ( let w = 0; w < 8; ++w ) {
            // 子領域の原点を設定
            for ( let i = 0; i < 3; ++i ) {
                child_origin[i] = this.area_origin[i] + child_size * ((w >> i) & 1);
            }

            const distance = findCubeRayDistance( child_origin, child_size, ray, limit );

            if ( distance != limit ) {
                // w の子領域が交差するので order_list に情報を追加
                let cinfo = (this._children !== null) ? this._children[w] : null;

                if ( cinfo === null ) {
                    cinfo = {
                        area_origin: GeoMath.createVector3( child_origin ),
                        area_size:   child_size
                    };
                }

                order_list.push( { distance, cinfo } );
            }
        }

        // 最低 1 つの子領域が交差するはず
        console.assert( order_list.length >= 1 );

        // ノードを視点から近い順に並び替える
        order_list.sort( (a, b) => a.distance - b.distance );

        // order_list から反復可能オブジェクトを生成
        const children = new Array( order_list.length );

        for ( let i = 0; i < order_list.length; ++i ) {
            children[i] = order_list[i].cinfo;
        }

        return children;
    }


    /**
     * @summary 自己と子孫を破棄
     *
     * this と this の子孫を破棄し、this の親から this を削除する。
     *
     * ※ このメソッドを呼び出した後は、他のメソッドを呼び出すことはできない。
     */
    dispose()
    {
        console.assert( this._level != 0 ); // 最上位ノードは破棄されない

        if ( this._parent === null ) {
            // すでに破棄済み
            return;
        }

        if ( this._b3d_state === B3dState.REQUESTED ) {
            this.cancelTileRequest();
        }
        else if ( this._b3d_state === B3dState.LOADED ) {
            this._b3d_data.dispose();
        }

        this._b3d_state = B3dState.NONE;
        this._b3d_data  = null;

        // メッシュを破棄
        if ( this._mesh_nodes !== null ) {
            for ( let mesh_node of Array.from( this._mesh_nodes.values() ) ) {
                mesh_node.dispose();
            }
            console.assert( this._mesh_nodes === null || this._mesh_nodes.size == 0 );
        }

        // 子孫を破棄
        if ( this._children !== null ) {
            for ( let child of this._children ) {
                if ( child !== null ) {
                    child.dispose();
                }
            }
            this._children = null;
        }

        // 子孫にタイルが存在しないことにする
        // 上の処理により this 自体にもタイルは存在しない
        this._has_tile_in_descendants = false;

        if ( this._parent !== null ) {
            this._parent._update_tile_in_descendants_for_kill();
        }

        // 親ノードから this を削除
        const my_index = this._parent._children.indexOf( this );
        this._parent._children[my_index] = null;
        this._parent = null;

        // B3dCube 数を減らす
        --this._owner._num_tree_cubes;
    }


    /**
     * タイル読み込み時の _has_tile_in_descendants プロパティ更新
     *
     * これは this が B3dBinary インスタンスを所有したことによる、祖先ノードの
     * 状態変化である。
     *
     * @private
     */
    _update_tile_in_descendants_for_load()
    {
        for ( let cube = this._parent; cube !== null; cube = cube._parent ) {
            if ( cube._has_tile_in_descendants ) {
                // すでに子孫がタイルデータを持っていることになっている
                // cube の祖先もそうなっているはずなので、ここで終了する
                break;
            }
            else {
                // 子孫がタイルデータを持っていることにする
                cube._has_tile_in_descendants = true;
            }
        }
    }


    /**
     * Cube インスタンス破棄時の _has_tile_in_descendants プロパティ更新
     *
     * これは this が破棄されたことによる、祖先ノードの状態変化である。
     *
     * @private
     */
    _update_tile_in_descendants_for_kill()
    {
        if ( !this._has_tile_in_descendants ) {
            // すでに this の子孫にタイルが存在しないことになっている。そのため this も
            // this の祖先も変更しない。
            return;
        }

        // this の子ノードが削除されたので this._has_tile_in_descendants を true から
        // false に変えなければならない可能性がある。そして this が変われば this の
        // 親も変えなければならない可能性がある。これが最上位ノードまで続く可能性が
        // ある。

        for ( let cube = this; cube !== null; cube = cube._parent ) {
            // cube のある子ノード child が child._has_tile_in_tree() なら、cube とその
            // 祖先を変える必要はない。そうでなければ cube を変える必要がある。

            console.assert( cube._has_tile_in_descendants );

            for ( let child of cube._children ) {
                if ( child !== null && child._has_tile_in_tree() ) {
                    // cube の子孫にタイルが存在することが分かったので、cube とその祖先は
                    // 変更しない
                    return;
                }
            }

            // cube の子孫にタイルが存在しなくなったことが分かったので、cube を変更する
            cube._has_tile_in_descendants = false;
        }
    }


    /**
     * 自己または子孫にタイルデータは存在するか？
     *
     * @private
     */
    _has_tile_in_tree()
    {
        return (this.getTileData() !== null) || this._has_tile_in_descendants;
    }


    /**
     * @summary 自己と子孫の平坦化リストを取得
     *
     * @return {mapray.B3dScene.B3dCube[]}
     */
    getCubesFlattened()
    {
        const list = [];

        this.flattenCubesRecur( list );

        return list;
    }


    /**
     * @summary 自己と子孫に存在する MeshNode インスタンスを取得
     *
     * @return {mapray.B3dScene.MeshNode[]}
     */
    getMeshesFlattened()
    {
        const list = [];

        this.flattenMeshesRecur( list );

        return list;
    }


    /**
     * @summary 削減優先順位のための比較
     *
     * @param  {mapray.B3dScene.B3dCube} other  比較対象
     * @return {number}                        比較値
     */
    compareForReduce( other )
    {
        // 最近アクセスしたものを優先
        // 同じならレベルが小さい方を優先

        let a = this;
        let b = other;
        let aframe = b._aframe - a._aframe;

        return (aframe !== 0) ? aframe : a.level - b.level;
    }


    /**
     * @private
     */
    flattenCubesRecur( list )
    {
        list.push( this );

        if ( this._children !== null ) {
            for ( let child of this._children ) {
                if ( child !== null ) {
                    child.flattenCubesRecur( list );
                }
            }
        }
    }


    /**
     * @private
     */
    flattenMeshesRecur( list )
    {
        if ( this._mesh_nodes !== null ) {
            for ( let mesh_node of this._mesh_nodes.values() ) {
                list.push( mesh_node );
            }
        }

        if ( this._children !== null ) {
            for ( let child of this._children ) {
                if ( child !== null ) {
                    child.flattenMeshesRecur( list );
                }
            }
        }
    }


    /**
     * @summary 最上位 Cube 専用の設定
     *
     * 最上位 Cube を外部から B3dState.LOADED 状態に設定する。
     *
     * ※ B3dScene のみが使用
     *
     * @param {mapray.B3dScene}       owner  ツリーを所有するオブジェクト
     * @param {mapray.B3dBinary} b3d_binary  B3dBinary インスタンス
     *
     * @package
     */
    $$setupRootNode( owner, b3d_binary )
    {
        console.assert( b3d_binary instanceof B3dBinary );

        this._owner     = owner;
        this._b3d_state = B3dState.LOADED;
        this._b3d_data  = b3d_binary;

        ++owner._num_tree_cubes;
    }

}


/**
 * @summary B3dScene のメッシュ情報
 *
 * @memberof mapray.B3dScene
 * @private
 */
class MeshNode {

    /**
     * @param {mapray.B3dScene.B3dCube} owner      this を所有するノード
     * @param {mapray.B3dScene.B3dCube} tile_cube  タイルを持つノード
     */
    constructor( owner,
                 tile_cube )
    {
        this._cube = owner;
        this._key  = tile_cube.level;  // owner._mesh_nodes での this のキー

        this._mesh_to_a0cs = MeshNode._get_area_to_a0cs( tile_cube );

        // クリップ立方体の寸法 (メッシュ座標系)
        this._clip_size = owner.area_size / tile_cube.area_size;

        console.assert( Number.isSafeInteger( 1 / this._clip_size ) );
        console.assert( 0 < this._clip_size && this._clip_size <= 1 );

        // クリップ立方体の原点 (メッシュ座標系)
        this._clip_origin = GeoMath.createVector3();
        for ( let i = 0; i < 3; ++i ) {
            this._clip_origin[i] = (owner.area_origin[i] - tile_cube.area_origin[i]) / tile_cube.area_size;

            console.assert( Number.isSafeInteger( this._clip_origin[i] / this._clip_size ) );
            console.assert( 0 <= this._clip_origin[i] && this._clip_origin[i] < 1 );
        }

        // キャッシュ関連
        this._aframe = -1;

        const tree = owner._owner;
        ++tree._num_tree_meshes;

        // メッシュを生成
        this._tile_mesh = tile_cube._b3d_data.clip( this._clip_origin, this._clip_size ) || MeshNode.EMPTY_TILE_MESH;
        this._tile_texture = tile_cube._b3d_data.getTexture();
        this._area_mesh = null;  // 立方体ワイヤーフレームメッシュ
    }


    /**
     * @summary メッシュはクリップされているか？
     *
     * @return {boolean}
     */
    isClipped()
    {
        return this._clip_size != 1;
    }


    /**
     * @summary Mesh は幾何を持っているか？
     *
     * @return {boolean}
     */
    hasGeometry()
    {
        return this._tile_mesh !== MeshNode.EMPTY_TILE_MESH;
    }


    /**
     * @summary メッシュを取得
     *
     * hasGeometry() == false のとき、動作は不定である。
     *
     * @return {mapray.Mesh}
     */
    getTileMesh()
    {
        console.assert( this.hasGeometry() );

        return this._tile_mesh;
    }


    /**
     * @summary テクスチャを取得
     *
     * @return {?mapray.Texture}
     */
    getTileTexture()
    {
        return this._tile_texture;
    }


    /**
     * @summary メッシュの位置座標から A0CS への変換行列を取得
     *
     * @return {mapray.Matrix}
     */
    getTransform()
    {
        return this._mesh_to_a0cs;
    }


    /**
     * @summary 領域メッシュ (ワイヤーフレーム) を取得
     *
     * @return {mapray.Mesh}
     */
    getAreaMesh( glenv )
    {
        if ( this._area_mesh === null ) {
            // メッシュ生成
            const mesh_data = {
                vtype: [
                    { name: "a_position", size: 3 }
                ],
                ptype:    "lines",
                vertices: this._createCubeVertices( this._clip_origin, this._clip_size ),
                indices:  this._createCubeIndices()
            };

            this._area_mesh = new Mesh( glenv, mesh_data );
        }

        return this._area_mesh;
    }


    /**
     * @summary 削減優先順位のための比較
     *
     * @param  {mapray.B3dScene.MeshNode} other  比較対象
     * @return {number}                          比較値
     */
    compareForReduce( other )
    {
        // 最近アクセスしたものを優先
        const a = this;
        const b = other;
        return b._aframe - a._aframe;
    }


    /**
     * @summary アクセスフレームを更新
     */
    touch()
    {
        const tree = this._cube._owner;

        if ( this._aframe !== tree._frame_counter ) {
            this._aframe = tree._frame_counter;
            ++tree._num_touch_meshes;
        }
    }


    /**
     * @summary インスタンスを破棄
     *
     * this のリソースを破棄し、this を所有する B3dCube インスタンスから this
     * を削除する。
     *
     * ※ このメソッドを呼び出した後は、他のメソッドを呼び出すことはできない。
     */
    dispose()
    {
        if ( this._tile_mesh !== null && this._tile_mesh !== MeshNode.EMPTY_TILE_MESH ) {
            this._tile_mesh.dispose();
            this._tile_mesh = null;
        }

        this._tile_texture = null;

        if ( this._area_mesh !== null ) {
            this._area_mesh.dispose();
            this._area_mesh = null;
        }

        const cube = this._cube;  // this の所有者
        console.assert( cube._mesh_nodes.get( this._key ) === this );

        // cube から this を削除
        cube._mesh_nodes.delete( this._key );
        if ( cube._mesh_nodes.size == 0 ) {
            cube._mesh_nodes = null;
        }

        // キャッシュ用カウント
        const tree = cube._owner;
        --tree._num_tree_meshes;
    }


    /**
     * @private
     */
    _createCubeVertices( origin, size )
    {
        let vertices = new Float32Array( 3 * 8 );

        for ( let i = 0; i < 8; ++i ) {
            vertices[3*i    ] = origin[0] + size * (i        & 1);
            vertices[3*i + 1] = origin[1] + size * ((i >> 1) & 1);
            vertices[3*i + 2] = origin[2] + size * ((i >> 2) & 1);
        }

        return vertices;
    }


    /**
     * @private
     */
    _createCubeIndices()
    {
        let indices = new Uint16Array( 12 * 2 );

        indices[ 0] = 0;
        indices[ 1] = 1;
        indices[ 2] = 2;
        indices[ 3] = 3;
        indices[ 4] = 4;
        indices[ 5] = 5;
        indices[ 6] = 6;
        indices[ 7] = 7;

        indices[ 8] = 0;
        indices[ 9] = 2;
        indices[10] = 1;
        indices[11] = 3;
        indices[12] = 4;
        indices[13] = 6;
        indices[14] = 5;
        indices[15] = 7;

        indices[16] = 0;
        indices[17] = 4;
        indices[18] = 1;
        indices[19] = 5;
        indices[20] = 2;
        indices[21] = 6;
        indices[22] = 3;
        indices[23] = 7;

        return indices;
    }


    /**
     * @summary cube から A0CS への変換行列を取得
     *
     * @param {mapray.B3dScene.B3dCube} cube
     *
     * @return {mapray.Matrix}
     *
     * @private
     */
    static
    _get_area_to_a0cs( cube )
    {
        const matrix = GeoMath.setIdentity( GeoMath.createMatrix() );

        matrix[ 0] = cube.area_size;
        matrix[ 5] = cube.area_size;
        matrix[10] = cube.area_size;

        for ( let i = 0; i < 3; ++i ) {
            matrix[12 + i] = cube.area_origin[i];
        }

        return matrix;
    }

}


/**
 * @summary 履歴統計
 *
 * todo: Globe.js と共通化
 *
 * @memberof mapray.B3dScene
 * @private
 */
class HistStats {

    constructor( hsize = 200 )
    {
        console.assert( hsize >= 3 );

        this._max_value = -Number.MAX_VALUE;

        this._history = new Float64Array( hsize );
        this._history.fill( this._max_value );

        this._bindex = 0;
        this._eindex = 0;
        this._length = hsize;
    }


    /**
     * @summary 最大値を取得
     */
    getMaxValue( value )
    {
        const old_max = this._max_value;

        if ( value >= old_max ) {
            // 最大値は value に変わる
            this._max_value = value;
            this._pop_front();
        }
        else if ( this._get_front() < old_max ) {
            // 最大値は変わらず
            this._pop_front();
        }
        else {
            // 最大値は変わる可能性がある
            this._pop_front();
            this._max_value = this._find_max();
        }

        this._push_back( value );

        return this._max_value;
    }


    /**
     * @return {number}
     * @private
     */
    _get_front()
    {
        console.assert( this._length > 0 );

        return this._history[this._bindex];
    }


    /**
     * @param {number} value
     * @private
     */
    _push_back( value )
    {
        console.assert( this._length < this._history.length );

        this._history[this._eindex] = value;

        if ( ++this._eindex == this._history.length ) {
            this._eindex = 0;
        }

        ++this._length;
    }


    /**
     * @private
     */
    _pop_front()
    {
        console.assert( this._length > 0 );

        if ( ++this._bindex == this._history.length ) {
            this._bindex = 0;
        }

        --this._length;
    }


    /**
     * @return {number}
     * @private
     */
    _find_max()
    {
        console.assert( this._length > 0 );

        const history = this._history;
        let     index = this._bindex;

        let max_value = history[index];

        for ( let i = 1; i < this._length; ++i ) {
            if ( ++index == history.length ) {
                index = 0;
            }

            if ( history[index] > max_value ) {
                max_value = history[index];
            }
        }

        return max_value;
    }

}


/**
 * @summary B3dScene 状態の列挙型
 * @enum {object}
 * @memberof mapray.B3dScene
 * @constant
 * @see mapray.B3dScene#status
 * @private
 */
var TreeState = {

    /**
     * 準備中 (初期状態)
     */
    NOT_READY: { id: "NOT_READY" },

    /**
     * 準備完了
     */
    READY: { id: "READY" },

    /**
     * 失敗状態
     *
     * 初期化に失敗またはキャンセルされた。
     */
    FAILED: { id: "FAILED" }

};


/**
 * @summary B3D タイルの状態の列挙型
 * @enum {object}
 * @memberof mapray.B3dScene.B3dCube
 * @constant
 * @see mapray.B3dScene.B3dCube#status
 */
var B3dState = {

    /**
     * B3D タイルが存在しない
     */
    NONE: { id: "NONE" },

    /**
     * B3D タイルが存在する
     */
    LOADED: { id: "LOADED" },

    /**
     * B3D タイルをリクエスト中
     */
    REQUESTED: { id: "REQUESTED" },

    /**
     * B3D タイルのリクエストに失敗
     */
    FAILED: { id: "FAILED" }

};


/**
 * @summary 立方体とレイとの交点を探す
 *
 * @desc
 * 立方体 (原点 が origin で寸法 size) と線分 (ray.position を始点とし、そこ
 * から ray.direction 方向に limit 距離未満にある点) との交点の中で、始点か
 * ら最も近い交点までの距離を返す。ただし立方体と線分が交差しないときは
 * limit を返す。
 *
 * @param {mapray.Vector3} origin  立方体の原点
 * @param {number}           size  立方体の寸法
 * @param {mapray.Ray}        ray  半直線を表すレイ
 * @param {number}          limit  制限距離
 *
 * @return {number}  交点までの距離
 *
 * @see 文献 LargeScale3DScene の「レイと直方体の交差」
 *
 * @private
 */
function
findCubeRayDistance( origin, size, ray, limit )
{
    // P_0 = origin
    // P_1 = origin + size
    //   q = ray.position
    //   r = ray.direction

    let tmin = 0;
    let tmax = limit;

    for ( let i = 0; i < 3; ++i ) {
        const rni = ray.direction[i];  // r . n_i

        if ( rni != 0 ) {
            // tA = ((P_0 - q) . n_i) / (r . n_i)
            // tB = ((P_1 - q) . n_i) / (r . n_i)
            const tA = (origin[i]        - ray.position[i]) / rni;
            const tB = (origin[i] + size - ray.position[i]) / rni;

            const t0 = (rni > 0) ? tA : tB;
            const t1 = (rni > 0) ? tB : tA;
            console.assert( t0 < t1 );

            tmin = Math.max( t0, tmin );
            tmax = Math.min( t1, tmax );

            if ( tmin >= tmax ) {
                // 共通区間が存在しないので交差しない
                return limit;
            }
        }
        else { // rni == 0
            if ( (ray.position[i] - origin[i]        <  0) ||
                 (ray.position[i] - origin[i] - size >= 0) ) {
                // すべての i において、以下が満たされないので交差しない
                // (q - P_0) . n_i >= 0
                // (q - P_1) . n_i < 0
                return limit;
            }
        }
    }

    console.assert( tmin < tmax );
    return tmin;
}


B3dScene.DEFAULT_LOD_FACTOR = 2.0;
B3dScene.MIN_LOD_FACTOR     = 0.5;

B3dScene.RADIUS_FACTOR = Math.sqrt( 3 );

// LEVEL_INTERVAL が小さすぎるとタイルの分割が多くなり、
// 大きすぎるとレベルの誤差が大きくなる
// レベルの誤差は最大で (LEVEL_INTERVL + 1) / 2
B3dScene.LEVEL_INTERVAL = 0.5;

B3dScene.CUBE_REDUCE_THRESH = 1.5;  // B3dCube 削減閾値
B3dScene.CUBE_REDUCE_FACTOR = 1.2;  // B3dCube 削減係数

B3dScene.MESH_REDUCE_LOWER  = 300;  // この個数以下なら削減しない
B3dScene.MESH_REDUCE_THRESH = 1.5;  // MeshNode 削減閾値
B3dScene.MESH_REDUCE_FACTOR = 1.2;  // MeshNode 削減係数

B3dScene.MAX_TILE_REQUESTEDS = 15;  // リクエスト中のリクエスト数の最大値

// 現在読み込まれているレベルと次に読み込むレベルの差を制限する
// 1は強制的に次のレベルを読み込むように制限することを意味する
B3dScene.MAX_SKIP_NODES = 1;

MeshNode.EMPTY_TILE_MESH = { id: "EMPTY_TILE_MESH" };


export default B3dScene;
