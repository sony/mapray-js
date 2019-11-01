class USGSImageProvider extends mapray.ImageProvider {
    constructor( prefix, suffix, size, zmin, zmax, opts )
    {
        super();
        this._prefix    = prefix;
        this._suffix    = suffix;
        this._size      = size;
        this._min_level = zmin;
        this._max_level = zmax;

        // タイル座標を並び替える関数
        var orderCoords;
        if ( opts && opts.coord_order ) {
            if ( opts.coord_order === CoordOrder.ZYX ) {
                orderCoords = function( z, x, y ) { return z + "/" + y + "/" + x; };
            }
            else if ( opts.coord_order === CoordOrder.XYZ ) {
                orderCoords = function( z, x, y ) { return x + "/" + y + "/" + z; };
            }
        }
        if ( !orderCoords ) {
            // その他の場合は既定値 COORD_ORDER_ZXY を使う
            orderCoords = function( z, x, y ) { return z + "/" + x + "/" + y; };
        }

        // XY 座標を変換する関数
        var convCoords;
        if ( opts && opts.coord_system ) {
            if ( opts.coord_system === CoordSystem.LOWER_LEFT ) {
                convCoords = function( z, x, y ) {
                    var size = Math.round( Math.pow( 2, z ) );
                    return orderCoords( z, x, size - y - 1 );
                };
            }
        }
        if ( !convCoords ) {
            // その他の場合は既定値 UPPER_LEFT (無変換) を使う
            convCoords = orderCoords;
        }

        // 座標部分の URL を取得する関数
        this._coords_part = convCoords;

        // crossorigin 属性の値
        this._crossOrigin = "anonymous";
        if ( opts && opts.credentials ) {
            if ( opts.credentials === mapray.CredentialMode.OMIT ) {
                this._crossOrigin = null;
            }
            else if ( opts.credentials === mapray.CredentialMode.INCLUDE ) {
                this._crossOrigin = "use-credentials";
            }
        }
    }


    /**
     * @override
     */
    requestTile( z, x, y, callback )
    {
        var image = new Image();

        image.onload  = function() { callback( image ); };
        image.onerror = function() { callback( null );  };

        if ( this._crossOrigin !== null ) {
            image.crossOrigin = this._crossOrigin;
        }

        image.src = this._makeURL( z, x, y );

        return image;  // 要求 ID (実態は Image)
    }


    /**
     * @override
     */
    cancelRequest( id )
    {
        // TODO: Image 読み込みの取り消し方法は不明
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
        return new mapray.ImageProvider.Range( this._min_level, this._max_level );
    }


    /**
     * URL を作成
     * @private
     */
    _makeURL( z, x, y )
    {
        return this._prefix + this._coords_part( z, x, y ) + this._suffix;
    }

}


/**
 * @summary URL 座標順序の列挙型
 * @desc
 * {@link mapray.StandardImageProvider} の構築子で opts.coord_order パラメータに指定する値の型である。
 * @enum {object}
 * @memberof mapray.StandardImageProvider
 * @constant
 */
var CoordOrder = {
    /**
     * 座標順序 Z/X/Y (既定値)
     */
    ZXY: { id: "ZXY" },

    /**
     * 座標順序 Z/Y/X
     */
    ZYX: { id: "ZYX" },

    /**
     * 座標順序 Z/X/Y
     */
    XYZ: { id: "XYZ" }
};


/**
 * @summary タイル XY 座標系の列挙型
 * @desc
 * {@link mapray.StandardImageProvider} の構築子で opts.coord_system パラメータに指定する値の型である。
 * @enum {object}
 * @memberof mapray.StandardImageProvider
 * @constant
 */
var CoordSystem = {
    /**
     * 原点:左上, X軸:右方向, Y軸:下方向 (既定値)
     */
    UPPER_LEFT: { id: "UPPER_LEFT" },

    /**
     * 原点:左下, X軸:右方向, Y軸:上方向
     */
    LOWER_LEFT: { id: "LOWER_LEFT" }
};


// クラス定数の定義
{
    USGSImageProvider.CoordOrder  = CoordOrder;
    USGSImageProvider.CoordSystem = CoordSystem;
}
