import Type from "./Type";
import Time from "./Time";
import Updater from "./Updater";
import Curve from "./Curve";
import TypeMismatchError from "./TypeMismatchError";


/**
 * アニメーションパラメータの結合
 *
 * パラメータ、Curve インスタンス、Updater インスンタンスを結合する。
 *
 * @see [[Curve]]
 * @see [[Updater]]
 */
class Binder
{

    private _updater: Updater;

    private _curve: Curve;

    private _type: Type;

    private _setter: Binder.Setter;


    /**
     * パラメータと curve と updater を結合する。
     *
     * パラメータ値は setter を通して設定される。
     *
     * setter には type 型の値が渡される。
     *
     * @param updater  アニメーションパラメータの更新管理
     * @param curve  アニメーション関数
     * @param type  パラメータ値の型
     * @param setter  パラメータ設定関数
     *
     * @throws [[TypeMismatchError]] curve が type 型をサポートしていないとき
     */
    constructor( updater: Updater, curve: Curve, type: Type, setter: Binder.Setter )
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
     * アニメーションパラメータの更新管理
     */
    get updater(): Updater { return this._updater; }


    /**
     * アニメーション関数
     */
    get curve(): Curve { return this._curve; }


    /**
     * パラメータ値の型
     *
     * @see [[Binder.Setter]]
     */
    get type(): Type { return this._type; }


    /**
     * パラメータ設定関数
     */
    get setter(): Binder.Setter { return this._setter; }


    /**
     * 結合を解除
     */
    unbind()
    {
        // updater から this を抹消
        this._updater._$unregister( this );
    }


    /**
     * アニメーション関数
     */
    get _$curve(): Curve
    {
        return this._curve;
    }


    /**
     * アニメーションパラメータを更新
     *
     * 時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。
     *
     * @param time 時刻
     * @internal
     */
    _$update( time: Time )
    {
        let  value = this._curve.getValue( time, this._type );
        let setter = this._setter;
        setter( value );
    }

}



namespace Binder {



/**
 * パラメータ設定関数
 *
 * Binder インスタンスの type 型のオブジェクトを受け取り、実際のパラメータを設定するための関数である。
 *
 * @param value  type 型のオブジェクト
 *
 * @see [[mapray.animation.Binder]]
 * @see [[mapray.animation.Binder.setter]]
 * @see [[mapray.animation.Binder.type]]
 */
export type Setter = (value: any) => void;



} // namespace Binder



export default Binder;
