import Viewer from "./Viewer";
import Dom from "./util/Dom";
import CredentialMode from "./CredentialMode";
import { Vector4 } from "./GeoMath";
import Color from "./util/Color";


/**
 * 画面のキャプチャ機能を提供するクラス
 * @example
 * ```ts
 * const capture = new Capture( viewer );
 * capture.setAttribution( options: CaptureOption );
 * const image1 = await capture.shoot();
 * const image2 = await capture.shoot();
 * ```
*/
class Capture {

    private _viewer: Viewer;

    private _mime_type: 'image/png' | 'image/jpeg';

    private _sync: boolean;

    private _attribution_content: string[];

    private _attribution_font_color: string;

    private _attribution_bg_color: string;

    private _attribution_font_size: number;

    private _attribution_h_margin: number;

    private _attribution_v_margin: number;

    private _attribution_h_spacing: number;

    /**
     * 表示する著作権情報を管理するarray。
     * undefined の場合は、キャッシュが生成されていないことを表す
     */
    private _attribution_array?: Capture.Attribution[];

    private _attribution_height: number;

    private _attribution_width: number;


    /**
     * コンストラクタ
     * @param viewer    Viewer インスタンス
     */
    constructor( viewer: Viewer, options: Capture.Option = {} )
    {
        this._viewer    = viewer;
        const type = options.type ?? 'jpeg';
        this._mime_type = type === 'png' ? 'image/png' : 'image/jpeg';
        this._sync      = options.sync ?? false;

        const att_options = options.attribution ?? {};
        this._attribution_content = (
            Array.isArray( att_options.content ) ? att_options.content:
            typeof( att_options.content ) === "string" ? [att_options.content]:
            []
        );
        this._attribution_font_color = Color.toRGBString( att_options.font_color ?? [ 0, 0, 0, 1 ] );
        this._attribution_bg_color = Color.toRGBString( att_options.bg_color ?? [ 1, 1, 1, 0.5 ] );
        this._attribution_font_size = att_options.font_size ?? 12;
        this._attribution_h_margin  = att_options.h_margin  ?? 10;
        this._attribution_v_margin  = att_options.v_margin  ?? 4;
        this._attribution_h_spacing = att_options.h_spacing ?? 10;

        this._attribution_array  = undefined;
        this._attribution_height = 0;
        this._attribution_width  = 0;
    }


    /**
     * 著作権コンテナに表示する著作権を指定
     * @example
     * ```ts
     * setAttribution([
     *         '<img src="./data/logo.png" width="30" height="16"/>attribution sample<img src="./data/logo.png" width="30" height="16">',
     *         '1234567890',
     *         '<img src="./data/mapray.svg" width="80" height="16" />',
     * ])
     * ```
     * ```ts
     * setAttribution( '1234567890<img src="./data/mapray.svg" width="80" height="16" />' );
     * ```
     */
    setAttributionContent( attribution: string | string[] ): void
    {
        this._attribution_content = (
            Array.isArray( attribution ) ? attribution:
            typeof( attribution ) === "string" ? [attribution]:
            []
        );
        this._attribution_array = undefined;
    }


    /**
     * 文字色を指定
     * 値は0~1.0の正規化された色値
     */
    setAttributionFontColor( font_color: Vector4 ): void
    {
        this._attribution_font_color = Color.toRGBString( font_color );
    }


    /**
     * 背景色を指定
     * 値は0~1.0の正規化された色値
     */
    setAttributionBackgroundColor( color: Vector4 ): void
    {
        this._attribution_bg_color = Color.toRGBString( color );
    }


    /**
     * 文字サイズのpixel値
     */
    setAttributionFontSize( font_size: number ): void
    {
        this._attribution_font_size = font_size;
    }


    /**
     * マージン
     */
    setAttributionSize( font_size: number ): void
    {
        this._attribution_font_size = font_size;
    }


    /**
     * 画面のキャプチャ
     *
     * @return キャプチャ画像データ (Blob)
     */
    async shoot(): Promise<Blob>
    {
        if ( !this._viewer.canvas_element ) {
            throw new Error('Canvas is null.');
        }

        const context = (this._sync ?
            await new Promise<CanvasRenderingContext2D>( resolve => {
                    let counter = 0; // フレーム安定カウンタ
                    this._viewer.addPostProcess( () => {
                            if ( this._viewer.load_status.total_loading > 0 ) {
                                counter = 0;
                                return true;
                            }
                            if ( counter++ < 4 ) {
                                return true;
                            }
                            OFFSCREEN_CONTEXT = Dom.copyTo2dCanvasContext( this._viewer.canvas_element, OFFSCREEN_CONTEXT );
                            resolve( OFFSCREEN_CONTEXT );
                            return false;
                    });
            }):
            await new Promise<CanvasRenderingContext2D>( resolve => {
                    this._viewer.addPostProcess( () => {
                            OFFSCREEN_CONTEXT = Dom.copyTo2dCanvasContext( this._viewer.canvas_element, OFFSCREEN_CONTEXT );
                            resolve( OFFSCREEN_CONTEXT );
                            return false;
                    });
            })
        );

        await this._postRenderForCapture( context );

        return await Dom.convertCanvasToBlob( context.canvas, this._mime_type );
    }


    /**
     * キャプチャ画像にロゴやアノテーションを描画
     * @param context 書き込む2Dキャンバスコンテキスト
     */
    private async _postRenderForCapture( context: CanvasRenderingContext2D ): Promise<void>
    {
        const width  = context.canvas.width;
        const height = context.canvas.height;

        context.font =  `${this._attribution_font_size}px Noto Sans JP,sans-serif`;
        context.textBaseline = 'alphabetic';
        context.textAlign = 'left';

        let attribution_array: Capture.Attribution[];
        if ( this._attribution_array ) {
            attribution_array = this._attribution_array;
        }
        else { // Generate Attributions
            attribution_array = [];
            for ( const attribution of this._attribution_content ) {
                await this._addCaptureAttribution( attribution, context, attribution_array );
            }
            this._attribution_array = attribution_array;

            this._attribution_height = 0;
            this._attribution_width = 0;
            for ( const attr of this._attribution_array ) {
                this._attribution_height = Math.max( this._attribution_height, attr.height );
                this._attribution_width += attr.width;
            }
            this._attribution_width += ( this._attribution_array.length - 1 ) * this._attribution_h_spacing;
        }

        // draw attributions
        if ( attribution_array.length > 0 ) {
            // fill bg-rect
            context.fillStyle = this._attribution_bg_color;
            context.fillRect(
                width  - this._attribution_width  - this._attribution_h_margin * 2,
                height - this._attribution_height - this._attribution_v_margin * 2,
                this._attribution_width  + this._attribution_h_margin * 2,
                this._attribution_height + this._attribution_v_margin * 2
            );

            // draw text & img
            let attribution_start_h = width - this._attribution_width - this._attribution_h_margin;
            const attribution_start_v = height - this._attribution_v_margin;
            for ( const attr of this._attribution_array ) {
                if ( attr.type === "image" ) {
                    context.drawImage( attr.img, attribution_start_h, attribution_start_v - attr.height, attr.width, attr.height );
                    attribution_start_h += attr.width + this._attribution_h_spacing;
                }
                else if ( attr.type === "text" ) {
                    context.fillStyle = this._attribution_font_color;
                    const metrics:TextMetrics = context.measureText( attr.text );
                    context.fillText( attr.text, attribution_start_h, attribution_start_v - metrics.fontBoundingBoxDescent );
                    attribution_start_h += attr.width + this._attribution_h_spacing;
                }
            }
        }

        // draw logo
        {
            const img = await this._viewer.logo_controller.getLogoImage({
                    mini: width - this._attribution_width - this._attribution_h_margin * 2 < 180
            });
            context.drawImage( img, 6, height - img.height - 4, img.width, img.height );
        }
    }


    /**
     * キャプチャ画像用アノテーションを管理Arrayに追加(imgとtextを分離)
     * @param attribution_string
     * @param context
     */
    private async _addCaptureAttribution( attribution_string: string, context: CanvasRenderingContext2D, attribution_array: Capture.Attribution[] )
    {
        const split_strings = attribution_string.match(new RegExp( "([^<]*)(<img[^>]*>)(.*)" ));
        if ( split_strings ) {
            if ( split_strings[1] ) {
                await this._addCaptureAttributionText( split_strings[1], context, attribution_array );
            }
            await this._addCaptureAttributionImg( split_strings[2], context, attribution_array );
            if ( split_strings[3] ) {
                await this._addCaptureAttribution( split_strings[3], context, attribution_array );
            }
        }
        else {
            await this._addCaptureAttributionText( attribution_string, context, attribution_array );
        }
    }


    /**
     * キャプチャ画像用アノテーション(img)を管理Arrayに追加
     * @param img_string
     * @param context
     */
    private async _addCaptureAttributionImg( img_tag: string, context: CanvasRenderingContext2D, attribution_array: Capture.Attribution[] )
    {
        let img_src:    string | undefined = undefined;
        let img_height: string | undefined = undefined;
        let img_width:  string | undefined = undefined;
        let img_cors:   string | undefined = undefined;

        const params = img_tag.matchAll( new RegExp( "(\\S+)=[\"'](.*?)[\"']", "g" ));
        const skipped = [];
        for ( const [, key, value] of params ) {
            switch ( key.toLowerCase() ) {
                case 'src':         img_src    = value; break;
                case 'width':       img_width  = value; break;
                case 'height':      img_height = value; break;
                case 'crossorigin': img_cors   = value; break;
                default: if (skipped) skipped.push(key);
            }
        }
        if ( skipped.length > 0 ) console.log( "Unsupported Attributes: " + skipped.join( ", " ) );

        if ( !img_src ) {
            console.log( "src attribute of image tag is missing" );
            return;
        }

        const img = await Dom.loadImage( img_src, {
                credentials: (
                    img_cors === '' || img_cors === 'anonymous' ? CredentialMode.SAME_ORIGIN:
                    img_cors === 'use-credentials' ? CredentialMode.INCLUDE:
                    CredentialMode.OMIT
                ),
        });

        let width: number;
        let height: number;
        if ( img_width && img_height ) {
            width  = Number( img_width );
            height = Number( img_height );
        }
        else if ( img_width ) {
            width = Number( img_width );
            height = img.height * ( Number( img_width ) / img.width );
        }
        else if ( img_height ) {
            height = Number( img_height );
            width = img.width * ( Number( img_height ) / img.height );
        }
        else {
            width  = img.width;
            height = img.height;
        }

        attribution_array.push({ type: "image", img, width, height });
    }


    /**
     * キャプチャ画像用アノテーション(text)を管理Arrayに追加
     * @param text
     * @param context
     */
    private async _addCaptureAttributionText( text: string, context: CanvasRenderingContext2D, attribution_array: Capture.Attribution[] )
    {
        if ( text.length > 0 ) {
            const metrics:TextMetrics = context.measureText( text );
            const width = metrics.width;
            const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
            attribution_array.push({ type: "text", text, width, height });
        }
    }
}



// hidden properties
let OFFSCREEN_CONTEXT: CanvasRenderingContext2D | undefined = undefined;



namespace Capture {



export interface Option {

    /**
     * 画像の拡張子
     */
    type?: "jpeg" | "png";

    /**
     * 画面の読み込みを待つかを決定する真偽値
     */
    sync?: boolean;

    /**
     * 著作権情報オプション
     */
    attribution?: AttributionOption;
}



export interface AttributionOption {
    /**
     * 著作権コンテナに表示する著作権を指定
     * @example
     * ```ts
     * content: [
     *          '<img src="./data/logo.png" width="30" height="16"/>attribution sample<img src="./data/logo.png" width="30" height="16">',
     *          '1234567890',
     *          '<img src="./data/mapray.svg" width="80" height="16" />',
     * ]
     * ```
     */
    content?: string | string[];

    /**
     * 文字色を指定
     * 値は0~1.0の正規化された色値
     */
    font_color?: Vector4,

    /**
     * 背景色を指定
     * 値は0~1.0の正規化された色値
     */
    bg_color?: Vector4,

    /**
     * 文字サイズのpixel値
     */
    font_size?: number,

    /**
     * 水平方向のmarginのpixel値
     */
    h_margin?: number,

    /**
     * 垂直方向のmarginのpixel値
     */
    v_margin?: number,

    /**
     * attribution間のスペースのpixel値
     */
    h_spacing?: number,
}



/**
 * capture用 image attribution
 * @private
 * */
export interface ImageAttribution {
    type: "image";
    img: HTMLImageElement;
    width: number;
    height: number;
}



/**
 * capture用 text attribution
 * @private
 * */
export interface TextAttribution {
    type: "text";
    text: string;
    width: number;
    height: number;
}



export type Attribution = TextAttribution | ImageAttribution;



} // namespace Capture



export default Capture;
