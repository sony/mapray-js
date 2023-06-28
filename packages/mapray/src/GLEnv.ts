/**
 * WebGL の環境
 *
 * WebGL レンダリングコンテキストを生成し、そのコンテキストに関連する
 * 情報を提供する。
 *
 * `glenv` が `GLEnv` インスタンスのとき、`glenv.context` により
 * `WebGL2RenderingContext` インタフェースを得ることができる。
 *
 * @internal
 */
class GLEnv {

    private _canvas: HTMLCanvasElement;

    /**
     * `WebGL2RenderingContext` インタフェースを取得
     */
    readonly context: WebGL2RenderingContext;


    readonly OES_element_index_uint: OES_element_index_uint | null;

    readonly EXT_texture_filter_anisotropic: EXT_texture_filter_anisotropic | null;

    readonly EXT_color_buffer_float: EXT_color_buffer_float | null;


    /**
     * @param canvas レンダリングターゲットとするキャンバス
     */
    constructor( canvas: HTMLCanvasElement )
    {
        const ctx_attribs = { depth: true, antialias: true };

        const context = this._getContextWebGL( canvas, ctx_attribs );

        if ( !context ) {
            throw new Error( "It doesn't appear your computer can support WebGL2." );
        }

        this._canvas  = canvas;
        this.context  = context;

        const exts = this._getExtensions( context );
        this.OES_element_index_uint = exts.OES_element_index_uint;
        this.EXT_texture_filter_anisotropic = exts.EXT_texture_filter_anisotropic;
        this.EXT_color_buffer_float = exts.EXT_color_buffer_float;
    }


    /** 
     * WebGL コンテキストを取得
     * @param  canvas       Canvas 要素
     * @param  ctx_attribs  生成属性 (省略可能)
     * @return 取得された WebGL コンテキスト (コンテキストを持たないときは null)
     *
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2
     */
    private _getContextWebGL( canvas: HTMLCanvasElement, ctx_attribs: WebGLContextAttributes ): WebGL2RenderingContext | null
    {
        const contextTypes = ["webgl2"];
        for ( let i = 0; i < contextTypes.length; ++i ) {
            const context = canvas.getContext( contextTypes[i], ctx_attribs );
            if ( context instanceof WebGL2RenderingContext ) {
                return context;
            }
        }
        return null;
    }


    /**
     * 既知の WebGL 拡張を取得
     * @param gl  WebGL コンテキスト
     * @see https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14.14
     */
    private _getExtensions( gl: WebGL2RenderingContext ) /* auto-type */
    {
        // OES_element_index_uint
        const OES_element_index_uint = gl.getExtension( "OES_element_index_uint" );

        // EXT_texture_filter_anisotropic
        const EXT_texture_filter_anisotropic =
            gl.getExtension( "EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "WEBKIT_EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "MOZ_EXT_texture_filter_anisotropic" );

        // EXT_color_buffer_float
        const EXT_color_buffer_float = gl.getExtension("EXT_color_buffer_float");

        return {
            OES_element_index_uint,
            EXT_texture_filter_anisotropic,
            EXT_color_buffer_float
        };
    }


    /**
     * レンダリングターゲットとするキャンバス
     */
    get canvas(): HTMLCanvasElement { return this._canvas; }
}

export default GLEnv;
