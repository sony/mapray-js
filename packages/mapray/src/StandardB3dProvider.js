import B3dProvider from "./B3dProvider";
import CredentialMode from "./CredentialMode";


/**
 * @summary 標準 B3D プロバイダ
 * @classdesc
 * <p>汎用的な B3D プロバイダの実装である。</p>

 * <p>[requestMeta]{@link mapray.StandardB3dProvider#requestMeta}() は次の URL のオブジェクトを要求する。<p>
 * <pre>
 *   prefix + "tile-index.json"
 * </pre>

 * <p>L = level, C = coords のとき、[requestTile]{@link mapray.StandardB3dProvider#requestTile}( level, coords )
 *    は次の URL のオブジェクトを要求する。<p>
 * <pre>
 *   prefix + L + '/' + C[0] + '/' + C[1] + '/' + C[2] + suffix
 * </pre>
 *
 * @memberof mapray
 * @extends mapray.B3dProvider
 */
class StandardB3dProvider extends B3dProvider {

    /**
     * @param {string} prefix     URL の先頭文字列
     * @param {string} suffix     URL の末尾文字列
     * @param {object} [options]  オプション集合
     * @param {mapray.CredentialMode} [options.meta_credentials=OMIT]  メタデータのクレデンシャルモード
     * @param {object} [options.meta_headers={}]  メタデータのリクエストに追加するヘッダーの辞書
     * @param {mapray.CredentialMode} [options.tile_credentials=OMIT]  タイルデータのクレデンシャルモード
     * @param {object} [options.tile_headers={}]  タイルデータのリクエストに追加するヘッダーの辞書
     */
    constructor( prefix, suffix, options )
    {
        super();

        const opts = options || {};

        this._prefix = prefix;
        this._suffix = suffix;

        this._meta_credentials = (opts.meta_credentials || CredentialMode.OMIT).credentials;
        this._meta_headers     = Object.assign( {}, opts.meta_headers );

        this._tile_credentials = (opts.tile_credentials || CredentialMode.OMIT).credentials;
        this._tile_headers     = Object.assign( {}, opts.tile_headers );
    }


    /**
     * @override
     */
    requestMeta( callback )
    {
        const actrl = new AbortController();

        fetch( this._makeMetaURL(), { credentials: this._meta_credentials,
                                      headers:     this._meta_headers,
                                      signal:      actrl.signal } )
            .then( response => {
                return response.ok ?
                    response.json() : Promise.reject( Error( response.statusText ) );
            } )
            .then( data => {
                // データ取得に成功
                callback( data );
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
    requestTile( level, coords, callback )
    {
        const actrl = new AbortController();

        fetch( this._makeTileURL( level, coords ), { credentials: this._tile_credentials,
                                                     headers:     this._tile_headers,
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
        const actrl = id;  // 要求 ID を AbortController に変換
        actrl.abort();   // 取り消したので要求を中止
    }


    /**
     * メタデータの URL を作成
     * @private
     */
    _makeMetaURL()
    {
        return this._prefix + "tile-index.json";
    }


    /**
     * タイルデータの URL を作成
     * @private
     */
    _makeTileURL( level, coords )
    {
        const c = coords;

        return this._prefix + level + '/' + c[0] + '/' + c[1] + '/' + c[2] + this._suffix;
    }

}


export default StandardB3dProvider;
