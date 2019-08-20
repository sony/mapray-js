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

}


Dom.SYSTEM_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";


export default Dom;