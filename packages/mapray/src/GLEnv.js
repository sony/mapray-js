/**
 * @summary WebGL の環境
 * @desc
 * WebGL レンダリングコンテキストを生成し、そのコンテキストに関連する情報を提供する。
 * @memberof mapray
 * @private
 */
class GLEnv {

    /**
     * @param canvas {HTMLCanvasElement}  レンダリングターゲットとするキャンバス
     */
    constructor( canvas )
    {
        var ctx_attribs = { depth: true, antialias: true };

        var context = this._getContextWebGL( canvas, ctx_attribs );

        if ( !context ) {
            throw new Error( "It doesn't appear your computer can support WebGL." );
        }

        this._canvas  = canvas;
        this._context = context;
        this._setupExtensions( context );
    }


    /** 
     * @summary WebGL コンテキストを取得
     * @param  {HTMLCanvasElement}      canvas       Canvas 要素
     * @param  {WebGLContextAttributes} ctx_attribs  生成属性 (省略可能)
     * @return {WebGLRenderingContext}               取得された WebGL コンテキスト (コンテキストを持たないときは null)
     * @private
     *
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     */
    _getContextWebGL( canvas, ctx_attribs )
    {
        var contextTypes = ["webgl", "experimental-webgl"];
        for ( var i = 0; i < contextTypes.length; ++i ) {
            var context = canvas.getContext( contextTypes[i], ctx_attribs );
            if ( context ) {
                return context;
            }
        }
        return null;
    }


    /** 
     * @summary 既知の WebGL 拡張を設定
     * @param  {WebGLRenderingContext} gl  WebGL コンテキスト
     * @private
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14.14
     */
    _setupExtensions( gl )
    {
        // OES_element_index_uint
        this.OES_element_index_uint = gl.getExtension( "OES_element_index_uint" );

        // EXT_texture_filter_anisotropic
        this.EXT_texture_filter_anisotropic =
            gl.getExtension( "EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "WEBKIT_EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "MOZ_EXT_texture_filter_anisotropic" );
    }


    /**
     * @summary レンダリングターゲットとするキャンバス
     * @type {HTMLCanvasElement}
     * @readonly
     */
    get canvas() { return this._canvas; }


    /**
     * @summary WebGL レンダリングコンテキスト
     * @type {WebGLRenderingContext}
     * @readonly
     */
    get context() { return this._context; }

}

export default GLEnv;
