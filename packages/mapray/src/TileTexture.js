/**
 * @summary タイルテクスチャ
 * @memberof mapray
 * @private
 * @see mapray.TileTextureCache
 */
class TileTexture {

    /**
     * @param {number}       z        地図ズームレベル
     * @param {number}       x        X タイル座標
     * @param {number}       y        Y タイル座標
     * @param {WebGLTexture} texture  テクスチャオブジェクト
     */
    constructor( z, x, y, texture )
    {
        /**
         * @summary 地図ズームレベル
         * @member mapray.TileTexture#z
         * @type {number}
         */
        this.z = z;

        /**
         * @summary X タイル座標
         * @member mapray.TileTexture#x
         * @type {number}
         */
        this.x = x;

        /**
         * @summary Y タイル座標
         * @member mapray.TileTexture#y
         * @type {number}
         */
        this.y = y;

        /**
         * @summary テクスチャオブジェクト
         * @member mapray.TileTexture#texture
         * @type {WebGLTexture}
         */
        this.texture = texture;
    }


    /**
     * @summary リソースを破棄
     * @param {WebGLRenderingContext} gl  WebGL レンダリングコンテキスト
     */
    dispose( gl )
    {
        gl.deleteTexture( this.texture );
        this.texture = null;
    }

}


export default TileTexture;
