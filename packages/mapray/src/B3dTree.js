import Area3D from "./Area3D";
import GeoMath from "./GeoMath";
import B3dBinary from "./B3dBinary";
import Mesh from "./Mesh";
import B3dMaterial from "./B3dMaterial";
import B3dCubeMaterial from "./B3dCubeMaterial";


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
        this._status    = TreeState.REQ_META;
        this._root_cube = new B3dCube();

        this._rho          = undefined;
        this._a0cs_to_gocs = undefined;
        this._lod_factor   = B3dTree.DEFAULT_LOD_FACTOR;  // TODO: パラメータ化により外部から指定

        this._frame_counter = 0;  // 現行フレーム番号

        this._meta_red_id = provider.requestMeta( data => this._setupMetaData( data ) );
    }


    /**
     * @summary リクエストの取り消しを試みる
     */
    cancel()
    {
        this._status = TreeState.CANCELLED;

        if ( this._status === TreeState.REQ_META ) {
            this._provider.cancelRequest( this._meta_red_id );
            this._meta_red_id = null;  // 不要になったので捨てる
        }
        else if ( this._status === TreeState.REQ_ROOT ) {
            this._root_cube.cancelRequest( this._provider );
        }
        else if ( this._status === TreeState.NORMAL ) {
            // TODO: ツリー上の REQUESTED をキャンセル
        }
    }


    /**
     * @summary 描画処理
     *
     * @param {mapray.RenderStage} stage
     */
    draw( stage )
    {
        if ( this._status !== TreeState.NORMAL ) {
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
        if ( this._status !== TreeState.NORMAL ) {
            // 描画できる状態ではない
            return;
        }

        ++this._frame_counter;
    }


    /**
     * @summary メタデータの設定
     *
     * @param {object} data  "tile-index.json" の内容
     *
     * @private
     */
    _setupMetaData( data )
    {
        if ( (data === null) || (this._status === TreeState.CANCELLED) ) {
            // 獲得に失敗またはキャンセル
            this._status = TreeState.CANCELLED;
            return;
        }

        if ( (data.format === undefined) || (data.format > 1) ) {
            // 未対応の形式
            this._status = TreeState.CANCELLED;
            return;
        }

        // メタデータを取得
        this._rho          = data.rho;
        this._a0cs_to_gocs = GeoMath.createMatrix( data.transform );

        // 基底タイルをリクエスト
        let req_id = this._provider.requestTile( new Area3D(), data => this._setupRootLoaded( data ) );
        this._root_cube.__setupRootRequested( req_id );

        // 設定の終了
        this._meta_red_id = null;  // 不要になったので捨てる
        this._status = TreeState.REQ_ROOT;
    }


    /**
     * @summary 基底 Cube の読み込み設定
     *
     * @param {ArrayBuffer} data  "0/0/0/0.bin" の内容
     *
     * @private
     */
    _setupRootLoaded( data )
    {
        if ( (data === null) || (this._status === TreeState.CANCELLED) ) {
            // 獲得に失敗またはキャンセル
            this._status = TreeState.CANCELLED;
            return;
        }

        // 基底 Cube のタイルを設定
        this._root_cube.__setupRootLoaded( data );

        // 設定の終了
        this._status = TreeState.NORMAL;
    }

}


/**
 * @summary B3dTree のレンダリングサブステージ
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
        this._area_route = new Array( B3dTree.MAX_DEPTH );
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
        let area = new Area3D();
        let cube = this._root_cube;

        let context = {
            area,  // 現在の領域
            cube   // area に対応する B3dCube インスタンス
        };

        this._mesh_node_list = [];
        this._traverse_recur( context );
    }


    /**
     * @summary area の領域をトラバース
     *
     * @param {object} context  詳細は _traverse()
     *
     * @private
     */
    _traverse_recur( context )
    {
        let area = context.area;

        if ( this._is_invisible( area ) ) {
            // area が視体積に入らないので無視
            return;
        }

        let target_level = this._get_tile_target_level( area );

        if ( target_level < 0 ) {
            // 子領域に分割して再帰
            if ( area.level >= this._area_route.length ) {
                // area.level が想定を超えたので描画を諦める
                return;
            }

            let cube = context.cube;
            let data = cube.getTileData();

            for ( let which = 0; which < 8; ++which ) {
                if ( (data !== null) && data.isVoidArea( which ) ) {
                    // 何もない子領域なので描画をスキップ
                    continue;
                }

                let ctx_child = {
                    area: area.getChild( which ),
                    cube: cube.newChild( which )
                };

                this._area_route[area.level] = which;
                this._traverse_recur( ctx_child );
            }
        }
        else {
            // area に対応するメッシュ情報を取得
            let mesh_node = this._get_mesh_node( context, target_level );
            mesh_node.__ensure( this._glenv );

            // メッシュ情報をリストに追加
            if ( mesh_node.isVisible() ) {
                this._mesh_node_list.push( mesh_node );
            }
        }
    }


    /**
     * @summary area の領域の可視性を検査
     *
     * area の領域が画面上に現れるか不明のときは false, そうでないときは true を返す。
     *
     * @param {mapray.Area3D} area
     *
     * @return {boolean}
     *
     * @private
     */
    _is_invisible( area )
    {
        let s = Math.pow( 2, -area.level );
        let c = area.coords;

        for ( let plane of this._volume_planes ) {
            let is_invisible = true;

            for ( let i = 0; i < 8; ++i ) {
                // ある四隅の座標 (A0CS)
                let p0 = s * (c[0] + (i & 1));
                let p1 = s * (c[1] + (i & 2));
                let p2 = s * (c[2] + (i & 4));

                // 平面からの符号付き距離
                let dist = p0*plane[0] + p1*plane[1] + p2*plane[2] + plane[3];

                // 位置の判定
                if ( dist >= 0 ) {
                    // plane に対して表側に点があるので不可視でないかも知れない
                    is_invisible = false;
                    break;
                }
            }

            if ( is_invisible ) {
                // 四隅がすべて plane の裏側にあるので不可視が確定
                return true;
            }
        }

        // 不明
        return false;
    }


    /**
     * @summary 現在の視点で area に適したタイルのレベルを取得
     *
     * area に適したタイルの整数レベル (>= 0) を返す。
     * ただし分割が必要なときは負数を返す。
     *
     * 常に (戻り値) <= area.level が成り立つ。
     *
     * @param {mapray.Area3D} area
     *
     * @return {number}
     *
     * @private
     */
    _get_tile_target_level( area )
    {
        let s = Math.pow( 2, -area.level );
        let c = area.coords;

        // area の中心位置 (A0CS)
        let p0 = s * (c[0] + 0.5);
        let p1 = s * (c[1] + 0.5);
        let p2 = s * (c[2] + 0.5);

        // 視点から area の中心までの深度距離 (A0CS)
        let plane = this._depth_plane;
        let depth = p0*plane[0] + p1*plane[1] + p2*plane[2] + plane[3];

        // area を内包する球の半径 (A0CS)
        let radius = s * B3dTree.RADIUS_FACTOR;

        // 視点から area までの最小深度距離 (A0CS)
        let min_depth = depth - radius;

        if ( min_depth <= 0 ) {
            // 視点と同じか後方に area の点が存在する可能性がある
            return -1;
        }

        // area 内のタイルのレベルの最小値と最大値 (連続値)
        let min_level = this._lod_offset - Math.maprayLog2( depth + radius );
        let max_level = this._lod_offset - Math.maprayLog2( min_depth );

        if ( max_level - min_level >= B3dTree.LEVEL_INTERVAL ) {
            // area 内のレベルの差が大きすぎるので area を分割
            return -1;
        }

        // area に対するタイルの代表レベル (整数値 >= 0)
        let tile_level = Math.max( Math.round( (min_level + max_level) / 2 ), 0 );

        // タイルの寸法のほうが小さいとき、area を分割
        return (tile_level <= area.level) ? tile_level : -1;
    }


    /**
     * @summary 描画するメッシュを取得
     *
     * @param {object} context       詳細は _traverse()
     * @param {number} target_level  希望するタイルのレベル
     *
     * @return {mapray.B3dTree.MeshNode}  メッシュ情報
     *
     * @private
     */
    _get_mesh_node( context, target_level )
    {
        // Ca = context.cube (その領域は context.area)
        // Lt = target_level (<= context.area.level)

        // (1)
        // タイルデータを持つ、レベルが 0 から Lt の Ca の祖先の中で、最もレベルの高いものを
        // Cd とする (レベル 0 はタイルデータを持っているので必ず存在する)

        // (2)
        // Ca が Cd のタイルデータに対応するメッシュを持っていれば、それを取得
        //
        // メッシュを持っていなければ、Cd のタイルデータから、Ca の領域で切り取ったメッシュ
        // を生成し、Ca にそのメッシュをキャッシュする

        // (3)
        // Cd のレベルが Lt より小さいとき、Cd のタイルの (Ca の領域に包含される) 1 レベル
        // 高いノードを Cf とする。
        // Cf に対応するタイルがプロバイダに存在することが分かっていて、リクエストされていない
        // 状態のとき、そのタイルをプロバイダにリクエストする


        // 現在の状態で context に相応しいタイルデータを取得
        let [tile_cube, tile_area] = this._get_tile_data_node( target_level );
        let tile_data = tile_cube.getTileData();

        // 必要ならタイルデータをプロバイダにリクエスト
        if ( tile_area.level < target_level ) {
            let which = this._area_route[tile_area.level];

            if ( tile_data.hasChild( which ) ) {
                // 子タイルがプロバイダに存在 -> リクエスト
                let child_tile_area = tile_area.getChild( which );
                let child_tile_cube = tile_cube.getChild( which );

                child_tile_cube.requestTile( this._provider, child_tile_area );
            }
        }

        // tile_data と context.area に対応したメッシュを取得
        return context.cube.getMeshNode( tile_data, tile_area, context.area );
    }


    /**
     * @summary タイルデータを持つノードを取得
     *
     * @param {number} target_level  希望するタイルのレベル
     *
     * @return  [mapray.B3dTree.B3dCube, mapray.Area3D]
     *
     * @private
     */
    _get_tile_data_node( target_level )
    {
        let cube = this._root_cube;
        let area = new Area3D();

        let last_cube = cube;
        let last_area = area.clone();

        for ( let level = 0; level < target_level; ++level ) {
            let which = this._area_route[level];

            cube = cube.getChild( which );
            Area3D.getChild( area, which, area );

            if ( cube.getTileData() ) {
                last_cube = cube;
                last_area.assign( area );
            }
        }

        return [last_cube, last_area];
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
            let mesh = mesh_node.getMesh();
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
 * @memberof mapray.B3dTree
 * @private
 */
class B3dCube {

    constructor()
    {
        this._children   = null;  // 配列は必要になってから生成
        this._b3d_state  = B3dState.NONE;
        this._b3d_data   = null;
        this._mesh_nodes = null;  // Map<B3dBinary, ?MeshNode>
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
            for ( let i = 0; i < 8; ++i ) {
                this._children[i] = null;
            }
        }

        let child = this._children[which];

        if ( child === null ) {
            // 子供がいなければ新規に生成
            child = new B3dCube();
            this._children[which] = child;
        }

        return child;
    }


    /**
     * @summary 子ノードを取得
     *
     * 指定した子ノードが存在しない場合、動作は不定である。
     *
     * @param {number} which  子インデックス (u + 2*v + 4*w)
     *
     * @return {mapray.B3dTree.B3dCube}
     */
    getChild( which )
    {
        return this._children[which];
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
     * @param {mapray.B3dBinary} tile_data  メッシュの元となるタイルデータ
     * @param {mapray.Area3D}    tile_area  タイルの領域
     * @param {mapray.Area3D}    clip_area  切り取り領域
     *
     * @return {mapray.B3dTree.MeshNode}  メッシュ情報
     */
    getMeshNode( tile_data, tile_area, clip_area )
    {
        if ( this._mesh_nodes === null ) {
            this._mesh_nodes = new Map();  // Map<B3dBinary, ?MeshNode>
        }

        let mesh_node = this._mesh_nodes.get( tile_data );

        if ( mesh_node === undefined ) {
            // 存在しないので生成して辞書に追加
            mesh_node = new MeshNode( tile_data, tile_area, clip_area );
            this._mesh_nodes.set( tile_data, mesh_node );
        }

        return mesh_node;
    }


    /**
     * @summary タイルをプロバイダにリクエスト
     *
     * @param {mapray.B3dProvider} provider  プロバイダ
     * @param {mapray.Area3D}      area      タイルの領域
     */
    requestTile( provider, area )
    {
        if ( this._b3d_state !== B3dState.NONE ) {
            // リクエストできる状態ではない
            return;
        }

        provider.requestTile( area, data => {
            if ( this._b3d_state !== B3dState.REQUESTED ) {
                // キャンセルされている
                return;
            }

            if ( data !== null ) {
                this._b3d_state = B3dState.LOADED;
                this._b3d_data  = new B3dBinary( data );
            }
            else {
                this._b3d_state = B3dState.FAILED;
                this._b3d_data  = null;
            }
        } );

        this._b3d_state = B3dState.REQUESTED;
    }


    /**
     * @summary リクエストを取り消す
     *
     * @param {mapray.B3dProvider} provider  プロバイダ
     */
    cancelRequest( provider )
    {
        if ( this._b3d_state === B3dState.REQUESTED ) {
            provider.cancelRequest( this._b3d_data );
            this._b3d_state = B3dState.NONE;
            this._b3d_data  = null;
        }
    }


    /**
     * @summary 基底 Cube 専用の設定
     *
     * Note: B3dTree のみが使用
     *
     * @param {object} req_id  requestTile() の結果
     */
    __setupRootRequested( req_id )
    {
        this._b3d_state = B3dState.REQUESTED;
        this._b3d_data  = req_id;
    }


    /**
     * @summary 基底 Cube 専用の設定
     *
     * Note: B3dTree のみが使用
     *
     * @param {ArrayBuffer} data  バイナリデータ
     */
    __setupRootLoaded( data )
    {
        this._b3d_state = B3dState.LOADED;
        this._b3d_data  = new B3dBinary( data );
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
     * @param {mapray.B3dBinary} tile_data  メッシュの元となるタイルデータ
     * @param {mapray.Area3D}    tile_area  タイルの領域
     * @param {mapray.Area3D}    clip_area  切り取り領域
     */
    constructor( tile_data, tile_area, clip_area )
    {
        this._mesh = null;

        this._tile_data = tile_data;

        this._tile_to_a0cs = this._get_tile_to_a0cs( tile_area );

        let pot = (tile_area.level == clip_area.level) ? 1 : Math.pow( 2, tile_area.level - clip_area.level );

        // クリップ立方体の原点 (tile_area 座標系)
        this._clip_origin = GeoMath.createVector3();
        for ( let i = 0; i < 3; ++i ) {
            this._clip_origin[i] = pot * clip_area.coords[i] - tile_area.coords[i];
        }

        // クリップ立方体の寸法 (tile_area 座標系)
        // ※ tile_area と clip_area のレベルが同じとき、厳密に 1 になる
        this._clip_size = pot;

        // 立方体ワイヤーフレームメッシュ
        this._cube_mesh = null;
    }


    /**
     * @summary Mesh は見えるか？
     *
     * @return {boolean}
     */
    isVisible()
    {
        return this._mesh != "EMPTY MESH";
    }


    /**
     * @summary メッシュを取得
     *
     * isVisible() == false のとき、動作は不定である。
     *
     * @return {mapray.Mesh}
     */
    getMesh()
    {
        return this._mesh;
    }


    /**
     * @summary メッシュの位置座標から A0CS への変換行列を取得
     *
     * @return {mapray.Matrix}
     */
    getTransform()
    {
        return this._tile_to_a0cs;
    }


    /**
     * @summary 領域メッシュを取得
     *
     * @return {mapray.Mesh}
     */
    getAreaMesh( glenv )
    {
        if ( this._cube_mesh === null ) {
            // メッシュ生成
            let mesh_data = {
                vtype: [
                    { name: "a_position", size: 3 }
                ],
                ptype:    "lines",
                vertices: this._createCubeVertices( this._clip_origin, this._clip_size ),
                indices:  this._createCubeIndices()
            };

            this._cube_mesh = new Mesh( glenv, mesh_data );
        }

        return this._cube_mesh;
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
     *    構築子と処理を分けた。
     *
     * @param {mapray.GlEnv} glenv
     *
     * @private
     */
    __ensure( glenv )
    {
        if ( this._mesh !== null ) {
            // すでに処理済み
            return;
        }

        // メッシュを生成
        this._mesh = this._tile_data.clip( glenv, this._clip_origin, this._clip_size ) || "EMPTY MESH";
    }


    /**
     * @summary tile_area から A0CS への変換行列を取得
     *
     * @param {mapray.Area3D} tile_area  タイルの領域
     *
     * @return {mapray.Matrix}
     *
     * @private
     */
    _get_tile_to_a0cs( tile_area )
    {
        // 文献 LargeScale3DSce の「A0CS 上でのレンダリング処理」を参照
        let pot = Math.pow( 2, -tile_area.level );

        let matrix = GeoMath.setIdentity( GeoMath.createMatrix() );

        matrix[ 0] = pot;
        matrix[ 5] = pot;
        matrix[10] = pot;

        for ( let i = 0; i < 3; ++i ) {
            matrix[12 + i] = pot * tile_area.coords[i];
        }

        return matrix;
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
     * メタデータをリクエスト中
     */
    REQ_META: { id: "REQ_META" },

    /**
     * メタデータをリクエスト中
     */
    REQ_ROOT: { id: "REQ_ROOT" },

    /**
     * 通常状態
     */
    NORMAL: { id: "NORMAL" },

    /**
     * 取り消しされた (続行できない失敗があった)
     */
    CANCELLED: { id: "CANCELLED" }

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

B3dTree.RADIUS_FACTOR = Math.sqrt( 3 ) / 2;

// LEVEL_INTERVAL が小さすぎるとタイルの分割が多くなり、
// 大きすぎるとレベルの誤差が大きくなる
// レベルの誤差は最大で (LEVEL_INTERVL + 1) / 2
B3dTree.LEVEL_INTERVAL = 0.5;

// トラバースの最大の深さ
B3dTree.MAX_DEPTH = 48;


export default B3dTree;
