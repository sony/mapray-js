/**
 * アニメーション時刻
 *
 * アニメーションの時刻を表現するクラスである。
 *
 * このクラスのインスタンスはイミュータブルである。
 */
class Time
{

    private _ntime: number;

    /**
     * 非公開の構築子
     *
     * @param ntime  数値時刻
     */
    private constructor( ntime: number )
    {
        this._ntime = ntime;
    }


    /**
     * 表現可能な最初の時刻
     */
    static get
    MIN_TIME(): Time { return TIME_MIN_TIME; }


    /**
     * 表現可能な最後の時刻
     */
    static get
    MAX_TIME(): Time { return TIME_MAX_TIME; }


    /**
     * 時刻に対応する数値の最小値
     */
    static get
    MIN_NTIME(): number { return TIME_MIN_NTIME; }


    /**
     * 時刻に対応する数値の最大値
     */
    static get
    MAX_NTIME(): number { return TIME_MAX_NTIME; }


    /**
     * 数値を時刻に変換
     *
     * 時刻に対応する数値から Time インスタンスを生成する。
     *
     * 条件: Time.MIN_NTIME <= ntime <= Time.MAX_NTIME
     *
     * @param ntime  時刻に対応する数値
     *
     * @return Time インスタンス
     */
    static fromNumber( ntime: number ): Time
    {
        return new Time( ntime );
    }


    /**
     * 時刻を数値に変換
     *
     * this の時刻に対応する数値を取得する。
     *
     * @return 時刻に対応する数値
     */
    toNumber(): number
    {
        return this._ntime;
    }


    /** 
     * 時刻の比較 (==)
     *
     * this の時刻と rhs の時刻が同じとき true, それ以外のとき false を返す。
     *
     * @param rhs  時刻
     *
     * @return 比較結果
     */
    equals( rhs: Time ): boolean
    {
        return this._ntime == rhs._ntime;
    }


    /**
     * 時刻の比較 (<)
     *
     * this の時刻が rhs の時刻より前のとき true, それ以外のとき false を返す。
     *
     * @param rhs  時刻
     *
     * @return 比較結果
     */
    lessThan( rhs: Time ): boolean
    {
        return this._ntime < rhs._ntime;
    }


    /** 
     * 時刻の比較 (<=)
     *
     * this の時刻が rhs の時刻より前または同じとき true, それ以外のとき false を返す。
     *
     * @param rhs  時刻
     *
     * @return 比較結果
     */
    lessEqual( rhs: Time ): boolean
    {
        return this._ntime <= rhs._ntime;
    }

}


const TIME_MIN_NTIME = -Number.MAX_VALUE;
const TIME_MAX_NTIME = +Number.MAX_VALUE;
const TIME_MIN_TIME  = Time.fromNumber( TIME_MIN_NTIME );
const TIME_MAX_TIME  = Time.fromNumber( TIME_MAX_NTIME );


export default Time;
