import Curve from "./Curve";
import Interval from "./Interval";
import Invariance from "./Invariance";


/**
 * @summary 定数関数
 *
 * @classdesc
 * <p>すべての時刻で同じ値を返す任意型の関数である。</p>
 * <p>関数値の型は構築子のパラメータにより指定する。</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Curve
 */
class ConstantCurve extends Curve
{

    /**
     * @desc
     * <p>type 型の value を定数値とする定数関数を生成する。</p>
     * <p>type は任意の型を指定することができる。</p>
     * <p>value を省略したときは type 型の既定値を返す定数関数となる。</p>
     *
     * @param {mapray.animation.Type} type    関数値の型
     * @param {object}               [value]  初期定数値 (type 型)
     */
    constructor( type, value )
    {
        super();

        this._constant_type  = type;
        this._constant_value = type.getDefaultValue();

        // 初期値が指定されているときは設定
        if ( value !== undefined ) {
            this.setConstantValue( value );
        }
    }


    /**
     * @summary 定数値を設定
     *
     * @param {object} value  定数値 (関数値の型)
     */
    setConstantValue( value )
    {
        if ( value == this._constant_value ) {
            // 同じ値で変化なし
            // == 演算子で比較できない型は常に違う値と判断されることもある
            return;
        }

        // 定数値を変更
        this._constant_value = this._constant_type.getCloneValue( value );

        // 全時刻の値が変化
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    /**
     * @override
     */
    isTypeSupported( type )
    {
        let from_type = this._constant_type;
        return type.isConvertible( from_type );
    }


    /**
     * @override
     */
    getValue( time, type )
    {
        let from_type  = this._constant_type;
        let from_value = from_type.getCloneValue( this._constant_value );
        return type.convertValue( from_type, from_value );
    }


    /**
     * @override
     */
    getInvariance( interval )
    {
        // 全時間で一定
        // (UNIVERSAL と非空区間は必ず交差するので interval の参照は不要)
        const invariance = new Invariance();
        return invariance.write( Interval.UNIVERSAL );
    }

}


export default ConstantCurve;
