import GeoMath, { Vector4 } from "../GeoMath";

import Curve from "./Curve";
import Type from "./Type";
import Time from "./Time";
import Interval from "./Interval";
import Invariance from "./Invariance";
import AnimUtil from "./AnimUtil";

/**
 * キーフレームによる四元数関数
 *
 * キーフレーム間を四元数を補間する関数である。
 *
 * 関数値の型は vector4 を指定する。
 */
class KFQuatLinearCurve extends Curve
{
    /** >= 2 */
    private _num_keyframes!: number;

    private _key_times!: Time[];

    private _key_values!: Float64Array;

    /**
     * vector4 型の関数を keyframes により生成する。
     *
     * keyframes を省略したときは vector4 型の既定値を返す定数関数と同等になる。keyframes の形式に関しては
     *    [[KFQuatLinearCurve.setKeyFrames setKeyFrames()]] を参照のこと。
     *
     * @param {object[]}       [keyframes]  初期キーフレーム
     */
    constructor( keyframes?: Vector4[]) {
        super();

        if ( keyframes !== undefined ) {
            // 初期のキーフレームを設定
            this.setKeyFrames( keyframes );
        }
        else {
            // 既定のキーフレームを設定
            const t0 = Time.fromNumber( 0 );
            const t1 = Time.fromNumber( 1 );
            const dv = Type.find("vector4").getDefaultValue();
            this.setKeyFrames( [t0, dv, t1, dv] );
        }
    }

    /**
     * キーフレーム設定
     *
     * keyframes により、すべてのキーフレームを指定する。
     *
     * 条件
     * - keyframes.length >= 4 (キーフレーム数 >= 2)
     * -: すべての i, j において、i < j ⇔ 時刻i < 時刻j
     * -: すべての i において、値i は vector4 型のインスタンス
     *
     * @param {object[]} keyframes  [時刻0, 値0, 時刻1, 値1, ...]
     */
    setKeyFrames( keyframes: any )
    {
        const dimension = 4;
        this._num_keyframes = keyframes.length / 2;
        this._key_times     = new Array( this._num_keyframes );
        this._key_values    = new Float64Array( this._num_keyframes * dimension );

        // キーフレームを設定
        for ( let ti = 0, vi = 0; ti < this._num_keyframes; ++ti, vi += dimension ) {
            const  time = keyframes[2*ti    ];
            const value = keyframes[2*ti + 1];

            // 時刻を配列に設定
            this._key_times[ti] = time;
            for ( let j = 0; j < dimension; ++j ) {
                this._key_values[vi + j] = value[j];
            }
        }

        // 全時刻の値が変化
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    override isTypeSupported( type: Type )
    {
        return type.isConvertible( Type.find("vector4") );
    }


    override getValue( time: Time)
    {
        return this._getInterpolatedValue( time );
    }


    override getInvariance( interval: Interval ): Invariance
    {
        const first_time = this._key_times[0];
        const  last_time = this._key_times[this._num_keyframes - 1];
        const ival_inner = new Interval( first_time, last_time, true, true );

        // 全体の不変性情報 (2区間程度なので毎回生成)
        const invr_full = new Invariance();
        invr_full.write( ival_inner.getPrecedings() );  // 最初のキーの時刻とその前の区間
        invr_full.write( ival_inner.getFollowings() );  // 最後のキーの時刻とその後の区間

        // interval 範囲に絞って返す
        return invr_full.getNarrowed( interval );
    }


    /**
     * time での補間値を取得
     *
     * @param time
     *
     * @return 補間値 (vector4)
     */
    private _getInterpolatedValue( time: Time ): any
    {
        // this._key_times に time より後の時刻が存在すれば、その中で最小のインデックス
        // そのような時刻が存在しなければ this._num_keyframes
        const index = AnimUtil.findKeyFrameIndex( time, this._key_times, 0, this._num_keyframes );

        if ( index == 0 ) {
            // time が最初のキー時刻と同じか、その前のときは最初のキー値で一定
            return this._createKeyFrameValue( 0 );
        }
        else if ( index == this._num_keyframes ) {
            // time が最後のキー時刻と同じか、その後のときは最後のキー値で一定
            return this._createKeyFrameValue( index - 1 );
        }
        else {
            // その他のときは前後のキー値で線形補間
            return this._createValueBy2Keys( index - 1, index, time );
        }
    }


    /**
     * キーフレーム値を生成
     *
     * @param index  キーフレームのインデックス
     *
     * @return キーフレーム値 (vector4)
     */
    private _createKeyFrameValue( index: number )
    {
        const dimension  = 4;
        const key_values = this._key_values;

        const  vi = dimension * index;
        const vec = new Float64Array( dimension );
        for ( let i = 0; i < dimension; ++i ) {
            vec[i] = key_values[vi + i];
        }
        return vec;
    }


    /**
     * キーフレーム間の補間値を生成
     *
     * @param i0  先キーフレームのインデックス
     * @param i1  後キーフレームのインデックス
     * @param time
     *
     * @return 補間値 (vector4)
     */
    private _createValueBy2Keys( i0: number, i1: number, time: Time ): any
    {
        const x0 = this._key_times[i0].toNumber();
        const x1 = this._key_times[i1].toNumber();
        const t = ( time.toNumber() - x0 ) / ( x1 - x0 );

        const key_values = this._key_values;

        const idx0 = i0 * 4;
        const idx1 = i1 * 4;

        const q1 = key_values.slice( idx0, idx0 + 4 );
        const q2 = key_values.slice( idx1, idx1 + 4 );

        return GeoMath.slerp_quat(q1, q2, t, GeoMath.createVector4());
    }
}

export default KFQuatLinearCurve;

