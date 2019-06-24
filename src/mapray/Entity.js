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

        this._need_to_create_regions = false;

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
     * @summary 領域が更新されたとき呼び出す
     *
     * @desc
     * <p>need_to_create_regions 状態を true に設定する。</p>
     *
     * @protected
     */
    needToCreateRegions()
    {
        this._need_to_create_regions = true;
    }


    /**
     * @summary need_to_create_regions を取得
     *
     * @desc
     * <p>need_to_create_regions 状態を返してから、need_to_create_regions 状態を false に設定する。</p>
     *
     * @return {boolean}  need_to_create_regions
     *
     * @package
     */
    checkToCreateRegions()
    {
        var result = this._need_to_create_regions;
        this._need_to_create_regions = false;
        return result;
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
     * @summary エンティティに標高値は必要か？
     *
     * @desc
     * <p>既定の実装では this.altitude_mode が AltitudeMode.ABSOLUTE なら false, それ以外なら true を返す。</p>
     *
     * @return {boolean}  エンティティに標高値は必要なら true, それ以外なら false
     *
     * @abstract
     * @package
     */
    needsElevation()
    {
        return (this._altitude_mode !== AltitudeMode.ABSOLUTE);
    }


    /**
     * @summary エンティティ領域を生成
     *
     * @desc
     * <p>既定の実装では [] を返す。</p>
     *
     * @return {mapray.EntityRegion[]}  エンティティ領域の配列
     *
     * @abstract
     * @package
     */
    createRegions()
    {
        return [];
    }


    /**
     * @summary 更新されたエンティティ領域の通知
     *
     * @desc
     * <p>標高が更新されたエンティティ領域が通知される。</p>
     * <p>既定の実装では何もしない。</p>
     *
     * @param {mapray.EntityRegion[]} regions  エンティティ領域の配列
     *
     * @abstract
     * @package
     */
    onChangeElevation( regions )
    {
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
