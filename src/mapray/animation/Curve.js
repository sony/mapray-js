/**
 * @summary アニメーション関数
 *
 * @classdesc
 * <p>指定時刻のアニメーション関数値を取得するための抽象クラスである。</p>
 *
 * @abstract
 * @memberof mapray.animation
 */
class Curve
{

    /**
     * @protected
     */
    constructor()
    {
        this._value_change_listeners = new Set();
    }


    /**
     * @summary 型はサポートされるか？
     *
     * @desc
     * <p>type 型がアニメーション関数の返却値の型として使用できるかどうかを返す。</p>
     * <p>this の生存中、このメソッドの type に対する結果は一定である。</p>
     * <p>このメソッドが true を返した場合、getValue() により
     *    アニメーション関数値を type 型で取得することが可能である。</p>
     *
     * @param {mapray.animation.Type} type  確認する型
     *
     * @return {boolean}  type がサポートされるとき true, それ以外は false
     *
     * @see {@link mapray.animation.Curve#getValue}
     *
     * @abstract
     */
    isTypeSupported( type )
    {
        this._override_error( "isTypeSupported" );
    }


    /**
     * @summary 指定時刻の値を取得
     *
     * @desc
     * <p>時刻 time のアニメーション関数値を type 型として取得する。</p>
     *
     * <p>事前条件: this.isTypeSupported( type ) == true</p>
     *
     * @param {mapray.animation.Time} time  時刻パラメータ
     * @param {mapray.animation.Type} type  返却値の型
     *
     * @return {object}  時刻 time に対する type 型の値
     *
     * @see {@link mapray.animation.Curve#isTypeSupported}
     *
     * @abstract
     */
    getValue( time, type )
    {
        this._override_error( "getValue" );
    }


    /**
     * @summary 不変性情報を取得
     *
     * @desc
     * <p>interval で指定される範囲の不変性情報を返す。</p>
     *
     * <p>不変性情報は interval に内包されるまたは交差する時刻区間を持っている。</p>
     * <p>一部が interval と交差する時刻区間はクリップしない。</p>
     *
     * <p>事前条件: interval.isEmpty() == false</p>
     *
     * @param {mapray.animation.Interval} interval  対象とする時刻区間
     *
     * @return {mapray.animation.Invariance}  不変性情報
     *
     * @abstract
     */
    getInvariance( interval )
    {
        this._override_error( "getInvariance" );
    }


    /**
     * @summary 関数値が変化したことを通知
     *
     * @desc
     * <p>時刻区間 interval の範囲の関数値が変化したことをフレームワークに通知する。</p>
     * <p>このメソッドは関数値が変化したときにサブクラスの実装者が呼び出す。</p>
     *
     * @param {mapray.animation.Interval} interval  関数値が変化した時刻区間
     *
     * @see {@link mapray.animation.Curve#addValueChangeListener}
     * @see {@link mapray.animation.Curve#removeValueChangeListener}
     *
     * @protected
     */
    notifyValueChange( interval )
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
     * @summary 関数値変化リスナーの登録
     *
     * @param {mapray.animation.Curve.ValueChangeListener} vcl  関数値変化リスナー
     *
     * @see {@link mapray.animation.Curve#notifyValueChange}
     * @see {@link mapray.animation.Curve#removeValueChangeListener}
     */
    addValueChangeListener( vcl )
    {
        this._value_change_listeners.add( vcl );
    }


    /**
     * @summary 関数値変化リスナーの登録解除
     *
     * @param {mapray.animation.Curve.ValueChangeListener} vcl  関数値変化リスナー
     *
     * @see {@link mapray.animation.Curve#notifyValueChange}
     * @see {@link mapray.animation.Curve#addValueChangeListener}
     */
    removeValueChangeListener( vcl )
    {
        this._value_change_listeners.delete( vcl );
    }


    /**
     * @summary メソッドがオーバーライドされていない
     *
     * arguments.callee と Error#stack は互換性が低いので、関数名の取得に使わなかった
     *
     * @param {string} func_name
     *
     * @private
     */
    _override_error( func_name )
    {
        throw new Error( "Curve#" + func_name + "() method has not been overridden in "
                         + this.constructor.name );
    }

}


/**
 * @summary アニメーション関数値変化リスナー
 *
 * @desc
 * <p>アニメーション関数値の変化を監視するためのリスナー関数の型である。</p>
 * <p>このリスナーを登録した Curve インスタンスの関数値が変化したときに呼び出される。</p>
 * <p>interval は関数値が変化した Curve インスタンスでの時刻範囲である。</p>
 *
 * <p>事前条件: interval.isEmpty() == false</p>
 *
 * @param {mapray.animation.Interval} interval  関数値が変化した時刻区間
 *
 * @callback ValueChangeListener
 *
 * @memberof mapray.animation.Curve
 *
 * @see {@link mapray.animation.Curve#notifyValueChange}
 * @see {@link mapray.animation.Curve#addValueChangeListener}
 * @see {@link mapray.animation.Curve#removeValueChangeListener}
 */


export default Curve;
