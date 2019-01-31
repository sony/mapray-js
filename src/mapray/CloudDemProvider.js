import DemProvider from "./DemProvider";


/**
 * @summary クラウド DEM プロバイダ
 * @memberof mapray
 * @extends mapray.DemProvider
 */
class CloudDemProvider extends DemProvider {

    /**
     * @param {string} api_key  API キーの文字列
     */
    constructor( api_key )
    {
        super();

        this._headers = {
            'X-Api-Key': api_key
        };
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        var actrl = new AbortController();

        fetch( this._makeURL( z, x, y ), { headers: this._headers,
                                           signal:  actrl.signal } )
            .then( response => response.arrayBuffer() )
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
        return 'https://tiles.mapray.com/dem/' + z + '/' + x + '/' + y + '.bin';
    }

}


export default CloudDemProvider;
