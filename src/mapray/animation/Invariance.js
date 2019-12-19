import Interval from "./Interval";
import OrderedMap from "../OrderedMap";


/**
 * @summary アニメーション関数値の不変性情報
 *
 * @classdesc
 * <p>Curve のサブクラスの実装者が、アニメーション関数値が一定となる時刻区間を表明するために利用するクラスである。</p>
 *
 * @see {@link mapray.animation.Curve#getInvariance}
 *
 * @memberof mapray.animation
 */
class Invariance
{

    constructor()
    {
        this._imap = createEmptyMap();
    }


    /**
     * @summary 複製を取得
     *
     * @desc
     * <p>this と同じ内容のインスタンスを生成する。</p>
     *
     * <p>計算量: 時刻区間数 n に対して O(n)</p>
     *
     * @return {mapray.animation.Invariance}  this の複製
     */
    clone()
    {
        let cloned = new Invariance();

        // Time と Interval はイミュータブルなのでシャローコピーで十分
        cloned._imap = this._imap.clone();

        return cloned;
    }


    /**
     * @summary 同一値の時刻区間を上書き
     *
     * @desc
     * <p>this が持っているすべての同一値時刻区間に interval の時刻区間部分を上書きする。</p>
     *
     * <p>イメージ的には interval 部分に毎回新しい色を重ねていく。最終的にできた各色の区間を同一値の時刻区間と見なす。</p>
     *
     * @param {mapray.animation.Interval} interval  同一値を持つ時刻区間
     *
     * @return {mapray.animation.Invariance}  this
     */
    write( interval )
    {
        // todo: 計算量を分析 (remove() に依存)

        this.remove( interval );
        this._insert( interval );

        return this;
    }


    /**
     * @summary 時刻区間の消去
     *
     * @desc
     * <p>this が持っているすべての同一値時刻区間から interval の時刻区間部分を消去する。</p>
     *
     * <p>イメージ的には {@link mapray.animation.Invariance#write write()} で重ねた色の
     *    interval 部分を透明にする。</p>
     *
     * @param {mapray.animation.Interval} interval  時刻区間
     *
     * @return {mapray.animation.Invariance}  this
     */
    remove( interval )
    {
        // todo: 計算量を分析 (OrderMap#remove() に依存)

        if ( interval.isEmpty() ) {
            // 空時刻区間の消去は変化なし
            return this;
        }

        // interval.lower 半区間に内包される最初の要素 (無ければ null)
        let fit = interval.l_open ?
            this._imap.findUpper( interval.lower ) :
            this._imap.findLower( interval.lower );

        // fit に先行する要素 (無ければ null)
        let pfit = (fit !== null) ? fit.findPredecessor() : this._imap.findLast();
        this._chopItem( pfit, interval );

        if ( fit !== null && interval.includes( fit.value ) ) {
            // fit は interval に内包される最初の要素

            // interval の後続で最初の要素 (無ければ null)
            let it2 = interval.u_open ?
                this._imap.findLower( interval.upper ) :
                this._imap.findUpper( interval.upper );

            // it2 の先行 (非 null)
            let it1 = (it2 !== null) ? it2.findPredecessor() : this._imap.findLast();

            // fit の後続で interval に内包されない最初の要素 (無ければ null)
            let lit = interval.includes( it1.value ) ? it2 : it1;

            // interval に内包される要素をすべて削除
            this._imap.remove( fit, lit );

            // lit は interval と交差している可能性がある
            this._chopItem( lit, interval );
        }
        else {
            // interval はどの時刻区間も内包しない

            // fit は interval と交差している可能性がある
            this._chopItem( fit, interval );
        }

        return this;
    }


    /**
     * @summary 選択範囲に絞った不変性情報を取得
     *
     * @desc
     * <p>interval で指定した選択範囲と交差する一定値時刻区間を選択して、新しい不変性情報のインスタンスを返す。</p>
     *
     * @param {mapray.animation.Interval} narrow  選択範囲
     *
     * @return {mapray.animation.Invariance}  範囲を狭めた不変性情報
     */
    getNarrowed( narrow )
    {
        const invr = new Invariance();

        if ( narrow.isEmpty() ) {
            // 交差しないので空を返す
            return invr;
        }

        // narrow と交差する範囲を決定
        const lo1   = this._imap.findUpper( narrow.lower );
        const lo0   = (lo1 !== null) ? lo1.findPredecessor() : this._imap.findLast();
        const lower = (lo0 !== null && lo0.value.hasIntersection( narrow )) ? lo0 : lo1;

        const upper = narrow.u_open ?
              this._imap.findLower( narrow.upper ) : 
              this._imap.findUpper( narrow.upper );

        // invr へ [lower, upper) を追加
        for ( let it = lower; it !== upper; it = it.findSuccessor() ) {
            invr._imap.insert( it.key, it.value );
        }

        return invr;
    }


    /**
     * @summary 複数の Invariance を統合
     *
     * @desc
     * <p>invariances のすべての同一値時刻区間の共通区間を持った Invariance インスタンスを生成する。</p>
     *
     * @param {mapray.animation.Invariance[]} invariances  統合元のリスト
     *
     * @return {mapray.animation.Invariance}  統合結果
     */
    static
    merge( invariances )
    {
        let result = new Invariance();
        result.write( Interval.UNIVERSAL );

        for ( let source of invariances ) {
            result._merge_from_invariance( source );
        }

        return result;
    }


    /**
     * @summary 時刻区間の配列を取得
     *
     * @desc
     * <p>Proper の時刻区間が時刻順で格納された配列を返す。</p>
     *
     * @return {mapray.animation.Interval[]}  時刻区間の配列
     *
     * @package
     */
    _$getArray()
    {
        let array = [];

        for ( let it = this._imap.findFirst(); it !== null; it = it.findSuccessor() ) {
            array.push( it.value );
        }

        return array;
    }


    /**
     * @summary 不変性情報を修正
     *
     * @desc
     * <p>Curve#getInvariance() で得た一部の不変性情報 subinvr を元に this を更新する。</p>
     * <p>更新後の this は Curve インスタンス全体の不変性情報と一致することが期待される。</p>
     *
     * @param {mapray.animation.Invariance} subinvr  更新部分
     *
     * @package
     */
    _$modify( subinvr )
    {
        // subinvr の最初と最後
        let ita = subinvr._imap.findFirst();
        if ( ita === null ) {
            // subinvr は空なので変化なし
            return;
        }
        let itb = subinvr._imap.findLast();

        // subinvr の全範囲をくりぬく
        let ai = ita.value;
        let bi = itb.value;
        this.remove( new Interval( ai.lower, bi.upper, ai.l_open, bi.u_open ) );

        // subinvr のすべての時刻区間を挿入
        // 計算量: this の要素数 n, subinvr の要素数 m に対して O(m log n)
        for ( let it = ita; it !== null; it = it.findSuccessor() ) {
            this._insert( it.value );
        }
    }


    /**
     * @summary 時刻区間を整列により拡張
     *
     * @desc
     * <p>interval の端が this のある区間内にないなら、前または次の区間の境界まで拡大する。</p>
     *
     * <p>事前条件: !interval.isEmpty()</p>
     *
     * @param {mapray.animation.Interval} interval  拡大対象の時刻区間
     *
     * @return {mapray.animation.Interval}  拡大された時刻区間
     *
     * @package
     */
    _$expandIntervalByAlignment( interval )
    {
        const map = this._imap;

        // 左側
        let lower; // Interval
        {
            const it1 = map.findLower( interval.lower );
            if ( it1 !== null &&
                 it1.value.lower.equals( interval.lower ) &&
                 (interval.l_open || !it1.value.l_open) ) {
                // intervalの下限時刻 と it1 の下限時刻が一致し、
                // interval の左端時刻が it1 区間に含まれる
                lower = interval;
            }
            else {
                const it0 = (it1 !== null) ? it1.findPredecessor() : map.findLast();
                if ( it0 !== null ) {
                    if ( it0.value.hasIntersection( interval ) ) {
                        // interval の左端と it0 が交差する
                        lower = interval;
                    }
                    else {
                        // interval の左端と it0 が交差しない
                        lower = it0.value.getFollowings();
                    }
                }
                else {
                    // interval の左端と交差する区間はなく、その左側にも区間がない
                    lower = Interval.UNIVERSAL;
                }
            }
        }

        // 右側
        let upper; // Interval
        {
            const it1 = map.findLower( interval.upper );
            if ( it1 !== null &&
                 interval.upper.equals( it1.value.lower ) &&
                 (!interval.u_open || !it1.value.l_open) ) {
                // interval 上限時刻と it1 の下限時刻が一致し、
                // interval の右端時刻が it1 区間に含まれる
                upper = interval;
            }
            else {
                const it0 = (it1 !== null) ? it1.findPredecessor() : map.findLast();
                if ( it0 !== null &&
                     it0.value.hasIntersection( interval ) &&
                     (interval.upper.lessThan( it0.value.upper ) ||
                      interval.upper.equals( it0.value.upper ) &&
                      (interval.u_open || !it0.value.u_open)) ) {
                    // interval の右端と it0 が交差する
                    upper = interval;
                }
                else {
                    // interval の右端と it0 が交差しない
                    upper = (it1 !== null) ? it1.value.getPrecedings() : Interval.UNIVERSAL;
                }
            }
        }

        return new Interval( lower.lower,  upper.upper,
                             lower.l_open, upper.u_open );
    }


    /**
     * @summary item から interval 部分を削り取る
     *
     * @desc
     * <p>item の時刻区間から interval 部分を消去する。</p>
     * <p>ただし item が null のときは何もしない。</p>
     * <p>最後に item は無効になる。</p>
     *
     * @param {?mapray.OrderedMap.Item}   item
     * @param {mapray.animation.Interval} interval
     *
     * @private
     */
    _chopItem( item, interval )
    {
        if ( item === null ) {
            // 何もしない
            return;
        }

        let diffs = item.value.getDifference( interval );

        // 削った時刻区間を入れ替え
        this._imap.remove( item );

        for ( let di of diffs ) {
            if ( di.isProper() ) {
                this._imap.insert( di.lower, di );
            }
        }
    }


    /**
     * @summary 時刻区間を挿入
     *
     * @desc
     * <p>条件: this._imap に interval と交差する区間が存在しない</p>
     *
     * <p>計算量: 時刻区間数 n に対して最悪 O(log n)</p>
     *
     * @param {mapray.animation.Interval} interval  時刻区間
     *
     * @private
     */
    _insert( interval )
    {
        if ( !interval.isProper() ) {
            // Empty と Single の時刻区間は保持しない
            return;
        }

        this._imap.insert( interval.lower, interval );
    }


    /**
     * @summary Invariance を統合
     *
     * 計算量:
     *   this の時刻区間数 k
     *   source の時刻区間数 n
     *   this の各時刻区間範囲内の source の時刻区間数 m　(平均値)
     *   merged_imap の時刻区間数 p
     *
     * findSuccessor() を O(1) と考えたとき
     *   O(k * (m * log p + log n))
     *
     * @param {mapray.animation.Invariance} source
     *
     * @private
     */
    _merge_from_invariance( source )
    {
        let merged_imap = createEmptyMap();

        for ( let target = this._imap.findFirst(); target !== null; target = target.findSuccessor() ) {
            mergeIntervalInvariance( target.value, source, merged_imap );
        }

        this._imap = merged_imap;
    }

}


/**
 * @summary _merge_from_invariance() の一部
 *
 * 計算量:
 *   source の時刻区間数 n
 *   tgtIv 範囲内の source 時刻区間数 m
 *   merged_imap の時刻区間数 p
 *
 * findSuccessor() を O(1) と考えたとき
 *   O(m * log p + log n)
 *   
 * @param {mapray.animation.Interval}    tgtIv  時刻区間
 * @param {mapray.animation.Invariance} source
 * @param {mapray.OrderedMap}      merged_imap
 *
 * @private
 */
function
mergeIntervalInvariance( tgtIv, source, merged_imap )
{
    let src_imap = source._imap;

    // tgtIv の範囲の source 内の時刻区間を決定
    // 計算量: source の時刻区間数 n に対して O(log n)
    let lower = src_imap.findLower( tgtIv.lower );
    let fit = (lower !== null) ? lower.findPredecessor() : null;
    if ( fit === null ) {
        fit = src_imap.findFirst();
    }
    let lit = src_imap.findUpper( tgtIv.upper );

    // fit から lit までの時刻区間と tgtIv との交差を merged_imap へ追加
    // 計算量: merged_imap の時刻区間数 p, tgtIv 範囲内の source 時刻区間数 m
    // に対して最悪 O(m * log n * log p)
    for ( let it = fit; it !== lit; it = it.findSuccessor() ) {
        let srcIv = it.value;
        let cross = tgtIv.getIntersection( srcIv );
        if ( cross.isProper() ) {
            merged_imap.insert( cross.lower, cross );
        }
    }
}


/** 
 * @summary 空の時刻区間マップを生成
 *
 * @desc
 * Proper 時刻区間が交差せず、時刻順に並んでいる
 * この条件では時刻区間の下限時刻をキーとして整列できる
 *
 * @return {mapray.OrderedMap}
 *
 * @private
 */
function
createEmptyMap()
{
    return new OrderedMap( (a, b) => a.lessThan( b ) );
}


export default Invariance;
