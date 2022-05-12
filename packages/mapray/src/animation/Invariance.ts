import Time from "./Time";
import Curve from "./Curve";
import Interval from "./Interval";
import OrderedMap from "../OrderedMap";


/**
 * アニメーション関数値の不変性情報
 *
 * Curve のサブクラスの実装者が、アニメーション関数値が一定となる時刻区間を表明するために利用するクラスである。
 *
 * @see [[Curve.getInvariance]]
 */
class Invariance
{

    private _imap: OrderedMap<Time, Interval>;


    constructor()
    {
        this._imap = createEmptyMap();
    }


    /**
     * 複製を取得
     *
     * this と同じ内容のインスタンスを生成する。
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
     * 同一値の時刻区間を上書き
     *
     * this が持っているすべての同一値時刻区間に interval の時刻区間部分を上書きする。
     *
     * イメージ的には interval 部分に毎回新しい色を重ねていく。最終的にできた各色の区間を同一値の時刻区間と見なす。
     *
     * @param interval  同一値を持つ時刻区間
     *
     * @return this
     */
    write( interval: Interval ): Invariance
    {
        // todo: 計算量を分析 (remove() に依存)

        this.remove( interval );
        this._insert( interval );

        return this;
    }


    /**
     * 時刻区間の消去
     *
     * this が持っているすべての同一値時刻区間から interval の時刻区間部分を消去する。
     *
     * イメージ的には {@link mapray.animation.Invariance#write write()} で重ねた色の
     *    interval 部分を透明にする。
     *
     * @param interval  時刻区間
     *
     * @return this
     */
    remove( interval: Interval ): Invariance
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
            let it1 = ((it2 !== null) ? it2.findPredecessor() : this._imap.findLast()) as OrderedMap.Item<Time, Interval>;

            // fit の後続で interval に内包されない最初の要素 (無ければ null)
            let lit = interval.includes( it1.value ) ? it2 : it1;

            // interval に内包される要素をすべて削除
            this._imap.remove( fit, lit || undefined );

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
     * 選択範囲に絞った不変性情報を取得
     *
     * interval で指定した選択範囲と交差する一定値時刻区間を選択して、新しい不変性情報のインスタンスを返す。
     *
     * @param narrow  選択範囲
     *
     * @return 範囲を狭めた不変性情報
     */
    getNarrowed( narrow: Interval ): Invariance
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
        // @ts-ignore
        for ( let it = lower; it !== upper; it = it.findSuccessor() ) {
            // @ts-ignore
            invr._imap.insert( it.key, it.value );
        }

        return invr;
    }


    /**
     * 複数の Invariance を統合
     *
     * invariances のすべての同一値時刻区間の共通区間を持った Invariance インスタンスを生成する。
     *
     * @param invariances  統合元のリスト
     *
     * @return 統合結果
     */
    static merge( invariances: Invariance[] ): Invariance
    {
        let result = new Invariance();
        result.write( Interval.UNIVERSAL );

        for ( let source of invariances ) {
            result._merge_from_invariance( source );
        }

        return result;
    }


    /**
     * 時刻区間の配列を取得
     *
     * Proper の時刻区間が時刻順で格納された配列を返す。
     *
     * @return  時刻区間の配列
     *
     * @internal
     */
    _$getArray(): Interval[]
    {
        let array = [];

        for ( let it = this._imap.findFirst(); it !== null; it = it.findSuccessor() ) {
            array.push( it.value );
        }

        return array;
    }


    /**
     * 不変性情報を修正
     *
     * [[Curve.getInvariance Curve.getInvariance()]] で得た一部の不変性情報 subinvr を元に this を更新する。
     *
     * 更新後の this は Curve インスタンス全体の不変性情報と一致することが期待される。
     *
     * @param subinvr  更新部分
     *
     * @internal
     */
    _$modify( subinvr: Invariance )
    {
        // subinvr の最初と最後
        let ita = subinvr._imap.findFirst();
        if ( ita === null ) {
            // subinvr は空なので変化なし
            return;
        }
        let itb = subinvr._imap.findLast() as OrderedMap.Item<Time, Interval>;

        // subinvr の全範囲をくりぬく
        let ai = ita.value;
        let bi = itb.value;
        this.remove( new Interval( ai.lower, bi.upper, ai.l_open, bi.u_open ) );

        // subinvr のすべての時刻区間を挿入
        // 計算量: this の要素数 n, subinvr の要素数 m に対して O(m log n)
        // @ts-ignore
        for ( let it = ita; it !== null; it = it.findSuccessor() ) {
            this._insert( it.value );
        }
    }


    /**
     * 時刻区間を整列により拡張
     *
     * interval の端が this のある区間内にないなら、前または次の区間の境界まで拡大する。
     *
     * 事前条件: !interval.isEmpty()
     *
     * @param interval  拡大対象の時刻区間
     *
     * @return 拡大された時刻区間
     * @internal
     */
    _$expandIntervalByAlignment( interval: Interval ): Interval
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
     * item から interval 部分を削り取る
     *
     * item の時刻区間から interval 部分を消去する。
     *
     * ただし item が null のときは何もしない。
     *
     * 最後に item は無効になる。
     *
     * @param item
     * @param interval
     */
    private _chopItem( item: OrderedMap.Item<Time, Interval> | null, interval: Interval )
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
     * 時刻区間を挿入
     *
     * 条件: this._imap に interval と交差する区間が存在しない
     *
     * 計算量: 時刻区間数 n に対して最悪 O(log n)
     *
     * @param interval  時刻区間
     */
    private _insert( interval: Interval )
    {
        if ( !interval.isProper() ) {
            // Empty と Single の時刻区間は保持しない
            return;
        }

        this._imap.insert( interval.lower, interval );
    }


    /**
     * Invariance を統合
     *
     * 計算量:
     *   this の時刻区間数 k
     *   source の時刻区間数 n
     *   this の各時刻区間範囲内の source の時刻区間数 m (平均値)
     *   merged_imap の時刻区間数 p
     *
     * findSuccessor() を O(1) と考えたとき
     *   O(k * (m * log p + log n))
     *
     * @param source
     */
    private _merge_from_invariance( source: Invariance )
    {
        let merged_imap = createEmptyMap();

        for ( let target = this._imap.findFirst(); target !== null; target = target.findSuccessor() ) {
            mergeIntervalInvariance( target.value, source, merged_imap );
        }

        this._imap = merged_imap;
    }

}


/**
 * _merge_from_invariance() の一部
 *
 * 計算量:
 *   source の時刻区間数 n
 *   tgtIv 範囲内の source 時刻区間数 m
 *   merged_imap の時刻区間数 p
 *
 * findSuccessor() を O(1) と考えたとき
 *   O(m * log p + log n)
 *   
 * @param tgtIv  時刻区間
 * @param source
 * @param merged_imap
 */
function
mergeIntervalInvariance( tgtIv: Interval, source: Invariance, merged_imap: OrderedMap<Time, Interval> )
{
    // @ts-ignore
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
    // @ts-ignore
    for ( let it = fit; it !== lit; it = it.findSuccessor() ) {
        // @ts-ignore
        let srcIv = it.value;
        let cross = tgtIv.getIntersection( srcIv );
        if ( cross.isProper() ) {
            merged_imap.insert( cross.lower, cross );
        }
    }
}


/** 
 * 空の時刻区間マップを生成
 *
 * Proper 時刻区間が交差せず、時刻順に並んでいる
 * この条件では時刻区間の下限時刻をキーとして整列できる
 */
function
createEmptyMap()
{
    return new OrderedMap<Time, Interval>( (a: Time, b: Time) => a.lessThan( b ) );
}


export default Invariance;
