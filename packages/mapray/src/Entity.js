import AltitudeMode from "./AltitudeMode";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import RenderPhase from "./RenderPhase";


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

        // animation.BindingBlock
        //   今のところ Entity (基底クラス) 自体のアニメーション可能パラメータと
        //   子孫は存在しないので animation には何も追加しない
        this._animation = new EasyBindingBlock();

        this._render_phase = RenderPhase.NORMAL;

        this._visibility = true;

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupEntityByJson( opts.json );
        }
    }


    /**
     * @summary 可視性フラグを取得
     * @type {boolean}
     * @readonly
     */
    get visibility() { return this._visibility; }


    /**
     * @summary 可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     */
    setVisibility( visibility )
    {
        this._visibility = visibility;
    }


    /**
     * @summary アニメーションパラメータ設定
     *
     * @type {mapray.animation.BindingBlock}
     * @readonly
     */
    get animation() { return this._animation; }


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
     * @summary 描画フェーズを取得
     * @type {mapray.RenderPhase}
     */
    get render_phase() {
        return this._render_phase;
    }


    /**
     * @summary 描画フェーズを設定
     * @type {mapray.RenderPhase}
     */
    set render_phase( render_phase ) {
        if ( this._render_phase !== render_phase ) {
            this._render_phase = render_phase;
        }
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
     * @summary FlakePrimitiveProducer インタフェースを取得
     *
     * @desc
     * <p>FlakePrimitiveProducer インタフェースを取得するためにシーンレンダラーが呼び出す。
     *    FlakePrimitiveProducer インタフェースが実装されていなければ null を返す。</p>
     * <p>既定の実装は null を返す。</p>
     *
     * @return {?mapray.Entity.FlakePrimitiveProducer}  FlakePrimitiveProducer インタフェース
     *
     * @abstract
     * @package
     */
    getFlakePrimitiveProducer()
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
            case "clamp":
                this._altitude_mode = AltitudeMode.CLAMP;
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


/**
 * @summary 地表断片エンティティのプリミティブを生産
 *
 * @classdesc
 * <p>シーンレンダラーに地表断片エンティティのプリミティブを与える。</p>
 *
 * @memberof mapray.Entity
 * @private
 * @abstract
 */
class FlakePrimitiveProducer {

    /**
     * @param {mapray.Entity} entity  FlakePrimitiveProducer に対応するエンティティ
     */
    constructor( entity )
    {
        this._entity  = entity;
        this._updated = false;
    }


    /**
     * @summary エンティティ
     *
     * @type {mapray.Entity}
     * @readonly
     */
    get entity() { return this._entity; }



    /**
     * @summary 位置や形状の変化を通知
     */
    notifyForUpdate()
    {
        this._updated = true;
    }


    /**
     * @summary 領域状態を取得
     *
     * @desc
     * <p>area が示す領域の状態を取得する。</p>
     *
     * @param {mapray.Area} area  確認する領域
     *
     * @return {mapray.Entity.AreaStatus}  領域の状態
     *
     * @abstract
     */
    getAreaStatus( area )
    {
        return AreaStatus.EMPTY;
    }


    /**
     * @summary メッシュを生成
     *
     * @desc
     * <p>area の領域に対応するメッシュを取得する。</p>
     * <p>area に形状がないときは null を返す。</p>
     *
     * @param {mapray.Area}     area  メッシュの領域
     * @param {number[]}       dpows  領域の分割指数
     * @param {mapray.DemBinary} dem  DEM バイナリ
     *
     * @return {?mapray.Mesh}
     *
     * @abstract
     */
    createMesh( area, dpows, dem )
    {
        return null;
    }


    /**
     * @summary マテリアルとプロパティを取得
     *
     * @param {mapray.RenderStage} stage  レンダリングステージ
     *
     * @return {object}  { material: mapray.EntityMaterial, properties: mapray.PropSet }
     *
     * @abstract
     */
    getMaterialAndProperties( stage )
    {
        throw new Error( "mapray.Entity.FlakePrimitiveProducer#getMaterialAndProperties() method has not been overridden." );
    }


    /**
     * @summary 更新状態を確認
     *
     * @desc
     * <p>レンダラーが呼び出す。</p>
     * <p>更新状態を返してから、更新なし状態に設定する。</p>
     *
     * @return {boolean}  更新ありのとき true, それ以外のとき false
     *
     * @package
     */
    checkForUpdate()
    {
        let updated = this._updated;

        this._updated = false;

        return updated;
    }

}


/**
 * @summary 領域状態の列挙型
 *
 * @enum {object}
 * @memberof mapray.Entity
 * @constant
 * @private
 */
var AreaStatus = {

    /**
     * 何もない領域
     */
    EMPTY: { id: "EMPTY" },


    /**
     * 完全に満たされた領域
     */
    FULL: { id: "FULL" },


    /**
     * 部分領域または領域不明
     */
    PARTIAL: { id: "PARTIAL" }

};


Entity.PrimitiveProducer = PrimitiveProducer;
Entity.FlakePrimitiveProducer = FlakePrimitiveProducer;
Entity.AreaStatus = AreaStatus;


export default Entity;
