import CredentialMode from "../CredentialMode";

const DATA_URL_PATTERN = new RegExp("^data:");
const ABSOLUTE_URL_PATTERN = new RegExp("^https?://");


/**
 * Utility for DOM
 * @internal
 */
namespace Dom {


    /**
     * キャンバスコンテキストを生成します。
     * @param width 幅
     * @param height 高さ
     */
    export function createCanvasContext( width: number, height: number ): CanvasRenderingContext2D
    {
        var canvas = document.createElement( "canvas" );
        canvas.width  = width;
        canvas.height = height;
        const context = canvas.getContext( "2d" );
        if ( !context ) {
            throw new Error("Cannot get context of canvas");
        }
        return context;
    }


    /**
     * 画像を読み込みます。
     * @param src
     * @Param options
     */
    export async function loadImage( src: string | Blob, options: Dom.ImageLoadOption={} ): Promise<HTMLImageElement>
    {
        return await new Promise( (resolve, reject) => {
                const image = new Image();
                image.onload  = event => resolve( image );
                image.onerror = event => reject( new Error("Failed to load image") );
                if ( options.credentials !== CredentialMode.OMIT ) {
                    image.crossOrigin = (
                        options.credentials === CredentialMode.INCLUDE ? "use-credentials" : "anonymous"
                    );
                }
                image.src = src instanceof Blob ? URL.createObjectURL( src ) : src;
        } );
    }


    /**
     * 画像が読み込まれるまで待ちます。
     * @param image
     */
    export async function waitForLoad( image: HTMLImageElement ): Promise<HTMLImageElement>
    {
        if ( !image.src ) throw new Error( "src was not set" );
        if ( image.complete ) return image;

        return await new Promise( (resolve, reject) => {
                const prevOnLoad: (((event: Event) => void) | null)  = image.onload;
                const prevOnError = image.onerror;
                image.onload = event => {
                    if ( typeof prevOnLoad === "function" ) prevOnLoad( event );
                    resolve( image );
                };
                image.onerror = event => {
                    if ( prevOnError ) prevOnError( event );
                    reject( new Error("Failed to load image") );
                };
        } );
    }


    /**
     * 各種画像データを Base64 へ変換します。
     * @param src 変換元データ
     */
    export function toBase64String( src: HTMLImageElement | HTMLCanvasElement ): string {
        return (
            src instanceof HTMLImageElement ? convertImageToBase64String( src ) :
            convertCanvasToBase64String( src )
        );
    }


    /**
     * 画像の内容を Base64 へ変換します。
     * @param image 画像
     */
    export function convertImageToBase64String( image: HTMLImageElement ): string {
        const w = image.naturalWidth;
        const h = image.naturalHeight;
        const ctx = createCanvasContext( w, h );
        ctx.drawImage( image, 0, 0, w, h );
        return ctx.canvas.toDataURL();
    }


    /**
     * キャンバスの内容を Base64 へ変換します。
     * @param canvas キャンバス
     */
    export function convertCanvasToBase64String( canvas: HTMLCanvasElement ): string
    {
        return canvas.toDataURL();
    }


    /**
     * 相対URL、絶対URLを解決します。
     * `url` が絶対URLの場合はそのまま返却し、 `url` が相対URLの場合は baseUrl からの相対URLとして絶対URLを返します。
     * @param baseUrl ベースとなるurl
     * @param url     baseUrlからの相対url か 絶対url
     */
    export function resolveUrl( baseUrl: string, url: string ): string
    {
        if ( DATA_URL_PATTERN.test( url ) || ABSOLUTE_URL_PATTERN.test( url ) ) {
            // url がデータ url または絶対 url のときは
            // そのまま url をリクエスト
            return url;
        }
        else {
            // それ以外のときは url を相対 url と解釈し
            // 基底 url と結合した url をリクエスト
            return baseUrl + url;
        }
    }


    export const SYSTEM_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";


    export interface ImageLoadOption {
        credentials?: CredentialMode;
    }

}


export default Dom;
