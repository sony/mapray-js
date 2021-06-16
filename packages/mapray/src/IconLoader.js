import Dom from "./util/Dom";
import Resource, { ResourceType } from "./Resource";


/**
 * @classdesc
 * アイコン画像のローダーです。
 * 何らかのプロパティに応じて、アイコンが読み込まれます。
 * 同一リソースが要求された場合は、読み込み中または読み込み済みのアイコンを返却します。
 * 同一リソースであるかの判定には、getKey(prop)関数により返却される値を用います。
 * @private
 */
class IconLoader {

    /**
     * @summary コンストラクタ
     */
    constructor() {
        this._cache = new Map();
    }


    /**
     * @summary プロパティに応じたアイコンを返却します。
     * すでに同一リソースを生成した場合は生成済みのインスタンスを返却し、そうでない場合はdoCreate(prop)により生成します。
     * @param {any} prop
     * @return {IconLoaderItem}
     */
    create( prop ) {
        const key = this.getKey( prop );
        let value = this._cache.get(key);
        if ( !value ) this._cache.set( key, value = this.doCreate( prop ) );
        return value;
    }


    /**
     * @summary プロパティに応じたアイコンを生成します。
     * @abstract
     * @param {any} prop プロパティ
     * @return {IconLoaderItem}
     */
    doCreate( prop ) {
    }


    /**
     * @summary プロパティに応じたキーを返却します。
     * 必要に応じてオーバーライドされることを想定した関数です。
     * ディフォルトでは、プロパティ自体がキーとなるように動作します。
     * @param {any} prop プロパティ
     */
    getKey( prop ) {
        return prop;
    }


    /**
     * @summary プロパティに応じたアイコンの読み込みを開始し、インスタンスを返却します。
     * 読み込みは開始しますが読み込み完了していない可能性があります。
     * この関数はasync関数ではありません。読み込み終了を監視するには、この関数の返却値に対してonEnd(callback)を呼び出します。
     * @param {any} prop プロパティ
     * @return {IconLoaderItem}
     */
    load( prop ) {
        const icon = this.create( prop );
        icon.load();
        return icon;
    }

}



/**
 * @classdesc アイコン画像ローダーのアイコンです。抽象クラスです。
 * ステータスの管理、読み込み完了後の通知等を行います。
 * @private
 */
class IconLoaderItem {

    constructor() {
        this._status = IconLoaderItem.Status.NOT_LOADED;
        this._funcs = [];
        this._icon = null;
    }


    /**
     * @summary アイコンの状態
     * @type {IconLoaderItem.Status}
     * @readonly
     */
    get status() {
        return this._status;
    }


    /**
     * @summary アイコンの読み込みが完了しているか
     * @return {boolean}
     */
    isLoaded() {
        return this._status === IconLoaderItem.Status.LOADED;
    }


    /**
     * @summary アイコンの読み込みが完了した時点で呼び出されるコールバック関数を登録します。
     * この関数を呼び出した時点で読み込みが完了している場合は、即座にコールバック関数を実行します。
     * @param {function}
     */
    onEnd( func ) {
        const alreadyDone = this._status === IconLoaderItem.Status.LOADED || this._status === IconLoaderItem.Status.ABORTED;
        if ( alreadyDone ) func( this );
        else this._funcs.push( func );
    }


    /**
     * @summary アイコン読み込み関数（doLoad()）を実行し、成功時、失敗時それぞれ後続処理を行います。
     */
    async load() {
        if ( this._status === IconLoaderItem.Status.NOT_LOADED ) {
            this._status = IconLoaderItem.Status.LOADING;
            try {
                this._icon = await this.doLoad();
                this._status = IconLoaderItem.Status.LOADED;
            }
            catch( error ) {
                this._status = IconLoaderItem.Status.ABORTED;
            }
            for ( var i = 0; i < this._funcs.length; i++ ) {
                this._funcs[ i ]( this );
            }
            this._funcs.length = 0;
        }
    }


    /**
     * @summary アイコンを読み込みます。この関数はオーバーライドされることを想定されています。
     * @abstract
     * @return {Image}
     */
    async doLoad() {
        throw new Error( "doLoad() is not implemented in: " + this.constructor.name );
    }


    /**
     * @summary アイコンを取得します。
     * アイコンが読み込まれるまではnullを返却します。
     * @return {Image|null}
     */
    get icon() {
        return this._icon;
    }

    /**
     * @summary アイコンの幅
     * アイコンが読み込まれるまでは-1を返却します。
     * @return {number}
     */
    get width() {
        return this._icon ? this.icon.width : -1;
    }

    /**
     * @summary アイコンの高さ
     * アイコンが読み込まれるまでは-1を返却します。
     * @return {number}
     */
    get height() {
        return this._icon ? this.icon.height : -1;
    }


    /**
     * @summary アイコンをキャンバスコンテキストに描画します。
     * @param {CanvasRenderingContext2D} context
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    draw( context, x, y, width, height ) {
        context.drawImage( this.icon, x, y, width, height );
    }

}

/**
 * @private
 */
IconLoaderItem.Status = {
    NOT_LOADED: "not loaded",
    LOADING: "loading",
    LOADED: "loaded",
    ABORTED: "aborted"
};



/**
 * @classdesc アイコン画像のURLを指定してアイコンを読み込むアイコンローダーです。
 * urlは下記のように生成します。
 * url = urlPrefix + id + urlSuffix
 * @private
 */
class URLTemplateIconLoader extends IconLoader {

    /**
     * @param {string} urlPrefix
     * @param {string} urlSuffix
     */
    constructor( urlPrefix, urlSuffix ) {
        super();
        this.urlPrefix = urlPrefix;
        this.urlSuffix = urlSuffix;
    }


    /**
     * @override
     */
    doCreate( id ) {
        return new URLIconLoaderItem( this.urlPrefix + id + this.urlSuffix );
    }

}



/**
 * @classdesc URLTemplateIconLoaderのアイコンです。
 *
 * @private
 */
class URLIconLoaderItem extends IconLoaderItem {

    /**
     * @param {string} url
     */
    constructor( url ) {
        super();
        this.url = url;
    }


    /**
     * @override
     */
    async doLoad() {
        return await Dom.loadImage( this.url, { crossOrigin: "Anonymous" } );
    }

}



/**
 * @classdesc テキストアイコンを生成するアイコンローダーです。
 *
 * @private
 */
class TextIconLoader extends IconLoader {

    /**
     * プロパティに応じたアイコンを生成します。
     * @param {string} prop.text プロパティ
     */
    doCreate( prop ) {
        return new TextIconLoaderItem( prop.text, prop.props );
    }


    /**
     * プロパティに応じたキーを返却します。
     * @param {string} prop.text プロパティ
     */
    getKey( prop ) {
        return prop.text;
    }

}



/**
 * @classdesc TextIconLoaderのアイコンです。
 *
 * @private
 */
class TextIconLoaderItem extends IconLoaderItem {

    /**
     * @param {string}         text                text
     * @param {mapray.Vector2} [props.size]        size in pixel
     * @param {string}         [props.font_family] font family
     */
    constructor( text, props = {} ) {
        super();
        this.text = text;
        this.props = props;
    }


    /**
     * @override
     */
    async doLoad() {
        var props = this.props;
        var size = props.size ? props.size[0] : 20;
        var fontFamily = props.font_family ? ("'" + props.font_family + "'") : Dom.SYSTEM_FONT_FAMILY;
        var context = Dom.createCanvasContext( size, size );
        context.textAlign    = "center";
        context.textBaseline = "alphabetic";
        context.font = (size * 0.6756756757) + "px " + fontFamily;
        context.fillText( this.text, size * 0.5, size * 0.7432432432 );
        return context.canvas;
    }


    /**
     * @override
     */
    draw( context, x, y, width, height ) {
        context.drawImage( this.icon, x, y, width, height );
    }

}



/**
 * @classdesc 画像からアイコンを生成するアイコンローダーです。
 * 
 * @private
 */
class ImageIconLoader extends IconLoader {

    /**
     * プロパティに応じたアイコンを生成します。
     * @param {string} prop.text プロパティ
     */
    doCreate( image_src ) {
        return new ImageIconLoaderItem( image_src );
    }

}



/**
 * @classdesc ImageIconLoaderのアイコンです。
 * 
 * @private
 */
class ImageIconLoaderItem extends IconLoaderItem {

    /**
     * @param {string|HTMLImageElement|HTMLCanvasElement} image_src image source
     */
    constructor( image_src ) {
        super();
        this._image_src = image_src;
    }


    /**
     * @override
     */
    async doLoad() {
        const image_src = this._image_src;
        const image = (
            image_src instanceof Resource          ? await image_src.load( { type: ResourceType.IMAGE } ):
            typeof( image_src ) === "string"       ? await Dom.loadImage( image_src ):
            image_src instanceof HTMLImageElement  ? await Dom.waitForLoad( image_src ):
            image_src instanceof HTMLCanvasElement ? image_src:
            null
        );
        if ( !image ) throw new Error( "not supported: " + image_src );
        return image;
    }

}



export { URLTemplateIconLoader, TextIconLoader, ImageIconLoader, IconLoaderItem, ImageIconLoaderItem };
export default IconLoader;
