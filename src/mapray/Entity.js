import AltitudeMode from "./AltitudeMode";


/**
 * @summary シーン・エンティティ
 * @classdesc
 * <p>シーン・エンティティの基底クラスである。</p>
 * @memberof mapray
 * @see mapray.Scene
 * @protected
 * @abstract
 */
class Entity {

    /**
     * @desc
     * <p>インスタンス生成後に、それを scene に追加することができる。</p>
     *
     * @param {mapray.Scene} scene  所属可能シーン
     * @param {object} [opts]       オプション集合
     * @param {object} [opts.json]  生成情報
     * @param {object} [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        /**
         * @summary 所属可能シーン
         * @member mapray.Entity#scene
         * @type {mapray.Scene}
         * @readonly
         */
        this.scene = scene;

        // 高度モード
        this._altitude_mode = AltitudeMode.ABSOLUTE;

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupEntityByJson( opts.json );
        }
    }


    /**
     * @summary 高度モード
     * @type {mapray.AltitudeMode}
     */
    set altitude_mode( value )
    {
        if ( this._altitude_mode !== value ) {
            var prev_mode = this._altitude_mode;
            this._altitude_mode = value;
            this.onChangeAltitudeMode( prev_mode );
        }
    }


    get altitude_mode()
    {
        return this._altitude_mode;
    }


    /**
     * @summary 高度モードが変更された後の通知
     *
     * @desc
     * <p>this.altitude_mode が変更されたときに呼び出される。</p>
     * <p>既定の実装は何もしない。</p>
     *
     * @param {mapray.AltitudeMode} prev_mode  直前のモード
     *
     * @abstract
     * @protected
     */
    onChangeAltitudeMode( prev_mode )
    {
    }


    /**
     * @summary プリミティブ配列を取得
     * @desc
     * <p>レンダリング時にこのエンティティを描画するための 0 個以上のプリミティブを含む配列を返す。</p>
     * <p>このメソッドが呼び出されたフレームのレンダリングが終了するまで、返した配列とそれに含まれるプリミティブは変更してはならない。</p>
     *
     * @param  {mapray.RenderStage} stage  レンダリングステージ
     * @return {Array.<mapray.Primitive>}  プリミティブ配列
     * @abstract
     * @package
     */
    getPrimitives( stage )
    {
        throw new Error( "mapray.Entity#getPrimitives() method has not been overridden." );
    }


    /**
     * JSON データによる Entity 共通の初期化
     * @private
     */
    _setupEntityByJson( json )
    {
        // 高度モード
        if ( json.altitude_mode ) {
            switch ( json.altitude_mode ) {
            case "absolute":
                this._altitude_mode = AltitudeMode.ABSOLUTE;
                break;
            case "relative":
                this._altitude_mode = AltitudeMode.RELATIVE;
                break;
            default:
                console.error( "unrecognized altitude_mode: " + json.altitude_mode );
            }
        }
    }

}


export default Entity;
