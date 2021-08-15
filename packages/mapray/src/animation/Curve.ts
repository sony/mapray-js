import Type from "./Type";
import Time from "./Time";
import Interval from "./Interval";
import Invariance from "./Invariance";



/**
 * アニメーション関数
 *
 * 指定時刻のアニメーション関数値を取得するための抽象クラスである。
 */
abstract class Curve
{
    private _value_change_listeners: Set<Curve.ValueChangeListener>;

    /**
     */
    protected constructor()
    {
        this._value_change_listeners = new Set();
    }


    /**
     * 型はサポートされるか？
     *
     * type 型がアニメーション関数の返却値の型として使用できるかどうかを返す。
     *
     * this の生存中、このメソッドの type に対する結果は一定である。
     *
     * このメソッドが true を返した場合、getValue() により
     *    アニメーション関数値を type 型で取得することが可能である。
     *
     * @param type  確認する型
     *
     * @return type がサポートされるとき true, それ以外は false
     *
     * @see [[Curve.getValue]]
     */
    abstract isTypeSupported( type: Type ): boolean;


    /**
     * 指定時刻の値を取得
     *
     * 時刻 time のアニメーション関数値を type 型として取得する。
     *
     * 事前条件: this.isTypeSupported( type ) == true
     *
     * @param time  時刻パラメータ
     * @param type  返却値の型
     *
     * @return  時刻 time に対する type 型の値
     *
     * @see [[mapray.animation.Curve.isTypeSupported]]
     */
    abstract getValue( time: Time, type: Type ): any;


    /**
     * 不変性情報を取得
     *
     * interval で指定される範囲の不変性情報を返す。
     *
     * 不変性情報は interval に内包されるまたは交差する時刻区間を持っている。
     *
     * 一部が interval と交差する時刻区間はクリップしない。
     *
     * 事前条件: interval.isEmpty() == false
     *
     * @param interval  対象とする時刻区間
     *
     * @return  不変性情報
     */
    abstract getInvariance( interval: Interval ): Invariance;


    /**
     * 関数値が変化したことを通知
     *
     * 時刻区間 interval の範囲の関数値が変化したことをフレームワークに通知する。
     *
     * このメソッドは関数値が変化したときにサブクラスの実装者が呼び出す。
     *
     * @param interval  関数値が変化した時刻区間
     *
     * @see [[Curve.addValueChangeListener]]
     * @see [[Curve.removeValueChangeListener]]
     */
    protected notifyValueChange( interval: Interval )
    {
        if ( interval.isEmpty() ) {
            // 空時刻区間なので実際には変化なし
            // ValueChangeListener の事前条件も満たさない
            return;
        }

        // 関数値変化リスナーの呼び出し
        for ( let vcl of this._value_change_listeners ) {
            vcl( interval );
        }
    }


    /**
     * 関数値変化リスナーの登録
     *
     * @param vcl  関数値変化リスナー
     *
     * @see [[Curve.notifyValueChange]]
     * @see [[Curve.removeValueChangeListener]]
     */
    addValueChangeListener( vcl: Curve.ValueChangeListener )
    {
        this._value_change_listeners.add( vcl );
    }


    /**
     * 関数値変化リスナーの登録解除
     *
     * @param Curve.ValueChangeListener vcl  関数値変化リスナー
     *
     * @see [[Curve.notifyValueChange]]
     * @see [[Curve.addValueChangeListener]]
     */
    removeValueChangeListener( vcl: Curve.ValueChangeListener )
    {
        this._value_change_listeners.delete( vcl );
    }

}



namespace Curve {



/**
 * アニメーション関数値変化リスナー
 *
 * アニメーション関数値の変化を監視するためのリスナー関数の型である。
 *
 * このリスナーを登録した Curve インスタンスの関数値が変化したときに呼び出される。
 *
 * interval は関数値が変化した Curve インスタンスでの時刻範囲である。
 *
 * 事前条件: interval.isEmpty() == false
 *
 * @param interval  関数値が変化した時刻区間
 *
 * @see [[Curve.notifyValueChange]]
 * @see [[Curve.addValueChangeListener]]
 * @see [[Curve.removeValueChangeListener]]
 */
export type ValueChangeListener = (interval: Interval) => void;



} // namespace Curve



export default Curve;
