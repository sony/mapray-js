import Type from "./Type";


/**
 * @summary アニメーション実装者用のユーティリティ
 *
 * @hideconstructor
 * @memberof mapray.animation
 *
 * @private
 */
class AnimUtil
{

    /**
     * @summary type の次元を取得
     *
     * @desc
     * <p>type が number のとき 1, vector2, vector3, vector4
     *    のときはベクトルの次数を返す。それ以外の型のときは 0 を返す。<p>
     *
     * @param {mapray.animation.Type} type
     *
     * @return {number}  type の次元、type が非対応のときは 0
     */
    static
    getDimension( type )
    {
        if ( Type.find( "number" ) === type ) {
            // スカラーは 1
            return 1;
        }
        else if ( Type.find( "vector2" ) === type ) {
            return 2;
        }
        else if ( Type.find( "vector3" ) === type ) {
            return 3;
        }
        else if ( Type.find( "vector4" ) === type ) {
            return 4;
        }
        else {
            // 非対応の型
            return 0;
        }
    }


    /**
     * @summary キーフレームのインデックスを検索
     *
     * @desc
     * <p>key_times の [lower, upper) の範囲に time より後の時刻が存在すれば、その中で最小のインデックスを返す。
     *    そのような時刻が存在しなければ upper を返す。</p>
     *
     * <p>返された値を i, key_times を k とすると time の位置は次のように解釈できる。</p>
     * <pre>
     *   i == lower のとき: time < k[i]
     *   i == upper のとき: k[i-1] <= time
     *   それ以外のとき: k[i-1] <= time < k[i]
     * </pre>
     *
     * <p>事前条件: upper - lower >= 1</p>
     *
     * <p>計算量: upper - lower を n とするとき、O(log n)</p>
     *
     * @param {mapray.animation.Time}   time       検索キー
     * @param {mapray.animation.Time[]} key_times  検索対象配列
     * @param {number}                  lower      下限インデックス
     * @param {number}                  upper      上限インデックス
     *
     * @return {number}  検索されたインデックス
     */
    static
    findKeyFrameIndex( time, key_times, lower, upper )
    {
        let l_idx = lower;
        let u_idx = upper;

        for (;;) {
            if ( u_idx - l_idx >= 2 ) {
                let m_idx  = Math.floor( (l_idx + u_idx) / 2 );  // 中間インデックス
                let m_time = key_times[m_idx];

                if ( m_time.lessThan( time ) ) {
                    // m_time < time なので [m_idx, u_idx) に存在するかもしれない
                    l_idx = m_idx;
                }
                else if ( time.lessThan( m_time ) ) {
                    // m_time > time なので [l_idx, m_idx) を確認
                    u_idx = m_idx;
                }
                else {
                    // m_time == time なので m_idx の次が結果になる
                    return m_idx + 1;
                }
            }
            else {
                // u_idx - l_idx == 1
                let l_time = key_times[l_idx];
                return time.lessThan( l_time ) ? l_idx : u_idx;
            }
        }

        return 0; // 警告回避
    }


    /**
     * @summary 最初にサポートする型を検索
     *
     * @desc
     * <p>types の中で curve がサポートする最初の型を返す。</p>
     * <p>types に curve がサポートする型が存在しなければ null を返す。</p>
     *
     * @param {mapray.animation.Curve}           curve
     * @param {iterable.<mapray.animation.Type>} types
     *
     * @return {?mapray.animation.Type}
     */
    static
    findFirstTypeSupported( curve, types )
    {
        for ( let type of types ) {
            if ( curve.isTypeSupported( type ) ) {
                return type;
            }
        }
        return null;
    }

}


export default AnimUtil;
