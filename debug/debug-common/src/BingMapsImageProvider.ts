import mapray from "@mapray/mapray-js";


type Callback = (status: any) => void;



/**
 * Bing Maps 画像プロバイダ
 *
 * Bing Maps で配信されている画像タイルを読み込む画像プロバイダです。
 * 利用するには BingMaps のキーが必要です。
 */
class BingMapsImageProvider extends mapray.ImageProvider {

    constructor( options: BingMapsImageProvider.Option = {} ) {
        super( new BingMapsImageProvider.Hooks( options ) );
    }

}



namespace BingMapsImageProvider {



/**
 * Bing Maps 画像プロバイダフック
 */
export class Hooks implements mapray.ImageProvider.Hook {

    private _options: BingMapsImageProvider.Option;

    private _size?: number;

    private _min_level?: number;

    private _max_level?: number;

    /* サブドメインとカルチャを置き換えた URL テンプレート */
    private _templ_urls!: string[];

    private _counter: number;


    /**
     * @param {object} [options]                      オプション集合
     * @param {string} [options.key]                  ユーザーキー
     * @param {string} [options.imagerySet="Aerial"]  画像のタイプ ({@link https://msdn.microsoft.com/en-us/library/ff701716.aspx|Get Imagery Metadata} の imagerySet を参照)
     * @param {string} [options.uriScheme="http"]     URI スキーム ("http" または "https")
     * @param {string} [options.culture]              カルチャ ({@link https://msdn.microsoft.com/en-us/library/hh441729.aspx|Supported Culture Codes} を参照)
     */
    constructor( options: BingMapsImageProvider.Option = {} )
    {
        this._options = options;

        this._size       = undefined;
        this._min_level  = undefined;
        this._max_level  = options.maxLevel;
        this._counter    = 0;
    }


    /**
     * メターデータの読み込み
     * @see https://msdn.microsoft.com/en-us/library/mt823633.aspx
     */
    async init( options?: { signal?: AbortSignal } )
    {
        const opts = this._options;
        let url = BingMapsImageProvider.TemplMetadataURL;
        url = url.replace( '{key}', opts.key || '' );
        url = url.replace( '{imagerySet}', opts.imagerySet || BingMapsImageProvider.DefaultImagerySet );
        url = url.replace( /\{uriScheme\}/g, opts.uriScheme || BingMapsImageProvider.DefaultUriScheme );

        const response = await fetch( url, { signal: options?.signal });
        if ( !response.ok ) {
            throw new Error( response.statusText );
        }
        const json = await response.json();
        return this._analyze_matadata( json, opts );
    }


    /**
     * メターデータの解析
     * @see https://msdn.microsoft.com/en-us/library/ff701716.aspx
     */
    private _analyze_matadata( json: any, opts: BingMapsImageProvider.Option ): mapray.ImageProvider.Info
    {
        const resource = json.resourceSets[0].resources[0];

        if ( resource.imageWidth != resource.imageHeight ) {
            throw new Error( "it supports only square images" );
        }

        const culture = opts.culture || BingMapsImageProvider.DefaultCulture;
        let   templ = resource.imageUrl.replace( '{culture}', culture );  // カルチャ置き換え済み URL テンプレート

        this._size       = resource.imageWidth;
        this._min_level  = resource.zoomMin;
        this._max_level  = this._max_level || resource.zoomMax;
        this._templ_urls = resource.imageUrlSubdomains.map( (subdomain: string) => templ.replace( '{subdomain}', subdomain ) );

        return {
            image_size: this._size,
            zoom_level_range: new mapray.ImageProvider.Range( resource.zoomMin, this._max_level || resource.zoomMax ),
        };
    }


    requestTile( z: number, x: number, y:number )
    {
        return new Promise<HTMLImageElement>( ( resolve, reject ) => {
            const image = new Image();
            image.onload      = () => resolve( image );
            image.onerror     = () => reject( new Error( "Failed to load image: " + z + "/" + x + "/" + y ) );
            image.crossOrigin = "anonymous";
            image.src         = this._makeURL( z, x, y );
        } );
    }


    /**
     * URL を作成
     */
    private _makeURL( z: number, x: number, y: number )
    {
        // templ_url の '{quadkey}' を置き換える
        // quadkey については Tile Coordinates and Quadkeys (https://msdn.microsoft.com/en-us/library/bb259689.aspx) を参照
        let templ_url = this._templ_urls[this._counter % this._templ_urls.length];

        let quadkey = '';
        for ( let i = 0; i < z; ++i ) {
            const bx = (x >> i) & 1;
            const by = (y >> i) & 1;
            quadkey = (bx + 2*by) + quadkey;
        }

        ++this._counter;
        return templ_url.replace( '{quadkey}', quadkey );
    }

}



export interface Option {
    key?: string;
    imagerySet?: string;
    uriScheme?: string;
    culture?: string;
    maxLevel?: number;
}



export const TemplMetadataURL  = "{uriScheme}://dev.virtualearth.net/REST/v1/Imagery/Metadata/{imagerySet}?uriScheme={uriScheme}&include=ImageryProviders&key={key}";
export const DefaultCulture    = "";
export const DefaultUriScheme  = "http";
export const DefaultImagerySet = "Aerial";



} // namespace BingMapsImageProvider



export default BingMapsImageProvider
