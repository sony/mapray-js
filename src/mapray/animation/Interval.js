import Time from "./Time";


/**
 * @summary アニメーション時刻の区間
 *
 * @classdesc
 * <p>アニメーション時刻の区間を表現するクラスである。</p>
 * <p>このクラスのインスタンスはイミュータブルである。</p>
 *
 * @memberof mapray.animation
 */
class Interval
{

    /**
     * @desc
     * <p>下限 lower と上限 upper の時刻区間を生成する。</p>
     * <p>端点である lower と upper が区間に含まれるかどうかは l_open と u_open により指定する。</p>
     *
     * <pre>
     *  interval       | l_open  u_open
     * ----------------+----------------
     *  [lower, upper] | false   false
     *  [lower, upper) | false   true
     *  (lower, upper] | true    false
     *  (lower, upper) | true    true
     * </pre>
     *
     * @param {mapray.animation.Time} lower  区間の下限時刻
     * @param {mapray.animation.Time} upper  区間の上限時刻
     * @param {boolean}      [l_open=false]  lower が区間にが含まれるとき false, 含まれないとき true
     * @param {boolean}      [u_open=false]  upper が区間にが含まれるとき false, 含まれないとき true
     */
    constructor( lower, upper, l_open, u_open )
    {
        this._lower  = lower;
        this._upper  = upper;
        this._l_open = (l_open === undefined) ? false : l_open;
        this._u_open = (u_open === undefined) ? false : u_open;
    }


    /**
     * @summary 全時刻区間
     *
     * @type {mapray.animation.Interval}
     * @readonly
     */
    static get
    UNIVERSAL() { return INTERVAL_UNIVERSAL; }


    /**
     * @summary 下限時刻
     *
     * @type {mapray.animation.Time}
     * @readonly
     */
    get
    lower() { return this._lower; }


    /**
     * @summary 上限時刻
     *
     * @type {mapray.animation.Time}
     * @readonly
     */
    get
    upper() { return this._upper; }


    /**
     * @summary 下限時刻は除外されるか？
     *
     * @type {boolean}
     * @readonly
     */
    get
    l_open() { return this._l_open; }


    /**
     * @summary 上限時刻は除外されるか？
     *
     * @type {boolean}
     * @readonly
     */
    get
    u_open() { return this._u_open; }


    /**
     * @summary 空時刻区間か？
     *
     * @desc
     * <p>this が空の時刻区間かどうかを返す。</p>
     * <p>空時刻区間の場合、区間内に 1 つも時刻が存在しない。</p>
     *
     * @return {boolean}  空時刻区間のとき true, それ以外のとき false
     */
    isEmpty()
    {
        let lower = this._lower;
        let upper = this._upper;

        return upper.lessThan( lower ) || upper.equals( lower ) && (this._l_open || this._u_open);
    }


    /**
     * @summary 単一時刻区間か？
     *
     * @desc
     * <p>this が単一時刻の時刻区間かどうかを返す。</p>
     * <p>単一時刻区間の場合、区間内にただ 1 つの時刻が存在する。</p>
     * <p>単一時刻区間であるなら lower == upper であり、逆は必ずしも成り立たない。</p>
     *
     * @return {boolean}  単一時刻区間のとき true, それ以外のとき false
     */
    isSingle()
    {
        return this._lower.equals( this._upper ) && !(this._l_open || this._u_open);
    }


    /**
     * @summary 通常時刻区間か？
     *
     * @desc
     * <p>this が通常の時刻区間かどうかを返す。</p>
     * <p>通常時刻区間の場合、区間内に無限個の時刻が存在する。</p>
     * <p>通常時刻区間であるなら lower < upper であり、逆も成り立つ。</p>
     *
     * @return {boolean}  通常時刻区間のとき true, それ以外のとき false
     */
    isProper()
    {
        return this._lower.lessThan( this._upper );
    }


    /**
     * @summary 先行しているか？
     *
     * @desc
     * <p>this のすべての時刻が rhs のすべての時刻より先行しているときに true, それ以外のときは false を返す。</p>
     * <p>this または rhs のどちらか、または両方が空時刻区間のときは true を返す。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {boolean}  this が rhs に先行しているとき true, それ以外のとき false
     */
    precedes( rhs )
    {
        if ( this.isEmpty() || rhs.isEmpty() ) {
            // this または rhs のどちらか、または両方が空時刻区間のときの仕様
            return true;
        }
        else {
            let ut1 = this._upper;
            let uo1 = this._u_open;
            let lt2 = rhs._lower;
            let lo2 = rhs._l_open;
            return ut1.lessThan( lt2 ) || ut1.equals( lt2 ) && (uo1 || lo2);
        }
    }


    /**
     * @summary 包含しているか？
     *
     * @desc
     * <p>rhs のすべての時刻が this に含まれるとき true, それ以外のときは false を返す。</p>
     * <p>rhs が空時刻区間のときは true を返す。</p>
     * <p>これは rhs ⊆ this と等価である。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {boolean}  this が rhs を包含しているとき true, それ以外のとき false
     */
    includes( rhs )
    {
        if ( rhs.isEmpty() ) {
            // rhs が空時刻区間のときの仕様
            return true;
        }
        else {
            let lt1 = this._lower;
            let lt2 = rhs._lower;
            let lo1 = this._l_open;
            let lo2 = rhs._l_open;
            let inc_l = lt1.lessThan( lt2 ) || lt1.equals( lt2 ) && (!lo1 || lo2);

            let ut1 = this._upper;
            let ut2 = rhs._upper;
            let uo1 = this._u_open;
            let uo2 = rhs._u_open;
            let inc_u = ut2.lessThan( ut1 ) || ut2.equals( ut1 ) && (uo2 || !uo1);

            return inc_l && inc_u;
        }
    }


    /**
     * @summary 時刻を包含しているか？
     *
     * @desc
     * <p>rhs の時刻が this に含まれるとき true, それ以外のときは false を返す。</p>
     * <p>このメソッドは this.includes( new Interval( rhs, rhs ) ) と同等である。</p>
     *
     * @param {mapray.animation.Time} rhs  時刻
     *
     * @return {boolean}  this が rhs を包含しているとき true, それ以外のとき false
     */
    includesTime( rhs )
    {
        let lower = this._lower;
        let inc_l = lower.lessThan( rhs ) || lower.equals( rhs ) && !this._l_open;

        let upper = this._upper;
        let inc_u = rhs.lessThan( upper ) || rhs.equals( upper ) && !this._u_open;

        return inc_l && inc_u;
    }


    /**
     * @summary 共通時刻区間は存在するか？
     *
     * @desc
     * <p>!this.getIntersection( rhs ).isEmpty() と同じである。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {boolean}  共通時刻区間
     *
     * @see {@link mapray.animation.Interval#getIntersection}
     */
    hasIntersection( rhs )
    {
        // todo: オブジェクトを生成しないように最適化
        return !this.getIntersection( rhs ).isEmpty();
    }


    /**
     * @summary 先行時刻区間を取得
     *
     * @desc
     * <p>this のすべての時刻に対して、先の時刻となるすべての時刻を含む先行時刻区間を返す。</p>
     * <p>this が空時刻区間のときは全時刻区間を返し、this
     *    に表現可能な最初の時刻が含まれるときは空時刻区間を返す。</p>
     * <p>this.getPrecedings().precedes( this ) は常に true を返す。</p>
     *
     * @return {mapray.animation.Interval}  先行時刻区間
     */
    getPrecedings()
    {
        if ( this.isEmpty() ) {
            // 空時刻区間のときは全時刻区間を返す仕様
            return INTERVAL_UNIVERSAL;
        }
        else {
            return new Interval( Time.MIN_TIME, this._lower, false, !this._l_open );
        }
    }


    /**
     * @summary 後続時刻区間を取得
     *
     * @desc
     * <p>this のすべての時刻に対して、後の時刻となるすべての時刻を含む後続時刻区間を返す。</p>
     * <p>this が空時刻区間のときは全時刻区間を返し、this
     *    に表現可能な最後の時刻が含まれるときは空時刻区間を返す。</p>
     * <p>this.precedes( this.getFollowings() ) は常に true を返す。</p>
     *
     * @return {mapray.animation.Interval}  後続時刻区間
     */
    getFollowings()
    {
        if ( this.isEmpty() ) {
            // 空時刻区間のときは全時刻区間を返す仕様
            return INTERVAL_UNIVERSAL;
        }
        else {
            return new Interval( this._upper, Time.MAX_TIME, !this._u_open, false );
        }
    }


    /**
     * @summary 共通時刻区間を取得
     *
     * @desc
     * <p>this と rhs の共通時刻区間 (this ∩ rhs) を返す。</p>
     * <p>this と rhs に共通の時刻が存在しなければ空時刻区間を返す。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {mapray.animation.Interval}  共通時刻区間
     *
     * @see {@link mapray.animation.Interval#hasIntersection}
     */
    getIntersection( rhs )
    {
        // B = Lb ∩ Ub とするとき
        // A ∩ B = A ∩ Lb ∩ Ub

        // A ∩ Lb
        let cross = this._getIntersectionByLower( rhs._lower, rhs._l_open );
        // (A ∩ Lb) ∩ Ub
        return cross._getIntersectionByUpper( rhs._upper, rhs._u_open );
    }


    /**
     * @summary 合併時刻区間を取得
     *
     * @desc
     * <p>this と rhs を合併した時刻集合 (this ∪ rhs) を時刻区間の配列として返す。</p>
     * <p>0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。</p>
     * <p>2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {mapray.animation.Interval[]}  合併時刻区間
     */
    getUnion( rhs )
    {
        if ( this.isEmpty() ) {
            return rhs.isEmpty() ? [] : [rhs];
        }
        else if ( rhs.isEmpty() ) {
            // Assert: !this.isEmpty() && rhs.isEmpty()
            return [this];
        }
        // Assert: !this.isEmpty() && !rhs.isEmpty()

        let lt1 = this._lower;
        let ut1 = this._upper;
        let lo1 = this._l_open;
        let uo1 = this._u_open;

        let lt2 = rhs._lower;
        let ut2 = rhs._upper;
        let lo2 = rhs._l_open;
        let uo2 = rhs._u_open;

        if ( ut1.lessThan( lt2 ) || (ut1.equals( lt2 ) && uo1 && lo2) ) {
            // Assert: this と rhs は離れている、かつ this が先行
            return [this, rhs];
        }
        else if ( ut2.lessThan( lt1 ) || (lt1.equals( ut2 ) && lo1 && uo2) ) {
            // Assert: this と rhs は離れている、かつ rhs が先行
            return [rhs, this];
        }
        // Assert: this と rhs は交差または隣接している (単一の時刻区間に合併できる)

        let [lower, l_open] =
            (lt1.lessThan( lt2 ) || lt1.equals( lt2 ) && lo2) ?
            [lt1, lo1] : [lt2, lo2];

        let [upper, u_open] =
            (ut2.lessThan( ut1 ) || ut2.equals( ut1 ) && uo2) ?
            [ut1, uo1] : [ut2, uo2];

        return [new Interval( lower, upper, l_open, u_open )];
    }


    /**
     * @summary 時刻区間の差を取得
     *
     * @desc
     * <p>this から rhs を差し引いた時刻集合 (this - rhs) を時刻区間の配列として返す。</p>
     * <p>0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。</p>
     * <p>2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。</p>
     *
     * @param {mapray.animation.Interval} rhs  時刻区間
     *
     * @return {mapray.animation.Interval[]}  時刻区間の差
     */
    getDifference( rhs )
    {
        // B = Lb ∩ Ub とするとき
        // A - B = A ∩ ~B
        //       = (A ∩ ~Lb) ∪ (A ∩ ~Ub)

        // A ∩ ~Lb
        let i1 = this._getIntersectionByUpper( rhs._lower, !rhs._l_open );
        // A ∩ ~Ub
        let i2 = this._getIntersectionByLower( rhs._upper, !rhs._u_open );
        // (A ∩ ~Lb) ∪ (A ∩ ~Ub)
        return i1.getUnion( i2 );
    }


    /**
     * @summary 補時刻区間を取得
     *
     * @desc
     * <p>全時刻区間 から this を差し引いた時刻集合を時刻区間の配列として返す。</p>
     * <p>0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。</p>
     * <p>2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。</p>
     *
     * @return {mapray.animation.Interval[]}  補時刻区間
     */
    getComplement()
    {
        return INTERVAL_UNIVERSAL.getDifference( this );
    }


    /**
     * @summary 下限時刻区間との共通時刻区間を取得
     *
     * @desc
     * <p>this ∩ Lower(bound, open) → Interval<p>
     *
     * @param {mapray.animation.Time} bound
     * @param {boolean}               open
     *
     * @return {mapray.animation.Interval}  共通時刻区間
     *
     * @private
     */
    _getIntersectionByLower( bound, open )
    {
        if ( bound.lessThan( this._lower ) || bound.equals( this._lower ) && this._l_open ) {
            return this;
        }
        else {
            return new Interval( bound, this._upper, open, this._u_open );
        }
    }


    /**
     * @summary 上限時刻区間との共通時刻区間を取得
     *
     * @desc
     * <p>this ∩ Upper(bound, open) → Interval<p>
     *
     * @param {mapray.animation.Time} bound
     * @param {boolean}               open
     *
     * @return {mapray.animation.Interval}  共通時刻区間
     *
     * @private
     */
    _getIntersectionByUpper( bound, open )
    {
        if ( this._upper.lessThan( bound ) || this._upper.equals( bound ) && this._u_open ) {
            return this;
        }
        else {
            return new Interval( this._lower, bound, this._l_open, open );
        }
    }

}


const INTERVAL_UNIVERSAL = new Interval( Time.MIN_TIME, Time.MAX_TIME );


export default Interval;
