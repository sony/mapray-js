import { SpriteProvider } from "./SpriteProvider";
import { RequestResult } from "../RequestResult";
import { Json } from "../util/json_type";
import CredentialMode, { convertCredentialModeToString } from "../CredentialMode";


/**
 * スプライトデータのための汎用的なプロバイダ実装である。
 *
 * [[requestLayout]]`()` は次の URL のオブジェクトを要求する。
 * ```
 * prefix + options.layout_suffix
 * ```
 *
 * [[requestSheet]]`()` は次の URL のオブジェクトを要求する。
 * ```
 * prefix + options.sheet_suffix
 * ```
 *
 * `prefix` は一般的に `"http://"` または `"https://"` で始まる
 * 文字列を指定する。
 *
 * @see [[constructor]], [[Option]]
 */
class StandardSpriteProvider extends SpriteProvider {

    /**
     * @param prefix  - URL の先頭文字列
     * @param options - オプション辞書
     */
    constructor( prefix:   string,
                 options?: StandardSpriteProvider.Option )
    {
        super();

        this._prefix        = prefix;
        this._layout_suffix = options?.layout_suffix ?? ".json";
        this._sheet_suffix  = options?.sheet_suffix  ?? ".png";

        this._layout_credentials = convertCredentialModeToString( options?.layout_credentials ?? CredentialMode.OMIT );
        this._layout_headers     = Object.assign( {}, options?.layout_headers );

        this._sheet_credentials = convertCredentialModeToString( options?.sheet_credentials ?? CredentialMode.OMIT );
        this._sheet_headers     = Object.assign( {}, options?.sheet_headers );
    }


    // from SpriteProvider
    override requestLayout(): RequestResult<SpriteProvider.Layout>
    {
        const controller = new AbortController();

        return {
            promise:   this._getLayout( controller.signal ),
            canceller: () => { controller.abort(); },
        };
    }


    // from SpriteProvider
    override requestSheet(): RequestResult<SpriteProvider.Sheet>
    {
        const controller = new AbortController();

        return {
            promise:   this._getSheet( controller.signal ),
            canceller: () => { controller.abort(); },
        };
    }


    /**
     * レイアウトデータの URL を作成
     */
    private _make_layout_data_url(): string
    {
        return `${this._prefix}${this._layout_suffix}`;
    }


    /**
     * スプライト画像データの URL を作成
     */
    private _make_sheet_data_url(): string
    {
        return `${this._prefix}${this._sheet_suffix}`;
    }


    /**
     * `LayoutItem` のリストを取得 (Promise)
     */
    private async _getLayout( asignal: AbortSignal ): Promise<SpriteProvider.Layout>
    {
        const json_layout = await this._getLayoutAsJson( asignal );
        return SpriteProvider.parseLayoutData( json_layout );
    }


    /**
     * レイアウトデータが記述された Json インスタンスを取得 (Promise)
     */
    private async _getLayoutAsJson( asignal: AbortSignal ): Promise<Json>
    {
        const fetch_init = {
            credentials: this._layout_credentials,
            headers:     this._layout_headers,
            signal:      asignal,
        };

        const response = await fetch( this._make_layout_data_url(), fetch_init );

        if ( response.ok ) {
            return response.json();
        }
        else {
            throw new Error( response.statusText );
        }
    }


    /**
     * スプライト画像を取得 (Promise)
     */
    private async _getSheet( asignal: AbortSignal ): Promise<HTMLImageElement>
    {
        const fetch_init = {
            credentials: this._sheet_credentials,
            headers:     this._sheet_headers,
            signal:      asignal,
        };

        const response = await fetch( this._make_sheet_data_url(), fetch_init );

        if ( response.ok ) {
            const image_blob = await response.blob();
            return create_image_element( image_blob );
        }
        else {
            throw new Error( response.statusText );
        }
    }


    private readonly _prefix: string;
    private readonly _layout_suffix: string;
    private readonly _sheet_suffix: string;
    private readonly _layout_credentials: RequestCredentials;
    private readonly _layout_headers: StandardSpriteProvider.Headers;
    private readonly _sheet_credentials: RequestCredentials;
    private readonly _sheet_headers: StandardSpriteProvider.Headers;

}


/**
 * 画像データから `HTMLImageElement` を生成
 *
 * @param image_blob - 画像データ
 *
 * @return `HTMLImageElement` インスタンス (`Promise`)
 */
function create_image_element( image_blob: Blob ): Promise<HTMLImageElement>
{
    return new Promise( ( resolve, reject ) => {
        const url = URL.createObjectURL( image_blob );
        const img = new Image();

        img.onload = function() {
            resolve( img );
            URL.revokeObjectURL( url );
        };

        img.onerror = function( e ) {
            reject( e );
            URL.revokeObjectURL( url );
        };

        img.src = url;
    } );
}


namespace StandardSpriteProvider {

/**
 * [[StandardSpriteProvider.constructor]] に与えるオプションの型である。
 */
export interface Option {

    /**
     * レイアウトデータの URL の末尾文字列
     *
     * @defaultValue ".json"
     */
    layout_suffix?: string;


    /**
     * 画像データの URL の末尾文字列
     *
     * @defaultValue ".png"
     */
    sheet_suffix?: string;


    /**
     * レイアウトデータ用のクレデンシャルモード
     *
     * @defaultValue [[CredentialMode.OMIT]]
     */
    layout_credentials?: CredentialMode;


    /**
     * レイアウトデータのリクエストに追加するヘッダーの辞書
     *
     * @defaultValue `{}`
     */
    layout_headers?: Headers;


    /**
     * 画像データ用のクレデンシャルモード
     *
     * @defaultValue [[CredentialMode.OMIT]]
     */
    sheet_credentials?: CredentialMode;


    /**
     * 画像データのリクエストに追加するヘッダーの辞書
     *
     * @defaultValue `{}`
     */
    sheet_headers?: Headers;

}


/**
 * リクエストに追加するヘッダーの辞書
 *
 * @see [[Option.layout_headers]], [[Option.sheet_headers]]
 */
export interface Headers {

    /**
     * ヘッダー名とその値
     */
    [name: string]: string;

}

} // namespace StandardSpriteProvider


export { StandardSpriteProvider };
