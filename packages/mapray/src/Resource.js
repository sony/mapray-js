import HTTP from "./HTTP";
import Dom from "./util/Dom";
import CredentialMode from "./CredentialMode";



/**
 * @summary リソースクラス
 * URLやDB、クラウドサービス等、各種リソースへのアクセスを同一インターフェースで提供することを目的とした抽象クラスです。
 * 基本機能：
 * ・コンストラクタ等によりあらかじめURLやデータの位置を示すプロパティを設定
 * ・load()によりリソースを読み込む
 * ・loadSubResource()によりサブリソースを読み込む
 *
 * サブリソースの読み込みについて、
 * @memberof mapray
 */
class Resource {

    /**
     * @protected
     */
    async load( options={} ) {
        throw new Error( "Not Implemented" );
    }

    /**
     * @protected
     */
    cancel() {
    }

    /**
     * @protected
     */
    loadSubResourceSupported() {
        return false;
    }

    /**
     * @param {string}  url       URL
     * @param {options} [options] 
     * @param {mapray.Resource.ResourceType} [options.type] 
     * @protected
     */
    async loadSubResource( url, options={} ) {
        throw new Error( "Not Supported" );
    }

    /**
     * @protected
     */
    resolveResourceSupported() {
      return false;
    }

    /**
     * @protected
     */
    async resolveResource( url ) {
        throw new Error( "Not Supported" );
    }

    /**
     * 
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
     * バイナリ
     */
    BINARY: { id: "BINARY" },

    /**
     * テクスチャ画像ファイル
     */
    IMAGE: { id: "IMAGE" }

};



/**
 * 
 */
class URLResource extends Resource {

    /**
     * @param {string} url
     * @param {object} [options]
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
     * @param {object} [options]
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
     * 
     */
    cancel() {
        this._abort_ctrl.abort();
    }

    /**
     * 
     */
    loadSubResourceSupported() {
        return true;
    }

    /**
     * 
     */
    async loadSubResource( subUrl, options={} ) {
        return await this._loadURLResource( Dom.resolveUrl( this._base_url, subUrl ), options.type, options );
    }

    /**
     * @protected
     */
    resolveResourceSupported() {
      return true;
    }

    /**
     * @param {string} sub_url
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
