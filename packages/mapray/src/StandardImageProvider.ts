import ImageProvider from "./ImageProvider";
import CredentialMode from "./CredentialMode";


/**
 * 標準地図画像プロバイダ
 *
 * 汎用的な地図画像プロバイダの実装である。
 * 構築子の引数に prefix, suffix, size, zmin, zmax を与えた場合、各メソッドの動作は以下のようになる。
 * ここで c1, c2, c3 は opts.coord_order の指定に従った第1、第2、第3の座標である。
 *
 * ```
 *   requestTile( z, x, y ) -> URL が prefix + c1 + '/' + c2 + '/' + c3 + suffix の画像を要求
 *   getImageSize()         -> size を返す
 *   getZoomLevelRange()    -> new ImageProvider.Range( zmin, zmax ) を返す
 * ```
 */
class StandardImageProvider extends ImageProvider {

    private _prefix: string;

    private _suffix: string;

    private _size: number;

    private _min_level: number;

    private _max_level: number;

    private _coords_part: OrderCoords;

    private _crossOrigin: string | null;


    /**
     * @param prefix  URL の先頭文字列
     * @param suffix  URL の末尾文字列
     * @param size    地図タイル画像の寸法
     * @param zmin    最小ズームレベル
     * @param zmax    最大ズームレベル
     * @param opts    オプション集合
     */
    constructor( prefix: string, suffix: string, size: number, zmin: number, zmax: number, opts?: StandardImageProvider.Option )
    {
        super();
        this._prefix    = prefix;
        this._suffix    = suffix;
        this._size      = size;
        this._min_level = zmin;
        this._max_level = zmax;

        // タイル座標を並び替える関数
        let orderCoords: OrderCoords | null = null;
        if ( opts && opts.coord_order ) {
            if ( opts.coord_order === StandardImageProvider.CoordOrder.ZYX ) {
                orderCoords = function( z, x, y ) { return z + "/" + y + "/" + x; };
            }
            else if ( opts.coord_order === StandardImageProvider.CoordOrder.XYZ ) {
                orderCoords = function( z, x, y ) { return x + "/" + y + "/" + z; };
            }
        }
        const orderCoordsFixed = (
            orderCoords ||
            function( z, x, y ) { return z + "/" + x + "/" + y; } // その他の場合は既定値 COORD_ORDER_ZXY を使う
        );

        // XY 座標を変換する関数
        let convCoords: OrderCoords | null = null;
        if ( opts && opts.coord_system ) {
            if ( opts.coord_system === StandardImageProvider.CoordSystem.LOWER_LEFT ) {
                convCoords = function( z, x, y ) {
                    var size = Math.round( Math.pow( 2, z ) );
                    return orderCoordsFixed( z, x, size - y - 1 );
                };
            }
        }
        if ( !convCoords ) {
            // その他の場合は既定値 UPPER_LEFT (無変換) を使う
            convCoords = orderCoordsFixed;
        }

        // 座標部分の URL を取得する関数
        this._coords_part = convCoords;

        // crossorigin 属性の値
        this._crossOrigin = "anonymous";
        if ( opts && opts.credentials ) {
            if ( opts.credentials === CredentialMode.OMIT ) {
                this._crossOrigin = null;
            }
            else if ( opts.credentials === CredentialMode.INCLUDE ) {
                this._crossOrigin = "use-credentials";
            }
        }
    }


    /**
     */
    override requestTile( z: number, x: number, y: number, callback: ImageProvider.RequestCallback ): object
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
     */
    override cancelRequest( id: object )
    {
        // TODO: Image 読み込みの取り消し方法は不明
    }


    /**
     */
    override getImageSize(): number
    {
        return this._size;
    }


    /**
     */
    override getZoomLevelRange(): ImageProvider.Range
    {
        return new ImageProvider.Range( this._min_level, this._max_level );
    }


    /**
     * URL を作成
     */
    private _makeURL( z: number, x: number, y: number ): string
    {
        return this._prefix + this._coords_part( z, x, y ) + this._suffix;
    }

}



namespace StandardImageProvider {



export interface Option {

    /**
     * URL の座標順序
     */
    coord_order: StandardImageProvider.CoordOrder;

    /**
     * タイル XY 座標系
     */
    coord_system: StandardImageProvider.CoordSystem;

    /**
     * クレデンシャルモード
     */
    credentials: CredentialMode;
}



/**
 * @summary URL 座標順序の列挙型
 * @desc
 * {@link mapray.StandardImageProvider} の構築子で opts.coord_order パラメータに指定する値の型である。
 * @enum {object}
 * @memberof mapray.StandardImageProvider
 * @constant
 */
export enum CoordOrder {
    /**
     * 座標順序 Z/X/Y (既定値)
     */
    ZXY,

    /**
     * 座標順序 Z/Y/X
     */
    ZYX,

    /**
     * 座標順序 Z/X/Y
     */
    XYZ,
};



/**
 * @summary タイル XY 座標系の列挙型
 * @desc
 * {@link mapray.StandardImageProvider} の構築子で opts.coord_system パラメータに指定する値の型である。
 * @enum {object}
 * @memberof mapray.StandardImageProvider
 * @constant
 */
export enum CoordSystem {
    /**
     * 原点:左上, X軸:右方向, Y軸:下方向 (既定値)
     */
    UPPER_LEFT,

    /**
     * 原点:左下, X軸:右方向, Y軸:上方向
     */
    LOWER_LEFT,
};



} // namespace StandardImageProvider



type OrderCoords = ( a: number, b: number, c: number ) => string;



export default StandardImageProvider;
