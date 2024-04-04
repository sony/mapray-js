import ImageProvider from "./ImageProvider";
import Resource, { URLResource } from "./Resource";
import CredentialMode from "./CredentialMode";



class StandardImageProvider extends ImageProvider {

    constructor( data: StandardImageProvider.ResourceInfo | Resource ) {
        if ( data instanceof Resource ) {
            super( new StandardImageProvider.Hook( data ) );
        }
        else {
            super( new StandardImageProvider.Hook( data ) );
        }
    }

}



namespace StandardImageProvider {



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
export class Hook implements ImageProvider.Hook {

    private _resource: Resource;


    private _format!: string;

    private _size!: number;

    private _min_level!: number;

    private _max_level!: number;

    private _coords_part!: OrderCoords;

    private _pixel_format!: ImageProvider.ColorPixelFormat;

    private _initialized: boolean;


    /**
     * @param resourceInfo リソースオプション
     */
    constructor( resourceInfo: StandardImageProvider.ResourceInfo );


    /**
     * @param resource リソースオブジェクト
     */
    constructor( resource: Resource );

    constructor( data: StandardImageProvider.ResourceInfo | Resource )
    {
        if ( data instanceof Resource ) {
            this._resource = data;
            this._initialized = false;
        }
        else {
            this._resource  = new URLResource( data.url, {
                transform: ( url: string, _type: any ) => ( {
                    url,
                    credentials: data.credentials,
                    headers: data.http_header,
                } ),
            } );

            this._format    = ( data.format ?? "png" ).replace( new RegExp( "^\\." ), "" );
            this._size      = data.size ?? 256;
            this._min_level = data.min_level;
            this._max_level = data.max_level;

            // タイル座標を並び替える関数
            let orderCoords: OrderCoords | null = null;
            if ( data && data.coord_order ) {
                if ( data.coord_order === StandardImageProvider.CoordOrder.ZYX ) {
                    orderCoords = function( z, x, y ) { return z + "/" + y + "/" + x; };
                }
                else if ( data.coord_order === StandardImageProvider.CoordOrder.XYZ ) {
                    orderCoords = function( z, x, y ) { return x + "/" + y + "/" + z; };
                }
            }
            const orderCoordsFixed = (
                orderCoords ||
                function( z, x, y ) { return z + "/" + x + "/" + y; } // その他の場合は既定値 COORD_ORDER_ZXY を使う
            );

            // XY 座標を変換する関数
            let convCoords: OrderCoords | null = null;
            if ( data && data.coord_system ) {
                if ( data.coord_system === StandardImageProvider.CoordSystem.LOWER_LEFT ) {
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

            this._pixel_format = data?.pixel_format ?? { type: "color" };
            this._initialized = true;
        }
    }


    async init(): Promise<ImageProvider.Info> {
        if ( !this._initialized ) {
            const info = await this._resource.loadAsJson() as CloudInfoJson | ImageInfoJson;
            if ( isCloudInfoJson( info ) ) {
                const availableTypes = info.statuses.reduce( ( flags, item ) => {
                    if ( item.status === "ready" ) {
                        flags[item.type] = true;
                    }
                    return flags;
                }, {} as {[key: string]: boolean } );
                if ( availableTypes.image ) {
                    this._resource = this._resource.resolveResource( info.url + ( info.url.endsWith( "/" ) ? "" : "/" ) + "image/" );
                    this._loadAsImage( info.image as ImageInfoJson );
                }
                else {
                    console.log( "couldn't find available type", info.statuses );
                }
            }
            else {
                this._loadAsImage( info );
            }
        }
        return {
            image_size: this._size,
            zoom_level_range: new ImageProvider.Range( this._min_level, this._max_level ),
            pixel_format: this._pixel_format,
        };
    }


    private _loadAsImage( info: ImageInfoJson ) {
        this._coords_part = ( z: number, x: number, y: number ) => { return z + "/" + x + "/" + y; };
        this._format = info.format;
        this._min_level = info.minzoom;
        this._max_level = info.maxzoom;
        this._size = 256;
        this._pixel_format = { type: "color" };
    }


    /** @inheritDoc */
    async requestTile( z: number, x: number, y: number ): Promise<ImageProvider.SupportedImageTypes>
    {
        const path = this._makePath( z, x, y );
        return await this._resource.loadSubResourceAsImage( path );
    }


    /** @inheritDoc */
    getImageSize(): number
    {
        return this._size;
    }


    /** @inheritDoc */
    getZoomLevelRange(): ImageProvider.Range
    {
        return new ImageProvider.Range( this._min_level, this._max_level );
    }


    /** @inheritDoc */
    getPixelFormat(): ImageProvider.ColorPixelFormat
    {
        return this._pixel_format;
    }


    /**
     * URL を作成
     */
    private _makePath( z: number, x: number, y: number ): string
    {
        return this._coords_part( z, x, y ) + "." + this._format;
    }

}



export interface ResourceInfo {

    /**
     * URL（先頭文字列）
     */
    url: string;

    /**
     * クレデンシャルモード
     */
    credentials?: CredentialMode;

    /**
     * HTTPヘッダ
     */
    http_header?: HeadersInit;

    /**
     * フォーマット（拡張子として利用されます）
     * @default "png"
     */
    format?: string;

    /**
     * 地図タイル画像の寸法
     * @default 256
     */
    size?: number;

    /*
     * 最小ズームレベル
     */
    min_level: number;

    /**
     * 最大ズームレベル
    */
    max_level: number;

    /**
     * URL の座標順序
     */
    coord_order?: StandardImageProvider.CoordOrder;

    /**
     * タイル XY 座標系
     */
    coord_system?: StandardImageProvider.CoordSystem;


    /**
     * ピクセルフォーマット
     * @default ImageProvider.ColorPixelFormat
     */
    pixel_format?: ImageProvider.ColorPixelFormat;
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
}



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
}



} // namespace StandardImageProvider



type OrderCoords = ( a: number, b: number, c: number ) => string;



interface ImageInfoJson {
    bounds: [ west: number, south: number, east: number, north: number ];
    minzoom: number;
    maxzoom: number;
    format: "png" | "webp";
}

interface StatusJson {
    type: "tiles" | "contour" | "info" | "heightmap" | "image";
    status: "before_queued" | "queued" | "processing" | "ready" | "error";
    error: string;
}

interface CloudInfoJson {
    url: string;
    statuses: StatusJson[];
    image?: ImageInfoJson;
}

function isCloudInfoJson( info: CloudInfoJson | ImageInfoJson ): info is CloudInfoJson
{
    return "url" in info;
}

export default StandardImageProvider;
