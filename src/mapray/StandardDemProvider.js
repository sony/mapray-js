import DemProvider from "./DemProvider";
import CredentialMode from "./CredentialMode";


/**
 * @summary 標準 DEM プロバイダ
 * @classdesc
 * <p>汎用的な DEM プロバイダの実装である。</p>
 * <p>構築子の引数に prefix を与えた場合、各メソッドの動作は以下のようになる。
 * <pre>
 *   requestTile( z, x, y ) -> URL が prefix + z + '/' + x + '/' + y + suffix のデータを要求
 * </pre>
 * @memberof mapray
 * @extends mapray.DemProvider
 */
class StandardDemProvider extends DemProvider {

    /**
     * @param {string} prefix     URL の先頭文字列
     * @param {string} suffix     URL の末尾文字列
     * @param {object} [options]  オプション集合
     * @param {mapray.CredentialMode} [options.credentials=OMIT]  クレデンシャルモード
     * @param {object} [options.headers={}]  リクエストに追加するヘッダーの辞書
     */
    constructor( prefix, suffix, options )
    {
        super();

        var opts = options || {};

        this._prefix      = prefix;
        this._suffix      = suffix;
        this._credentials = (opts.credentials || CredentialMode.OMIT).credentials;
        this._headers     = Object.assign( {}, opts.headers );
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        var actrl = new AbortController();

        fetch( this._makeURL( z, x, y ), { credentials: this._credentials,
                                           headers:     this._headers,
                                           signal:      actrl.signal } )
            .then( response => {
                return response.ok ?
                    response.arrayBuffer() : Promise.reject( Error( response.statusText ) );
            } )
            .then( buffer => {
                // データ取得に成功
                callback( buffer );
            } )
            .catch( () => {
                // データ取得に失敗または取り消し
                callback( null );
            } );

        return actrl;
    }


    /**
     * @override
     */
    cancelRequest( id )
    {
        var actrl = id;  // 要求 ID を AbortController に変換
        actrl.abort();   // 取り消したので要求を中止
    }


    /**
     * URL を作成
     * @private
     */
    _makeURL( z, x, y )
    {
        return this._prefix + z + '/' + x + '/' + y + this._suffix;
    }

}


export default StandardDemProvider;
