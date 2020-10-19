import HTTP from "./HTTP";
import Dom from "./util/Dom";
import CredentialMode from "./CredentialMode";



/**
 * @classdesc リソースクラス
 * URLやDB、クラウドサービス等、各種リソースへのアクセスを同一インターフェースで提供することを目的とした抽象クラスです。
 * 基本機能：
 * ・コンストラクタ等によりあらかじめURLやデータの位置を示すプロパティを設定
 * ・load()によりリソースを読み込む
 * ・loadSubResource()によりサブリソースを読み込む
 *
 * @memberof mapray
 */
class Resource {

    /**
     * リソースを読み込みます。
     */
    async load( options={} ) {
        throw new Error( "Not Implemented" );
    }

    /**
     * @summary リソースの読み込みをキャンセルできる場合はキャンセルします。
     */
    cancel() {
    }

    /**
     * @summary サブリソースをサポートするかを返します。
     * @return {boolean}
     */
    loadSubResourceSupported() {
        return false;
    }

    /**
     * @summary サブリソースを読み込みます。
     * @param {string}  url       URL
     * @param {object} options
     * @param {mapray.Resource.ResourceType} [options.type] 返却するタイプを指定します。
     * @return {object} options.type に応じた型で返却されます。
     */
    async loadSubResource( url, options={} ) {
        throw new Error( "Not Supported" );
    }

    /**
     * @summary 関連リソースをサポートするかを返します。
     * @return {boolean}
     */
    resolveResourceSupported() {
      return false;
    }

    /**
     * @summary 関連リソースを読み込みます。
     * @return {boolean}
     */
    async resolveResource( url ) {
        throw new Error( "Not Supported" );
    }

    /**
     * @summary リソース型
     */
    static get ResourceType() { return ResourceType; }
}



/**
 * @summary リソースの種類
 * @enum {object}
 * @memberof mapray.ResourceType
 * @constant
 */
const ResourceType = {

    /**
     * JSON
     */
    JSON: { id: "JSON" },

    /**
     * バイナリ(ArrayBuffer)
     */
    BINARY: { id: "BINARY" },

    /**
     * 画像（Image）
     */
    IMAGE: { id: "IMAGE" }

};



/**
 * @classdesc URLリソースです。
 */
class URLResource extends Resource {

    /**
     * @param {string} url
     * @param {object} [options]
     * @param {mapray.Resource.ResourceType} [options.type]
     * @param {mapray.Transform} [options.transform]
     */
    constructor( url, options={} ) {
        super();
        this._url = url;
        const index = url.lastIndexOf( '/' );
        if ( index === -1 ) throw new Error( "invalid url" );
        this._base_url = this._url.substr( 0, index + 1 );
        this._type = options.type || "json";
        this._transform = options.transform || defaultTransformCallback;
        this._abort_ctrl = new AbortController();
    }

    /**
     * @summary リソースのurl
     * @type {string} リソースのurl
     */
    get url() {
        return this._url;
    }

    /**
     * @summary このリソースを読み込みます。
     * @param {object} [options]
     */
    async load( options={} ) {
        return await this._loadURLResource( this._url, options.type || this._type, options );
    }

    /**
     * @summary リソースの読み込みをキャンセルします。
     */
    cancel() {
        this._abort_ctrl.abort();
    }

    /**
     * @summary このクラスでのデフォルト実装では、trueを返却します。
     * @return {boolean}
     */
    loadSubResourceSupported() {
        return true;
    }

    /**
     * @summary サブリソースを読み込みます。
     * @param {string} subUrl URL
     * @param {object} options
     * @param {mapray.Resource.ResourceType} [options.type] 返却するタイプを指定します。
     * @return {object} options.type に応じた型で返却されます。
     */
    async loadSubResource( subUrl, options={} ) {
        return await this._loadURLResource( Dom.resolveUrl( this._base_url, subUrl ), options.type, options );
    }

    /**
     * @summary 関連リソースをサポートするかを返します。
     * @return {boolean}
     */
    resolveResourceSupported() {
      return true;
    }

    /**
     * @summary 関連リソースを読み込みます。
     * @param {string} url　
     * @return {Resource}
     */
    resolveResource( sub_url ) {
        const url = Dom.resolveUrl( this._base_url, sub_url );
        return new URLResource( url, {
                transform: this._transform
        });
    }


    /**
     * @param {string} url
     * @param {mapray.Resource.ResourceType} [type]
     * @private
     */
    async _loadURLResource( url, type, options={} ) {
        const tr = this._transform( url, type );
        if ( type === ResourceType.IMAGE ) {
            return await Dom.loadImage( tr.url, tr );
        }
        const http_option = this._make_fetch_params( tr ) || {};
        if ( options.signal ) http_option.signal = options.signal;

        const response = await HTTP.get( tr.url, null, http_option );
        if ( !response.ok ) throw new Error( response.statusText );

        return (
            type === ResourceType.JSON ? await response.json():
            type === ResourceType.BINARY ? await response.arrayBuffer():
            response
        );
    }

    /**
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr ) {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || HTTP.CREDENTIAL_MODE.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = tr.headers;
        }

        return init;
    }
}



function defaultTransformCallback( url, type ) {
    return { url: url };
}



export { URLResource, ResourceType };
export default Resource;
