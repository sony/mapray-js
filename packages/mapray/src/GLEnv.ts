/**
 * WebGL の環境
 * WebGL レンダリングコンテキストを生成し、そのコンテキストに関連する情報を提供する。
 * @internal
 */
class GLEnv {

    private _canvas: HTMLCanvasElement;

    private _context: WebGLRenderingContext;

    OES_element_index_uint!: OES_element_index_uint | null;

    EXT_texture_filter_anisotropic!: EXT_texture_filter_anisotropic | null;

    WEBGL_depth_texture!: WEBGL_depth_texture | null;


    /**
     * @param canvas レンダリングターゲットとするキャンバス
     */
    constructor( canvas: HTMLCanvasElement )
    {
        const ctx_attribs = { depth: true, antialias: true };

        const context = this._getContextWebGL( canvas, ctx_attribs );

        if ( !context ) {
            throw new Error( "It doesn't appear your computer can support WebGL." );
        }

        this._canvas  = canvas;
        this._context = context;

        this._setupExtensions( context );
    }


    /** 
     * WebGL コンテキストを取得
     * @param  canvas       Canvas 要素
     * @param  ctx_attribs  生成属性 (省略可能)
     * @return 取得された WebGL コンテキスト (コンテキストを持たないときは null)
     *
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     */
    private _getContextWebGL( canvas: HTMLCanvasElement, ctx_attribs: WebGLContextAttributes ): WebGLRenderingContext | null
    {
        const contextTypes = ["webgl", "experimental-webgl"];
        for ( let i = 0; i < contextTypes.length; ++i ) {
            const context = canvas.getContext( contextTypes[i], ctx_attribs );
            if ( context instanceof WebGLRenderingContext ) {
                return context;
            }
        }
        return null;
    }


    /** 
     * 既知の WebGL 拡張を設定
     * @param gl  WebGL コンテキスト
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14.14
     */
    private _setupExtensions( gl: WebGLRenderingContext )
    {
        // OES_element_index_uint
        this.OES_element_index_uint = gl.getExtension( "OES_element_index_uint" );

        // WEBGL_depth_texture
        this.WEBGL_depth_texture =
            gl.getExtension( "WEBGL_depth_texture" ) ||
            gl.getExtension( "WEBKIT_WEBGL_depth_texture" ) ||
            gl.getExtension( "MOZ_WEBGL_depth_texture" );

        // EXT_texture_filter_anisotropic
        this.EXT_texture_filter_anisotropic =
            gl.getExtension( "EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "WEBKIT_EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "MOZ_EXT_texture_filter_anisotropic" );
    }


    /**
     * レンダリングターゲットとするキャンバス
     */
    get canvas(): HTMLCanvasElement { return this._canvas; }


    /**
     * WebGL レンダリングコンテキスト
     */
    get context(): WebGLRenderingContext { return this._context; }

}

export default GLEnv;
