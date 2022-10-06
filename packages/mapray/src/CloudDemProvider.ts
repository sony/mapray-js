import DemProvider from "./DemProvider";


/**
 * @summary クラウド DEM プロバイダ
 * @memberof mapray
 * @extends mapray.DemProvider
 */
class CloudDemProvider extends DemProvider<AbortController> {

    private _headers: {
        'X-Api-Key': string;
    };

    /**
     * @param {string} api_key  API キーの文字列
     */
    constructor( api_key: string )
    {
        super();

        this._headers = {
            'X-Api-Key': api_key
        };
    }


    override requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): AbortController
    {
        var actrl = new AbortController();

        fetch( this._makeURL( z, x, y ), { headers: this._headers,
                                           signal:  actrl.signal } )
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


    override cancelRequest( id: AbortController )
    {
        var actrl = id;
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
        return 'https://tiles.mapray.com/dem/' + z + '/' + x + '/' + y + '.bin';
    }

}



export default CloudDemProvider;
