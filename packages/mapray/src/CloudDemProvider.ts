import DemProvider from "./DemProvider";


/**
 * クラウド DEM プロバイダ
 */
class CloudDemProvider extends DemProvider {

    constructor( api_key: string ) {
        super( new CloudDemProvider.Hook( api_key ) );
    }

}



/**
 */
namespace CloudDemProvider {



export class Hook implements DemProvider.Hook {

    private _headers: {
        'X-Api-Key': string;
    };

    /**
     * @param {string} api_key  API キーの文字列
     */
    constructor( api_key: string )
    {
        this._headers = {
            'X-Api-Key': api_key
        };
    }


    init(): Promise<DemProvider.Info> {
        return Promise.resolve( {} );
    }


    async requestTile( z: number, x: number, y: number, options?: { signal?: AbortSignal } ): Promise<ArrayBuffer>
    {
        const response = await fetch( this._makeURL( z, x, y ), {
            headers: this._headers,
            signal:  options?.signal,
        } );
        if ( !response.ok ) throw new Error( response.statusText );
        return await response.arrayBuffer();
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



} // namespace CloudDemProvider



export default CloudDemProvider;
