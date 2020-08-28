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
    load( options={} ) {
        return Promise.reject( new Error( "Not Implemented" ) );
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
    loadSubResource( url, options={} ) {
        return Promise.reject( new Error( "Not Supported" ) );
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
    resolveResource( url ) {
        return Promise.reject( new Error( "Not Supported" ) );
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
    load( options={} ) {
        const tr = this._transform( this._url, options.type );
        const http_option = this._make_fetch_params( tr ) || {};
        if ( options.signal ) http_option.signal = options.signal;
        return (
            HTTP.get( tr.url, null, http_option )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    if ( options.type === ResourceType.JSON ) {
                        return response.json();
                    }
                    else if ( options.type === ResourceType.IMAGE ) {
                        return Dom.loadImage( tr.url, http_option );
                    }
                    else if ( options.type === ResourceType.BINARY ) {
                        return response.arrayBuffer();
                    }
                    else return response;
            })
        );
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
    loadSubResource( subUrl, options={} ) {
        const url = Dom.resolveUrl( this._base_url, subUrl );
        const tr = this._transform( url, options.type );
        const http_option = tr.init || {};
        if ( options.signal ) http_option.signal = options.signal;

        if ( options.type === URLResource.ResourceType.BINARY ) {
            return (
                HTTP.get( tr.url, null, http_option )
                .then( response => {
                        if ( !response.ok ) throw new Error( response.statusText );
                        return response.arrayBuffer();
                })
            );
        }
        else if ( options.type === URLResource.ResourceType.IMAGE ) {
            return Dom.loadImage( tr.url, http_option );
        }
        else if ( options.type === URLResource.ResourceType.JSON ) {
            return (
                HTTP.get( tr.url, null, http_option )
                .then( response => {
                        if ( !response.ok ) throw new Error( response.statusText );
                        return response.json();
                })
            );
        }
        else {
            return (
                HTTP.get( tr.url, null, this._make_fetch_params( tr ) )
                .then( response => {
                        if ( !response.ok ) throw new Error( response.statusText );
                        return response;
                })
            );
        }
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
     * fetch() の init 引数に与えるオブジェクトを生成
     * @private
     */
    _make_fetch_params( tr )
    {
        var init = {
            signal:      this._abort_ctrl.signal,
            credentials: (tr.credentials || HTTP.CREDENTIAL_MODE.OMIT).credentials
        };

        if ( tr.headers ) {
            init.headers = tr.headers;
        }

        return init;
    }

    /**
     * バイナリを取得するときの fetch 関数のパラメータを取得
     *
     * @param  {string} url  バイナリの URL
     * @return {object}      { url: URL, init: fetch() に与える init オブジェクト }
     */
    makeBinaryFetchParams( url, resourceType )
    {
        const tr = this._transform( url, resourceType );

        var init = {
            credentials: (tr.credentials || CredentialMode.OMIT).credentials
        };
        if ( tr.headers ) {
            init.headers = tr.headers;
        }

        return {
            url:  tr.url,
            init: init
        };
    }


    /**
     * イメージを取得するときの Image のプロパティを取得
     *
     * @param  {string} url  バイナリの URL
     * @return {object}      { url: URL, crossOrigin: Image#crossOrigin }
     */
    _makeImageLoadParams( url, resourceType )
    {
        const tr = this._transform( url, resourceType );

        const params = {
            url: tr.url
        };

        // crossorigin 属性の値
        if ( tr.credentials === CredentialMode.SAME_ORIGIN ) {
            params.crossOrigin = "anonymous";
        }
        else if ( tr.credentials === CredentialMode.INCLUDE ) {
            params.crossOrigin = "use-credentials";
        }

        return params;
    }

}



function defaultTransformCallback( url, type ) {
    return { url: url };
}



export { URLResource, ResourceType };
export default Resource;
