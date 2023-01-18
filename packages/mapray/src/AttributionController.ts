import GeoMath, { Vector3, Vector4 } from "./GeoMath";
import Viewer from "./Viewer";
import ContainerController from "./ContainerController"
import Color from "./util/Color";



/**
 * 著作権表示の表示制御
 */
class AttributionController extends ContainerController {

    private _default_attributions: string[];

    private _attributions: string[];

    private _background_color: Vector4;

    private _text_color: Vector3;

    protected _sub_container: HTMLElement;

    private _normalize_attribution_styles: boolean;


    /**
     * コンストラクタ
     * @param options      表示オプション（ 任意で著作権コンテナの表示に関するオプションを指定する。 ）
     */
    constructor( options: AttributionController.Option = {} )
    {
        super( options );

        this._position = options.position ?? ContainerController.ContainerPosition.BOTTOM_RIGHT;
        this._background_color = Color.createColor( options.background_color ?? [ 1, 1, 1, 0.5 ] );
        this._text_color = options.text_color ?? [ 0, 0, 0 ];
        this._normalize_attribution_styles = options.normalize_attribution_styles ?? true;

        this._default_attributions = [];
        this._attributions = [];

        this._sub_container = document.createElement( "div" );
        this._sub_container.classList.add( "mapray-attribution-container" );

        this._container.classList.add( "mapray-attribution" );
        this._container.appendChild( this._sub_container );

        if ( options.is_default ?? true ) {
            this._addAttribution( AttributionController.MAPRAY_DEFAULT_ATTRIBUTION, true );
        }

        if ( options.attributions ) {
            this._addAttribution( options.attributions, false );
        }
    }


    /**
     * @internal
     */
    override init( viewer: Viewer ): void
    {
        super.init( viewer );
        this._updateBackgroundColor();
        this._updateTextColor();
    }


    /**
     * 指定した著作権をコンテナに追加
     * @param attribution 単体もしくは配列の文字列 ( HTMLタグ可 )
     */
    addAttribution( attribution: string | string[] ): void
    {
        this._addAttribution( attribution, false );
    }


    /**
     * 指定した著作権をコンテナに追加
     * @param attribution 単体もしくは配列の文字列 ( HTMLタグ可 )
     * @param is_default デフォルト要素として追加するか
     */
    private _addAttribution( attribution: string | string[], is_default: boolean ): void
    {
        if ( Array.isArray( attribution ) ) {
            attribution.forEach( attribution_element => {
                this._addAttribution( attribution_element, is_default );
            });
        }
        else {
            if ( this._isValidAttribution( attribution ) ) {
                this._addDomNodeForAttribution( attribution, is_default );
                if ( is_default ) {
                    this._default_attributions.push( attribution );
                }
                else {
                    this._attributions.push( attribution );
                }
            }
        };
    }


    /**
     * 指定した著作権をコンテナから削除
     * @param attribution 対象の著作権を示す文字列
     */
    removeAttribution( attribution: string ): void
    {
        const index: number = this._attributions.indexOf( attribution );
        if ( index !== -1 ) {
            this._sub_container.removeChild( this._sub_container.children[index + this._default_attributions.length] );
            this._attributions.splice( index, 1 );
        };
    }


    /**
     * コンテナが持つ著作権をリセット
     *
     * 「©Mapray」を含むデフォルトの著作権はリセットしない。
     */
    clearAttribution(): void
    {
        for ( let i = 0; i < this._attributions.length; i++ ) {
            if ( this._sub_container.lastElementChild ) {
                this._sub_container.removeChild( this._sub_container.lastElementChild );
            }
        }
        this._attributions = [];
    }


    /**
     * コンテナが持つ著作権を取得
     * @returns 著作権の配列
     */
    getAttributions(): string[]
    {
        return this._attributions;
    }


    /**
     * 指定した著作権をコンテナが持つデフォルトの著作権から削除
     * @param attribution 対象の著作権を示す文字列
     */
    private _removeDefaultAttribution( attribution: string ): void
    {
        const index: number = this._default_attributions.indexOf( attribution );
        if ( index !== -1 ) {
            this._sub_container.removeChild( this._sub_container.children[index] );
            this._default_attributions.splice( index, 1 );
        };
    }


    /**
     * コンテナが持つデフォルトの著作権をリセット
     */
    private _clearDefaultAttribution(): void
    {
        for ( let i = 0; i < this._default_attributions.length; i++ ) {
            if ( this._sub_container.firstElementChild ) {
                this._sub_container.removeChild( this._sub_container.firstElementChild );
            }
        }
        this._default_attributions = [];
    }


    /**
     * コンテナが持つデフォルトの著作権を取得
     * @returns デフォルトの著作権配列
     */
    private _getDefaultAttributions(): string[]
    {
        return this._default_attributions;
    }


    /**
     * コンテナの背景色を変更
     * @param color GeoMath で表される色情報
     */
    setBackgroundColor( color: Vector3 | Vector4 ): void
    {
        const color_vec4 = Color.createColor( color );
        const equals = (
            this._background_color[0] === color_vec4[0] &&
            this._background_color[1] === color_vec4[1] &&
            this._background_color[2] === color_vec4[2] &&
            this._background_color[3] === color_vec4[3]
        );
        if ( equals ) return;

        this._background_color = color_vec4;
        // 表示状態の更新
        this._updateBackgroundColor();
    }


    /**
     * コンテナの現在の背景色を取得
     * @returns GeoMath で表される色情報
     */
    getBackgroundColor(): Vector4
    {
        return this._background_color;
    }


    /**
     * コンテナの文字色を変更
     * @param color GeoMath で表される色情報
     */
    setTextColor( color: Vector3 ): void
    {
        if ( this._text_color === color ) return;

        this._text_color = color;
        this._updateTextColor();
    }


    /**
     * コンテナの現在の文字色を取得
     * @returns GeoMath で表される色情報
     */
    getTextColor(): Vector3
    {
        return this._text_color;
    }


    /**
     * 著作権を追加する際に、コンテナに既にある著作権と重複していないかを確認
     * @param attribution 確認する対象の著作権
     * @returns 重複していないなら true、重複しているなら false
     */
    private _isValidAttribution( attribution: string ): boolean
    {
        if ( this._default_attributions ) {
            if ( this._default_attributions.includes( attribution ) ) {
                return false;
            }
        }
        if ( this._attributions ) {
            if ( this._attributions.includes( attribution ) ) {
                return false;
            }
        }
        return true;
    }


    /**
     * コンテナに著作権を追加
     *
     * 追加した著作権はコンテナに表示されている著作権の末尾に配置される。
     * @param attribution 著作権
     */
    private _addDomNodeForAttribution( attribution: string, is_default: boolean ): void
    {
        const attribution_container = document.createElement( "a" );
        attribution_container.innerHTML = attribution;

        if ( this._normalize_attribution_styles ) {
            attribution_container.querySelectorAll( `a` ).forEach( container_element => {
                    container_element.setAttribute( `target`, `_blank` );
                    container_element.style.color = "unset";
            });
        }

        if ( is_default ) {
            this._sub_container.insertBefore( attribution_container, this._sub_container.children[this._default_attributions.length] );
        }
        else {
            this._sub_container.appendChild( attribution_container );
        }
    }


    /**
     * コンテナの背景色の変更処理
     */
    private _updateBackgroundColor(): void
    {
        this._container.style.backgroundColor = Color.toRGBString( this._background_color );
    }


    private _updateTextColor(): void
    {
        this._container.style.color = Color.toRGBString( this._text_color );
    }
}



namespace AttributionController {



export interface Option extends ContainerController.Option {
    /**
     * 著作権コンテナに表示する著作権を指定
     * @example
     * ```ts
     * const myAttributions = [
     *     `<a href="https://mapray.com">©Mapray</a>`,
     *     `<a href="http://www.jaxa.jp/">©JAXA</a>`,
     *     `<a href="https://www.gsi.go.jp/kiban/index.html">測量法に基づく国土地理院長承認（複製）H30JHf626</a>`
     * ］
     * ```
     */
    attributions?: string | string[];

    /**
     * 著作権コンテナに含まれるAタグなどに適用されるブラウザデフォルトスタイルを無効にする。
     *
     * `setTextColor` を使って指定したテキスト色が上書きされるのを防ぐために利用します（デフォルトで有効です）。
     * この動作を無効にするには `false` を指定します。
     *
     * @defaultValue `true`
     */
    normalize_attribution_styles?: boolean;

    /**
     * 背景色を指定
     * @example
     * ```ts
     * background_color: [0, 1, 0, 0.5]
     * ```
     */
    background_color?: Vector3 | Vector4;

    /**
     * 文字色を指定
     * @example
     * ```ts
     * text_color: [0, 1, 0]
     * ```
     */
    text_color?: Vector3;

    /**
     * Viewer に格納されるコンテナに対してこのオプションを用いることを想定
     * true にすることで、©Mapray ( デフォルトの著作権 ) が表示される。
     * ユーザ側でこのオプションを指定することはない。またこのパラメータは途中で変えることができない。
     */
    is_default?: boolean;
}



/**
 * Mapray 著作権
 */
export const MAPRAY_DEFAULT_ATTRIBUTION: string = `<a href="https://mapray.com">©Mapray</a>`;



} // namespace AttributionController



export default AttributionController;
