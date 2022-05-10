import GLEnv from "./GLEnv";
import { Vector4 } from "./GeoMath";
import { cfa_assert } from "./util/assertion";


/**
 * サポートされる入力画像の型
 */
export type SourceImage = HTMLImageElement | HTMLCanvasElement;


/**
 * モデルテクスチャ
 */
class Texture {

    /**
     * オプション `mag_filter`, `min_filter`, `wrap_s`, `wrap_t` は
     * WebGL の定数と同じ値を指定する。
     *
     * これらのうち、指定がなかったオプションは `usage` オプションによ
     * り決定される。
     *
     * @param glenv   - WebGL 環境
     * @param image   - 元画像 (`usage=COLOR` のときは `null`)
     * @param options - オプション
     */
    constructor( glenv:    GLEnv,
                 image:    SourceImage | null,
                 options?: Option )
    {
        this._glenv  = glenv;
        this._handle = this._createTexture( image, options ?? {} );
    }


    /**
     * テクスチャのハンドル
     */
    get handle(): WebGLTexture { return this._handle; }


    /**
     * リソースを破棄
     */
    dispose(): void
    {
        const gl = this._glenv.context;
        gl.deleteTexture( this._handle );
        // @ts-ignore
        this._handle = null;
    }


    /**
     * WebGL テクスチャオブジェクトを生成
     *
     * @param image - 元画像
     * @param opts  - オプション集合
     *
     * @return WebGL テクスチャオブジェクト
     */
    private _createTexture( image: SourceImage | null,
                            opts:  Option ): WebGLTexture
    {
        const      gl = this._glenv.context;
        const  target = gl.TEXTURE_2D;
        const texture = gl.createTexture();

        if ( texture === null ) {
            throw new Error( "Failed to create texture" );
        }

        const params = Texture._getParameters( gl, opts );

        gl.bindTexture( target, texture );

        const flip_y = opts.flip_y ?? true;
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, flip_y );

        if ( opts.usage === Texture.Usage.COLOR ) {
            // 均一色テクスチャー
            gl.texImage2D( target, 0, params.format, 1, 1, 0, params.format, params.type,
                           Texture._getColorArray( opts ) );
        }
        else {
            // 画像テクスチャー
            cfa_assert( image !== null ); // usage=COLOR 以外のときは非 null
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
     * @param gl   - WebGL コンテキスト
     * @param opts - オプション集合
     */
    private static _getParameters( gl:   WebGLRenderingContext,
                                   opts: Option ): TexGenParam
    {
        const params: TexGenParam = {
            format:     gl.RGBA,
            type:       gl.UNSIGNED_BYTE,
            mag_filter: gl.LINEAR,
            min_filter: gl.LINEAR_MIPMAP_LINEAR,
            wrap_s:     gl.REPEAT,
            wrap_t:     gl.REPEAT
        };

        if ( opts.usage === Texture.Usage.SIMPLETEXT ) {
            params.format     = gl.ALPHA;
            params.min_filter = gl.LINEAR;
            params.wrap_s     = gl.CLAMP_TO_EDGE;
            params.wrap_t     = gl.CLAMP_TO_EDGE;
        }
        else if ( opts.usage === Texture.Usage.TEXT) {
            params.min_filter = gl.LINEAR;
            params.wrap_s     = gl.CLAMP_TO_EDGE;
            params.wrap_t     = gl.CLAMP_TO_EDGE;
        }
        else if ( opts.usage === Texture.Usage.COLOR ) {
            params.mag_filter = gl.NEAREST;
            params.min_filter = gl.NEAREST;
        }
        else if ( opts.usage === Texture.Usage.ICON ) {
            params.min_filter = gl.LINEAR;
            params.wrap_s     = gl.CLAMP_TO_EDGE;
            params.wrap_t     = gl.CLAMP_TO_EDGE;
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
     * @param opts - オプション集合
     *
     * @return 均一色用の画像データ
     */
    private static _getColorArray( opts: Option ): Uint8Array
    {
        const  color = opts.color ?? [1, 1, 1, 1];
        const pixels = color.map( value => Math.round( 255*value ) );

        return new Uint8Array( pixels );
    }


    /**
     * ミップマップを生成するか？
     *
     * @param gl     - WebGL コンテキスト
     * @param params - 生成パラメータ
     *
     * @return ミップマップを生成するとき true, それ以外のとき false
     */
    private static _generateMipmapQ( gl: WebGLRenderingContext,
                                     params: TexGenParam ): boolean
    {
        const filter = params.min_filter;

        return (filter == gl.NEAREST_MIPMAP_NEAREST)
            || (filter == gl.LINEAR_MIPMAP_NEAREST)
            || (filter == gl.NEAREST_MIPMAP_LINEAR)
            || (filter == gl.LINEAR_MIPMAP_LINEAR);
    }


    private readonly _glenv:  GLEnv;
    private readonly _handle: WebGLTexture;

}


/**
 * [[Texture.constructor]] に与えるオプションの型
 */
export interface Option {

    /**
     * テクスチャ用途
     *
     * @default Texture.GENERAL
     */
    usage?: Texture.Usage;

    /**
     * 拡大フィルタ
     *
     * NEAREST | LINEAR
     */
    mag_filter?: GLenum;

    /**
     * 縮小フィルタ
     *
     * NEAREST | LINEAR | NEAREST_MIPMAP_NEAREST |
     * LINEAR_MIPMAP_NEAREST | NEAREST_MIPMAP_LINEAR |
     * LINEAR_MIPMAP_LINEAR
     */
    min_filter?: GLenum;

    /**
     * S Wrap
     *
     * CLAMP_TO_EDGE | MIRRORED_REPEAT | REPEAT
     */
    wrap_s?: GLenum

    /**
     * T Wrap
     *
     * CLAMP_TO_EDGE | MIRRORED_REPEAT | REPEAT
     */
    wrap_t?: GLenum;

    /**
     * 画像読み込み時に上下を反転するか？
     *
     * @default true
     */
    flip_y?: boolean;

    /**
     * usage=COLOR のときの色指定
     *
     * @default [1,1,1,1]
     */
    color?: Vector4;

}


/**
 * テクスチャ生成パラメータ
 */
interface TexGenParam {

    format:     GLenum;
    type:       GLenum;
    mag_filter: GLenum;
    min_filter: GLenum;
    wrap_s:     GLenum;
    wrap_t:     GLenum;

}


namespace Texture {

/**
 * テクスチャ用途の型
 *
 * [[Texture.constructor]] で `opts.usage` パラメータに指定する値の型
 * である。
 */
export const enum Usage {

    /**
     * 一般用途 (既定値)
     */
    GENERAL = "@@_Usage.GENERAL",

    /**
     * 均一色
     */
    COLOR = "@@_Usage.COLOR",

    /**
     * テキスト表示
     */
    TEXT = "@@_Usage.TEXT",

    /**
     * シンプルテキスト表示
     */
    SIMPLETEXT = "@@_Usage.SIMPLETEXT",

    /**
     * アイコン
     */
    ICON = "@@_Usage.ICON",

}

} // namespace Texture


export default Texture;
