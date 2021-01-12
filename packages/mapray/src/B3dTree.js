import GeoMath from "./GeoMath";
import Mesh from "./Mesh";
import B3dNative from "./B3dNative";
import B3dBinary from "./B3dBinary";
import B3dMaterial from "./B3dMaterial";
import B3dCubeMaterial from "./B3dCubeMaterial";
import WasmTool from "./WasmTool";
import b3dtile_factory from "./wasm/b3dtile.js";


/**
 * @summary B3dCube を管理
 *
 * @memberof mapray
 * @private
 */
class B3dTree {

    /**
     * @param {mapray.B3dCollection}  owner  this の所有者
     * @param {mapray.B3dProvider} provider  B3D プロバイダ
     */
    constructor( owner, provider )
    {
        this._owner     = owner;
        this._provider  = provider;
        this._status    = TreeState.NOT_READY;
        this._native    = null;
        this._root_cube = null;

        // 幾何計算関連
        this._rho          = undefined;
        this._a0cs_to_gocs = undefined;
        this._lod_factor   = B3dTree.DEFAULT_LOD_FACTOR;  // TODO: パラメータ化により外部から指定

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

        if ( owner.getWasmModule() ) {
            this._startInitialization( owner.getWasmModule() );
        }
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
            for ( let cube of this._root_cube.flatten() ) {
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
     */
    draw( stage )
    {
        if ( this._status !== TreeState.READY ) {
            // 描画できる状態ではない
            return;
        }

        (new B3dStage( this, stage )).render();
    }


    /**
     * @summary フレーム終了処理
     */
    endFrame()
    {
        if ( this._status !== TreeState.READY ) {
            // 描画できる状態ではない
            return;
        }

        console.assert( this._num_tree_cubes >= this._num_touch_cubes );
        console.assert( this._num_tree_meshes >= this._num_touch_meshes );
        console.assert( this._num_touch_cubes >= 1 );

        this._reduceCubesIfNecessary();
        this._reduceMeshesIfNecessary();

        // 次のフレームのカウンターを準備
        this._num_touch_cubes  = 0;
        this._num_touch_meshes = 0;
        ++this._frame_counter;
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
                   em_module] = await Promise.all( [this._getRootTile(),
                                                    WasmTool.createEmObjectByModule( wa_module,
                                                                                     b3dtile_factory )] );

            this._native = new B3dNative( em_module );

            // 基底 Cube のタイルを設定
            this._root_cube = new B3dCube( null, -1 );
            this._root_cube.$$setupRootNode( this, tile_data );

            this._status = TreeState.READY;
        }
        catch ( e ) {
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
    _getRootTile()
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
        if ( (metadata.format === undefined) || (metadata.format > 1) ) {
            // 未対応の形式
            throw Error( "b3dtile format error" );
        }

        // メタデータを取得
        this._rho          = metadata.rho;
        this._a0cs_to_gocs = GeoMath.createMatrix( metadata.transform );
    }


    /**
     * @summary 必要なら B3dCube インスタンスを削減
     *
     * @private
     */
    _reduceCubesIfNecessary()
    {
        const max_touch_cubes = this._hist_stats.getMaxValue( this._num_touch_cubes );

        if ( this._num_tree_cubes <= B3dTree.CUBE_REDUCE_THRESH * max_touch_cubes ) {
            // 最近使用した cube 数に対してツリー上の cube 数はそれほど
            // 多くないので、まだ削減しない
            return;
        }

        // B3dCube を集めて、優先度で整列
        const tree_cubes = this._root_cube.getCubesFlattened();
        console.assert( tree_cubes.length == this._num_tree_cubes );

        tree_cubes.sort( (a, b) => a.compareForReduce( b ) );

        // 優先度の低い B3dCube を削除
        const num_tree_cubes = Math.floor( B3dTree.CUBE_REDUCE_FACTOR * max_touch_cubes );

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
        if ( this._num_tree_meshes <= B3dTree.MESH_REDUCE_LOWER ) {
            // ツリー上のメッシュの絶対数がそれほど多くないので、
            // まだ削減しない
            return;
        }

        if ( this._num_tree_meshes <= B3dTree.MESH_REDUCE_THRESH * this._num_touch_meshes ) {
            // 現行フレームで使用したメッシュ数に対してツリー上のメッシュは
            // それほど多くないので、まだ削減しない
            return;
        }

        // MeshNode を集めて、優先度で整列
        const tree_meshes = this._root_cube.getMeshesFlattened();
        console.assert( tree_meshes.length == this._num_tree_meshes );
        tree_meshes.sort( (a, b) => a.compareForReduce( b ) );

        // 優先度の低い MeshNode を削除
        const num_tree_meshes = Math.floor( B3dTree.MESH_REDUCE_FACTOR * this._num_touch_meshes );

        for ( let mesh_node of tree_meshes.slice( num_tree_meshes ) ) {
            mesh_node.dispose();
        }
        console.assert( this._num_tree_meshes == num_tree_meshes );
    }

}


/**
 * @summary B3dTree のレンダリングサブステージ
 *
 * @memberof mapray.B3dTree
 * @private
 */
class B3dStage {

    /**
     * @param {mapray.B3dTree}     tree    クライアント B3dTree
     * @param {mapray.RenderStage} pstage  親レンダリングステージ
     */
    constructor( tree, pstage )
    {
        this._provider = tree._provider;
        this._glenv    = pstage._glenv;
        this._native   = tree._native;
        this._shader_cache = tree._owner.shader_cache;

        let viewer = pstage._viewer;
        let lod_factor = viewer.b3d_degug.lod_factor;
        this._render_mode = viewer.b3d_degug.render_mode;

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
        this._mesh_node_list = [];
        this._traverse_recur( this._root_cube );
    }


    /**
     * @summary cube とその子孫をトラバース
     *
     * @param {mapray.B3dTree.B3dCube} cube
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
            mesh_node.$$ensure( this._glenv );

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
     * @param {mapray.B3dTree.B3dCube} cube
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
     * @param {mapray.B3dTree.B3dCube} cube
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
        const radius = h * B3dTree.RADIUS_FACTOR;

        // 視点から cube までの最小深度距離 (A0CS)
        const min_depth = depth - radius;

        if ( min_depth <= 0 ) {
            // 視点と同じか後方に cube の点が存在する可能性がある
            // LOD が計算できないので分割
            return -1;
        }

        // cube 内のタイルのレベルの最小値と最大値 (連続値)
        const min_level = this._lod_offset - Math.maprayLog2( depth + radius );
        const max_level = this._lod_offset - Math.maprayLog2( min_depth );

        if ( max_level - min_level >= B3dTree.LEVEL_INTERVAL ) {
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
        let material = this._getMaterial();

        material.bindProgram();

        for ( let mesh_node of this._mesh_node_list ) {

            // TEST
            this._clip_flag = (mesh_node._clip_size != 1);

            material.setParameters( this, mesh_node.getTransform() );
            let mesh = mesh_node.getTileMesh();
            mesh.draw( material );
        }

        if ( this._render_mode == 1 ) {
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
    _getMaterial()
    {
        let cache = this._shader_cache;

        if ( cache._B3dMaterial === undefined ) {
            cache._B3dMaterial = new B3dMaterial( this._glenv );
        }

        return cache._B3dMaterial;
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
 * @summary B3dTree の立方体ノード
 *
 * @memberof mapray.B3dTree
 * @private
 */
class B3dCube {

    /**
     * @param {?mapray.B3dTree.B3dCube} parent  親ノード (最上位の場合は null)
     * @param {number}                  which   子インデックス (最上位の場合は無視)
     */
    constructor( parent, which )
    {
        this._owner      = undefined;
        this._parent     = parent;
        this._children   = null;  // 配列は必要になってから生成
        this._b3d_state  = B3dState.NONE;
        this._b3d_data   = null;  // B3dBinary または cancel ID または null
        this._mesh_nodes = null;  // Map<int, MeshNode>
        this._aframe     = -1;

        /**
         *  @summary 領域の原点 (A0CS)
         *
         *  ※ 誤差なしの厳密値を想定している。
         *
         *  @member mapray.B3dTree.B3dCube
         *  @type {number[]}
         */
        this.area_origin = undefined;

        /**
         *  @summary 領域の寸法 (A0CS)
         *
         *  ※ 誤差なしの厳密値を想定している。
         *
         *  @member mapray.B3dTree.B3dCube
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
         *  @member mapray.B3dTree.B3dCube
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
     * @return {mapray.B3dTree.B3dCube}
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
     * @return {mapray.B3dTree.MeshNode}  メッシュ情報
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
        target_node._tryRequestTile( loaded_node, failed_node );

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
     * @param {mapray.B3dTree.B3dCube}  loaded_node  現状で this に最も近い (タイルを持つ) ノード
     * @param {?mapray.B3dTree.B3dCube} failed_node
     *
     * @private
     */
    _tryRequestTile( loaded_node,
                     failed_node )
    {
        console.assert( loaded_node );

        if ( this._owner._num_tile_requesteds >= B3dTree.MAX_TILE_REQUESTEDS ) {
            // 要求が最大数に達しているので受け入れない
            return;
        }

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
        cand_node._requestTile();
    }


    /**
     * _tryRequestTile() のサブルーチン
     *
     * @param {mapray.B3dTree.B3dCube} loaded_node
     *
     * @return {mapray.B3dTree.B3dCube[]}
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
     * @param {mapray.B3dTree.B3dCube}   loaded_node  タイルデータを持つノード
     * @param {mapray.B3dTree.B3dCube[]} node_routes  (loaded_node, this]
     *
     * @return {?mapray.B3dTree.B3dCube}
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
            return node_routes[index];
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

        const native = tree._native;
        console.assert( native );

        const tile_coords = new Array( 3 );
        for ( let i = 0; i < 3; ++i ) {
            tile_coords[i] = this.area_origin[i] / this.area_size;
        }

        this._b3d_data = tree._provider.requestTile( this.level, tile_coords, data => {
            if ( this._b3d_state !== B3dState.REQUESTED ) {
                // キャンセルまたは this は破棄されている
                return;
            }

            if ( data !== null ) {
                // タイルの読み込みに成功
                this._b3d_state = B3dState.LOADED;
                this._b3d_data  = new B3dBinary( native, data );
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

        // 親ノードから this を削除
        const my_index = this._parent._children.indexOf( this );
        this._parent._children[my_index] = null;
        this._parent = null;

        // B3dCube 数を減らす
        --this._owner._num_tree_cubes;
    }


    /**
     * @summary 自己と子孫の平坦化リストを取得
     *
     * @return {mapray.B3dTree.B3dCube[]}
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
     * @return {mapray.B3dTree.MeshNode[]}
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
     * @param  {mapray.B3dTree.B3dCube} other  比較対象
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
     * ※ B3dTree のみが使用
     *
     * @param {mapray.B3dTree} owner  ツリーを所有するオブジェクト
     * @param {ArrayBuffer}     data  バイナリデータ
     *
     * @package
     */
    $$setupRootNode( owner, data )
    {
        console.assert( data );

        const native = owner._native;
        console.assert( native );

        this._owner     = owner;
        this._b3d_state = B3dState.LOADED;
        this._b3d_data  = new B3dBinary( native, data );

        ++owner._num_tree_cubes;
    }

}


/**
 * @summary B3dTree のメッシュ情報
 *
 * @memberof mapray.B3dTree
 * @private
 */
class MeshNode {

    /**
     * @param {mapray.B3dTree.B3dCube} owner      this を所有するノード
     * @param {mapray.B3dTree.B3dCube} tile_cube  タイルを持つノード
     */
    constructor( owner,
                 tile_cube )
    {
        this._cube = owner;
        this._key  = tile_cube.level;  // owner._mesh_nodes での this のキー

        this._tile_mesh = null;  // tile_cube のタイルを owner の領域で切り取ったメッシュ
        this._area_mesh = null;  // 立方体ワイヤーフレームメッシュ

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

        // ensure() で必要
        this._tile_data = tile_cube._b3d_data;
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
        return this._tile_mesh;
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
     * @param  {mapray.B3dTree.MeshNode} other  比較対象
     * @return {number}                         比較値
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
     * @summary メッシュを使えるようにする
     *
     * ※ アルゴリズムと本質的に関係ない glenv を深いところまで持ち運ばないように、
     *    構築子と処理を分けた。B3dStage が使用する専用メソッドである。
     *
     * @param {mapray.GlEnv} glenv
     *
     * @package
     */
    $$ensure( glenv )
    {
        if ( this._tile_mesh !== null ) {
            // すでに処理済み
            return;
        }

        // メッシュを生成
        this._tile_mesh = this._tile_data.clip( glenv, this._clip_origin, this._clip_size ) || MeshNode.EMPTY_TILE_MESH;
    }


    /**
     * @summary cube から A0CS への変換行列を取得
     *
     * @param {mapray.B3dTree.B3dCube} cube
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
 * @memberof mapray.B3dTree
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
 * @summary B3dTree 状態の列挙型
 * @enum {object}
 * @memberof mapray.B3dTree
 * @constant
 * @see mapray.B3dTree#status
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
 * @memberof mapray.B3dTree.B3dCube
 * @constant
 * @see mapray.B3dTree.B3dCube#status
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


B3dTree.DEFAULT_LOD_FACTOR = 4.0;

B3dTree.RADIUS_FACTOR = Math.sqrt( 3 );

// LEVEL_INTERVAL が小さすぎるとタイルの分割が多くなり、
// 大きすぎるとレベルの誤差が大きくなる
// レベルの誤差は最大で (LEVEL_INTERVL + 1) / 2
B3dTree.LEVEL_INTERVAL = 0.5;

B3dTree.CUBE_REDUCE_THRESH = 1.5;  // B3dCube 削減閾値
B3dTree.CUBE_REDUCE_FACTOR = 1.2;  // B3dCube 削減係数

B3dTree.MESH_REDUCE_LOWER  = 300;  // この個数以下なら削減しない
B3dTree.MESH_REDUCE_THRESH = 1.5;  // MeshNode 削減閾値
B3dTree.MESH_REDUCE_FACTOR = 1.2;  // MeshNode 削減係数

B3dTree.MAX_TILE_REQUESTEDS = 15;  // リクエスト中のリクエスト数の最大値

MeshNode.EMPTY_TILE_MESH = { id: "EMPTY_TILE_MESH" };


export default B3dTree;
