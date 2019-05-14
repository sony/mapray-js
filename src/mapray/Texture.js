/**
 * @summary モデルテクスチャ
 * @memberof mapray
 * @package
 */
class Texture {

    /**
     * <p>オプション mag_filter, min_filter, wrap_s, wrap_t は WebGL の定数と同じ値を指定する。
     *    これらのうち、指定がなかったオプションは usage オプションにより決定される。</p>
     *
     * @param {mapray.GLEnv}                          glenv   WebGL 環境
     * @param {?(HTMLImageElement|HTMLCanvasElement)} image   元画像 (usage=COLOR のときは null)
     * @param {object}                             [options]  オプション集合
     * @param {mapray.Texture.Usage} [options.usage=GENERAL]    テクスチャ用途
     * @param {number}               [options.mag_filter]       拡大フィルタ (NEAREST | LINEAR)
     * @param {number}               [options.min_filter]       縮小フィルタ (NEAREST | LINEAR | NEAREST_MIPMAP_NEAREST |
     *                                                          LINEAR_MIPMAP_NEAREST | NEAREST_MIPMAP_LINEAR | LINEAR_MIPMAP_LINEAR)
     * @param {number}               [options.wrap_s]           S Wrap (CLAMP_TO_EDGE | MIRRORED_REPEAT | REPEAT)
     * @param {number}               [options.wrap_t]           T Wrap (CLAMP_TO_EDGE | MIRRORED_REPEAT | REPEAT)
     * @param {boolean}              [options.flip_y=true]      画像読み込み時に上下を反転するか？
     * @param {mapray.Vector4}       [options.color=[1,1,1,1]]  usage=COLOR のときの色指定
     */
    constructor( glenv, image, options )
    {
        var opts = options || {};
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
     * WebGL テクスチャオブジェクトを生成
     *
     * @param  {?(HTMLImageElement|HTMLCanvasElement)} image  元画像
     * @param  {object}                                opts   オプション集合
     * @return {WebGLTexture}  WebGL テクスチャオブジェクト
     * @private
     */
    _createTexture( image, opts )
    {
        var      gl = this._glenv.context;
        var  target = gl.TEXTURE_2D;
        var texture = gl.createTexture();
        var  params = Texture._getParameters( gl, opts );

        gl.bindTexture( target, texture );

        var flip_y = (opts.flip_y !== undefined) ? opts.flip_y : true;
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, flip_y );

        if ( opts.usage === Texture.Usage.COLOR ) {
            // 均一色テクスチャー
            gl.texImage2D( target, 0, params.format, 1, 1, 0, params.format, params.type,
                           Texture._getColorArray( opts ) );
        }
        else {
            // 画像テクスチャー
            gl.texImage2D( target, 0, params.format, params.format, params.type, image );
        }

        if ( flip_y ) {
            gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
        }

        if ( Texture._generateMipmapQ( gl, params ) ) {
            gl.generateMipmap( target );
        }

        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, params.mag_filter );
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, params.min_filter );
        gl.texParameteri( target, gl.TEXTURE_WRAP_S, params.wrap_s );
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, params.wrap_t );

        gl.bindTexture( target, null );

        return texture;
    }


    /**
     * テクスチャの生成パラメータを取得
     *
     * @param  {WebGLRenderingContext} gl    WebGL コンテキスト
     * @param  {object}                opts  オプション集合
     * @return {object}  生成パラメータ
     * @private
     */
    static
    _getParameters( gl, opts )
    {
        var params = {
            format:     gl.RGBA,
            type:       gl.UNSIGNED_BYTE,
            mag_filter: gl.LINEAR,
            min_filter: gl.LINEAR_MIPMAP_LINEAR,
            wrap_s:     gl.REPEAT,
            wrap_t:     gl.REPEAT
        };

        if ( opts.usage === Texture.Usage.TEXT ) {
            params.format     = gl.ALPHA;
            params.min_filter = gl.LINEAR;
            params.wrap_s     = gl.CLAMP_TO_EDGE;
            params.wrap_t     = gl.CLAMP_TO_EDGE;
        }
        else if ( opts.usage === Texture.Usage.COLOR ) {
            params.mag_filter = gl.NEAREST;
            params.min_filter = gl.NEAREST;
        }

        // オプション指定による上書き
        if (opts.mag_filter !== undefined) {
            params.mag_filter = opts.mag_filter;
        }
        if (opts.min_filter !== undefined) {
            params.min_filter = opts.min_filter;
        }
        if (opts.wrap_s !== undefined) {
            params.wrap_s = opts.wrap_s;
        }
        if (opts.wrap_t !== undefined) {
            params.wrap_t = opts.wrap_t;
        }

        return params;
    }


    /**
     * テクスチャの生成パラメータを取得
     *
     * @param  {object} opts  オプション集合
     * @return {Uint8Array}   均一色用の画像データ
     * @private
     */
    static
    _getColorArray( opts )
    {
        var  color = opts.color || [1, 1, 1, 1];
        var pixels = color.map( value => Math.round( 255*value ) );
        return new Uint8Array( pixels );
    }


    /**
     * ミップマップを生成するか？
     *
     * @param  {WebGLRenderingContext} gl      WebGL コンテキスト
     * @param  {object}                params  生成パラメータ
     * @return {boolean}  ミップマップを生成するとき true, それ以外のとき false
     * @private
     */
    static
    _generateMipmapQ( gl, params )
    {
        var filter = params.min_filter;
        return (filter == gl.NEAREST_MIPMAP_NEAREST)
            || (filter == gl.LINEAR_MIPMAP_NEAREST)
            || (filter == gl.NEAREST_MIPMAP_LINEAR)
            || (filter == gl.LINEAR_MIPMAP_LINEAR);
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
     * 均一色
     */
    COLOR: { id: "COLOR" },

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
