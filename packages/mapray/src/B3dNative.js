/**
 * @summary b3dtile の wasm インスタンスを管理
 *
 * @classdesc
 *
 * <p>C++ のソースコードは packages/mapray/wasm/b3dtile/ にある。<p>
 *
 * @memberof mapray
 * @private
 */
class B3dNative {

    /**
     * @param {object} em_module  Emscripten モジュール
     */
    constructor( em_module )
    {
        this._emod = em_module;

        // wasm とやり取りするための一時変数
        this._src_binary  = null;  // タイルデータ (ArrayBuffer)
        this._clip_result = null;  // クリッピング結果を受け取る関数 (mapray.B3dNative.ClipResult)
        this._ray_result  = null;  // レイ判定結果を受け取る関数 (mapray.B3dNative.findRayDistance)

        // 関数登録: Tile.hpp の binary_copy_func_t を参照
        const binary_copy = em_module.addFunction( (dst_begin) => {
            this._emod.HEAPU8.set( new Uint8Array( this._src_binary ), dst_begin );
            this._src_binary = null;
        }, "vi" );

        // 関数登録: Tile.hpp の clip_result_func_t を参照
        const clip_result = em_module.addFunction( (num_vertices, num_triangles, data) => {
            this._clip_result.call( null,
                                    num_vertices,
                                    num_triangles,
                                    this._emod.HEAPU8.buffer,
                                    data );
            this._clip_result = null;
        }, "viii" );

        // 関数登録: Tile.hpp の ray_result_func_t を参照
        const ray_result = em_module.addFunction( (distance, id) => {
            this._ray_result.call( null, distance, id );
            this._ray_result = null;
        }, "vdi" );

        // b3dtile インスタンスを初期化
        em_module._initialize( binary_copy, clip_result, ray_result );
    }


    /**
     * @summary バイナリデータを追加
     *
     * @param {ArrayBuffer} buffer  タイルデータのバイナリデータ
     *
     * @return {number}  オブジェクトハンドル
     */
    addBinary( buffer )
    {
        this._src_binary = buffer;  // 次の呼び出しから間接的に参照される
        return this._emod._tile_create( buffer.byteLength );
    }


    /**
     * @summary バイナリデータを消去
     *
     * @param {number} handle  オブジェクトハンドル
     */
    removeBinary( handle )
    {
        return this._emod._tile_destroy( handle );
    }


    /**
     * @summary 子孫の最大深度を取得
     *
     * @see {@link mapray.B3dBinary#getDescendantDepth}
     */
    getDescendantDepth( handle, position, limit )
    {
        const x = position[0];
        const y = position[1];
        const z = position[2];

        return this._emod._tile_get_descendant_depth( handle, x, y, z, limit );
    }


    /**
     * @see {@link mapray.B3dBinary#clip}
     *
     * @param {number}         handle  オブジェクトハンドル
     * @param {mapray.Vector3} origin  クリップ立方体の原点 (ALCS)
     * @param {number}         size    クリップ立方体の寸法 (ALCS)
     * @param {mapray.B3dNative.ClipResult} fn_result  結果を受け取る関数
     */
    clip( handle, origin, size, fn_result )
    {
        const x = origin[0];
        const y = origin[1];
        const z = origin[2];

        this._clip_result = fn_result;
        this._emod._tile_clip( handle, x, y, z, size );
    }


    /**
     * @see {@link mapray.B3dBinary#findRayDistance}
     *
     * @param {number}      handle  オブジェクトハンドル
     * @param {function} fn_result  結果を受け取る関数 (Tile.hpp の ray_result_func_t を参照)
     */
    findRayDistance( handle,
                     // [[[
                     // B3dBinary#findRayDistance() と同じ引数
                     ray, limit, rect_origin, rect_size,
                     // ]]]
                     fn_result )
    {
        this._ray_result = fn_result;

        this._emod._tile_find_ray_distance( handle,

                                            ray.position[0],
                                            ray.position[1],
                                            ray.position[2],

                                            ray.direction[0],
                                            ray.direction[1],
                                            ray.direction[2],

                                            limit,

                                            rect_origin[0],
                                            rect_origin[1],
                                            rect_origin[2],
                                            rect_size );
    }

}


/**
 * @summary クリッピング結果を受け取る関数の型
 *
 * @desc
 * <p>Tile.hpp の clip_result_func_t に対応する関数である。
 *    ただし、データの先頭へのポインタは buffer と byte_offset で表現している。</p>
 *
 * @param {number}  num_vertices
 * @param {number} num_triangles
 * @param {ArrayBuffer}   buffer
 * @param {number}   byte_offset
 *
 * @callback ClipResult
 * @memberof mapray.B3dNative
 */


export default B3dNative;
