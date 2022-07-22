import HTTP from "./HTTP";
import Dom from "./util/Dom";
import CredentialMode from "./CredentialMode";



/**
 * リソースを表現するクラスです。
 * URLやDB、クラウドサービス等、各種リソースへのアクセスを同一インターフェースで提供することを目的とした抽象クラスです。
 *
 * 基本機能：
 * - コンストラクタ等によりあらかじめURLやデータの位置を示すプロパティを設定
 * - load()によりリソースを読み込む
 * - loadSubResource()によりサブリソースを読み込む
 */
abstract class Resource {

    /**
     * リソースを読み込みます。
     */
    async load( options: Resource.Option = {} ): Promise<any> {
        throw new Error( "Not Implemented" );
    }

    /**
     * Jsonリソースを読み込みます。
     */
    async loadAsJson( options: Resource.Option = {} ): Promise<object> {
        return await this.load({ ...options, type: Resource.Type.JSON }) as object;
    }

    /**
     * バイナリリソースを読み込みます。
     */
    async loadAsBinary( options: Resource.Option = {} ): Promise<ArrayBuffer> {
        return await this.load({ ...options, type: Resource.Type.BINARY }) as ArrayBuffer;
    }

    /**
     * イメージリソースを読み込みます。
     */
    async loadAsImage( options: Resource.Option = {} ): Promise<HTMLImageElement> {
        return await this.load({ ...options, type: Resource.Type.IMAGE }) as HTMLImageElement;
    }

    /**
     * テキストリソースを読み込みます。
     */
    async loadAsText( options: Resource.Option = {} ): Promise<string> {
        return await this.load({ ...options, type: Resource.Type.TEXT }) as string;
    }


    /**
     * リソースの読み込みをキャンセルできる場合はキャンセルします。
     */
    cancel() {
    }

    /**
     * サブリソースをサポートするかを返します。
     */
    loadSubResourceSupported(): boolean {
        return false;
    }

    /**
     * サブリソースを読み込みます。
     * @param url     URL
     * @param options
     * @return `options.type` に応じた型で返却されます。
     */
    async loadSubResource( url: string, options: Resource.Option = {} ): Promise<any> {
        throw new Error( "Not Supported" );
    }

    /**
     * 関連リソースをサポートするかを返します。
     */
    resolveResourceSupported(): boolean {
      return false;
    }

    /**
     * 関連リソースを読み込みます。
     */
    resolveResource( url: string ): Resource {
        throw new Error( "Not Supported" );
    }

    /**
     * リソースのテキスト表現
     */
    toString() {
        return "Resource";
    }
}


namespace Resource {


export interface Option {
    /**
     * 返却するタイプを指定します。
     */
    type?: Resource.Type;

    /**
     *
     */
    transform?: Resource.TransformCallback;

    /**
     *
     */
    signal?: AbortSignal;
}



/**
 * リソース要求変換関数
 *
 * リソースのリクエスト時に URL などを変換する関数の型である。
 *
 * ```ts
 * function( url, type ) {
 *     return {
 *         url:         url,
 *         credentials: mapray.CredentialMode.SAME_ORIGIN,
 *         headers: {
 *             'Header-Name': 'Header-Value'
 *         }
 *     };
 * }
 *
 * @param  url   変換前のリソース URL
 * @param  type  リソースの種類
 * @return       変換結果を表すオブジェクト
 */
export type TransformCallback = ( url: string, type: any ) => Resource.TransformResult;



/**
 * リソース要求変換関数の変換結果
 *
 * 関数型 [[Loader.TransformCallback]] の戻り値のオブジェクト構造である。
 */
export interface TransformResult {
    /**
     * 変換後のリソース URL
     */
    url: string;

    /**
     * クレデンシャルモード
     */
    credentials?: CredentialMode;

    /**
     * リクエストに追加するヘッダーの辞書 (キーがヘッダー名、値がヘッダー値)
     */
    headers?: object;
}



export function defaultTransformCallback( url: string, type: Resource.Type ) {
    return { url: url };
}



/**
 * リソースの種類
 */
export enum Type {

    /**
     * JSON
     */
    JSON,

    /**
     * バイナリ(ArrayBuffer)
     */
    BINARY,

    /**
     * 画像（Image）
     */
    IMAGE,

    /**
     * テキスト
     */
    TEXT,
};



}
// namespace Resource



/**
 * HTTPサーバなどで配信されるリソースを表現します。
 * ベースとなるリソースがサブリソースを持つようなリソースを想定したクラスです。
 *
 * 例としてhtmlの場合について説明します。
 * htmlファイルは画像やcssなど様々なサブリソースを持つことができます。
 * htmlファイルをベースとなるリソースと呼び、それ以外のファイルをサブリソースと呼びます。
 * サブリソースはベースとなるリソースからの相対パスで表現されることや、絶対パスで表現されることがあります。
 * また、htmlファイルには、別のhtmlファイルへのリンクが記述されることがあり、別のhtmlファイルはさらに画像やcssなどのファイルを持ちます。
 * このクラスは上記のような状況を表現することができます。
 * - [[load]] はベースとなるリソースの内容を読み込みます。
 * - [[loadSubResource]] は、ベースとなるリソースからの相対パスを指定してサブリソースの内容を読み込みます（絶対パスを指定すると指定したURLへ直接アクセスします）。
 * - [[resolveResource]] は、別のhtmlファイルへのリンクをたどるような状況を表現する場合に利用します。相対パスや絶対パスを指定すると、新たな Resource を得ることができます。
 *
 * 下記に使用例を示します。
 * ```ts
 * // https://.../test.html を起点とするリソースを定義します。
 * const resource = new URLResource("https://.../test.html");
 * // test.html の内容を読み込みます。
 *
 * const html = await resource.load({ type: Resource.ResourceType.TEXT });
 * // test.html と同一パスにある画像を読み込みます。
 *
 * const image = await resource.loadSubResource("image.png",
 *   { type: Resource.ResourceType.IMAGE });
 *
 * // test.html からの相対パス(sub) にある 別のhtml(other.html) を起点とするリソースを定義します。
 * const otherResource = resource.resolveResource("sub/other.html");
 *
 * // other.htmlの内容を読み込みます。
 * const otherHtml = await otherResource.load({ type: Resource.ResourceType.TEXT });
 *
 * // other.htmlと同一パスにあるの画像を読み込みます。
 * const otherImage = await otherResource.loadSubResource("image.png",
 *   { type: Resource.ResourceType.IMAGE });
 * ```
 */
class URLResource extends Resource {

    private _url: string;

    private _base_url: string;

    private _type: Resource.Type;

    private _transform: Resource.TransformCallback;

    private _abort_ctrl: AbortController;

    /**
     * @param url
     * @param options
     */
    constructor( url: string, options: Resource.Option = {} ) {
        super();
        this._url = url;
        const index = url.lastIndexOf( '/' );
        if ( index === -1 ) throw new Error( "invalid url" );
        this._base_url = this._url.substr( 0, index + 1 );
        this._type = options.type || Resource.Type.JSON;
        this._transform = options.transform || Resource.defaultTransformCallback;
        this._abort_ctrl = new AbortController();
    }

    /**
     * リソースのurl
     */
    get url(): string {
        return this._url;
    }

    /**
     * このリソースを読み込みます。
     * @param options
     */
    async load( options: Resource.Option = {} ): Promise<any> {
        return await this._loadURLResource( this._url, options.type || this._type, options );
    }

    /**
     * リソースの読み込みをキャンセルします。
     */
    cancel() {
        this._abort_ctrl.abort();
    }

    /**
     * このクラスでのデフォルト実装では、trueを返却します。
     */
    loadSubResourceSupported(): boolean {
        return true;
    }

    /**
     * サブリソースを読み込みます。
     * @param subUrl URL
     * @param options
     * @return `options.type` に応じた型で返却されます。
     */
    async loadSubResource( subUrl: string, options: Resource.Option = {} ): Promise<any> {
        return await this._loadURLResource( Dom.resolveUrl( this._base_url, subUrl ), options.type, options );
    }

    /**
     * 関連リソースをサポートするかを返します。
     */
    resolveResourceSupported(): boolean {
      return true;
    }

    /**
     * 関連リソースを読み込みます。
     * @param sub_url
     * @return
     */
    resolveResource( sub_url: string ): Resource {
        const url = Dom.resolveUrl( this._base_url, sub_url );
        return new URLResource( url, {
                transform: this._transform
        });
    }


    /**
     * @param url
     * @param type
     */
    private async _loadURLResource( url: string, type?: Resource.Type, options: Resource.Option = {} ) {
        const tr = this._transform( url, type );
        if ( type === Resource.Type.IMAGE ) {
            return await Dom.loadImage( tr.url, tr );
        }
        const http_option = this._make_fetch_params( tr ) || {};
        if ( options.signal ) http_option.signal = options.signal;

        const response = await HTTP.get( tr.url, undefined, http_option );
        if ( !response.ok ) throw new Error( response.statusText );

        return (
            type === Resource.Type.JSON   ? await response.json():
            type === Resource.Type.TEXT   ? await response.text():
            type === Resource.Type.BINARY ? await response.arrayBuffer():
            response
        );
    }

    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     */
    private _make_fetch_params( tr: Resource.TransformResult ): RequestInit {
        var init: RequestInit = {
            signal:      this._abort_ctrl.signal,
            credentials: tr.credentials || CredentialMode.OMIT,
        };

        if ( tr.headers ) {
            // @ts-ignore
            init.headers = tr.headers;
        }

        return init;
    }


    override toString() {
        return "URLResource(" + this.url + ")";
    }
}



export { URLResource };
export default Resource;
