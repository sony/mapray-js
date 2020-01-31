import TypeMismatchError from "./TypeMismatchError";


/**
 * @summary アニメーションパラメータの結合
 *
 * @classdesc
 * <p>パラメータ、Curve インスタンス、Updater インスンタンスを結合する。</p>
 *
 * @see {@link mapray.animation.Curve}
 * @see {@link mapray.animation.Updater}
 *
 * @memberof mapray.animation
 */
class Binder
{

    /**
     * @desc
     * <p>パラメータと curve と updater を結合する。</p>
     * <p>パラメータ値は setter を通して設定される。</p>
     * <p>setter には type 型の値が渡される。</p>
     *
     * @param {mapray.animation.Updater}      updater  アニメーションパラメータの更新管理
     * @param {mapray.animation.Curve}          curve  アニメーション関数
     * @param {mapray.animation.Type}            type  パラメータ値の型
     * @param {mapray.animation.Binder.Setter} setter  パラメータ設定関数
     *
     * @throws {@link mapray.animation.TypeMismatchError}  curve が type 型をサポートしていないとき
     */
    constructor( updater, curve, type, setter )
    {
        if ( !curve.isTypeSupported( type ) ) {
            throw new TypeMismatchError( "type mismatch error" );
        }

        this._updater = updater;
        this._curve   = curve;
        this._type    = type;
        this._setter  = setter;

        // updater に this を登録
        updater._$register( this );
    }


    /**
     * @summary アニメーションパラメータの更新管理
     *
     * @type {mapray.animation.Updater}
     * @readonly
     */
    get updater() { return this._updater; }


    /**
     * @summary アニメーション関数
     *
     * @type {mapray.animation.Curve}
     * @readonly
     */
    get curve() { return this._curve; }


    /**
     * @summary パラメータ値の型
     *
     * @type {mapray.animation.Type}
     * @readonly
     *
     * @see {@link mapray.animation.Binder.Setter}
     */
    get type() { return this._type; }


    /**
     * @summary パラメータ設定関数
     *
     * @type {mapray.animation.Binder.Setter}
     * @readonly
     */
    get setter() { return this._setter; }


    /**
     * @summary 結合を解除
     */
    unbind()
    {
        // updater から this を抹消
        this._updater._$unregister( this );
    }


    /**
     * @summary アニメーション関数
     *
     * @type {mapray.animation.Curve}
     * @readonly
     *
     * @package
     */
    get
    _$curve()
    {
        return this._curve;
    }


    /**
     * @summary アニメーションパラメータを更新
     *
     * @desc
     * <p>時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。</p>
     *
     * @param {mapray.animation.Time} time  時刻
     *
     * @package
     */
    _$update( time )
    {
        let  value = this._curve.getValue( time, this._type );
        let setter = this._setter;
        setter( value );
    }

}


/**
 * @summary パラメータ設定関数
 *
 * @desc
 * <p>Binder インスタンスの type 型のオブジェクトを受け取り、実際のパラメータを設定するための関数である。</p>
 *
 * @param {object} value  type 型のオブジェクト
 *
 * @callback Setter
 *
 * @memberof mapray.animation.Binder
 *
 * @see {@link mapray.animation.Binder}
 * @see {@link mapray.animation.Binder#setter}
 * @see {@link mapray.animation.Binder#type}
 */


export default Binder;
