import Time from "./Time";
import Binder from "./Binder";
import Interval from "./Interval";
import Curve from "./Curve";
import Invariance from "./Invariance";
import OrderedMap from "../OrderedMap";


/**
 * アニメーションパラメータの更新管理
 *
 * アニメーション関数と結合しているアニメーションパラメータを更新するための機能を提供する。
 */
class Updater
{

    /** 前回更新した時刻 (一度も更新していないときは null) */
    private _prev_time: Time | null;

    /** Curve -> Tracked 辞書 */
    private _track_binders: Map<Curve, Tracked>;

    /**
     * パラメータがまだ更新されていない、またはアニメーション関数値と
     * 矛盾する可能性のある Binder インスタンス
     */
    private _dirty_binders: Set<Binder>;

    /** 関数値が変化した Curve を管理 */
    private _vary_curves: VaryCurves;


    /**
     */
    constructor()
    {
        this._prev_time = null;

        this._track_binders = new Map<Curve, Tracked>();

        this._dirty_binders = new Set<Binder>();

        this._vary_curves = new VaryCurves();
    }


    /**
     * アニメーションパラメータを更新
     *
     * 時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。
     *
     * @param time  時刻
     */
    update( time: Time )
    {
        this._update_dirty_binders( time );

        if ( this._prev_time !== null ) {
            const vary_curves = this._vary_curves.getVaryCurves( this._prev_time, time );
            for ( let curve of vary_curves ) {
                let tracked = this._track_binders.get( curve ) as Tracked;
                tracked.updateBinders( time );
            }
        }

        this._flush_dirty_binders();

        // 前回の時刻を更新
        this._prev_time = time;
    }


    /**
     * Binder インスタンスの登録
     *
     * 事前条件: binder は this で管理されていない
     *
     * @internal
     */
    _$register( binder: Binder )
    {
        // 最初は dirty_binders に登録
        this._dirty_binders.add( binder );
    }


    /**
     * Binder インスタンスの抹消
     *
     * 事前条件: binder は this で管理されている
     *
     * @internal
     */
    _$unregister( binder: Binder )
    {
        if ( this._dirty_binders.delete( binder ) ) {
            // binder は dirty_binders 側に存在していた
        }
        else {
            // binder は track_binders 側に存在する
            let tracked = this._track_binders.get( binder._$curve ) as Tracked;
            tracked.unregister( binder );
        }
    }

    get _$track_binders() {
        return this._track_binders;
    }


    get _$dirty_binders() {
        return this._dirty_binders;
    }


    get _$prev_time() {
        return this._prev_time;
    }


    get _$vary_curves() {
        return this._vary_curves;
    }


    /**
     * _dirty_binders のすべてのパラメータを更新
     *
     * @param time
     */
    private _update_dirty_binders( time: Time )
    {
        for ( let binder of this._dirty_binders ) {
            binder._$update( time );
        }
    }


    /**
     * _dirty_binders から _track_binders へ Binder を移動
     */
    private _flush_dirty_binders()
    {
        for ( let binder of Array.from( this._dirty_binders ) ) {
            // dirty_binders から binder を削除
            this._dirty_binders.delete( binder );

            // track_binders へ binder を追加
            let   curve = binder._$curve;
            let tracked = this._track_binders.get( curve );

            if ( tracked === undefined ) {
                // curve を使っている Binder インスタンスが初めて登録される
                tracked = new Tracked( this, curve, binder );
                this._track_binders.set( curve, tracked );
            }
            else {
                // 2つ目以降の Binder インスタンス
                tracked.register( binder );
            }
        }
    }

}


/**
 * 追跡されたバインダ
 *
 * @internal
 */
class Tracked {

    private _updater: Updater;

    private _curve: Curve;

    private _binders: Set<Binder>;

    private _invariance: Invariance;

    private _listener: Curve.ValueChangeListener;


    /**
     * updater._track_binders に追加されるときに呼び出される。
     *
     * updater._vary_curves も更新する。
     *
     * @param updater      this を管理する Updater インスタンス
     * @param curve        対象とする Curve インスタンス
     * @param init_binder  最初の Binder インスタンス
     */
    constructor( updater: Updater, curve: Curve, init_binder: Binder )
    {
        this._updater = updater;
        this._curve   = curve;

        // curve と結合している Binder インスタンスの集合
        this._binders = new Set( [init_binder] );

        // curve の現在の不変性
        this._invariance = curve.getInvariance( Interval.UNIVERSAL );

        // アニメーション関数値の変更管理
        this._listener = interval => { this._onValueChange( interval ); };
        curve.addValueChangeListener( this._listener );

        // vary_curves に curve を追加
        updater._$vary_curves.addCurve( curve, this._invariance );
    }


    /**
     * Curve を持つ Binder を登録
     *
     * @param binder
     */
    register( binder: Binder )
    {
        // Assert: !this._binders.has( binder )
        this._binders.add( binder );
    }


    /**
     * Curve を持つ Binder を抹消
     *
     * this が updater._track_binders から削除されることがある。
     *
     * curve が updater._vary_curves から削除されることがある。
     *
     * @param binder
     */
    unregister( binder: Binder )
    {
        // Assert: this._binders.has( binder )
        this._binders.delete( binder );

        if ( this._binders.size > 0 ) {
            // まだ this._curve と関連した Binder インスタンスが this に存在する
            return;
        }

        // this._curve と関連した唯一の Binder インスタンスが this から削除された

        // vary_curves から curve を削除
        this._updater._$vary_curves.removeCurve( this._curve, this._invariance );

        // 変更を追跡する必要はなくなったのでリスナーを削除
        this._curve.removeValueChangeListener( this._listener );

        // this を this._updater から削除
        this._updater._$track_binders.delete( this._curve );
    }


    /**
     * アニメーションパラメータを更新
     *
     * 時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。
     *
     * @param time  時刻
     */
    updateBinders( time: Time )
    {
        for ( let binder of this._binders ) {
            binder._$update( time );
        }
    }


    /**
     * アニメーション間数値が変更された
     *
     * @param chg_ival  変更された時刻区間
     */
    private _onValueChange( chg_ival: Interval )
    {
        // assert: !chg_ival.isEmpty()
        // assert: this._updater._prev_time != null

        if ( chg_ival.includesTime( this._updater._$prev_time as Time ) ) {
            // 現在設定されているパラメータ値と矛盾が生じる
            // this._binders を dirty_binders に移動
            this._move_to_dirty_binders();
        }
        else {
            // 不変性情報を部分的に更新
            let subinvr = this._curve.getInvariance( chg_ival );
            this._updater._$vary_curves.modifyCurve( this._curve, chg_ival, subinvr, this._invariance );
            this._invariance._$modify( subinvr );
        }
    }


    /**
     * this を dirty_binders に移動
     *
     * this は updater._track_binders, updater._vary_curves から削除される。
     */
    private _move_to_dirty_binders()
    {
        for ( let binder of Array.from( this._binders ) ) {
            // this から binder を削除
            this.unregister( binder );
            // dirty_binders に binder を追加
            this._updater._$dirty_binders.add( binder );
        }
    }

}


/**
 * 時刻間での関数値が変化した Curve を得る
 * @internal
 */
class VaryCurves {

    /**
     * 連続変化の時刻区間 (すべて Proper)
     * - 外から内部に入る、内部で動くとき変化する
     * - 下限が '[' のとき、左から下限に入る、下限から左へ出るとき変化する
     * - 上限が ']' のとき、右から上限に入る、上限から右へ出るとき変化する
     */
    private _continuous: OrderedMap<Time, ContCurves>;

    private _oneshot: OrderedMap<Time, Set<Curve>>;

    private _oneshot_L: OrderedMap<Time, Set<Curve>>;

    private _oneshot_R: OrderedMap<Time, Set<Curve>>;


    /**
     */
    constructor()
    {
        this._continuous = createTimeMap<ContCurves>();

        // 単発変化の時刻 []
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、点に入る、点から出るとき変化する
        this._oneshot = createTimeMap<Set<Curve>>();

        // 単発変化の時刻 [)
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、左から点に入る、点から左へ出るとき変化する
        this._oneshot_L = createTimeMap<Set<Curve>>();

        // 単発変化の時刻 (]
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、右から点に入る、点から右へ出るとき変化する
        this._oneshot_R = createTimeMap<Set<Curve>>();
    }


    /**
     * Curve を追加
     *
     * データベースに不変性が invariance である curve を追加する。
     *
     * 事前条件: curve は filter 内に存在しない
     *
     * @param curve     追加する Curve インスタンス
     * @param invariance  curve の不変性情報
     * @param filter   追加する時刻区間 (前回の不変性情報で整列済み)
     */
    addCurve( curve: Curve, invariance: Invariance, filter: Interval = Interval.UNIVERSAL )
    {
        const invr_ivals = invariance.getNarrowed( filter )._$getArray();

        if ( invr_ivals.length == 0 ) {
            // 全時刻区間が変化
            this._addToGeneric( curve, filter );
        }
        else {
            // 不変区間が存在する場合
            const lastIndex = invr_ivals.length - 1;

            // 最初
            {
                const invr_ival = invr_ivals[0];
                const vary_ival = filter.getIntersection( invr_ival.getPrecedings() );
                if ( !vary_ival.isEmpty() ) {
                    this._addToGeneric( curve, vary_ival );
                }
                else if ( isSameInterval_L( filter, invr_ival ) &&
                          !this._hasContiguous_L( invr_ival, curve ) ) {
                    // invr_ival と filter の左が一致して、curve を持った invr_ival の左隣接が存在しない
                    if ( invr_ival.l_open ) {
                        this._addToOneshotGroup( curve, invr_ival, this._oneshot_R );
                    }
                    else if ( !invr_ival.getPrecedings().isEmpty() ) {
                        this._addToOneshotGroup( curve, invr_ival, this._oneshot_L );
                    }
                }
            }

            // 中間
            for ( let i = 0; i < lastIndex; ++i ) {
                const lower = invr_ivals[i    ].getFollowings();
                const upper = invr_ivals[i + 1].getPrecedings();
                const vary_ival = lower.getIntersection( upper );

                if ( vary_ival.isEmpty() ) {
                    //  lower と upper に間がない
                    this._addToOneshotGroup( curve, lower, lower.l_open ?
                                             this._oneshot_R : this._oneshot_L );
                }
                else {
                    // lower と upper に間がある
                    this._addToGeneric( curve, vary_ival );
                }
            }

            // 最後
            {
                const invr_ival = invr_ivals[lastIndex];
                const vary_ival = filter.getIntersection( invr_ival.getFollowings() );
                if ( !vary_ival.isEmpty() ) {
                    this._addToGeneric( curve, vary_ival );
                }
                else if ( isSameInterval_R( filter, invr_ival ) &&
                          !this._hasContiguous_R( invr_ival, curve ) ) {
                    if ( invr_ival.u_open ) {
                        this._addToOneshotGroup( curve, invr_ival, this._oneshot_L );
                    }
                    else if ( !invr_ival.getFollowings().isEmpty() ) {
                        this._addToOneshotGroup( curve, invr_ival, this._oneshot_R );
                    }
                }
            }
        }
    }


    /**
     * interval の左の隣接する区間は存在するか？
     *
     * continuous の中に interval の左に隣接する区間があり、かつ
     *    curve を持っているものは存在するかどうかを返す。
     *
     * @param interval (!= Φ)
     * @param curve
     */
    private _hasContiguous_L( interval: Interval, curve: Curve ): boolean
    {
        const map = this._continuous;

        // interval の左のアイテム
        const it1 = map.findLower( interval.lower );
        const it0 = (it1 !== null) ? it1.findPredecessor() : map.findLast();

        if ( it0 !== null ) {
            const pred      = it0.value; // ContCurves
            const pred_ival = pred.interval;

            if ( pred_ival.upper.equals( interval.lower ) &&
                 (interval.l_open && !pred_ival.u_open ||
                  !interval.l_open && pred_ival.u_open) ) {
                // 隣接している
                if ( pred.curves.has( curve ) ) {
                    // 隣接して curve を持っている
                    return true;
                }
            }
        }

        return false;
    }


    /**
     * interval の右の隣接する区間は存在するか？
     *
     * continuous の中に interval の右に隣接する区間があり、かつ
     *    curve を持っているものは存在するかどうかを返す。
     *
     * @param  interval (!= Φ)
     * @param  curve
     *
     * @return
     */
    private _hasContiguous_R( interval: Interval, curve: Curve ): boolean
    {
        const map = this._continuous;

        // interval の右のアイテム
        const it = map.findLower( interval.upper );
        if ( it === null ) {
            // interval の右に区間が存在しない
            return false;
        }

        const succ      = it.value; // ContCurves
        const succ_ival = succ.interval;

        if ( !succ_ival.lower.equals( interval.upper ) ) {
            // 境界が不一致
            return false;
        }

        if ( succ_ival.l_open && interval.u_open ||
             !succ_ival.l_open && !interval.u_open ) {
            // 重複または離れている
            return false;
        }

        return succ.curves.has( curve );
    }


    /**
     * Curve を削除
     *
     * filter 範囲の curve を削除する。filter は整列済みを想定しているので区間の分割は行わない。
     *
     * 事前条件
     * - curve は invariance と矛盾しない状態で this に存在する
     * - !filter.isEmpty()</p>
     *
     * todo: 削除後に隣接区間が同じ集合になったときの統合処理
     *
     * @param curve     削除する Curve インスタンス
     * @param invariance  curve の不変性情報
     * @param filter   削除する時刻区間 (invariance で整列済み)
     */
    removeCurve( curve: Curve, invariance: Invariance, filter: Interval = Interval.UNIVERSAL )
    {
        const invr_ivals = invariance.getNarrowed( filter )._$getArray();

        if ( invr_ivals.length == 0 ) {
            // filter の全時刻区間が変化
            this._removeForGeneric( curve, filter );
        }
        else {
            // 不変区間が存在する場合
            const lastIndex = invr_ivals.length - 1;

            // 最初
            {
                const invr_ival = invr_ivals[0];
                const vary_ival = filter.getIntersection( invr_ival.getPrecedings() );
                if ( !vary_ival.isEmpty() ) {
                    this._removeForGeneric( curve, vary_ival );
                }
                else {
                    if ( isSameInterval_L( filter, invr_ival ) ) {
                        // oneshot_L/R の可能性に対応
                        this._removeForOneshotGroup( curve, filter );
                    }
                }
            }

            // 中間
            for ( let i = 0; i < lastIndex; ++i ) {
                const lower = invr_ivals[i    ].getFollowings();
                const upper = invr_ivals[i + 1].getPrecedings();
                const vary_ival = lower.getIntersection( upper );

                if ( vary_ival.isEmpty() ) {
                    // ai と bi に間がない
                    this._removeForOneshotGroup( curve, lower );
                }
                else {
                    // ai と bi に間がある
                    this._removeForGeneric( curve, vary_ival );
                }
            }

            // 最後
            {
                const invr_ival = invr_ivals[lastIndex];
                const vary_ival = filter.getIntersection( invr_ival.getFollowings() );
                if ( !vary_ival.isEmpty() ) {
                    this._removeForGeneric( curve, vary_ival );
                }
                else {
                    if ( isSameInterval_R( filter, invr_ival ) ) {
                        // oneshot_L/R の可能性に対応
                        const upper = filter.upper;
                        this._removeForOneshotGroup( curve, new Interval( upper, upper ) );
                    }
                }
            }
        }
    }


    /**
     * Curve を変更
     *
     * @param curve
     * @param chg_ival  更新時刻区間 (!= Φ)
     * @param sub_invr  更新部分の Invariance
     * @param old_invr  以前の Invariance
     */
    modifyCurve( curve: Curve, chg_ival: Interval, sub_invr: Invariance, old_invr: Invariance )
    {
        // old_invr を基にして chg_ival を整列拡張
        const aligned = old_invr._$expandIntervalByAlignment( chg_ival );

        // this のデータベースから aligned 区間の curve を削除
        this.removeCurve( curve, old_invr, aligned );

        // aligned 区間で sub_invr を追加
        this.addCurve( curve, sub_invr, aligned );
    }


    /**
     * 関数値が変化した Curve インスタンス集合を取得
     *
     * 時刻が prev_time から time に連続変化したときに、関数値が変化する可能性のある
     *    Curve インスタンスを得るための列挙可能オブジェクトを返す。
     *
     * @param prev_time  始点時刻
     * @param time       終点時刻
     */
    getVaryCurves( prev_time: Time, time: Time ): Iterable<Curve>
    {
        if ( prev_time.lessThan( time ) ) {
            // 順再生
            return this._collectCurves( prev_time, time );
        }
        else if ( time.lessThan( prev_time ) ) {
            // 逆再生
            return this._collectCurves( time, prev_time );
        }
        else {
            // 時刻変わらず
            return [];
        }
    }


    /**
     * curve を continuous または oneshot へ追加
     *
     * curve を continuous または oneshot に登録する。
     *    ただし interval.isEmpty() のときは何もしない。
     *
     * @param curve  追加する Curve インスタンス
     * @param interval  変化する時刻区間
     */
    private _addToGeneric( curve: Curve, interval: Interval )
    {
        if ( interval.isProper() ) {
            this._addToContinuous( curve, interval );
        }
        else if ( interval.isSingle() ) {
            this._addToOneshotGroup( curve, interval, this._oneshot );
        }
    }


    /**
     * curve を oneshot 族へ追加
     *
     * @param curve  追加する Curve インスタンス
     * @param interval  lower が時刻として使われる
     * @param pname  oneshot 族のプロパティ名
     */
    private _addToOneshotGroup( curve: Curve, interval: Interval, map: OrderedMap<Time, Set<Curve>> )
    {
        let time = interval.lower;

        let item = map.findEqual( time );
        if ( item === null ) {
            // 新規の時刻
            // 空の Set<Curve> インスタンスを追加
            item = map.insert( time, new Set() );
        }

        item.value.add( curve );
    }


    /**
     * curve を continuous へ追加
     *
     * 事前条件: interval.isProper()
     *
     * @param curve  追加する Curve インスタンス
     * @param interval  変化する時刻区間
     */
    private _addToContinuous( curve: Curve, interval: Interval )
    {
        // assert: interval.isProper()

        // A は追加する連続区間
        // T は登録済みの連続区間 (A と交差する区間の中で一番左側の区間)

        // 交差タイプ
        //
        // (1) 登録済みの区間に A と交差する区間はない
        //     A: ====
        //
        // (2) T は A の左から飛び出し、右からは飛び出していない
        //     A:  ====
        //     T: ====
        //
        // (3) T は A の右から飛び出し、左からは飛び出していない
        //     A: ====
        //     T:  ====
        //
        // (4) T は A の左右どちらからも飛び出している
        //     A:  ===
        //     T: =====
        //
        // (5) T は A の左右どちらからも飛び出していない
        //     A: =====
        //     T:  ===

        // 記号の意味
        //
        //   $X は X.getPrecedings()
        //   X$ は X.getFollowings()

        let A_ival  = interval;  // A
        let A_curve = curve;

        for (;;) {
            // assert: A != Φ

            let target = this._removeFirstCrossInContinuous( A_ival );

            if ( target !== null ) {
                let T_ival   = target.cc.interval;  // T: A と交差する区間で一番左側の区間
                let T_curves = target.cc.curves;    // T の Curve インタンス集合
                let A_x_T    = target.cross;        // A∩T

                let $A_x_T = A_ival.getPrecedings().getIntersection( T_ival );  // $A∩T

                if ( $A_x_T.isEmpty() ) {
                    // 交差タイプ (3) または (5)

                    let A_x_$T = A_ival.getIntersection( T_ival.getPrecedings() );  // A∩$T
                    if ( !A_x_$T.isEmpty() ) {
                        // (d) A∩$T != Φ なら、A∩$T として、A_curve を新規登録
                        this._addForContinuous( A_x_$T, A_curve );
                    }
                }
                else {
                    // 交差タイプ (2) または (4)

                    // (b) $A∩T として、T_curves を新規登録
                    this._addForContinuous( $A_x_T, new Set( T_curves ) );
                }

                let A$_x_T = A_ival.getFollowings().getIntersection( T_ival );  // A$∩T

                if ( A$_x_T.isEmpty() ) {
                    // 交差タイプ (2) または (5)
                    
                    // (a) A∩T として、T_curves に A_curve を加えた集合を新規登録
                    this._addForContinuous( A_x_T, T_curves.add( A_curve ) );

                    // (z) A∩T$ != Φ なら、A を A∩T$ として再処理
                    let A_x_T$ = A_ival.getIntersection( T_ival.getFollowings() );  // A∩T$

                    if ( !A_x_T$.isEmpty() ) {
                        A_ival = A_x_T$;
                        continue;
                    }
                }
                else {
                    // 交差タイプ (3) または (4)

                    // (c) A$∩T として、T_curves を新規登録
                    this._addForContinuous( A$_x_T, new Set( T_curves ) );

                    // (a) A∩T として、T_curves に A_curve を加えた集合を新規登録
                    this._addForContinuous( A_x_T, T_curves.add( A_curve ) );
                }
            }
            else {
                // 交差タイプ (1)

                // A として、A_curve を新規登録
                this._addForContinuous( A_ival, A_curve );
            }

            break;
        }
    }


    /**
     * 最初に interval と交差する要素を削除
     *
     * this._continuous 内の時刻区間の中から、最初に interval と交差する要素を削除しする。
     *    その交差区間と要素が持っていた ContCurves インスタンスを返す。
     *
     * ただし、交差する区間が存在しなければ null を返す。
     *
     * @param interval  時刻区間
     *
     * @return {!object}  { cc: ContCurves, cross: Interval }
     */
    private _removeFirstCrossInContinuous( interval: Interval )
    {
        let map = this._continuous;  // 各区間は Proper 前提

        let t1 = map.findUpper( interval.lower );
        let t0 = (t1 !== null) ? t1.findPredecessor() : map.findLast();

        if ( t0 !== null ) {
            let cross = interval.getIntersection( t0.value.interval );
            if ( !cross.isEmpty() ) {
                let cc = t0.value;
                map.remove( t0 );
                return { cc, cross };
            }
        }

        if ( t1 !== null ) {
            let cross = interval.getIntersection( t1.value.interval );
            if ( !cross.isEmpty() ) {
                let cc = t1.value;
                map.remove( t1 );
                return { cc, cross };
            }
        }

        // 交差は存在しない
        return null;
    }


    /**
     * curves を continuous または oneshot へ追加
     *
     * interval.isSingle() のときは curves を this._oneshot の Curve 集合に追加する。
     *
     * interval.isProper() のときは ContCurves インスタンスを新規に this._continuous へ追加する。
     *
     * 事前条件: !interval.isEmpty()
     *
     * @param interval  時刻区間、または時刻 (lower を時刻とする)
     * @param curves  追加する Curve インスタンス、またはその集合
     */
    private _addForContinuous( interval: Interval, curves: Curve | Set<Curve> )
    {
        let time = interval.lower;  // 時刻へ変換

        if ( interval.isSingle() ) {
            // oneshot: curves を Curve 集合へ追加
            let it = this._oneshot.findEqual( time );
            if ( it === null ) {
                // 新規の時刻
                // 空の Set<Curve> インスタンスを追加
                it = this._oneshot.insert( time, new Set() );
            }

            let dst_set = it.value;

            if ( curves instanceof Set ) {
                // 複数 Curve
                for ( let curve of curves ) {
                    dst_set.add( curve );
                }
            }
            else {
                // 単一 Curve
                dst_set.add( curves );
            }
        }
        else {
            // continuous: curves を新規追加
            this._continuous.insert( time, new ContCurves( interval, curves ) );
        }
    }


    /**
     * curve を continuous または oneshot から削除
     *
     * curve を continuous または oneshot から削除するe。
     *    ただし interval.isEmpty() のときは何もしない。
     *
     * @param curve  削除する Curve インスタンス
     * @param interval  変化する時刻区間
     */
    private _removeForGeneric( curve: Curve, interval: Interval )
    {
        if ( interval.isProper() ) {
            this._removeForContinuous( curve, interval );
        }
        else if ( interval.isSingle() ) {
            this._removeForOneshotGroup( curve, interval );
        }
    }


    /**
     * curve を oneshot 族から削除
     *
     * ある oneshot 族の時刻 interval.lower に curve
     *    が存在すれば削除し、存在しなければ何もしない。
     *
     * @param curve  削除する Curve インスタンス
     * @param interval  lower が時刻として使われる
     */
    private _removeForOneshotGroup( curve: Curve, interval: Interval )
    {
        const time = interval.lower;

        for ( const map of [ this._oneshot, this._oneshot_L, this._oneshot_R ] ) {
            const item = map.findEqual( time );

            if ( item !== null ) {
                const curves = item.value;

                // curve を削除し、空になったら curves も削除
                if ( curves.has( curve ) ) {
                    curves.delete( curve );
                    if ( curves.size == 0 ) {
                        map.remove( item );
                    }
                }

                // curve は複数に所属することはないので、1つ削除したら終了
                break;
            }
        }
    }


    /**
     * curves を continuous または oneshot から削除
     *
     * interval 区間にある continuous と oneshot の curve を削除する。
     *
     * 事前条件: interval.isProper()
     *
     * @param curve  削除する Curve インスタンス
     * @param interval  時刻区間
     */
    private _removeForContinuous( curve: Curve, interval: Interval )
    {
        // this._continuous
        {
            const map = this._continuous;  // 各区間は Proper 前提
            const it1 = map.findUpper( interval.lower );
            const it0 = (it1 !== null) ? it1.findPredecessor() : map.findLast();
            const end = map.findUpper( interval.upper );

            for ( let it = (it0 || it1); it !== end; ) {
                // @ts-ignore
                let curves = it.value.curves;
                curves.delete( curve );
                // @ts-ignore
                it = ((curves.size == 0) ? map.remove( it ) : it.findSuccessor()) as OrderedMap.Item<Time, ContCurves>;
            }
        }

        // this._oneshot
        {
            let map = this._oneshot;
            let it0 = map.findLower( interval.lower );
            let end = map.findUpper( interval.upper );

            for ( let it = it0; it !== end; ) {
                // @ts-ignore
                let curves = it.value;
                curves.delete( curve );
                // @ts-ignore
                it = (curves.size == 0) ? map.remove( it ) : it.findSuccessor();
            }
        }
    }


    /**
     * Curve インスタンスを収集
     *
     * 事前条件: t1.lessThan( t2 )
     *
     * @param t1
     * @param t2
     */
    private _collectCurves( t1: Time, t2: Time ): Iterable<Curve>
    {
        let curves = new Set<Curve>();  // Set<Curve>

        this._collectContinuousCurves( t1, t2, curves );

        this._collectOneshotCurves( t1, t2, this._oneshot,   true,  true,  curves );
        this._collectOneshotCurves( t1, t2, this._oneshot_L, false, true,  curves );
        this._collectOneshotCurves( t1, t2, this._oneshot_R, true,  false, curves );

        return curves;
    }


    /**
     * continuous から Curve インスタンスを収集
     *
     * 事前条件: t1.lessThan( t2 )
     *
     * @param t1
     * @param t2
     * @param curves
     */
    private _collectContinuousCurves( t1: Time, t2: Time, curves: Set<Curve> )
    {
        // 時刻区間 [t1, ∞) と交差する最初の時刻区間
        let it_A = this._continuous.findLower( t1 );
        if ( it_A !== null ) {
            // it_A != null でも、時刻区間 Pred と交差している可能性もある
            let it_Pred = it_A.findPredecessor();
            if ( it_Pred !== null ) {
                if ( it_Pred.value.interval.includesTime( t1 ) ) {
                    // Pred と [t1, ∞) が交差するので it_Pred に置き換える
                    it_A = it_Pred;
                }
            }
        }
        else {
            // it_A == null でも、時刻区間 Last と交差している可能性がある
            let it_Last = this._continuous.findLast();
            if ( it_Last !== null ) {
                if ( it_Last.value.interval.includesTime( t1 ) ) {
                    // Last と [t1, ∞) が交差するので it_Last に置き換える
                    it_A = it_Last;
                }
            }
        }

        // 時刻区間 (∞, t2] と交差する最後の時刻区間の直後
        let it_Z = this._continuous.findLower( t2 );
        if ( it_Z !== null ) {
            let Z_ival = it_Z.value.interval;
            if ( Z_ival.lower.equals( t2 ) && !Z_ival.l_open ) {
                // it_Z の最小時刻がギリギリ (∞, t2] に入るので it_Z の直後を選ぶ
                it_Z = it_Z.findSuccessor();
            }
        }

        // assert: it_A != null || it_Z == null

        // Curve インスタンスを収集
        // @ts-ignore
        for ( let it = it_A; it !== it_Z; it = it.findSuccessor() ) {
            // @ts-ignore
            for ( let curve of it.value.curves ) {
                curves.add( curve );
            }
        }
    }


    /**
     * oneshot から Curve インスタンスを収集
     *
     * 事前条件: t1.lessThan( t2 )
     *
     * @param t1
     * @param t2
     * @param pname
     * @param closed1
     * @param closed2
     * @param curves
     */
    private _collectOneshotCurves( t1: Time, t2: Time, map: OrderedMap<Time, Set<Curve>>, closed1: boolean, closed2: boolean, curves: Set<Curve> )
    {
        // 時刻区間 [t1, ∞) に含まれる最初の時刻
        let it_A = closed1 ? map.findLower( t1 ) : map.findUpper( t1 );

        // 時刻区間 (∞, t2] に含まれる最後の時刻区間の直後
        let it_Z = closed1 ? map.findUpper( t2 ) : map.findLower( t2 );

        // assert: it_A != null || it_Z == null

        // Curve インスタンスを収集
        // @ts-ignore
        for ( let it = it_A; it !== it_Z; it = it.findSuccessor() ) {
            // @ts-ignore
            for ( let curve of it.value ) {
                curves.add( curve );
            }
        }
    }

}


/**
 * VaryCurves#continuous の値
 *
 * @internal
 */
class ContCurves {

    interval: Interval;

    curves: Set<Curve>;

    /**
     * @param interval  継続的に変化する時刻区間
     * @param curves  初期の Curve インスタンス、またはその集合
     */
    constructor( interval: Interval, curves: Curve | Set<Curve> )
    {
        // assert: interval.isProper()
        this.interval = interval;
        this.curves   = new Set( (curves instanceof Set) ? curves : [curves] );
    }

}


/**
 * Time を昇順に順序付ける辞書を生成
 */
function
createTimeMap<T>(): OrderedMap<Time, T>
{
    return new OrderedMap<Time, T>( (a: Time, b: Time) => a.lessThan( b ) );
}


/**
 * a と b の左側は同じか？
 *
 * @param a
 * @param b
 */
function
isSameInterval_L( a: Interval, b: Interval ): boolean
{
    return a.lower.equals( b.lower ) && (a.l_open && b.l_open || !a.l_open && !b.l_open);
}


/**
 * a と b の右側は同じか？
 *
 * @param a
 * @param b
 */
function
isSameInterval_R( a: Interval, b: Interval ): boolean
{
    return a.upper.equals( b.upper ) && (a.u_open && b.u_open || !a.u_open && !b.u_open);
}


export default Updater;
