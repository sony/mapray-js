import Time from "./Time";


/**
 * アニメーション時刻の区間
 *
 * アニメーション時刻の区間を表現するクラスである。
 *
 * このクラスのインスタンスはイミュータブルである。
 */
class Interval
{

    private _lower: Time;

    private _upper: Time;

    private _l_open: boolean;

    private _u_open: boolean;


    /**
     * 下限 lower と上限 upper の時刻区間を生成する。
     *
     * 端点である lower と upper が区間に含まれるかどうかは l_open と u_open により指定する。
     *
     * | interval       | l_open | u_open |
     * |----------------|--------|--------|
     * | [lower, upper] | false  | false  |
     * | [lower, upper) | false  | true   |
     * | (lower, upper] | true   | false  |
     * | (lower, upper) | true   | true   |
     *
     * @param lower  区間の下限時刻
     * @param upper  区間の上限時刻
     * @param lower が区間にが含まれるとき false, 含まれないとき true
     * @param upper が区間にが含まれるとき false, 含まれないとき true
     */
    constructor( lower: Time, upper: Time, l_open: boolean = false, u_open: boolean = false )
    {
        this._lower  = lower;
        this._upper  = upper;
        this._l_open = l_open;
        this._u_open = u_open;
    }


    /**
     * 全時刻区間
     */
    static get
    UNIVERSAL() { return INTERVAL_UNIVERSAL; }


    /**
     * 下限時刻
     */
    get
    lower() { return this._lower; }


    /**
     * 上限時刻
     */
    get
    upper() { return this._upper; }


    /**
     * 下限時刻は除外されるか？
     */
    get
    l_open() { return this._l_open; }


    /**
     * 上限時刻は除外されるか？
     */
    get
    u_open() { return this._u_open; }


    /**
     * 空時刻区間か？
     *
     * this が空の時刻区間かどうかを返す。
     *
     * 空時刻区間の場合、区間内に 1 つも時刻が存在しない。
     *
     * @return 空時刻区間のとき true, それ以外のとき false
     */
    isEmpty(): boolean
    {
        let lower = this._lower;
        let upper = this._upper;

        return upper.lessThan( lower ) || upper.equals( lower ) && (this._l_open || this._u_open);
    }


    /**
     * 単一時刻区間か？
     *
     * this が単一時刻の時刻区間かどうかを返す。
     *
     * 単一時刻区間の場合、区間内にただ 1 つの時刻が存在する。
     *
     * 単一時刻区間であるなら lower == upper であり、逆は必ずしも成り立たない。
     *
     * @return 単一時刻区間のとき true, それ以外のとき false
     */
    isSingle(): boolean
    {
        return this._lower.equals( this._upper ) && !(this._l_open || this._u_open);
    }


    /**
     * 通常時刻区間か？
     *
     * this が通常の時刻区間かどうかを返す。
     *
     * 通常時刻区間の場合、区間内に無限個の時刻が存在する。
     *
     * 通常時刻区間であるなら lower < upper であり、逆も成り立つ。
     *
     * @return 通常時刻区間のとき true, それ以外のとき false
     */
    isProper(): boolean
    {
        return this._lower.lessThan( this._upper );
    }


    /**
     * 先行しているか？
     *
     * this のすべての時刻が rhs のすべての時刻より先行しているときに true, それ以外のときは false を返す。
     *
     * this または rhs のどちらか、または両方が空時刻区間のときは true を返す。
     *
     * @param rhs  時刻区間
     *
     * @return this が rhs に先行しているとき true, それ以外のとき false
     */
    precedes( rhs: Interval ): boolean
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
     * 包含しているか？
     *
     * rhs のすべての時刻が this に含まれるとき true, それ以外のときは false を返す。
     *
     * rhs が空時刻区間のときは true を返す。
     *
     * これは rhs ⊆ this と等価である。
     *
     * @param rhs  時刻区間
     *
     * @return this が rhs を包含しているとき true, それ以外のとき false
     */
    includes( rhs: Interval ): boolean
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
     * 時刻を包含しているか？
     *
     * rhs の時刻が this に含まれるとき true, それ以外のときは false を返す。
     *
     * このメソッドは this.includes( new Interval( rhs, rhs ) ) と同等である。
     *
     * @param rhs  時刻
     *
     * @return this が rhs を包含しているとき true, それ以外のとき false
     */
    includesTime( rhs: Time ): boolean
    {
        let lower = this._lower;
        let inc_l = lower.lessThan( rhs ) || lower.equals( rhs ) && !this._l_open;

        let upper = this._upper;
        let inc_u = rhs.lessThan( upper ) || rhs.equals( upper ) && !this._u_open;

        return inc_l && inc_u;
    }


    /**
     * 共通時刻区間は存在するか？
     *
     * !this.getIntersection( rhs ).isEmpty() と同じである。
     *
     * @param rhs  時刻区間
     *
     * @return 共通時刻区間
     *
     * @see [[Interval.getIntersection]]
     */
    hasIntersection( rhs: Interval ): boolean
    {
        // todo: オブジェクトを生成しないように最適化
        return !this.getIntersection( rhs ).isEmpty();
    }


    /**
     * 先行時刻区間を取得
     *
     * this のすべての時刻に対して、先の時刻となるすべての時刻を含む先行時刻区間を返す。
     *
     * this が空時刻区間のときは全時刻区間を返し、this
     *    に表現可能な最初の時刻が含まれるときは空時刻区間を返す。
     *
     * this.getPrecedings().precedes( this ) は常に true を返す。
     *
     * @return 先行時刻区間
     */
    getPrecedings(): Interval
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
     * 後続時刻区間を取得
     *
     * this のすべての時刻に対して、後の時刻となるすべての時刻を含む後続時刻区間を返す。
     *
     * this が空時刻区間のときは全時刻区間を返し、this
     *    に表現可能な最後の時刻が含まれるときは空時刻区間を返す。
     *
     * this.precedes( this.getFollowings() ) は常に true を返す。
     *
     * @return 後続時刻区間
     */
    getFollowings(): Interval
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
     * 共通時刻区間を取得
     *
     * this と rhs の共通時刻区間 (this ∩ rhs) を返す。
     *
     * this と rhs に共通の時刻が存在しなければ空時刻区間を返す。
     *
     * @param rhs  時刻区間
     *
     * @return 共通時刻区間
     *
     * @see [[Interval.hasIntersection]]
     */
    getIntersection( rhs: Interval ): Interval
    {
        // B = Lb ∩ Ub とするとき
        // A ∩ B = A ∩ Lb ∩ Ub

        // A ∩ Lb
        let cross = this._getIntersectionByLower( rhs._lower, rhs._l_open );
        // (A ∩ Lb) ∩ Ub
        return cross._getIntersectionByUpper( rhs._upper, rhs._u_open );
    }


    /**
     * 合併時刻区間を取得
     *
     * this と rhs を合併した時刻集合 (this ∪ rhs) を時刻区間の配列として返す。
     * 0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。
     *
     * 2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。
     *
     * @param rhs  時刻区間
     *
     * @return 合併時刻区間
     */
    getUnion( rhs: Interval ): Interval[]
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
     * 時刻区間の差を取得
     *
     * this から rhs を差し引いた時刻集合 (this - rhs) を時刻区間の配列として返す。
     *
     * 0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。
     *
     * 2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。
     *
     * @param rhs 時刻区間
     *
     * @return 時刻区間の差
     */
    getDifference( rhs: Interval ): Interval[]
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
     * 補時刻区間を取得
     *
     * 全時刻区間 から this を差し引いた時刻集合を時刻区間の配列として返す。
     *
     * 0 から 2 個の時刻区間を含む配列を返す。配列の要素に空時刻区間は含まれない。
     *
     * 2 要素の配列 v が返されたとき、v[0] と v[1] の間に時刻が存在し、さらに
     *    v[0].precedes( v[1] ) は true となる。
     *
     * @return 補時刻区間
     */
    getComplement(): Interval[]
    {
        return INTERVAL_UNIVERSAL.getDifference( this );
    }


    /**
     * 下限時刻区間との共通時刻区間を取得
     *
     * this ∩ Lower(bound, open) → Interval
     *
     * @param bound
     * @param open
     *
     * @return 共通時刻区間
     */
    private _getIntersectionByLower( bound: Time, open: boolean ): Interval
    {
        if ( bound.lessThan( this._lower ) || bound.equals( this._lower ) && this._l_open ) {
            return this;
        }
        else {
            return new Interval( bound, this._upper, open, this._u_open );
        }
    }


    /**
     * 上限時刻区間との共通時刻区間を取得
     *
     * this ∩ Upper(bound, open) → Interval
     *
     * @param bound
     * @param open
     *
     * @return 共通時刻区間
     */
    private _getIntersectionByUpper( bound: Time, open: boolean ): Interval
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
