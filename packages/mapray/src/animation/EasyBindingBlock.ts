import Type from "./Type";
import Updater from "./Updater";
import Curve from "./Curve";
import BindingBlock from "./BindingBlock";
import Binder from "./Binder";
import AnimationError from "./AnimationError";
import TypeMismatchError from "./TypeMismatchError";


/**
 * アニメーションパラメータ設定のヘルパークラス
 */
class EasyBindingBlock extends BindingBlock
{
    private _entries: Map<string, EasyBindingBlock.Entry>;

    private _bounds: Map<string, Binder>;

    private _descendant_unbinders: EasyBindingBlock.DescendantUnbinder[];


    /**
     */
    constructor()
    {
        super();

        // アニメーション可能なパラメータ
        this._entries = new Map<string, EasyBindingBlock.Entry>();  // Map<id, Entry>

        // 結合中のパラメータ
        this._bounds = new Map<string, Binder>();  // Map<id, Binder>

        // すべての子孫の結合を解除するための関数のリスト
        this._descendant_unbinders = [];  // DescendantUnbinder[]

        // 不変条件: this._bounds.has( id ) ⇒ this._entries.has( id )
        //           this._bounds.has( id ) ⇔ (this._bounds.get( id ) !== undefined) ⇔ this.isBound()
    }


    /**
     * アニメーション可能パラメータを追加
     *
     * 識別子を id としてアニメーション可能なパラメータを登録する。
     *
     * types にはこのパラメータに結合可能なアニメーション関数の 1 つまたはそれ以上の型を配列で与える。
     *
     * types に 2 つ以上の型が存在するときは type_solver に型を決定する関数を指定しなければならない。
     *    1 つしか型が存在しないとき type_solver は無視されるので null を与えてもよい。
     *
     * setter は実際のパラメータに値を設定する関数である。
     *
     * id に対応するパラメータがすでに結合されている場合はその結合が解除される。
     *
     * @param id  パラメータ ID
     * @param types  サポートする型のリスト
     * @param type_solver  型決定関数
     * @param setter  パラメータ設定関数
     *
     * @see [[BindingBlock.Parameter]]
     */
    addEntry( id: string, types: Type[], type_solver: EasyBindingBlock.TypeSolver | null, setter: Binder.Setter )
    {
        // 上書きで追加
        this._entries.set( id, new EasyBindingBlock.Entry( types, type_solver, setter ) );

        // すでに結合されている場合は解除する
        const binder = this._bounds.get( id );
        if ( binder ) {
            binder.unbind();
            this._bounds.delete( id );
        }
    }


    /**
     * 子孫の結合を解除するための関数を追加
     *
     * @param unbinder 子孫の結合を解除するための関数
     *
     * @see [[BindingBlock.unbindAllRecursively]]
     */
    addDescendantUnbinder( unbinder: EasyBindingBlock.DescendantUnbinder )
    {
        this._descendant_unbinders.push( unbinder );
    }


    /**
     */
    override enumSupportedParameters()
    {
        let parameters = [];

        for ( let [id, enrty] of this._entries ) {
            parameters.push( new BindingBlock.Parameter( id, enrty.types ) );
        }

        return parameters;
    }


    /**
     */
    override isBound( id: string )
    {
        // 不変条件により !this._entries.has( id ) ⇒ !this._bounds.has( id ) が
        // 成り立つので、id がアニメーションに対応していないときは仕様通り false を返す

        return this._bounds.has( id );
    }


    /**
     */
    override getBoundUpdater( id: string )
    {
        const binder = this._bounds.get( id );
        return (binder !== undefined) ? binder.updater : undefined;
    }


    /**
     */
    override getBoundCurve( id: string )
    {
        const binder = this._bounds.get( id );
        return (binder !== undefined) ? binder.curve : undefined;
    }


    /**
     */
    override bind( id: string, updater: Updater, curve: Curve ): void
    {
        const entry = this._entries.get( id );
        if ( entry === undefined ) {
            // id のパラメータはアニメーションに非対応
            throw new AnimationError( "unsupported parameter" );
        }

        // すでに結合されている場合は先に解除
        this.unbind( id );

        // 型を決定
        const types = entry.types;
        const type  = (types.length === 1) ? types[0] : (() => {
                if (!entry.type_solver) throw new TypeMismatchError( "" );
                return entry.type_solver( curve );
        })();

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
     */
    override unbind( id: string )
    {
        let binder = this._bounds.get( id );
        if ( binder !== undefined ) {
            binder.unbind();
            this._bounds.delete( id );
        }

        // assert: !this.isBound( id )
    }


    /**
     */
    override unbindAll()
    {
        for ( let [/*id*/, binder] of this._bounds ) {
            binder.unbind();
        }
        this._bounds.clear();

        // assert: 任意の id に対して !this.isBound( id )
    }


    /**
     */
    override unbindAllRecursively()
    {
        // 子孫
        for ( let unbinder of this._descendant_unbinders ) {
            unbinder();
        }

        // 自身
        this.unbindAll();
    }

}



namespace EasyBindingBlock {



/**
 * パラメータ情報
 *
 * @memberof mapray.animation.EasyBindingBlock
 */
export class Entry {

    types: Type[]

    type_solver?: EasyBindingBlock.TypeSolver;

    setter: Binder.Setter;


    /**
     * @param types  サポートする型のリスト
     * @param type_solver  型決定関数
     * @param setter  パラメータ設定関数
     */
    constructor( types: Type[], type_solver: EasyBindingBlock.TypeSolver | null, setter: Binder.Setter )
    {
        if ( types.length < 1 || (types.length >= 2 && !type_solver) ) {
            // 型は 1 つ以上で、2 つ以上のときは TypeSolver が必要
            // これは事前条件であるが、気付き用に投げる
            throw new AnimationError( "bad parameter entry" );
        }

        this.types       = types.slice();  // 複製
        this.type_solver = type_solver || undefined;
        this.setter      = setter;
    }

}



/**
 * 型決定関数
 *
 * ここで説明する types と setter は [[EasyBindingBlock.addEntry addEntry()]]
 *    の引数、curve は [[EasyBindingBlock.bind bind()]] の引数である。
 *
 * types と curve がサポートする型から、setter 関数に渡されるパラメータの型 (curve から得る関数値の型も同じ)
 *    を決定して返す。
 *
 * この関数は types に含まれる型、かつ curve がサポートする型以外は返さない。そのような型が決定できなければ
 *    null を返す。
 *
 * この関数は types に複数の型を指定したときに、bind() の呼び出しのタイミングで呼び出される。types
 *    に 1 つの型しか存在しないときは呼び出されない。
 *
 * @param curve
 *
 * @see [[EasyBindingBlock.addEntry]]
 * @see [[EasyBindingBlock.bind]]
 * @see [[Curve.isTypeSupported]]
 * @see [[Binder.Setter]]
 */
export type TypeSolver = (curve: Curve) => Type | null



/**
 * 子孫の結合を解除するための関数
 *
 * 一般的な実装では、直接の子オブジェクトの animation.unbindAllRecursively() を呼び出す。
 *
 * @see [[EasyBindingBlock.addDescendantUnbinder]]
 * @see [[BindingBlock.unbindAllRecursively]]
 */
export type DescendantUnbinder = () => void;



} // namespace EasyBindingBlock



export default EasyBindingBlock;
