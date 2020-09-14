import GeoMath from "./GeoMath";
import Mesh from "./Mesh";
import MeshBuffer from "./MeshBuffer";
import ConvexPolygon from "./ConvexPolygon";


/**
 * @summary B3D バイナリーデータ
 *
 * @memberof mapray
 * @private
 */
class B3dBinary {

    /**
     * Note: array の内容は書き換える
     *
     * @param {ArrayBuffer} array  B3D 配列データ
     */
    constructor( array )
    {
        // ヘッダー情報を取得
        let header = new DataView( array );

        this._children    = header.getUint16( B3dBinary.OFFSET_CHILDREN,      true );
        this._void_areas  = header.getUint16( B3dBinary.OFFSET_VOID_AREAS,    true );
        let contents      = header.getUint32( B3dBinary.OFFSET_CONTENTS,      true );
        let num_vertices  = header.getUint32( B3dBinary.OFFSET_NUM_VERTICES,  true );
        let num_triangles = header.getUint32( B3dBinary.OFFSET_NUM_TRIANGLES, true );

        this._num_vertices  = num_vertices;
        this._num_triangles = num_triangles;

        let pointer = B3dBinary.OFFSET_DATA;

        this._positions = new Uint16Array( array, pointer, 3 * num_vertices );
        // TODO: マシンバイトオーダーに変換
        pointer += align4( this._positions.byteLength );

        // NUM_VERTICES の値が 2^16 より大きいとき UINT32 型、それ以外のとき UINT16 型
        let triArrayType = (num_vertices > 65536) ? Uint32Array : Uint16Array;

        this._triangles = new triArrayType( array, pointer, 3 * num_triangles );
        // TODO: マシンバイトオーダーに変換
        pointer += align4( this._triangles.byteLength );

        this._n_array = null;
        if ( (contents & B3dBinary.CONTENTS_MASK_N_ARRAY) != 0 ) {
            this._n_array = new Int8Array( array, pointer, 3 * num_vertices );
            pointer += align4( this._n_array.byteLength );
        }

        this._c_array = null;
        if ( (contents & B3dBinary.CONTENTS_MASK_C_ARRAY) != 0 ) {
            this._c_array = new Uint8Array( array, pointer, 3 * num_vertices );
            pointer += align4( this._c_array.byteLength );
        }
    }


    /**
     * @summary 子供は存在するか？
     *
     * @param {number} which  子供の位置 (0-7)
     *
     * @return {boolean}  存在するとき true, それ以外のとき false
     */
    hasChild( which )
    {
        return (this._children & (1 << which)) != 0;
    }


    /**
     * @summary 何も存在しない領域か？
     *
     * @param {number} which  子供の位置 (0-7)
     *
     * @return {boolean}  何も存在しないとき true, 不明のとき false
     */
    isVoidArea( which )
    {
        return (this._void_areas & (1 << which)) != 0;
    }


    /**
     * @summary 切り取ったメッシュを取得
     *
     * タイルを origin, size の領域 (タイル内に収まらなければならない) で切り取っ
     * たメッシュを返す。size が厳密に 1 のときは、切り取らずにタイル全体を返す。
     *
     * 幾何が存在しないときは null を返す。
     *
     * @param {mapray.GlEnv}   glenv
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}         size    クリップ立方体の寸法 (ALCS)
     *
     * @return {?mapray.Mesh}  メッシュまたは null
     */
    clip( glenv, origin, size )
    {
        if ( size == 1 ) {
            return this._create_entire_mesh( glenv );
        }
        else {
            return this._create_clipped_mesh( glenv, origin, size );
        }
    }


    /**
     * @summary タイル全体のメッシュを生成
     *
     * @param {mapray.GlEnv} glenv
     *
     * @return {?mapray.Mesh}  メッシュまたは null
     *
     * @private
     */
    _create_entire_mesh( glenv )
    {
        if ( this._num_triangles == 0 ) {
            // 幾何が存在しないタイル
            return null;
        }

        let mesh_init = new Mesh.Initializer( Mesh.DrawMode.TRIANGLES, this._num_vertices );

        // 頂点インデックス
        let itype = (this._num_vertices > 65536) ?
            Mesh.ComponentType.UNSIGNED_INT : Mesh.ComponentType.UNSIGNED_SHORT;

        mesh_init.addIndex( new MeshBuffer( glenv, this._triangles, { target: MeshBuffer.Target.INDEX } ),
                            this._triangles.length,  // num_indices
                            itype );

        // 頂点属性
        mesh_init.addAttribute( "a_position",
                                new MeshBuffer( glenv, this._positions ),
                                3,  // num_components
                                Mesh.ComponentType.UNSIGNED_SHORT,
                                { normalized: true } );

        if ( this._n_array !== null ) {
            mesh_init.addAttribute( "a_normal",
                                    new MeshBuffer( glenv, this._n_array ),
                                    3,  // num_components
                                    Mesh.ComponentType.BYTE,
                                    { normalized: true } );
        }

        if ( this._c_array !== null ) {
            mesh_init.addAttribute( "a_color",
                                    new MeshBuffer( glenv, this._c_array ),
                                    3,  // num_components
                                    Mesh.ComponentType.UNSIGNED_BYTE,
                                    { normalized: true } );
        }

        return new Mesh( glenv, mesh_init );
    }


    /**
     * @summary 切り取ったメッシュを生成
     *
     * @param {mapray.GlEnv}   glenv
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}         size    クリップ立方体の寸法 (ALCS)
     *
     * @return {?mapray.Mesh}  メッシュまたは null
     *
     * @private
     */
    _create_clipped_mesh( glenv, origin, size )
    {
        // クリッピングなし部分の情報
        let  index_table_A = new Int32Array( this._num_vertices );  // 旧頂点 -> 新頂点
        let  tri_indices_A = [];  // 新三角形 (新頂点インデックスの並び)
        let num_vertices_A = 0;   // 新頂点の個数

        // クリッピングあり部分の情報
        let polygons_B     = [];  // 重心座標で表現した凸多角形
        let num_vertices_B = 0;   // 新頂点の個数

        // index_table_A を初期化
        // fill() を使いたいが Safafi 未対応
        for ( let i = 0; i < this._num_vertices; ++i ) {
            index_table_A[i] = -1;
        }

        let helper = new ClipHelper( this._positions, this._triangles, origin, size );

        // 情報の設定
        for ( let tid = 0; tid < this._num_triangles; ++tid ) {
            if ( helper.is_outside( tid ) ) {
                // 三角形は完全にクリップ立方体の外側
                continue;
            }
            else if ( helper.is_inside( tid ) ) {
                // 三角形は完全にクリップ立方体の内側
                let tri_base = 3 * tid;
                for ( let i = tri_base; i < tri_base + 3; ++i ) {
                    let old_index = this._triangles[i];
                    let new_index = index_table_A[old_index];
                    if ( new_index < 0 ) {
                        index_table_A[old_index] = new_index = num_vertices_A;
                        ++num_vertices_A;
                    }
                    tri_indices_A.push( new_index );
                }
            }
            else {
                // それ以外の三角形
                let cpoly = helper.clip( tid );
                if ( cpoly !== null ) {
                    polygons_B.push( cpoly );
                    num_vertices_B += cpoly.num_vertices;
                }
            }
        }

        let num_vertices = num_vertices_A + num_vertices_B;
        if ( num_vertices == 0 ) {
            // クリップ立方体内の幾何は空だった
            return null;
        }
        else if ( num_vertices_A == this._num_vertices ) {
            // タイルの幾何はすべてクリップ立方体内に収まっていた
            return this._create_entire_mesh( glenv );
        }

        // 頂点属性の配列を構築
        let new_vertices = {
            positions: new Uint16Array( 3 * num_vertices ),
            n_array:   (this._n_array !== null) ? new  Int8Array( 3 * num_vertices ) : null,
            c_array:   (this._c_array !== null) ? new Uint8Array( 3 * num_vertices ) : null
        };

        this._set_vertices_A( index_table_A, new_vertices );
        this._set_vertices_B( polygons_B, num_vertices_A, new_vertices );

        // 頂点インデックスの配列を構築
        let num_triangles_B = num_vertices_B - 2 * polygons_B.length;
        let indexArrayType  = (num_vertices > 65536) ? Uint32Array : Uint16Array;
        let new_indices     = new indexArrayType( tri_indices_A.length + 3 * num_triangles_B );

        this._set_indices_A( tri_indices_A, new_indices );
        this._set_indices_B( polygons_B, num_vertices_A, tri_indices_A.length, new_indices );

        return B3dBinary._create_mesh( glenv, new_indices, new_vertices );
    }


    /**
     * @param {Int32Array} index_table
     * @param {object}     dst_vertices
     *
     * @private
     */
    _set_vertices_A( index_table, dst_vertices )
    {
        for ( let old_index = 0; old_index < index_table.length; ++old_index ) {
            let new_index = index_table[old_index];
            if ( new_index < 0 ) continue;

            let n3i = 3 * new_index;
            let o3i = 3 * old_index;

            for ( let i = 0; i < 3; ++i ) {
                dst_vertices.positions[n3i + i] = this._positions[o3i + i];
            }
            if ( this._n_array !== null ) {
                for ( let i = 0; i < 3; ++i ) {
                    dst_vertices.n_array[n3i + i] = this._n_array[o3i + i];
                }
            }
            if ( this._c_array !== null ) {
                for ( let i = 0; i < 3; ++i ) {
                    dst_vertices.c_array[n3i + i] = this._c_array[o3i + i];
                }
            }
        }
    }


    /**
     * @param {mapray.ConvexPolygon[]}  polygons
     * @param {number}                  dst_start
     * @param {object}                  dst_vertices
     *
     * @private
     */
    _set_vertices_B( polygons, dst_start, dst_vertices )
    {
        let vi_dst = dst_start;

        for ( let cpoly of polygons ) {
            let mu_coords = cpoly.vertices;
            let tri_base  = 3 * cpoly.tid;
            let vi0 = this._triangles[tri_base    ];  // 三角形の角 0 に対応するタイル頂点インデックス
            let vi1 = this._triangles[tri_base + 1];
            let vi2 = this._triangles[tri_base + 2];

            for ( let ci = 0; ci < cpoly.num_vertices; ++ci ) {
                let mu1 = mu_coords[2*ci    ];
                let mu2 = mu_coords[2*ci + 1];
                let mu0 = 1 - mu1 - mu2;

                // 頂点位置
                for ( let i = 0; i < 3; ++i ) {
                    let value = mu0 * this._positions[3*vi0 + i] +
                                mu1 * this._positions[3*vi1 + i] +
                                mu2 * this._positions[3*vi2 + i];
                    dst_vertices.positions[3*vi_dst + i] = Math.round( value );
                }

                // 頂点法線
                if ( this._n_array !== null ) {
                    for ( let i = 0; i < 3; ++i ) {
                        let value = mu0 * this._n_array[3*vi0 + i] +
                                    mu1 * this._n_array[3*vi1 + i] +
                                    mu2 * this._n_array[3*vi2 + i];
                        // 長さの正規化は省略
                        dst_vertices.n_array[3*vi_dst + i] = Math.round( value );
                    }
                }

                // 頂点カラー
                if ( this._c_array !== null ) {
                    for ( let i = 0; i < 3; ++i ) {
                        let value = mu0 * this._c_array[3*vi0 + i] +
                                    mu1 * this._c_array[3*vi1 + i] +
                                    mu2 * this._c_array[3*vi2 + i];
                        // 長さの正規化は省略
                        dst_vertices.c_array[3*vi_dst + i] = Math.round( value );
                    }
                }

                ++vi_dst;
            }
        }
    }


    /**
     * @param {number[]}                src_indices
     * @param {Uint16Array|Uint32Array} dst_indices
     *
     * @private
     */
    _set_indices_A( src_indices, dst_indices )
    {
        dst_indices.set( src_indices );
    }


    /**
     * @param {mapray.ConvexPolygon[]}  polygons
     * @param {number}                  vindex_base
     * @param {number}                  dst_start
     * @param {Uint16Array|Uint32Array} dst_indices
     *
     * @private
     */
    _set_indices_B( polygons, vindex_base, dst_start, dst_indices )
    {
        let dst_index = dst_start;
        let    vindex = vindex_base;
        for ( let cpoly of polygons ) {
            let num_vertices = cpoly.num_vertices;
            for ( let i = 2; i < num_vertices; ++i ) {
                dst_indices[dst_index++] = vindex;
                dst_indices[dst_index++] = vindex + i - 1;
                dst_indices[dst_index++] = vindex + i;
            }
            vindex += num_vertices;
        }
    }

    /**
     * @summary メッシュを生成
     *
     * @param {mapray.GlEnv} glenv
     * @param {number[]}   indices
     * @param {object}    vertices
     *
     * @return {mapray.Mesh}  メッシュ
     *
     * @private
     */
    static
    _create_mesh( glenv, indices, vertices )
    {
        let num_vertices = vertices.positions.length / 3;

        let mesh_init = new Mesh.Initializer( Mesh.DrawMode.TRIANGLES, num_vertices );

        // 頂点インデックス
        let itype = (num_vertices > 65536) ? Mesh.ComponentType.UNSIGNED_INT : Mesh.ComponentType.UNSIGNED_SHORT;
        mesh_init.addIndex( new MeshBuffer( glenv, indices, { target: MeshBuffer.Target.INDEX } ),
                            indices.length,  // num_indices
                            itype );

        // 頂点属性
        mesh_init.addAttribute( "a_position",
                                new MeshBuffer( glenv, vertices.positions ),
                                3,  // num_components
                                Mesh.ComponentType.UNSIGNED_SHORT,
                                { normalized: true } );

        if ( vertices.n_array !== null ) {
            mesh_init.addAttribute( "a_normal",
                                    new MeshBuffer( glenv, vertices.n_array ),
                                    3,  // num_components
                                    Mesh.ComponentType.BYTE,
                                    { normalized: true } );
        }

        if ( vertices.c_array !== null ) {
            mesh_init.addAttribute( "a_color",
                                    new MeshBuffer( glenv, vertices.c_array ),
                                    3,  // num_components
                                    Mesh.ComponentType.UNSIGNED_BYTE,
                                    { normalized: true } );
        }

        return new Mesh( glenv, mesh_init );
    }

}


/**
 * @summary クリッピング処理の補助
 *
 * @memberof mapray.B3dBinary
 * @private
 */
class ClipHelper {

    /**
     * @param {Uint16Array} positions  頂点配列
     * @param {number[]}    triangles  三角形配列
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}           size  クリップ立方体の寸法 (ALCS)
     */
    constructor( positions, triangles, origin, size )
    {
        this._positions = positions;
        this._triangles = triangles;

        this._lower = GeoMath.createVector3();  // 境界の下限 (16-bit unsigned fixed)
        this._upper = GeoMath.createVector3();  // 境界の上限 (16-bit unsigned fixed)

        for ( let i = 0; i < 3; ++i ) {
            this._lower[i] = 65535 * origin[i];
            this._upper[i] = 65535 * (origin[i] + size);

            // タイルの下限と上限にある点は特別に含めるように調整
            if ( this._lower[i] < 0.1 ) {
                this._lower[i] = -0.1;
            }
            if ( this._upper[i] > 65534.9 ) {
                this._upper[i] = 65535.1;
            }
        }
    }


    /**
     * @summary 三角形は完全に境界の外側か？
     *
     * @param {number}  三角形インデックス
     *
     * @return {boolean}  判定結果
     */
    is_outside( tid )
    {
        let tri_base  = 3 * tid;
        let triangles = this._triangles;
        let positions = this._positions;

        // 下限側
        for ( let ai = 0; ai < 3; ++ai ) {   // 座標軸番号
            let lower      = this._lower[ai];
            let is_outside = true;
            for ( let ci = 0; ci < 3; ++ci ) {       // 三角形の角番号
                let vi = triangles[tri_base + ci];   // タイルの頂点番号
                if ( positions[3*vi + ai] >= lower ) {
                    // 三角形の一部が ai 軸下限の内側
                    is_outside = false;
                    break;
                }
            }
            if ( is_outside ) {
                // 三角形は完全に ai 軸下限の外側
                return true;
            }
        }

        // 上限側
        for ( let ai = 0; ai < 3; ++ai ) {   // 座標軸番号
            let upper      = this._upper[ai];
            let is_outside = true;
            for ( let ci = 0; ci < 3; ++ci ) {       // 三角形の角番号
                let vi = triangles[tri_base + ci];   // タイルの頂点番号
                if ( positions[3*vi + ai] < upper ) {
                    // 三角形の一部が ai 軸上限の内側
                    is_outside = false;
                    break;
                }
            }
            if ( is_outside ) {
                // 三角形は完全に ai 軸上限の外側
                return true;
            }
        }

        // 三角形は境界の外側でないかもしれない
        return false;
    }


    /**
     * @summary 三角形は完全に境界の内側か？
     *
     * @param {number}  三角形インデックス
     *
     * @return {boolean}  判定結果
     */
    is_inside( tid )
    {
        let tri_base  = 3 * tid;
        let triangles = this._triangles;
        let positions = this._positions;

        for ( let ai = 0; ai < 3; ++ai ) {   // 座標軸番号
            let lower = this._lower[ai];
            let upper = this._upper[ai];
            for ( let ci = 0; ci < 3; ++ci ) {       // 三角形の角番号
                let vi = triangles[tri_base + ci];   // タイルの頂点番号
                let coord = positions[3*vi + ai];    // ai 軸の座標値
                if ( (coord < lower) || (coord >= upper) ) {
                    // 三角形の一部が ai 軸の下限か上限の外側
                    return false;
                }
            }
        }

        // 三角形は完全に境界の内側にある
        return true;
    }


    /**
     * @summary クリッピング処理
     *
     * @param {number}  三角形インデックス
     *
     * @return {?mapray.B3dBinary.Polygon}
     */
    clip( tid )
    {
        let tri_base = 3 * tid;
        let  p0_base = 3 * this._triangles[tri_base    ];
        let  p1_base = 3 * this._triangles[tri_base + 1];
        let  p2_base = 3 * this._triangles[tri_base + 2];

        let cpoly = new ConvexPolygon( [0, 0, 1, 0, 0, 1] );

        try {
            for ( let ai = 0; ai < 3; ++ai ) {
                let a0 = this._positions[p0_base + ai];
                let a1 = this._positions[p1_base + ai];
                let a2 = this._positions[p2_base + ai];

                let nx = a1 - a0;  // (a1 - a0) . n
                let ny = a2 - a0;  // (a2 - a0) . n

                if ( (nx != 0) || (ny != 0) ) {
                    let ld = a0 - this._lower[ai];  // n . a0 + d
                    // TODO: まだ private メソッドを使用
                    cpoly = cpoly._clip_by_halfspace( nx, ny, -ld );
                    if ( cpoly === null ) {
                        return null;
                    }

                    let ud = this._upper[ai] - a0;  // n . a0 + d
                    // TODO: まだ private メソッドを使用
                    cpoly = cpoly._clip_by_halfspace( -nx, -ny, -ud );
                    if ( cpoly === null ) {
                        return null;
                    }
                }
            }
        }
        catch ( e ) {
            // クリッピングに失敗
            return null;
        }

        cpoly.tid = tid;
        return cpoly;
    }

}


/**
 * @summary 4 バイトアライン
 *
 * @param {number} bytes
 *
 * @return {number}
 *
 * @private
 */
function
align4( bytes )
{
    // 4 の倍数に切り上げる
    return 4 * Math.ceil( bytes / 4 );
}


B3dBinary.OFFSET_CHILDREN   = 0;
B3dBinary.OFFSET_VOID_AREAS = 2;
B3dBinary.OFFSET_CONTENTS   = 4;
B3dBinary.OFFSET_NUM_VERTICES  = 8;
B3dBinary.OFFSET_NUM_TRIANGLES = 12;
B3dBinary.OFFSET_DATA = 16;
B3dBinary.CONTENTS_MASK_N_ARRAY = 1;
B3dBinary.CONTENTS_MASK_C_ARRAY = 2;


export default B3dBinary;
