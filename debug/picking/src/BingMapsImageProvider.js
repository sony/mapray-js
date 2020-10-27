import mapray from "@mapray/mapray-js";


var ImageProvider = mapray.ImageProvider;
var        Status = ImageProvider.Status;


/**
 * @summary Bing Maps 画像プロバイダ
 * @memberof mapray
 * @extends mapray.ImageProvider
 */
export default class BingMapsImageProvider extends ImageProvider {

    /**
     * @param {object} [options]                      オプション集合
     * @param {string} [options.key]                  ユーザーキー
     * @param {string} [options.imagerySet="Aerial"]  画像のタイプ ({@link https://msdn.microsoft.com/en-us/library/ff701716.aspx|Get Imagery Metadata} の imagerySet を参照)
     * @param {string} [options.uriScheme="http"]     URI スキーム ("http" または "https")
     * @param {string} [options.culture]              カルチャ ({@link https://msdn.microsoft.com/en-us/library/hh441729.aspx|Supported Culture Codes} を参照)
     */
    constructor( options )
    {
        super();

        var opts = options || {};

        this._status    = Status.NOT_READY;
        this._callbacks = [];

        this._size       = undefined;
        this._min_level  = undefined;
        this._max_level  = options.maxLevel;
        this._templ_urls = undefined;  // サブドメインとカルチャを置き換えた URL テンプレート
        this._counter    = 0;

        this._load_matadata( opts );
    }


    /**
     * メターデータの読み込み
     * @see https://msdn.microsoft.com/en-us/library/mt823633.aspx
     * @private
     */
    _load_matadata( opts )
    {
        var url = BingMapsImageProvider.TemplMetadataURL;
        url = url.replace( '{key}', opts.key || '' );
        url = url.replace( '{imagerySet}', opts.imagerySet || BingMapsImageProvider.DefaultImagerySet );
        url = url.replace( /\{uriScheme\}/g, opts.uriScheme || BingMapsImageProvider.DefaultUriScheme );

        fetch( url )
            .then( response => {
                return response.ok ?
                    response.json() : Promise.reject( Error( response.statusText ) );
            } )
            .then( json => {
                this._analyze_matadata( json, opts );
                this._status = Status.READY;
            } )
            .catch( err => {
                console.error( "BingMapsImageProvider: " + err.message );
                this._status = Status.FAILED;
            } ).then( () => {
                // 状態変化を通知
                for ( var i = 0; i < this._callbacks.length; ++i ) {
                    this._callbacks[i]( this._status );
                }
            } );
    }


    /**
     * メターデータの解析
     * @see https://msdn.microsoft.com/en-us/library/ff701716.aspx
     * @private
     */
    _analyze_matadata( json, opts )
    {
        var resource = json.resourceSets[0].resources[0];

        if ( resource.imageWidth != resource.imageHeight ) {
            throw new Error( "it supports only square images" );
        }

        var culture = opts.culture || BingMapsImageProvider.DefaultCulture;
        var   templ = resource.imageUrl.replace( '{culture}', culture );  // カルチャ置き換え済み URL テンプレート

        this._size       = resource.imageWidth;
        this._min_level  = resource.zoomMin;
        this._max_level  = this._max_level || resource.zoomMax;
        this._templ_urls = resource.imageUrlSubdomains.map( subdomain => templ.replace( '{subdomain}', subdomain ) );
    }

    /**
     * @override
     */
    status( callback )
    {
        if ( this._status === Status.NOT_READY ) {
            if ( callback ) {
                this._callbacks.push( callback );
            }
        }
        return this._status;
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        var image = new Image();

        image.onload  = function() { callback( image ); };
        image.onerror = function() { callback( null );  };

        image.crossOrigin = "anonymous";
        image.src         = this._makeURL( z, x, y );

        return image;  // 要求 ID (実態は Image)
    }


    /**
     * @override
     */
    cancelRequest( id )
    {
    }


    /**
     * @override
     */
    getImageSize()
    {
        return this._size;
    }


    /**
     * @override
     */
    getZoomLevelRange()
    {
        return new ImageProvider.Range( this._min_level, this._max_level );
    }


    /**
     * URL を作成
     * @private
     */
    _makeURL( z, x, y )
    {
        // templ_url の '{quadkey}' を置き換える
        // quadkey については Tile Coordinates and Quadkeys (https://msdn.microsoft.com/en-us/library/bb259689.aspx) を参照
        var templ_url = this._templ_urls[this._counter % this._templ_urls.length];

        var quadkey = '';
        for ( var i = 0; i < z; ++i ) {
            var bx = (x >> i) & 1;
            var by = (y >> i) & 1;
            quadkey = (bx + 2*by) + quadkey;
        }

        ++this._counter;
        return templ_url.replace( '{quadkey}', quadkey );
    }

}


BingMapsImageProvider.TemplMetadataURL  = "{uriScheme}://dev.virtualearth.net/REST/v1/Imagery/Metadata/{imagerySet}?uriScheme={uriScheme}&include=ImageryProviders&key={key}";
BingMapsImageProvider.DefaultCulture    = "";
BingMapsImageProvider.DefaultUriScheme  = "http";
BingMapsImageProvider.DefaultImagerySet = "Aerial";
