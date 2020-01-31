import Curve from "./Curve";
import Type from "./Type";
import Time from "./Time";
import Interval from "./Interval";
import Invariance from "./Invariance";
import AnimUtil from "./AnimUtil";
import AnimationError from "./AnimationError";


/**
 * @summary キーフレームによる線形関数
 *
 * @classdesc
 * <p>キーフレーム間を数値またはベクトルを線形に補間する関数である。</p>
 * <p>関数値の型は構築子のパラメータにより number, vector2, vector3 または vector4 を指定する。</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Curve
 */
class KFLinearCurve extends Curve
{

    /**
     * <p>type 型の関数を keyframes により生成する。</p>
     * <p>type は number, vector2, vector3 または vector4 を指定することができる。</p>
     * <p>keyframes を省略したときは type 型の既定値を返す定数関数と同等になる。keyframes の形式に関しては
     *    {@link mapray.animation.KFLinearCurve#setKeyFrames setKeyFrames()} を参照のこと。</p>
     *
     * @param {mapray.animation.Type} type  関数値の型
     * @param {object[]}       [keyframes]  初期キーフレーム
     */
    constructor( type, keyframes )
    {
        super();

        const dimension = AnimUtil.getDimension( type );
        if ( dimension == 0 ) {
            throw AnimationError( "unsupported type" );
        }

        this._value_type    = type;       // number | vector2 | vector3 | vector4
        this._dimension     = dimension;  // 1〜4
        this._num_keyframes = undefined;  // >= 2
        this._key_times     = undefined;  // Time[]
        this._key_values    = undefined;  // Float64Array

        if ( keyframes !== undefined ) {
            // 初期のキーフレームを設定
            this.setKeyFrames( keyframes );
        }
        else {
            // 既定のキーフレームを設定
            const t0 = Time.fromNumber( 0 );
            const t1 = Time.fromNumber( 1 );
            const dv = type.getDefaultValue();
            this.setKeyFrames( [t0, dv, t1, dv] );
        }
    }


    /**
     * @summary キーフレーム設定
     *
     * @desc
     * <p>keyframes により、すべてのキーフレームを指定する。</p>
     *
     * <p>
     * 条件1: keyframes.length >= 4 (キーフレーム数 >= 2)<br>
     * 条件2: すべての i, j において、i < j ⇔ 時刻i < 時刻j<br>
     * 条件3: すべての i において、値i は構築子の type 引数で指定した型のインスタンス
     * </p>
     *
     * @param {object[]} keyframes  [時刻0, 値0, 時刻1, 値1, ...]
     */
    setKeyFrames( keyframes )
    {
        const dimension = this._dimension;

        this._num_keyframes = keyframes.length / 2;
        this._key_times     = new Array( this._num_keyframes );
        this._key_values    = new Float64Array( this._num_keyframes * dimension );

        // キーフレームを設定
        for ( let ti = 0, vi = 0; ti < this._num_keyframes; ++ti, vi += dimension ) {
            const  time = keyframes[2*ti    ];
            const value = keyframes[2*ti + 1];

            // 時刻を配列に設定
            this._key_times[ti] = time;

            // 値を配列に設定
            if ( dimension == 1 ) {
                // スカラー
                this._key_values[vi] = value;
            }
            else {
                // ベクトル
                for ( let j = 0; j < dimension; ++j ) {
                    this._key_values[vi + j] = value[j];
                }
            }
        }

        // 全時刻の値が変化
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    /**
     * @override
     */
    isTypeSupported( type )
    {
        let from_type = this._value_type;
        return type.isConvertible( from_type );
    }


    /**
     * @override
     */
    getValue( time, type )
    {
        let from_type  = this._value_type;
        let from_value = this._getInterpolatedValue( time );
        return type.convertValue( from_type, from_value );
    }


    /**
     * @override
     */
    getInvariance( interval )
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
     * @summary time での補間値を取得
     *
     * @param {mapray.animation.Time} time
     *
     * @return {object}  補間値 (this._value_type に適応した型)
     *
     * @private
     */
    _getInterpolatedValue( time )
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
     * @summary キーフレーム値を生成
     *
     * @param {number} index  キーフレームのインデックス
     *
     * @return {object}  キーフレーム値 (this._value_type に適応した型)
     *
     * @private
     */
    _createKeyFrameValue( index )
    {
        const dimension  = this._dimension;
        const key_values = this._key_values;

        if ( dimension == 1 ) {
            // スカラー
            return key_values[index];
        }
        else {
            // ベクトル
            let  vi = dimension * index;
            let vec = new Float64Array( dimension );
            for ( let i = 0; i < dimension; ++i ) {
                vec[i] = key_values[vi + i];
            }
            return vec;
        }
    }


    /**
     * @summary キーフレーム間の補間値を生成
     *
     * @param {number} i0  先キーフレームのインデックス
     * @param {number} i1  後キーフレームのインデックス
     * @param {mapray.animation.Time} time
     *
     * @return {object}  補間値 (this._value_type に適応した型)
     *
     * @private
     */
    _createValueBy2Keys( i0, i1, time )
    {
        const x0 = this._key_times[i0].toNumber();
        const x1 = this._key_times[i1].toNumber();
        const r1 = (time.toNumber() - x0) / (x1 - x0);
        const r0 = 1 - r1;

        const dimension  = this._dimension;
        const key_values = this._key_values;

        if ( dimension == 1 ) {
            // スカラー
            return r0*key_values[i0] + r1*key_values[i1];
        }
        else {
            // ベクトル
            let vi0 = dimension * i0;
            let vi1 = dimension * i1;
            let vec = new Float64Array( dimension );
            for ( let i = 0; i < dimension; ++i ) {
                vec[i] = r0*key_values[vi0 + i] + r1*key_values[vi1 + i];
            }
            return vec;
        }
    }

}


export default KFLinearCurve;
