import { Provider } from "./provider";
import { Json, isObject as json_isObject } from "../util/json_type";
import CredentialMode, { convertCredentialModeToString } from "../CredentialMode";

type Area             = Provider.Area;
type MetaData         = Provider.MetaData;
type RequestResult<T> = Provider.RequestResult<T>;


/**
 * ベクトルタイルのための汎用的なプロバイダ実装である。
 *
 * [[requestMeta]]`()` は次の URL のオブジェクトを要求する。
 * ```
 * prefix + options.metadata_path
 * ```
 *
 * [[requestTile]]`( area )` は次の URL のオブジェクトを要求する。
 * ```
 * prefix + area.z + '/' + area.x + '/' + area.y + options.tile_suffix
 * ```
 * @see [[constructor]], [[Option]]
 */
class StandardProvider extends Provider {

    /**
     * @param prefix  - URL の先頭文字列
     * @param options - オプション辞書
     */
    constructor( prefix:   string,
                 options?: StandardProvider.Option )
    {
        super();

        this._prefix        = prefix;
        this._metadata_path = options?.metadata_path ?? "metadata.json";
        this._tile_suffix   = options?.tile_suffix ?? ".pbf";

        this._meta_credentials = convertCredentialModeToString( options?.meta_credentials ?? CredentialMode.OMIT );
        this._meta_headers     = Object.assign( {}, options?.meta_headers );

        this._tile_credentials = convertCredentialModeToString( options?.tile_credentials ?? CredentialMode.OMIT );
        this._tile_headers     = Object.assign( {}, options?.tile_headers );
    }


    // from Provider
    override requestMeta(): RequestResult<MetaData>
    {
        const controller = new AbortController();

        return {
            promise:   this._getMetaData( controller.signal ),
            canceller: () => { controller.abort(); },
        };
    }


    // from Provider
    override requestTile( area: Area ): RequestResult<ArrayBuffer>
    {
        const controller = new AbortController();

        return {
            promise:   this._getTileBinary( area, controller.signal ),
            canceller: () => { controller.abort(); },
        };
    }


    /**
     * メタデータの URL を作成
     */
    private _makeMetaDataURL(): string
    {
        return `${this._prefix}${this._metadata_path}`;
    }


    /**
     * タイルデータの URL を作成
     */
    private _makeTileDataURL( area: Area ): string
    {
        return `${this._prefix}${area.z}/${area.x}/${area.y}${this._tile_suffix}`;
    }


    /**
     * `MetaData` インスタンスを取得 (Promise)
     */
    private async _getMetaData( asignal: AbortSignal ): Promise<MetaData | null>
    {
        try {
            const json_meta = await this._getMetaDataAsJson( asignal );

            if ( !json_isObject( json_meta ) ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid meta data" );
            }

            const minzoom = json_meta['minzoom'];
            const maxzoom = json_meta['maxzoom'];

            if ( typeof minzoom !== 'string' || typeof maxzoom !== 'string' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid meta data" );
            }

            // メタデータを返す
            return {
                min_level: Number( minzoom ),
                max_level: Number( maxzoom ),
            }
        }
        catch ( e: unknown ) {
            // データの取得に失敗、またはキャンセル

            const message = (e instanceof Error) ? e.message : e;

            if ( e instanceof Error ) {
                console.error( `Meta data error: ${message}` );
            }

            return null;
        }
    }


    /**
     * メタデータが記述された Json インスタンスを取得 (Promise)
     */
    private async _getMetaDataAsJson( asignal: AbortSignal ): Promise<Json>
    {
        const fetch_init = {
            credentials: this._meta_credentials,
            headers:     this._meta_headers,
            signal:      asignal,
        };

        const response = await fetch( this._makeMetaDataURL(), fetch_init );

        if ( response.ok ) {
            return response.json();
        }
        else {
            throw new Error( response.statusText );
        }
    }


    /**
     * タイルのバイナリーデータを取得 (Promise)
     */
    private async _getTileBinary( area:    Area,
                                  asignal: AbortSignal ): Promise<ArrayBuffer | null>
    {
        const fetch_init = {
            credentials: this._tile_credentials,
            headers:     this._tile_headers,
            signal:      asignal,
        };

        const response = await fetch( this._makeTileDataURL( area ), fetch_init );

        if ( response.ok ) {
            return response.arrayBuffer();
        }
        else {
            // データの取得に失敗、またはキャンセル
            return null;
        }
    }


    private readonly _prefix: string;
    private readonly _metadata_path: string;
    private readonly _tile_suffix: string;
    private readonly _meta_credentials: RequestCredentials;
    private readonly _meta_headers: StandardProvider.Headers;
    private readonly _tile_credentials: RequestCredentials;
    private readonly _tile_headers: StandardProvider.Headers;

}


namespace StandardProvider {

/**
 * [[StandardProvider.constructor]] に与えるオプションの型である。
 */
export interface Option {

    /**
     * メタデータの `prefix` からの パス
     *
     * @default "metadata.json"
     */
    metadata_path?: string;


    /**
     * タイルデータの URL の末尾文字列
     *
     * @default ".pbf"
     */
    tile_suffix?: string;


    /**
     * メタデータ用のクレデンシャルモード
     *
     * @default [[CredentialMode.OMIT]]
     */
    meta_credentials?: CredentialMode;


    /**
     * メタデータのリクエストに追加するヘッダーの辞書
     *
     * @default {}
     */
    meta_headers?: Headers;


    /**
     * タイルデータ用のクレデンシャルモード
     *
     * @default [[CredentialMode.OMIT]]
     */
    tile_credentials?: CredentialMode;


    /**
     * タイルデータのリクエストに追加するヘッダーの辞書
     *
     * @default {}
     */
    tile_headers?: Headers;

}


/**
 * リクエストに追加するヘッダーの辞書
 *
 * @see [[Option.meta_headers]], [[Option.tile_headers]]
 */
export interface Headers {

    /**
     * ヘッダー名とその値
     */
    [name: string]: string;

}

} // namespace StandardProvider


export { StandardProvider };
