import Curve from "./Curve";
import Type from "./Type";
import Time from "./Time";
import Interval from "./Interval";
import Invariance from "./Invariance";
import AnimUtil from "./AnimUtil";


/**
 * @summary キーフレームによる階段関数
 *
 * @classdesc
 * <p>あるキーフレームから次のキーフレームの直前まで一定の値を返す階段関数である。</p>
 * <p>構築子により任意の関数値の型を指定することができる。</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Curve
 */
class KFStepCurve extends Curve
{

    /**
     * @desc
     * <p>type 型の階段関数を keyframes により生成する。</p>
     * <p>type は任意の型を指定することができる。</p>
     * <p>keyframes を省略したときは type 型の既定値を返す定数関数と同等になる。keyframes の形式に関しては
     *    {@link mapray.animation.KFStepCurve#setKeyFrames setKeyFrames()} を参照のこと。</p>
     *
     * @param {mapray.animation.Type} type  関数値の型
     * @param {object[]}       [keyframes]  初期キーフレーム
     */
    constructor( type, keyframes )
    {
        super();

        this._value_type    = type;       // any type
        this._num_keyframes = undefined;  // >= 1
        this._key_times     = undefined;  // Time[]
        this._key_values    = undefined;  // object[]

        if ( keyframes !== undefined ) {
            // 初期のキーフレームを設定
            this.setKeyFrames( keyframes );
        }
        else {
            // 既定のキーフレームを設定
            const t0 = Time.fromNumber( 0 );
            const dv = type.getDefaultValue();
            this.setKeyFrames( [t0, dv] );
        }
    }


    /**
     * @summary キーフレーム設定
     *
     * @desc
     * <p>keyframes により、すべてのキーフレームを指定する。</p>
     *
     * <p>
     * 条件1: keyframes.length >= 2 (キーフレーム数 >= 1)<br>
     * 条件2: すべての i, j において、i < j ⇔ 時刻i < 時刻j<br>
     * 条件3: すべての i において、値i は構築子の type 引数で指定した型のインスタンス
     * </p>
     *
     * @param {object[]} keyframes  [時刻0, 値0, 時刻1, 値1, ...]
     */
    setKeyFrames( keyframes )
    {
        this._num_keyframes = keyframes.length / 2;
        this._key_times     = new Array( this._num_keyframes );
        this._key_values    = new Array( this._num_keyframes );

        // キーフレームを設定
        for ( let i = 0; i < this._num_keyframes; ++i ) {
            const  time = keyframes[2*i    ];
            const value = keyframes[2*i + 1];

            this._key_times[i]  = time;
            this._key_values[i] = this._value_type.getCloneValue( value );
        }

        // 全時刻の値が変化
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    /**
     * @override
     */
    isTypeSupported( type )
    {
        const from_type = this._value_type;
        return type.isConvertible( from_type );
    }


    /**
     * @override
     */
    getValue( time, type )
    {
        const from_type  = this._value_type;
        const from_value = this._getInterpolatedValue( time );
        return type.convertValue( from_type, from_value );
    }


    /**
     * @override
     */
    getInvariance( interval )
    {
        if ( this._num_keyframes == 1 ) {
            // キーフレームが 1 個のときは ConstantCurve と同じく、全時間で一定値
            // (UNIVERSAL と非空区間は必ず交差するので interval の参照は不要)
            return new Invariance().write( Interval.UNIVERSAL );
        }
        else {
            // assert: this._num_keyframes >= 2
            const invr = new Invariance();

            // 最初から2番目のキー時刻より前は一定値
            const first = this._key_times[1];
            invr.write( new Interval( first, first ).getPrecedings() );

            // 最後のキー時刻とその後は一定値
            const lastL = this._key_times[this._num_keyframes - 2];
            const lastU = this._key_times[this._num_keyframes - 1];
            invr.write( new Interval( lastL, lastU, false, true ).getFollowings() );

            // interval 範囲に絞って返す
            return invr.getNarrowed( interval );
        }
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
        const found = AnimUtil.findKeyFrameIndex( time, this._key_times, 0, this._num_keyframes );

        // キー値のインデックス
        const index = (found > 0) ? found - 1 : 0;

        // 補間値を生成
        return this._value_type.getCloneValue( this._key_values[index] );
    }

}


export default KFStepCurve;
