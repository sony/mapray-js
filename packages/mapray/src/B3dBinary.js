import GeoMath from "./GeoMath";
import Mesh from "./Mesh";
import MeshBuffer from "./MeshBuffer";


/**
 * @summary B3D バイナリーデータ
 *
 * @memberof mapray
 * @private
 */
class B3dBinary {

    /**
     * @param {mapray.B3dNative} native
     * @param {ArrayBuffer}      buffer  タイルデータのバイナリデータ
     */
    constructor( native, buffer )
    {
        this._native = native;
        this._handle = native.addBinary( buffer );

        // ヘッダー情報を取得
        let data = new DataView( buffer );

        // DESCENDANTS
        // 最上位の枝ノード
        const tree_size = data.getUint16( B3dBinary.OFFSET_DESCENDANTS + 0, true );
        const children  = data.getUint16( B3dBinary.OFFSET_DESCENDANTS + 2, true );

        this._void_areas = 0;
        this._is_leaf    = true;

        for ( let i = 0; i < 8; ++i ) {
            const shift = 2 * i;
            const  mask = 3 << shift;
            const ntype = (children & mask) >> shift;

            if ( ntype == 0 ) {
                // 子なし (VOID)
                this._void_areas += (1 << i);
            }
            else if ( this._is_leaf && ntype >= 2 ) {
                // 枝ノード(2) or 葉ノード(3)
                this._is_leaf = false;
            }
        }

        // CONTENTS
        this._contents = data.getUint32( B3dBinary.OFFSET_DESCENDANTS + 4 * tree_size, true );
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
     * @summary 子孫が存在しないタイルか？
     *
     * @return {boolean}  子孫が存在しないとき true, それ以外のとき false
     */
    isLeaf()
    {
        return this._is_leaf;
    }


    /**
     * @summary 子孫の最大深度を取得
     *
     * 位置 position を包含する子孫タイルが this 存在すれば (既知の) 最大深度を
     * 返す。ただし position の位置に子孫が存在しないときは 0 を返す。
     *
     * position に limit より深い子孫タイルが存在しても limit を返す可能性がある。
     *
     * position の各要素 x は 0 <= x < 1 でなければならない。
     *
     * ※ 一般的に limit が小さいほうが速度的に有利な可能性がある
     *
     * @param {mapray.Vector3} position  確認する位置 (ALCS)
     * @param {number}            limit  最大の深さ (>= 1)
     *
     * @return {number}  既知の最大深度
     */
    getDescendantDepth( position, limit )
    {
        return this._native.getDescendantDepth( this._handle, position, limit );
    }


    /**
     * @summary 切り取ったメッシュを取得
     *
     * @desc
     *
     * <p>タイルを origin, size の領域で切り取ったメッシュを返す。</p>
     *
     * <p>幾何が存在しないときは null を返す。</p>
     *
     * @param {mapray.GlEnv}   glenv
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}         size    クリップ立方体の寸法 (ALCS)
     *
     * @return {?mapray.Mesh}  メッシュまたは null
     */
    clip( glenv, origin, size )
    {
        let mesh = null;

        this._native.clip( this._handle, origin, size, (num_vertices, num_triangles, buffer, byte_offset) => {

            if ( num_triangles == 0 ) {
                // 幾何が存在しない
                return;
            }

            // NUM_VERTICES の値が 2^16 より大きいとき UINT32 型、それ以外のとき UINT16 型
            const triArrayType = (num_vertices > 65536) ? Uint32Array : Uint16Array;

            let pointer = byte_offset;

            const positions = new Uint16Array( buffer, pointer, 3 * num_vertices );
            pointer += align4( positions.byteLength );

            const triangles = new triArrayType( buffer, pointer, 3 * num_triangles );
            pointer += align4( triangles.byteLength );

            let n_array = null;
            if ( (this._contents & B3dBinary.CONTENTS_MASK_N_ARRAY) != 0 ) {
                n_array = new Int8Array( buffer, pointer, 3 * num_vertices );
                pointer += align4( n_array.byteLength );
            }

            let c_array = null;
            if ( (this._contents & B3dBinary.CONTENTS_MASK_C_ARRAY) != 0 ) {
                c_array = new Uint8Array( buffer, pointer, 3 * num_vertices );
                pointer += align4( c_array.byteLength );
            }

            //
            const mesh_init = new Mesh.Initializer( Mesh.DrawMode.TRIANGLES, num_vertices );

            // 頂点インデックス
            const itype = (num_vertices > 65536) ?
                Mesh.ComponentType.UNSIGNED_INT : Mesh.ComponentType.UNSIGNED_SHORT;

            mesh_init.addIndex( new MeshBuffer( glenv, triangles, { target: MeshBuffer.Target.INDEX } ),
                                triangles.length,  // num_indices
                                itype );

            // 頂点属性
            mesh_init.addAttribute( "a_position",
                                    new MeshBuffer( glenv, positions ),
                                    3,  // num_components
                                    Mesh.ComponentType.UNSIGNED_SHORT,
                                    { normalized: true } );

            if ( n_array !== null ) {
                mesh_init.addAttribute( "a_normal",
                                        new MeshBuffer( glenv, n_array ),
                                        3,  // num_components
                                        Mesh.ComponentType.BYTE,
                                        { normalized: true } );
            }

            if ( c_array !== null ) {
                mesh_init.addAttribute( "a_color",
                                        new MeshBuffer( glenv, c_array ),
                                        3,  // num_components
                                        Mesh.ComponentType.UNSIGNED_BYTE,
                                        { normalized: true } );
            }

            mesh = new Mesh( glenv, mesh_init );
        } );

        return mesh;
    }


    /**
     * @summary タイル内の三角形とレイとの交点を探す
     *
     * @param {mapray.Ray} ray  半直線を表すレイ (ALCS)
     * @param {number}   limit  制限距離
     * @param {mapray.Vector3} rect_origin  ヒント直方体の原点 (ALCS)
     * @param {number}         rect_size    ヒント直方体の寸法 (ALCS)
     *
     * @return {number}  交点までの距離
     */
    findRayDistance( ray, limit, rect_origin, rect_size )
    {
        let result;

        this._native.findRayDistance( this._handle,
                                      ray, limit, rect_origin, rect_size,
                                      (distance, id) => {
            result = distance;
        } );

        return result;
    }


    /**
     * @summary インスタンスを破棄
     *
     * this のリソースを解放する。this のメソッドは呼び出せなくなる。
     */
    dispose()
    {
        this._native.removeBinary( this._handle );
        this._handle = 0;
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


B3dBinary.OFFSET_DESCENDANTS    = 0;
B3dBinary.CONTENTS_MASK_N_ARRAY = 1;
B3dBinary.CONTENTS_MASK_C_ARRAY = 2;


export default B3dBinary;
