import DemProvider from "./DemProvider";
import CredentialMode from "./CredentialMode";
import Util from "./util/Util";


/**
 * 標準 DEM プロバイダ
 *
 * 汎用的な DEM プロバイダ実装です。
 */
class StandardDemProvider extends DemProvider {

    constructor( data: StandardDemProvider.ResourceInfo ) {
        super( new StandardDemProvider.Hook( data ) );
    }

}



namespace StandardDemProvider {



export class Hook implements DemProvider.Hook {

    private _prefix: string;

    private _suffix: string;

    private _info: DemProvider.Info;

    private _credentials: CredentialMode;

    private _headers: HeadersInit;


    /**
     * @param prefix   URL の先頭文字列
     * @param suffix   URL の末尾文字列
     * @param options  オプション集合
     */
    constructor( data: StandardDemProvider.ResourceInfo )
    {
        this._prefix      = data.prefix;
        this._suffix      = data.suffix ?? StandardDemProvider.DEFAULT_SUFFIX;
        this._info        = {
            resolution_power: data.resolution_power,
        };
        this._credentials = data.credentials ?? CredentialMode.OMIT;
        this._headers     = Object.assign( {}, data.headers );
    }


    init(): Promise<Required<DemProvider.Info>>
    {
        return Promise.resolve( DemProvider.applyInfoWithDefaults( this._info ) );
    }


    async requestTile( z: number, x: number, y: number, options?: { signal: AbortSignal } ): Promise<ArrayBuffer>
    {
        const response = await fetch( this._makeURL( z, x, y ), {
            credentials: this._credentials,
            headers: this._headers,
            signal: options?.signal,
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
        return this._prefix + z + "/" + x + "/" + y + this._suffix;
    }

}



export const DEFAULT_SUFFIX = ".bin";



export interface ResourceInfo {

    /**
     */
    prefix: string; // @ToDo: url

    /**
     * URLの最後に付与する値
     * @default ".bin"
     */
    suffix?: string;

    /**
     * 解像度の指数
     *
     * DEM タイルデータ解像度の 2 を底とする対数を取得する。DEM タイルデータの解像度は必ず 2 のべき乗である。
     *
     * @default 8
     */
    resolution_power?: number;

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
