import Dom from "./util/Dom";



/**
 * @summary アイコン画像のローダーです。
 * 何らかのプロパティを指定し、アイコンが読み込まれます。
 * 同一リソースが要求された場合は、読み込み中または読み込み済みのアイコンを返却します。
 * 同一リソースであるかの判定には、getKey(prop)関数により返却される値を用います。
 */
class IconLoader {

    constructor() {
        this._cache = new Map();
    }


    /**
     * @desc
     * プロパティに応じたアイコンを返却します。すでに同一リソースを生成した場合は生成済みのインスタンスを返却し、そうでない場合はdoCreate(prop)により生成します。
     * @param {any} prop
     */
    create( prop ) {
        const key = this.getKey( prop );
        let value = this._cache.get(key);
        if ( !value ) this._cache.set( key, value = this.doCreate( prop ) );
        return value;
    }


    /**
     * プロパティに応じたアイコンを生成します。（オーバーライドされることを想定した関数です）
     * @param {any} prop プロパティ
     */
    doCreate( prop ) {
    }


    /**
     * プロパティに応じたキーを返却します。（必要に応じてオーバーライドされることを想定した関数です）。
     * ディフォルトでは、プロパティ自体がキーとなるように動作します。
     * @param {any} prop プロパティ
     */
    getKey( prop ) {
        return prop;
    }


    /**
     * プロパティに応じたアイコンの読み込みを開始し、インスタンスを返却します。読み込みは開始しますが読み込み完了していない可能性があります。
     * @param {any} prop プロパティ
     */
    load( prop ) {
        const icon = this.create( prop );
        icon.load();
        return icon;
    }

}



/**
 * @summary アイコン画像ローダーのアイコンです。抽象クラスです。
 * ステータスの管理、読み込み完了後の通知等を行います。
 * @private
 */
class IconLoaderItem {

    constructor() {
        this._status = IconLoaderItem.Status.NOT_LOADED;
        this.funcs = [];
    }


    /**
     * @summary アイコンの状態
     * @type {IconLoaderItem.Status}
     * @readonly
     */
    get status() {
        return this._status;
    }


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
        else this.funcs.push( func );
    }


    /**
     * @summary アイコンを読み込み関数（doLoad()）を実行し、成功時、失敗時それぞれ後続処理を行います。
     */
    load() {
        if ( this._status === IconLoaderItem.Status.NOT_LOADED ) {
            this._status = IconLoaderItem.Status.LOADING;
            this.doLoad(
                () => {
                    this._status = IconLoaderItem.Status.LOADED;
                    for ( var i = 0; i < this.funcs.length; i++ ) {
                        this.funcs[ i ]( this );
                    }
                    this.funcs.length = 0;
                },
                () => {
                    this._status = IconLoaderItem.Status.ABORTED;
                    for ( var i = 0; i < this.funcs.length; i++ ) {
                        this.funcs[ i ]( this );
                    }
                    this.funcs.length = 0;
                }
            );
        }
    }


    /**
     * @summary アイコンを読み込みます。この関数はオーバーライドされることを想定されています。
     * @param {function} onload  成功時のコールバック
     * @param {function} onerror 失敗時のコールバック
     */
    doLoad( onload, onerror ) {
        throw new Error( "doLoad() is not implemented in: " + this.constructor.name );
    }


    get icon() {
        return this._icon;
    }

    get width() {
        return this.icon ? this.icon.width : -1;
    }

    get height() {
        return this.icon ? this.icon.height : -1;
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

IconLoaderItem.Status = {
    NOT_LOADED: "not loaded",
    LOADING: "loading",
    LOADED: "loaded",
    ABORTED: "aborted"
};



/**
 * @summary アイコン画像のURLを指定してアイコンを読み込むアイコンローダーです。
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


    doCreate( id ) {
        return new URLIconLoaderItem( this.urlPrefix + id + this.urlSuffix );
    }

}



/**
 * @summary URLTemplateIconLoaderのアイコンです。
 
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


    doLoad( onload, onerror ) {
        var image = new Image();
        image.onload = event => {
            this._icon = event.target;
            onload();
        };
        image.onerror = event => {
            this._icon = null;
            onerror();
        };
        image.crossOrigin = "anonymous";
        image.src = this.url;
    }

}



/**
 * @summary テキストアイコンを生成するアイコンローダーです。
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
 * @summary TextIconLoaderのアイコンです。
 *
 * @private
 */
class TextIconLoaderItem extends IconLoaderItem {

    /**
     * @param {string} text text
     * @param {mapray.Vector2} [props.size] size in pixel
     * @param {string} [props.fontFamily] font family
     */
    constructor( text, props = {} ) {
        super();
        this.text = text;
        this.props = props;
    }


    /**
     * @override
     */
    doLoad( onload, onerror ) {
        var props = this.props;
        var size = props.size ? props.size[0] : 20;
        var fontFamily = props.fontFamily ? ("'" + props.fontFamily + "'") : Dom.SYSTEM_FONT_FAMILY;
        var context = Dom.createCanvasContext( size, size );
        context.textAlign    = "center";
        context.textBaseline = "alphabetic";
        context.font = (size * 0.6756756757) + "px " + fontFamily;
        context.fillText( this.text, size * 0.5, size * 0.7432432432 );
        this._icon = context.canvas;
        onload();
    }


    /**
     * @override
     */
    draw( context, x, y, width, height ) {
        context.drawImage( this.icon, x, y, width, height );
    }

}



/**
 * @summary 画像からアイコンを生成するアイコンローダーです。
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
 * @summary ImageIconLoaderのアイコンです。
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
    doLoad( onload, onerror ) {
        var image_src = this._image_src;
        if ( typeof( image_src ) === "string" ) {
            var url = image_src;
            var image = new Image();
            image.onload = event => {
                this._icon = event.target;
                onload();
            };
            image.onerror = event => {
                this._icon = null;
                onerror();
            };
            image.src = url;
        }
        else if ( image_src instanceof HTMLImageElement ) {
            var image = image_src;
            if ( image.complete ) {
                this._icon = image;
                onload();
            }
            else {
                if ( image.onload !== null ) throw new Error();
                if ( image.onerror !== null ) throw new Error();
                image.onload = event => {
                    this._icon = event.target;
                    onload();
                };
                image.onerror = event => {
                    this._icon = null;
                    onerror();
                };
            }
        }
        else if ( image_src instanceof HTMLCanvasElement ) {
            var canvas = image_src;
            this._icon = canvas;
            onload();
        }
        else {
            onerror( new Error( "not supported: " + image_src ) );
        }
    }

}



export { URLTemplateIconLoader, TextIconLoader, ImageIconLoader }
export default IconLoader;