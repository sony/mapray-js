import CredentialMode from "../CredentialMode";

const DATA_URL_PATTERN = new RegExp("^data:");
const ABSOLUTE_URL_PATTERN = new RegExp("^https?://");


/**
 * @summary Utility Class for DOM
 * @private
 * @memberof mapray
 */
class Dom {

    /**
     * @param  {number}  width
     * @param  {number}  height
     * @return {CanvasRenderingContext2D}
     */
    static createCanvasContext( width, height )
    {
        var canvas = document.createElement( "canvas" );
        canvas.width  = width;
        canvas.height = height;
        return canvas.getContext( "2d" );
    }

    /**
     * @summary 画像を読み込みます。
     * @param  {string|Blob}  src
     * @Param  {object}  options
     * @param  {mapray.CredentialMode}  [options.credentials=mapray.CredentialMode.SAME_ORIGIN]
     */
    static async loadImage( src, options={} )
    {
        return await new Promise( (resolve, reject) => {
                const image = new Image();
                image.onload  = event => resolve( event.target );
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
     * @summary 画像が読み込まれるまで待ちます。
     * @param  {HTMLImageElement}  image
     */
    static async waitForLoad( image )
    {
        if ( !image.src ) throw new Error( "src was not set" );
        if ( image.complete ) return image;

        return await new Promise( (resolve, reject) => {
                const prevOnLoad  = image.onload;
                const prevOnError = image.onerror;
                image.onload = event => {
                    if ( prevOnLoad ) prevOnLoad( event );
                    resolve( event.target );
                };
                image.onerror = event => {
                    if ( prevOnError ) prevOnError( event );
                    reject( new Error("Failed to load image") );
                };
        } );
    }

    static resolveUrl( baseUrl, url ) {
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

}


Dom.SYSTEM_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";


export default Dom;
