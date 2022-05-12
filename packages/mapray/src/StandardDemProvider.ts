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
class StandardDemProvider extends DemProvider<AbortController> {

    private _prefix: string;

    private _suffix: string;

    private _credentials: CredentialMode;

    private _headers: HeadersInit;


    /**
     * @param prefix   URL の先頭文字列
     * @param suffix   URL の末尾文字列
     * @param options  オプション集合
     */
    constructor( prefix: string, suffix: string, options: StandardDemProvider.Option = {} )
    {
        super();

        this._prefix      = prefix;
        this._suffix      = suffix;
        this._credentials = options.credentials || CredentialMode.OMIT;
        this._headers     = Object.assign( {}, options.headers );
    }


    override requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): AbortController
    {
        const actrl = new AbortController();

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
                callback( undefined );
            } );

        return actrl;
    }


    override cancelRequest( id: AbortController )
    {
        const actrl = id;
        actrl.abort();
    }


    /**
     * URL を作成
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     */
    private _makeURL( z: number, x: number, y: number )
    {
        return this._prefix + z + '/' + x + '/' + y + this._suffix;
    }

}



namespace StandardDemProvider {



export interface Option {
    /**
     * クレデンシャルモード
     */
    credentials?: CredentialMode;

    /**
     * リクエストに追加するヘッダーの辞書
     */
    headers?: HeadersInit;
}



} // namespace StandardDemProvider



export default StandardDemProvider;
