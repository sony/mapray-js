/**
 * WebGL の環境
 *
 * WebGL レンダリングコンテキストを生成し、そのコンテキストに関連する
 * 情報を提供する。
 *
 * `glenv` が `GLEnv` インスタンスのとき、`glenv.context` により
 * `WebGLRenderingContext` インタフェースを得ることができ、対応してい
 * れば `glenv.context2` により `WebGL2RenderingContext` インタフェー
 * スを得ることができる。

 * また、以下の式は互いに同値である。
 *
 * - `glenv.context instanceof WebGL2RenderingContext`
 * - `glenv.is_webgl2()`
 * - `glenv.context2 !== null`
 *
 * @internal
 */
class GLEnv {

    private _canvas: HTMLCanvasElement;

    /**
     * `WebGLRenderingContext` インタフェースを取得
     *
     * @see [[context2]], [[is_webgl2]]
     */
    readonly context: WebGLRenderingContext;


    /**
     * `WebGL2RenderingContext` インタフェースを取得
     *
     * ただし、コンテキストが `WebGL2RenderingContext` インタフェースに対応し
     * ていなければ `null` を得る。
     *
     * @see [[context]], [[is_webgl2]]
     */
    readonly context2: WebGL2RenderingContext | null;


    readonly OES_element_index_uint: OES_element_index_uint | null;

    readonly EXT_texture_filter_anisotropic: EXT_texture_filter_anisotropic | null;

    readonly WEBGL_depth_texture: WEBGL_depth_texture | null;


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
        this.context  = context;
        this.context2 = (context instanceof WebGL2RenderingContext) ? context : null;

        const exts = this._getExtensions( context );
        this.OES_element_index_uint = exts.OES_element_index_uint;
        this.EXT_texture_filter_anisotropic = exts.EXT_texture_filter_anisotropic;
        this.WEBGL_depth_texture = exts.WEBGL_depth_texture;
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
        const contextTypes = ["webgl2", "webgl", "experimental-webgl"];
        for ( let i = 0; i < contextTypes.length; ++i ) {
            const context = canvas.getContext( contextTypes[i], ctx_attribs );
            if ( context instanceof WebGLRenderingContext ||
                 context instanceof WebGL2RenderingContext ) {
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
    private _getExtensions( gl: WebGLRenderingContext ) /* auto-type */
    {
        // OES_element_index_uint
        const OES_element_index_uint = gl.getExtension( "OES_element_index_uint" );

        // WEBGL_depth_texture
        const WEBGL_depth_texture =
            gl.getExtension( "WEBGL_depth_texture" ) ||
            gl.getExtension( "WEBKIT_WEBGL_depth_texture" ) ||
            gl.getExtension( "MOZ_WEBGL_depth_texture" );

        // EXT_texture_filter_anisotropic
        const EXT_texture_filter_anisotropic =
            gl.getExtension( "EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "WEBKIT_EXT_texture_filter_anisotropic" ) ||
            gl.getExtension( "MOZ_EXT_texture_filter_anisotropic" );

        return {
            OES_element_index_uint,
            WEBGL_depth_texture,
            EXT_texture_filter_anisotropic,
        };
    }


    /**
     * レンダリングターゲットとするキャンバス
     */
    get canvas(): HTMLCanvasElement { return this._canvas; }


    /**
     * WebGL2 レンダリングコンテキストか?
     *
     * [[context]] と [[context2]] が `WebGL2RenderingContext` インタフェース
     * を持つかどうかを返す。
     *
     * @see [[context]], [[context2]]
     */
    get is_webgl2(): boolean { return this.context2 !== null; }

}

export default GLEnv;
