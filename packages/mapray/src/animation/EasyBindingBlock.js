import BindingBlock from "./BindingBlock";
import Binder from "./Binder";
import AnimationError from "./AnimationError";
import TypeMismatchError from "./TypeMismatchError";


/**
 * @summary アニメーションパラメータ設定のヘルパークラス
 *
 * @memberof mapray.animation
 * @extends mapray.animation.BindingBlock
 */
class EasyBindingBlock extends BindingBlock
{

    /**
     */
    constructor()
    {
        super();

        // アニメーション可能なパラメータ
        this._entries = new Map();  // Map<id, Entry>

        // 結合中のパラメータ
        this._bounds  = new Map();  // Map<id, Binder>

        // すべての子孫の結合を解除するための関数のリスト
        this._descendant_unbinders = [];  // DescendantUnbinder[]

        // 不変条件: this._bounds.has( id ) ⇒ this._entries.has( id )
        //           this._bounds.has( id ) ⇔ (this._bounds.get( id ) !== undefined) ⇔ this.isBound()
    }


    /**
     * @summary アニメーション可能パラメータを追加
     *
     * @desc
     * <p>識別子を id としてアニメーション可能なパラメータを登録する。</p>
     *
     * <p>types にはこのパラメータに結合可能なアニメーション関数の 1 つまたはそれ以上の型を配列で与える。</p>
     *
     * <p>types に 2 つ以上の型が存在するときは type_solver に型を決定する関数を指定しなければならない。
     *    1 つしか型が存在しないとき type_solver は無視されるので null を与えてもよい。</p>
     *
     * <p>setter は実際のパラメータに値を設定する関数である。</p>
     *
     * <p>id に対応するパラメータがすでに結合されている場合はその結合が解除される。</p>
     *
     * @param {string}                             id  パラメータ ID
     * @param {mapray.animation.Type[]}         types  サポートする型のリスト
     * @param {?mapray.animation.EasyBindingBlock.TypeSolver} type_solver  型決定関数
     * @param {mapray.animation.Binder.Setter} setter  パラメータ設定関数
     *
     * @see {@link mapray.animation.BindingBlock.Parameter}
     */
    addEntry( id, types, type_solver, setter )
    {
        // 上書きで追加
        this._entries.set( id, new Entry( types, type_solver, setter ) );

        // すでに結合されている場合は解除する
        let binder = this._bounds.get( id );
        if ( binder !== undefined ) {
            binder.unbind();
            this._bounds.delete( id );
        }
    }


    /**
     * @summary 子孫の結合を解除するための関数を追加
     *
     * @param {mapray.animation.EasyBindingBlock.DescendantUnbinder} unbinder  子孫の結合を解除するための関数
     *
     * @see {@link mapray.animation.BindingBlock#unbindAllRecursively}
     */
    addDescendantUnbinder( unbinder )
    {
        this._descendant_unbinders.push( unbinder );
    }


    /**
     * @override
     */
    enumSupportedParameters()
    {
        let parameters = [];

        for ( let [id, enrty] of this._entries ) {
            parameters.push( new BindingBlock.Parameter( id, enrty.types ) );
        }

        return parameters;
    }


    /**
     * @override
     */
    isBound( id )
    {
        // 不変条件により !this._entries.has( id ) ⇒ !this._bounds.has( id ) が
        // 成り立つので、id がアニメーションに対応していないときは仕様通り false を返す

        return this._bounds.has( id );
    }


    /**
     * @override
     */
    getBoundUpdater( id )
    {
        let binder = this._bounds.get( id );
        return (binder !== undefined) ? binder.updater : null;
    }


    /**
     * @override
     */
    getBoundCurve( id )
    {
        let binder = this._bounds.get( id );
        return (binder !== undefined) ? binder.curve : null;
    }


    /**
     * @override
     */
    bind( id, updater, curve )
    {
        let entry = this._entries.get( id );
        if ( entry === undefined ) {
            // id のパラメータはアニメーションに非対応
            throw new AnimationError( "unsupported parameter" );
        }

        // すでに結合されている場合は先に解除
        this.unbind( id );

        // 型を決定
        let types = entry.types;
        let type  = (types.length == 1) ? types[0] : entry.type_solver( curve );

        if ( type == null || !curve.isTypeSupported( type ) ) {
            // curve は id のパラメータが要求する型に対応できない
            throw new TypeMismatchError( "type mismatch error" );
        }

        // パラメータを結合
        this._bounds.set( id, new Binder( updater, curve, type, entry.setter ) );

        // assert: this.isBound( id )
        // assert: this.getBoundUpdater( id ) === updater
        // assert: this.getBoundCurve( id ) === curve
    }


    /**
     * @override
     */
    unbind( id )
    {
        let binder = this._bounds.get( id );
        if ( binder !== undefined ) {
            binder.unbind();
            this._bounds.delete( id );
        }

        // assert: !this.isBound( id )
    }


    /**
     * @override
     */
    unbindAll()
    {
        for ( let [/*id*/, binder] of this._bounds ) {
            binder.unbind();
        }
        this._bounds.clear();

        // assert: 任意の id に対して !this.isBound( id )
    }


    /**
     * @override
     */
    unbindAllRecursively()
    {
        // 子孫
        for ( let unbinder of this._descendant_unbinders ) {
            unbinder();
        }

        // 自身
        this.unbindAll();
    }

}


/**
 * @summary パラメータ情報
 *
 * @memberof mapray.animation.EasyBindingBlock
 * @private
 */
class Entry {

    /**
     * @param {mapray.animation.Type[]}         types  サポートする型のリスト
     * @param {?mapray.animation.EasyBindingBlock.TypeSolver} type_solver  型決定関数
     * @param {mapray.animation.Binder.Setter} setter  パラメータ設定関数
     */
    constructor( types, type_solver, setter )
    {
        if ( types.length < 1 || (types.length >= 2 && !type_solver) ) {
            // 型は 1 つ以上で、2 つ以上のときは TypeSolver が必要
            // これは事前条件であるが、気付き用に投げる
            throw new AnimationError( "bad parameter entry" );
        }

        this.types       = types.concat();  // 複製
        this.type_solver = type_solver;
        this.setter      = setter;
    }

}


/**
 * @summary 型決定関数
 *
 * @desc
 * <p>ここで説明する types と setter は {@link mapray.animation.EasyBindingBlock#addEntry addEntry()}
 *    の引数、curve は {@link mapray.animation.EasyBindingBlock#bind bind()} の引数である。</p>
 *
 * <p>types と curve がサポートする型から、setter 関数に渡されるパラメータの型 (curve から得る関数値の型も同じ)
 *    を決定して返す。</p>
 *
 * <p>この関数は types に含まれる型、かつ curve がサポートする型以外は返さない。そのような型が決定できなければ
 *    null を返す。</p>
 *
 * <p>この関数は types に複数の型を指定したときに、bind() の呼び出しのタイミングで呼び出される。types
 *    に 1 つの型しか存在しないときは呼び出されない。</p>
 *
 * @param {mapray.animation.Curve} curve
 *
 * @return {?mapray.animation.Type}
 *
 * @callback TypeSolver
 *
 * @memberof mapray.animation.EasyBindingBlock
 *
 * @see {@link mapray.animation.EasyBindingBlock#addEntry}
 * @see {@link mapray.animation.EasyBindingBlock#bind}
 * @see {@link mapray.animation.Curve#isTypeSupported}
 * @see {@link mapray.animation.Binder.Setter}
 */


/**
 * @summary 子孫の結合を解除するための関数
 *
 * @desc
 * <p>一般的な実装では、直接の子オブジェクトの .animation.unbindAllRecursively() を呼び出す。</p>
 *
 * @callback DescendantUnbinder
 *
 * @memberof mapray.animation.EasyBindingBlock
 *
 * @see {@link mapray.animation.EasyBindingBlock#addDescendantUnbinder}
 * @see {@link mapray.animation.BindingBlock#unbindAllRecursively}
 */


export default EasyBindingBlock;
