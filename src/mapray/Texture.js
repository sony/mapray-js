/**
 * @summary モデルテクスチャ
 * @memberof mapray
 * @package
 */
class Texture {

    /**
     * @param {mapray.GLEnv}                       glenv
     * @param {HTMLImageElement|HTMLCanvasElement} image                 元画像
     * @param {object}                             [opts]                オプション集合
     * @param {mapray.Texture.Usage}               [opts.usage=GENERAL]  テクスチャ用途
     */
    constructor( glenv, image, opts )
    {
        this._glenv  = glenv;
        this._handle = this._createTexture( image, opts );
    }


    /**
     * @summary テクスチャのハンドル
     * @type {WebGLTexture}
     * @readonly
     */
    get handle() { return this._handle; }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        var gl = this._glenv.context;
        gl.deleteTexture( this._handle );
        this._handle = null;
    }


    /**
     * @private
     */
    _createTexture( image, opts )
    {
        var      gl = this._glenv.context;
        var  target = gl.TEXTURE_2D;
        var texture = gl.createTexture();
        var  params = Texture._getParameters( gl, opts || {} );

        gl.bindTexture( target, texture );

        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
        gl.texImage2D( target, 0, params.format, params.format, params.type, image );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );

        if ( params.gen_mipmap ) {
            gl.generateMipmap( target );
        }

        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, params.mag_filter );
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, params.min_filter );
        gl.texParameteri( target, gl.TEXTURE_WRAP_S, params.wrap );
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, params.wrap );

        gl.bindTexture( target, null );

        return texture;
    }


    /**
     * @private
     */
    static _getParameters( gl, opts )
    {
        var usage = opts.usage || Texture.Usage.GENERAL;

        var params = {
            format:     gl.RGBA,
            type:       gl.UNSIGNED_BYTE,
            mag_filter: gl.LINEAR,
            min_filter: gl.LINEAR_MIPMAP_LINEAR,
            wrap:       gl.REPEAT,
            gen_mipmap: true
        };

        if ( usage === Texture.Usage.TEXT ) {
            params.format     = gl.ALPHA;
            params.min_filter = gl.LINEAR;
            params.wrap       = gl.CLAMP_TO_EDGE;
            params.gen_mipmap = false;
        }

        return params;
    }

}


/**
 * @summary テクスチャの用途
 * @desc
 * {@link mapray.Texture} の構築子で opts.usage パラメータに指定する値の型である。
 * @enum {object}
 * @memberof mapray.Texture
 * @constant
 */
var Usage = {
    /**
     * 一般用途 (既定値)
     */
    GENERAL: { id: "GENERAL" },

    /**
     * テキスト表示
     */
    TEXT: { id: "TEXT" }
};


// クラス定数の定義
{
    Texture.Usage = Usage;
}


export default Texture;
