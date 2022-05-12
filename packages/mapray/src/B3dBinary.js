import GeoMath from "./GeoMath";
import Mesh from "./Mesh";
import MeshBuffer from "./MeshBuffer";
import Texture from "./Texture";


/**
 * @summary B3D バイナリーデータ
 *
 * @classdesc
 * <p>B3D のタイルデータに対応するオブジェクトである。</p>
 *
 * @memberof mapray
 * @private
 */
class B3dBinary {

    /**
     * @desc
     * <p>初期化は create() から呼び出される。直接呼び出すことはできない。</p>
     *
     * @param {mapray.GLEnv}         glenv  WebGL 環境
     * @param {mapray.B3dNative}    native  シーンの B3dNative インスタンス
     * @param {Uint8Array}         vecdata  タイルデータの VECDATA 部
     * @param {?HTMLImageElement} teximage  テクスチャ画像 (テクスチャ がないとき null)
     */
    constructor( glenv, native, vecdata, teximage )
    {
        this._glenv  = glenv;
        this._native = native;
        this._handle = native.addBinary( vecdata );

        // ヘッダー情報を取得
        const dview = new DataView( vecdata.buffer, vecdata.byteOffset, vecdata.byteLength );

        // DESCENDANTS
        // 最上位の枝ノード
        const tree_size = dview.getUint16( B3dBinary.OFFSET_DESCENDANTS + 0, true );
        const children  = dview.getUint16( B3dBinary.OFFSET_DESCENDANTS + 2, true );

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
        this._contents = dview.getUint32( B3dBinary.OFFSET_DESCENDANTS + 4 * tree_size, true );

        // テクスチャ
        this._texture = null;

        if ( teximage !== null ) {
            const gl = glenv.context;
            this._texture = new Texture( glenv, teximage,
                                         { mag_filter: gl.LINEAR,
                                           min_filter: gl.LINEAR,
                                           wrap_s: gl.CLAMP_TO_EDGE,
                                           wrap_t: gl.CLAMP_TO_EDGE } );
        }
    }


    /**
     * @summary B3dBinary インスタンスを生成
     *
     * @param {mapray.GLEnv}      glenv  WebGL 環境
     * @param {mapray.B3dNative} native  シーンの B3dNative インスタンス
     * @param {ArrayBuffer}      buffer  タイルのバイナリーデータ
     *
     * @return {Promise.<mapray.B3dBinary>}
     */
    static async create( glenv, native, buffer )
    {
        const dview = new DataView( buffer );

        let cursor = B3dBinary.OFFSET_VECDATA_PART;

        const vecdata_size = dview.getUint32( B3dBinary.OFFSET_VECDATA_SIZE, true );  // VECDATA_SIZE
        const vecdata_part = new Uint8Array( buffer, cursor, vecdata_size );          // VECDATA_PART
        cursor += vecdata_size;

        let   teximage = null;  // HTMLImageElement
        const teximage_size = dview.getUint32( B3dBinary.OFFSET_TEXIMAGE_SIZE, true );  // TEXIMAGE_SIZE

        if ( teximage_size > 0 ) {
            const teximage_part = new Uint8Array( buffer, cursor, teximage_size );  // TEXIMAGE_PART
            cursor += teximage_size;
            teximage = await B3dBinary._create_teximage( teximage_part );
        }

        return new B3dBinary( glenv, native, vecdata_part, teximage );
    }


    /**
     * @summary B3dBinary インスタンスを生成
     *
     * @param {Uint8Array} binary  TEXIMAGE_PART のデータ
     *
     * @return {Promise.<HTMLImageElement>}
     *
     * @private
     */
    static async _create_teximage( binary )
    {
        const dview = new DataView( binary.buffer, binary.byteOffset, binary.byteLength );

        // MIME_TYPE_SIZE
        const mimetype_size = dview.getUint32( B3dBinary.OFFSET_MIME_TYPE_SIZE, true );

        let cursor = B3dBinary.OFFSET_MIME_TYPE;

        // MIME_TYPE
        const decoder = new TextDecoder();  // UTF-8 デコーダ
        const mimetype = decoder.decode( new Uint8Array( binary.buffer, binary.byteOffset + cursor, mimetype_size ) );
        cursor += align4( mimetype_size );

        // WIDTH
        const width = dview.getUint16( cursor, true );
        cursor += 2;

        // HEIGHT
        const height = dview.getUint16( cursor, true );
        cursor += 2;

        // IMAGE_DATA_SIZE
        const image_data_size = dview.getUint32( cursor, true );
        cursor += 4;

        // IMAGE_DATA
        const image_data = new Uint8Array( binary.buffer, binary.byteOffset + cursor, image_data_size );
        const image_blob = new Blob( [image_data], { type: mimetype } );

        return B3dBinary._create_image( image_blob );
    }


    /**
     * @summary 画像データから Image を生成
     *
     * @param {Blob} image_blob  画像データ
     *
     * @return {Promise.<HTMLImageElement>}
     *
     * createImageBitmap() による実装のほうがよいが、Safari では対応していない。
     * また Firefox では imageOrientation オプションが使えないので諦めた。
     *
     * @private
     */
    static _create_image( image_blob )
    {
        return new Promise( ( resolve, reject ) => {
            const url = URL.createObjectURL( image_blob );
            const img = new Image();

            img.onload = function() {
                resolve( img );
                URL.revokeObjectURL( url );
            };

            img.onerror = function( e ) {
                reject( e );
                URL.revokeObjectURL( url );
            };

            img.src = url;
        } );
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
     * @summary テクスチャを取得
     *
     * このタイルの描画に使うテクスチャを取得する。
     *
     * テクスチャが存在しないときは null を返す。
     *
     * ※ タイルにポリゴンが存在する場合は、必ずテクスチャが存在する。
     *
     * @return {?mapray.Texture}
     */
    getTexture()
    {
        return this._texture;
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
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}         size    クリップ立方体の寸法 (ALCS)
     *
     * @return {?mapray.Mesh}  メッシュまたは null
     */
    clip( origin, size )
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

            let tc_array = null;
            if ( (this._contents & B3dBinary.CONTENTS_MASK_TC_ARRAY) != 0 ) {
                tc_array = new Uint16Array( buffer, pointer, 2 * num_vertices );
                pointer += align4( tc_array.byteLength );
            }

            //
            const mesh_init = new Mesh.Initializer( Mesh.DrawMode.TRIANGLES, num_vertices );

            // 頂点インデックス
            const itype = (num_vertices > 65536) ?
                Mesh.ComponentType.UNSIGNED_INT : Mesh.ComponentType.UNSIGNED_SHORT;

            mesh_init.addIndex( new MeshBuffer( this._glenv, triangles, { target: MeshBuffer.Target.INDEX } ),
                                triangles.length,  // num_indices
                                itype );

            // 頂点属性
            mesh_init.addAttribute( "a_position",
                                    new MeshBuffer( this._glenv, positions ),
                                    3,  // num_components
                                    Mesh.ComponentType.UNSIGNED_SHORT,
                                    { normalized: true } );

            if ( n_array !== null ) {
                mesh_init.addAttribute( "a_normal",
                                        new MeshBuffer( this._glenv, n_array ),
                                        3,  // num_components
                                        Mesh.ComponentType.BYTE,
                                        { normalized: true } );
            }

            if ( tc_array !== null ) {
                mesh_init.addAttribute( "a_texcoord",
                                        new MeshBuffer( this._glenv, tc_array ),
                                        2,  // num_components
                                        Mesh.ComponentType.UNSIGNED_SHORT,
                                        { normalized: true } );
            }

            mesh = new Mesh( this._glenv, mesh_init );
        } );

        return mesh;
    }


    /**
     * @summary タイル内の三角形とレイとの交点を探す
     *
     * 座標系が ALCS であること以外は B3dCube#_getRayIntersectionByPath() と同じ
     * 仕様である。
     */
    getRayIntersection( ray, limit, rect_origin, rect_size )
    {
        let result = null;

        this._native.findRayDistance( this._handle,
                                      ray, limit, rect_origin, rect_size,
                                      (distance, id_0, id_1) => {
            if ( distance != limit ) {
                result = {
                    distance,
                    feature_id: [id_0, id_1]
                };
            }
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

        if ( this._texture !== null ) {
            this._texture.dispose();
            this._texture = null;
        }
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


B3dBinary.OFFSET_VECDATA_SIZE  = 0;
B3dBinary.OFFSET_TEXIMAGE_SIZE = 4;
B3dBinary.OFFSET_VECDATA_PART  = 8;

// vecdata part
B3dBinary.OFFSET_DESCENDANTS     = 0;
B3dBinary.CONTENTS_MASK_N_ARRAY  = 1;
B3dBinary.CONTENTS_MASK_TC_ARRAY = 2;

// teximage part
B3dBinary.OFFSET_MIME_TYPE_SIZE = 0;
B3dBinary.OFFSET_MIME_TYPE      = 4;

export default B3dBinary;
