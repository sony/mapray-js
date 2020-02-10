/**
 * @summary アニメーション時刻
 *
 * @classdesc
 * <p>アニメーションの時刻を表現するクラスである。</p>
 * <p>このクラスのインスタンスはイミュータブルである。</p>
 *
 * @memberof mapray.animation
 * @hideconstructor
 */
class Time
{

    /**
     * 非公開の構築子
     *
     * @param {number} ntime  数値時刻
     */
    constructor( ntime )
    {
        this._ntime = ntime;
    }


    /**
     * @summary 表現可能な最初の時刻
     *
     * @type {mapray.animation.Time}
     * @readonly
     */
    static get
    MIN_TIME() { return TIME_MIN_TIME; }


    /**
     * @summary 表現可能な最後の時刻
     *
     * @type {mapray.animation.Time}
     * @readonly
     */
    static get
    MAX_TIME() { return TIME_MAX_TIME; }


    /**
     * @summary 時刻に対応する数値の最小値
     *
     * @type {number}
     * @readonly
     */
    static get
    MIN_NTIME() { return TIME_MIN_NTIME; }


    /**
     * @summary 時刻に対応する数値の最大値
     *
     * @type {number}
     * @readonly
     */
    static get
    MAX_NTIME() { return TIME_MAX_NTIME; }


    /**
     * @summary 数値を時刻に変換
     *
     * @desc
     * <p>時刻に対応する数値から Time インスタンスを生成する。</p>
     * <p>条件: Time.MIN_NTIME <= ntime <= Time.MAX_NTIME</p>
     *
     * @param {number} ntime  時刻に対応する数値
     *
     * @return {mapray.animation.Time}  Time インスタンス
     */
    static
    fromNumber( ntime )
    {
        return new Time( ntime );
    }


    /**
     * @summary 時刻を数値に変換
     *
     * @desc
     * <p>this の時刻に対応する数値を取得する。</p>
     *
     * @return {number}  時刻に対応する数値
     */
    toNumber()
    {
        return this._ntime;
    }


    /** @summary 時刻の比較 (==)
     *
     * @desc
     * <p>this の時刻と rhs の時刻が同じとき true, それ以外のとき false を返す。</p>
     *
     * @param {mapray.animation.Time} rhs  時刻
     *
     * @return {boolean}  比較結果
     */
    equals( rhs )
    {
        return this._ntime == rhs._ntime;
    }


    /** @summary 時刻の比較 (<)
     *
     * @desc
     * <p>this の時刻が rhs の時刻より前のとき true, それ以外のとき false を返す。</p>
     *
     * @param {mapray.animation.Time} rhs  時刻
     *
     * @return {boolean}  比較結果
     */
    lessThan( rhs )
    {
        return this._ntime < rhs._ntime;
    }


    /** @summary 時刻の比較 (<=)
     *
     * @desc
     * <p>this の時刻が rhs の時刻より前または同じとき true, それ以外のとき false を返す。</p>
     *
     * @param {mapray.animation.Time} rhs  時刻
     *
     * @return {boolean}  比較結果
     */
    lessEqual( rhs )
    {
        return this._ntime <= rhs._ntime;
    }

}


const TIME_MIN_NTIME = -Number.MAX_VALUE;
const TIME_MAX_NTIME = +Number.MAX_VALUE;
const TIME_MIN_TIME  = Time.fromNumber( TIME_MIN_NTIME );
const TIME_MAX_TIME  = Time.fromNumber( TIME_MAX_NTIME );


export default Time;
