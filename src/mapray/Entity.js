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
     * @private
     */
    onChangeAltitudeMode( prev_mode )
    {
    }


    /**
     * @summary PrimitiveProducer インタフェースを取得
     *
     * @desc
     * <p>PrimitiveProducer インタフェースを取得するためにシーンレンダラーが呼び出す。
     *    PrimitiveProducer インタフェースが実装されていなければ null を返す。</p>
     * <p>既定の実装は null を返す。</p>
     *
     * @return {?mapray.Entity.PrimitiveProducer}  PrimitiveProducer インタフェース
     *
     * @abstract
     * @package
     */
    getPrimitiveProducer()
    {
        return null;
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


/**
 * @summary エンティティのプリミティブを生産
 *
 * @classdesc
 * <p>シーンレンダラーにエンティティのプリミティブを与える。</p>
 *
 * @memberof mapray.Entity
 * @private
 * @abstract
 */
class PrimitiveProducer {

    /**
     * @param {mapray.Entity} entity  PrimitiveProducer に対応するエンティティ
     */
    constructor( entity )
    {
        this._entity = entity;
        this._need_to_create_regions = false;
    }


    /**
     * @summary エンティティ
     *
     * @type {mapray.Entity}
     * @readonly
     */
    get entity() { return this._entity; }


    /**
     * @summary 領域が更新されたとき呼び出す
     *
     * @desc
     * <p>領域を変更したい場合に PrimitiveProducer の実装者が呼び出す必要がある。</p>
     */
    needToCreateRegions()
    {
        this._need_to_create_regions = true;
    }


    /**
     * @summary need_to_create_regions を取得
     *
     * @desc
     * <p>エンティティの領域を変更する (createRegions() を呼び出す) 必要があるかどうかを確認するためにシーンレンダラーが呼び出す。</p>
     *
     * @return {boolean}  領域を変更する必要があるとき true, それ以外のとき false
     *
     * @see needToCreateRegions()
     */
    checkToCreateRegions()
    {
        var result = this._need_to_create_regions;
        this._need_to_create_regions = false;
        return result;
    }


    /**
     * @summary エンティティに標高値は必要か？
     *
     * @desc
     * <p>エンティティが標高値を必要としているかどうかを確認するためレンダラーが呼び出す。<p>
     * <p>既定の実装では entity.altitude_mode が AltitudeMode.ABSOLUTE なら false, それ以外なら true を返す。</p>
     *
     * @return {boolean}  エンティティに標高値が必要なら true, それ以外なら false
     *
     * @abstract
     */
    needsElevation()
    {
        return (this._entity._altitude_mode !== AltitudeMode.ABSOLUTE);
    }


    /**
     * @summary エンティティ領域を生成
     *
     * @desc
     * <p>エンティティの領域を確認するためレンダラーが呼び出す。<p>
     * <p>既定の実装では [] を返す。</p>
     *
     * @return {mapray.EntityRegion[]}  エンティティ領域の配列
     *
     * @abstract
     */
    createRegions()
    {
        return [];
    }


    /**
     * @summary 更新されたエンティティ領域の通知
     *
     * @desc
     * <p>エンティティの領域の標高が変化したことを通知するためレンダラーが呼び出す。regions は標高が更新されたエンティティ領域を含む配列である。</p>
     * <p>既定の実装では何もしない。</p>
     *
     * @param {mapray.EntityRegion[]} regions  エンティティ領域の配列
     *
     * @abstract
     */
    onChangeElevation( regions )
    {
    }


    /**
     * @summary プリミティブ配列を取得
     *
     * @desc
     * <p>レンダリング時にこのエンティティを描画するための 0 個以上のプリミティブを含む配列を返す。</p>
     * <p>このメソッドが呼び出されたフレームのレンダリングが終了するまで、返した配列とそれに含まれるプリミティブは変更してはならない。</p>
     *
     * @param  {mapray.RenderStage} stage  レンダリングステージ
     * @return {Array.<mapray.Primitive>}  プリミティブ配列
     *
     * @abstract
     */
    getPrimitives( stage )
    {
        throw new Error( "mapray.Entity.PrimitiveProducer#getPrimitives() method has not been overridden." );
    }

}


Entity.PrimitiveProducer = PrimitiveProducer;


export default Entity;
