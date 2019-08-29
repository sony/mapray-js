/**
 * @summary Utility Class for DOM
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
     * 画像を読み込みます。
     * @param  {string}  src
     * @param  {string}  options.crossOrigin
     */
    static loadImage( src, options={} )
    {
        return new Promise( (resolve, reject) => {
                const image = new Image();
                image.onload  = event => resolve( event.target );
                image.onerror = event => reject( new Error("Failed to load image") );
                if ( options.crossOrigin !== undefined ) {
                    image.crossOrigin = crossOrigin;
                }
                image.src = src;
        } );
    }

    /**
     * 画像が読み込まれるまで待ちます。
     * @param  {HTMLImageElement}  image
     */
    static waitForLoad( image )
    {
        if ( !image.src ) return Promise.reject( new Error( "src was not set" ) );
        if ( image.complete ) {
            return Promise.resolve( image );
        }
        return new Promise( (resolve, reject) => {
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

}


Dom.SYSTEM_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";


export default Dom;