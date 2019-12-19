import Interval from "./Interval";
import Invariance from "./Invariance";
import OrderedMap from "../OrderedMap";


/**
 * @summary アニメーションパラメータの更新管理
 *
 * @classdesc
 * <p>アニメーション関数と結合しているアニメーションパラメータを更新するための機能を提供する。</p>
 *
 * @memberof mapray.animation
 */
class Updater
{

    /**
     */
    constructor()
    {
        // 前回更新した時刻 (一度も更新していないときは null)
        this._prev_time = null;

        // Curve -> Tracked 辞書
        this._track_binders = new Map();

        // パラメータがまだ更新されていない、またはアニメーション関数値と
        // 矛盾する可能性のある Binder インスタンス
        this._dirty_binders = new Set();

        // 関数値が変化した Curve を管理
        this._vary_curves = new VaryCurves();
    }


    /**
     * @summary アニメーションパラメータを更新
     *
     * @desc
     * <p>時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。</p>
     *
     * @param {mapray.animation.Time} time  時刻
     */
    update( time )
    {
        this._update_dirty_binders( time );

        if ( this._prev_time !== null ) {
            const vary_curves = this._vary_curves.getVaryCurves( this._prev_time, time );
            for ( let curve of vary_curves ) {
                let tracked = this._track_binders.get( curve );
                tracked.updateBinders( time );
            }
        }

        this._flush_dirty_binders();

        // 前回の時刻を更新
        this._prev_time = time;
    }


    /**
     * @summary Binder インスタンスの登録
     *
     * @desc
     * <p>事前条件: binder は this で管理されていない</p>
     *
     * @param {mapray.animation.Binder} binder
     *
     * @package
     */
    _$register( binder )
    {
        // 最初は dirty_binders に登録
        this._dirty_binders.add( binder );
    }


    /**
     * @summary Binder インスタンスの抹消
     *
     * @desc
     * <p>事前条件: binder は this で管理されている</p>
     *
     * @param {mapray.animation.Binder} binder
     *
     * @package
     */
    _$unregister( binder )
    {
        if ( this._dirty_binders.delete( binder ) ) {
            // binder は dirty_binders 側に存在していた
        }
        else {
            // binder は track_binders 側に存在する
            let tracked = this._track_binders.get( binder._$curve );
            tracked.unregister( binder );
        }
    }


    /**
     * @summary _dirty_binders のすべてのパラメータを更新
     *
     * @param {mapray.animation.Time} time
     *
     * @private
     */
    _update_dirty_binders( time )
    {
        for ( let binder of this._dirty_binders ) {
            binder._$update( time );
        }
    }


    /**
     * @summary _dirty_binders から _track_binders へ Binder を移動
     *
     * @private
     */
    _flush_dirty_binders()
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
 * @summary 追跡されたバインダ
 *
 * @memberof mapray.animation.Updater
 * @private
 */
class Tracked {

    /**
     * @desc
     * <p>updater._track_binders に追加されるときに呼び出される。</p>
     * <p>updater._vary_curves も更新する。</p>
     *
     * @param {mapray.animation.Updater} updater      this を管理する Updater インスタンス
     * @param {mapray.animation.Curve}   curve        対象とする Curve インスタンス
     * @param {mapray.animation.Binder}  init_binder  最初の Binder インスタンス
     */
    constructor( updater, curve, init_binder )
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
        updater._vary_curves.addCurve( curve, this._invariance );
    }


    /**
     * @summary Curve を持つ Binder を登録
     *
     * @param {mapray.animation.Binder} binder
     */
    register( binder )
    {
        // Assert: !this._binders.has( binder )
        this._binders.add( binder );
    }


    /**
     * @summary Curve を持つ Binder を抹消
     *
     * @desc
     * <p>this が updater._track_binders から削除されることがある。</p>
     * <p>curve が updater._vary_curves から削除されることがある。</p>
     *
     * @param {mapray.animation.Binder} binder
     */
    unregister( binder )
    {
        // Assert: this._binders.has( binder )
        this._binders.delete( binder );

        if ( this._binders.size > 0 ) {
            // まだ this._curve と関連した Binder インスタンスが this に存在する
            return;
        }

        // this._curve と関連した唯一の Binder インスタンスが this から削除された

        // vary_curves から curve を削除
        this._updater._vary_curves.removeCurve( this._curve, this._invariance );

        // 変更を追跡する必要はなくなったのでリスナーを削除
        this._curve.removeValueChangeListener( this._listener );

        // this を this._updater から削除
        this._updater._track_binders.delete( this._curve );
    }


    /**
     * @summary アニメーションパラメータを更新
     *
     * @desc
     * <p>時刻 time でのアニメーション関数値をアニメーションパラメータに設定する。</p>
     *
     * @param {mapray.animation.Time} time  時刻
     */
    updateBinders( time )
    {
        for ( let binder of this._binders ) {
            binder._$update( time );
        }
    }


    /**
     * @summary アニメーション間数値が変更された
     *
     * @param {mapray.animation.Interval} chg_ival  変更された時刻区間
     *
     * @private
     */
    _onValueChange( chg_ival )
    {
        // assert: !chg_ival.isEmpty()
        // assert: this._updater._prev_time != null

        if ( chg_ival.includesTime( this._updater._prev_time ) ) {
            // 現在設定されているパラメータ値と矛盾が生じる
            // this._binders を dirty_binders に移動
            this._move_to_dirty_binders();
        }
        else {
            // 不変性情報を部分的に更新
            let subinvr = this._curve.getInvariance( chg_ival );
            this._updater._vary_curves.modifyCurve( this._curve, chg_ival, subinvr, this._invariance );
            this._invariance._$modify( subinvr );
        }
    }


    /**
     * @summary this を dirty_binders に移動
     *
     * @desc
     * <p>this は updater._track_binders, updater._vary_curves から削除される。</p>
     *
     * @private
     */
    _move_to_dirty_binders()
    {
        for ( let binder of Array.from( this._binders ) ) {
            // this から binder を削除
            this.unregister( binder );
            // dirty_binders に binder を追加
            this._updater._dirty_binders.add( binder );
        }
    }

}


/**
 * @summary 時刻間での関数値が変化した Curve を得る
 *
 * @memberof mapray.animation.Updater
 * @private
 */
class VaryCurves {

    /**
     */
    constructor()
    {
        // 連続変化の時刻区間 (すべて Proper)
        // OrderedMap<Time, ContCurves>
        //   外から内部に入る、内部で動くとき変化する
        //   下限が '[' のとき、左から下限に入る、下限から左へ出るとき変化する
        //   上限が ']' のとき、右から上限に入る、上限から右へ出るとき変化する
        this._continuous = createTimeMap();

        // 単発変化の時刻 []
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、点に入る、点から出るとき変化する
        this._oneshot = createTimeMap();

        // 単発変化の時刻 [)
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、左から点に入る、点から左へ出るとき変化する
        this._oneshot_L = createTimeMap();

        // 単発変化の時刻 (]
        // OrderedMap<Time, Set<Curve>>
        //   点を通過、右から点に入る、点から右へ出るとき変化する
        this._oneshot_R = createTimeMap();
    }


    /**
     * @summary Curve を追加
     *
     * @desc
     * <p>データベースに不変性が invariance である curve を追加する。</p>
     *
     * <p>事前条件: curve は filter 内に存在しない</p>
     *
     * @param {mapray.animation.Curve}        curve     追加する Curve インスタンス
     * @param {mapray.animation.Invariance} invariance  curve の不変性情報
     * @param {mapray.animation.Interval}    [filter]   追加する時刻区間 (前回の不変性情報で整列済み)
     */
    addCurve( curve, invariance, filter = Interval.UNIVERSAL )
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
                        this._addToOneshotGroup( curve, invr_ival, "_oneshot_R" );
                    }
                    else if ( !invr_ival.getPrecedings().isEmpty() ) {
                        this._addToOneshotGroup( curve, invr_ival, "_oneshot_L" );
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
                                             "_oneshot_R" : "_oneshot_L" );
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
                        this._addToOneshotGroup( curve, invr_ival, "_oneshot_L" );
                    }
                    else if ( !invr_ival.getFollowings().isEmpty() ) {
                        this._addToOneshotGroup( curve, invr_ival, "_oneshot_R" );
                    }
                }
            }
        }
    }


    /**
     * @summary interval の左の隣接する区間は存在するか？
     *
     * @desc
     * <p>continuous の中に interval の左に隣接する区間があり、かつ
     *    curve を持っているものは存在するかどうかを返す。</p>
     *
     * @param {mapray.animation.Interval} interval (!= Φ)
     * @param {mapray.animation.Curve}    curve
     *
     * @return {boolean}
     *
     * @private
     */
    _hasContiguous_L( interval, curve )
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
     * @summary interval の右の隣接する区間は存在するか？
     *
     * @desc
     * <p>continuous の中に interval の右に隣接する区間があり、かつ
     *    curve を持っているものは存在するかどうかを返す。</p>
     *
     * @param {mapray.animation.Interval} interval (!= Φ)
     * @param {mapray.animation.Curve}    curve
     *
     * @return {boolean}
     *
     * @private
     */
    _hasContiguous_R( interval, curve )
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
     * @summary Curve を削除
     *
     * @desc
     * <p>filter 範囲の curve を削除する。filter は整列済みを想定しているので区間の分割は行わない。</p>
     *
     * <p>事前条件: curve は invariance と矛盾しない状態で this に存在する</p>
     * <p>事前条件: !filter.isEmpty()</p>
     *
     * <p>todo: 削除後に隣接区間が同じ集合になったときの統合処理</p>
     *
     * @param {mapray.animation.Curve}        curve     削除する Curve インスタンス
     * @param {mapray.animation.Invariance} invariance  curve の不変性情報
     * @param {mapray.animation.Interval}    [filter]   削除する時刻区間 (invariance で整列済み)
     */
    removeCurve( curve, invariance, filter = Interval.UNIVERSAL )
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
     * @summary Curve を変更
     *
     * @param {mapray.animation.Curve}      curve
     * @param {mapray.animation.Interval}   chg_ival  更新時刻区間 (!= Φ)
     * @param {mapray.animation.Invariance} sub_invr  更新部分の Invariance
     * @param {mapray.animation.Invariance} old_invr  以前の Invariance
     */
    modifyCurve( curve, chg_ival, sub_invr, old_invr )
    {
        // old_invr を基にして chg_ival を整列拡張
        const aligned = old_invr._$expandIntervalByAlignment( chg_ival );

        // this のデータベースから aligned 区間の curve を削除
        this.removeCurve( curve, old_invr, aligned );

        // aligned 区間で sub_invr を追加
        this.addCurve( curve, sub_invr, aligned );
    }


    /**
     * @summary 関数値が変化した Curve インスタンス集合を取得
     *
     * @desc
     * <p>時刻が prev_time から time に連続変化したときに、関数値が変化する可能性のある
     *    Curve インスタンスを得るための列挙可能オブジェクトを返す。</p>
     *
     * @param {mapray.animation.Time} prev_time  始点時刻
     * @param {mapray.animation.Time} time       終点時刻
     *
     * @return {iterable.<mapray.animation.Curve>}
     */
    getVaryCurves( prev_time, time )
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
     * @summary curve を continuous または oneshot へ追加
     *
     * @desc
     * <p>curve を continuous または oneshot に登録する。
     *    ただし interval.isEmpty() のときは何もしない。</p>
     *
     * @param {mapray.animation.Curve}       curve  追加する Curve インスタンス
     * @param {mapray.animation.Interval} interval  変化する時刻区間
     *
     * @private
     */
    _addToGeneric( curve, interval )
    {
        if ( interval.isProper() ) {
            this._addToContinuous( curve, interval );
        }
        else if ( interval.isSingle() ) {
            this._addToOneshotGroup( curve, interval, "_oneshot" );
        }
    }


    /**
     * @summary curve を oneshot 族へ追加
     *
     * @param {mapray.animation.Curve}       curve  追加する Curve インスタンス
     * @param {mapray.animation.Interval} interval  lower が時刻として使われる
     * @param {string}                       pname  oneshot 族のプロパティ名
     *
     * @private
     */
    _addToOneshotGroup( curve, interval, pname )
    {
        let  map = this[pname];  // OrderedMap<Time, Set<Curve>>
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
     * @summary curve を continuous へ追加
     *
     * @desc
     * <p>事前条件: interval.isProper()</p>
     *
     * @param {mapray.animation.Curve}       curve  追加する Curve インスタンス
     * @param {mapray.animation.Interval} interval  変化する時刻区間
     *
     * @private
     */
    _addToContinuous( curve, interval )
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
     * @summary 最初に interval と交差する要素を削除
     *
     * @desc
     * <p></p>
     * <p>this._continuous 内の時刻区間の中から、最初に interval と交差する要素を削除しする。
     *    その交差区間と要素が持っていた ContCurves インスタンスを返す。</p>
     * <p>ただし、交差する区間が存在しなければ null を返す。</p>
     *
     * @param {mapray.animation.Interval} interval  時刻区間
     *
     * @return {!object}  { cc: ContCurves, cross: Interval }
     *
     * @private
     */
    _removeFirstCrossInContinuous( interval )
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
     * @summary curves を continuous または oneshot へ追加
     *
     * @desc
     * <p>interval.isSingle() のときは curves を this._oneshot の Curve 集合に追加する。</p>
     * <p>interval.isProper() のときは ContCurves インスタンスを新規に this._continuous へ追加する。</p>
     *
     * <p>事前条件: !interval.isEmpty()</p>
     *
     * @param {mapray.animation.Interval} interval  時刻区間、または時刻 (lower を時刻とする)
     * @param {mapray.animation.Curve|Set}  curves  追加する Curve インスタンス、またはその集合
     *
     * @private
     */
    _addForContinuous( interval, curves )
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
     * @summary curve を continuous または oneshot から削除
     *
     * @desc
     * <p>curve を continuous または oneshot から削除するe。
     *    ただし interval.isEmpty() のときは何もしない。</p>
     *
     * @param {mapray.animation.Curve}       curve  削除する Curve インスタンス
     * @param {mapray.animation.Interval} interval  変化する時刻区間
     *
     * @private
     */
    _removeForGeneric( curve, interval )
    {
        if ( interval.isProper() ) {
            this._removeForContinuous( curve, interval );
        }
        else if ( interval.isSingle() ) {
            this._removeForOneshotGroup( curve, interval );
        }
    }


    /**
     * @summary curve を oneshot 族から削除
     *
     * @desc
     * <p>ある oneshot 族の時刻 interval.lower に curve
     *    が存在すれば削除し、存在しなければ何もしない。</p>
     *
     * @param {mapray.animation.Curve}       curve  削除する Curve インスタンス
     * @param {mapray.animation.Interval} interval  lower が時刻として使われる
     *
     * @private
     */
    _removeForOneshotGroup( curve, interval )
    {
        const time = interval.lower;

        for ( const pname of ["_oneshot", "_oneshot_L", "_oneshot_R"] ) {
            const  map = this[pname];  // OrderedMap<Time, Set<Curve>>
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
     * @summary curves を continuous または oneshot から削除
     *
     * @desc
     * <p>interval 区間にある continuous と oneshot の curve を削除する。</p>
     * <p>事前条件: interval.isProper()</p>
     *
     * @param {mapray.animation.Curve}       curve  削除する Curve インスタンス
     * @param {mapray.animation.Interval} interval  時刻区間
     *
     * @private
     */
    _removeForContinuous( curve, interval )
    {
        // this._continuous
        {
            let map = this._continuous;  // 各区間は Proper 前提
            let it1 = map.findUpper( interval.lower );
            let it0 = (it1 !== null) ? it1.findPredecessor() : map.findLast();
            let end = map.findUpper( interval.upper );

            for ( let it = (it0 || it1); it !== end; ) {
                let curves = it.value.curves;
                curves.delete( curve );
                it = (curves.size == 0) ? map.remove( it ) : it.findSuccessor();
            }
        }

        // this._oneshot
        {
            let map = this._oneshot;
            let it0 = map.findLower( interval.lower );
            let end = map.findUpper( interval.upper );

            for ( let it = it0; it !== end; ) {
                let curves = it.value;
                curves.delete( curve );
                it = (curves.size == 0) ? map.remove( it ) : it.findSuccessor();
            }
        }
    }


    /**
     * @summary Curve インスタンスを収集
     *
     * @desc
     * 事前条件: t1.lessThan( t2 )
     *
     * @param {mapray.animation.Time} t1
     * @param {mapray.animation.Time} t2
     *
     * @return {iterable.<mapray.animation.Curve>}
     *
     * @private
     */
    _collectCurves( t1, t2 )
    {
        let curves = new Set();  // Set<Curve>

        this._collectContinuousCurves( t1, t2, curves );
        this._collectOneshotCurves( t1, t2, "_oneshot",   true,  true,  curves );
        this._collectOneshotCurves( t1, t2, "_oneshot_L", false, true,  curves );
        this._collectOneshotCurves( t1, t2, "_oneshot_R", true,  false, curves );

        return curves;
    }


    /**
     * @summary continuous から Curve インスタンスを収集
     *
     * @desc
     * 事前条件: t1.lessThan( t2 )
     *
     * @param {mapray.animation.Time}        t1
     * @param {mapray.animation.Time}        t2
     * @param {Set.<mapray.animation.Curve>} curves
     *
     * @private
     */
    _collectContinuousCurves( t1, t2, curves )
    {
        // 時刻区間 [t1, ∞) と交差する最初の時刻区間
        let it_A = this._continuous.findLower( t1 );
        if ( it_A !== null ) {
            let it_P = it_A.findPredecessor();
            if ( it_P !== null ) {
                if ( it_P.value.interval.includeTime( t1 ) ) {
                    // it_A の直前が [t1, ∞) と交差するなら it_A の直前を選ぶ
                    it_A = it_P;
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
        for ( let it = it_A; it !== it_Z; it = it.findSuccessor() ) {
            for ( let curve of it.value.curves ) {
                curves.add( curve );
            }
        }
    }


    /**
     * @summary oneshot から Curve インスタンスを収集
     *
     * @desc
     * 事前条件: t1.lessThan( t2 )
     *
     * @param {mapray.animation.Time}        t1
     * @param {mapray.animation.Time}        t2
     * @param {string}                       pname
     * @param {boolean}                      closed1
     * @param {boolean}                      closed2
     * @param {Set.<mapray.animation.Curve>} curves
     *
     * @private
     */
    _collectOneshotCurves( t1, t2, pname, closed1, closed2, curves )
    {
        let map = this[pname];  // OrderedMap<Time, Set<Curve>>

        // 時刻区間 [t1, ∞) に含まれる最初の時刻
        let it_A = closed1 ? map.findLower( t1 ) : map.findUpper( t1 );

        // 時刻区間 (∞, t2] に含まれる最後の時刻区間の直後
        let it_Z = closed1 ? map.findUpper( t2 ) : map.findLower( t2 );

        // assert: it_A != null || it_Z == null

        // Curve インスタンスを収集
        for ( let it = it_A; it !== it_Z; it = it.findSuccessor() ) {
            for ( let curve of it.value ) {
                curves.add( curve );
            }
        }
    }

}


/**
 * summary VaryCurves#continuous の値
 *
 * @memberof mapray.animation.Updater.VaryCurves
 * @private
 */
class ContCurves {

    /**
     * @param {mapray.animation.Interval} interval  継続的に変化する時刻区間
     * @param {mapray.animation.Curve|Set}  curves  初期の Curve インスタンス、またはその集合
     */
    constructor( interval, curves )
    {
        // assert: interval.isProper()
        this.interval = interval;
        this.curves   = new Set( (curves instanceof Set) ? curves : [curves] );
    }

}


/**
 * @summary Time を昇順に順序付ける辞書を生成
 *
 * @private
 */
function
createTimeMap()
{
    return new OrderedMap( (a, b) => a.lessThan( b ) );
}


/**
 * @summary a と b の左側は同じか？
 *
 * @param {mapray.animation.Interval} a
 * @param {mapray.animation.Interval} b
 *
 * @private
 */
function
isSameInterval_L( a, b )
{
    return a.lower.equals( b.lower ) && (a.l_open && b.l_open || !a.l_open && !b.l_open);
}


/**
 * @summary a と b の右側は同じか？
 *
 * @param {mapray.animation.Interval} a
 * @param {mapray.animation.Interval} b
 *
 * @private
 */
function
isSameInterval_R( a, b )
{
    return a.upper.equals( b.upper ) && (a.u_open && b.u_open || !a.u_open && !b.u_open);
}


export default Updater;
