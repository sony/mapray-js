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

    load( resourceType ) {
        return Promise.reject( new Error( "Not Implemented" ) );
    }

    cancel() {
    }

    isSubResourceSupported() {
        return false;
    }

    loadSubResource( url, resourceType ) {
    }
}



class URLResource extends Resource {

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

    load( resourceType ) {
        const tr = this._transform( this._url, resourceType );
        return (
            HTTP.get( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    if ( this._type !== "json" ) {
                        throw new Error( "unsupported type: " + this._type );
                    }
                    return response.json();
            })
        );
    }

    cancel() {
        this._abort_ctrl.abort();
    }

    isSubResourceSupported() {
        return true;
    }

    loadSubResource( subUrl, resourceType ) {
        const url = this._resolve_url( subUrl );
        const tr = this._transform( url, resourceType );
        return (
            HTTP.get( tr.url, this._make_fetch_params( tr ) )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    return response.json();
            })
        );
    }

    loadSubResourceAsArrayBuffer( subUrl, resourceType ) {
        const url = this._resolve_url( subUrl );
        const tr = this.makeBinaryFetchParams( url, resourceType );
        return (
            HTTP.get( tr.url, tr.init )
            .then( response => {
                    if ( !response.ok ) throw new Error( response.statusText );
                    return response;
            })
            .then( response => response.arrayBuffer() )
        );
    }

    loadSubResourceAsImage( subUrl, resourceType ) {
        const url = this._resolve_url( subUrl );
        const tr = this._makeImageLoadParams( url, resourceType );
        return Dom.loadImage( tr.url, { crossOrigin: tr.crossOrigin } );
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

    _resolve_url( url ) {
        if ( DATA_URL_PATTERN.test( url ) || ABSOLUTE_URL_PATTERN.test( url ) ) {
            // url がデータ url または絶対 url のときは
            // そのまま url をリクエスト
            return url;
        }
        else {
            // それ以外のときは url を相対 url と解釈し
            // 基底 url と結合した url をリクエスト
            return this._base_url + url;
        }
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


const DATA_URL_PATTERN = new RegExp("^data:");
const ABSOLUTE_URL_PATTERN = new RegExp("^https?://");



function defaultTransformCallback( url, type )
{
    return { url: url };
}

export { URLResource };
export default Resource;