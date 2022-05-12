import Binder from "./Binder";
import Updater from "./Updater";
import Curve from "./Curve";
import Type from "./Type";

import AnimationError from "./AnimationError";
import TypeMismatchError from "./TypeMismatchError";


/**
 * アニメーション設定の標準インタフェース
 *
 * オブジェクトのアニメーション可能パラメータにアニメーションを設定 (バインド)
 * するための標準的なインタフェースを提供する。
 *
 * 具体的には内部で各パラメータに適した [[Binder]]
 * インスタンスの生成し、ユーザーが簡単にアニメーションを設定できるようにする。<p>
 *
 * 一般的に、アニメーション可能パラメータを持つオブジェクトの <em>animation</em>
 * プロパティから、このインタフェースを得ることができる。
 *
 * 注意: アニメーションを設定しているパラメータは
 * [[Updater]] のメソッドを通してのみ更新することができる。
 * それ以外の手段でパラメータを更新した場合はパラメータ値に矛盾が生じる可能性がある。
 *
 * @see [[Binder]]
 * @see [[Updater]]
 */
abstract class BindingBlock
{

    /**
     */
    constructor()
    {
    }


    /**
     * アニメーション可能パラメータの情報を取得
     *
     * アニメーションに対応したパラメータの情報を配列として取得する。
     *
     * 返される配列は 0 個またはそれ以上の要素を含み、要素間のパラメータ ID は重複しない。
     *
     * this の生存期間中、(順序以外) 常に同じ内容を返す。
     */
    abstract enumSupportedParameters(): BindingBlock.Parameter[];


    /**
     * パラメータは結合中か？
     *
     * id が示すパラメータが結合されているとき true, 結合されていないとき false を返す。
     *
     * ただし id が示すパラメータがアニメーションに対応していないときは false を返す。
     *
     * @param id  パラメータ ID
     */
    abstract isBound( id: string ): boolean;


    /**
     * パラメータに結合されている Updater インスタンスを取得
     *
     * id が示すパラメータが結合されている Updater インスタンスを返す。
     * ただし this.isBound( id ) == false のときは null を返す。
     *
     * @param id  パラメータ ID
     */
    abstract getBoundUpdater( id: string ): Updater | undefined;


    /**
     * パラメータに結合されている Curve インスタンスを取得
     *
     * id が示すパラメータが結合されている Curve インスタンスを返す。
     * ただし this.isBound( id ) == false のときは null を返す。
     *
     * @param id  パラメータ ID
     */
    abstract getBoundCurve( id: string ): Curve | undefined;


    /**
     * パラメータにアニメーションを結合
     *
     * id が示すパラメータと updater と curve を結びつける。ただし、すでに id
     *    が示すパラメータに結合があれば、先にその結合を解除してから行う。
     *
     * パラメータが結合されている間、updater によりそのパラメータを更新することができる。
     *
     * @param id  パラメータ ID
     * @param updater  アニメーションパラメータ更新管理
     * @param curve  アニメーション関数
     *
     * @throws [[AnimationError]]
     *         id が示すパラメータはアニメーションに対応していない
     *
     * @throws [[TypeMismatchError]]
     *         id が示すパラメータの型と curve の型に互換性がないとき
     *
     * @see [[Binder]]
     *
     * @abstract
     */
    abstract bind( id: string, updater: Updater, curve: Curve ): void;


    /**
     * パラメータの結合を解除
     *
     * id が示すパラメータの結合を解除する。
     *
     * ただし this.isBound( id ) == false のときは何もしない。
     *
     * @param id  パラメータ ID
     */
    abstract unbind( id: string ): void;


    /**
     * すべてのパラメータの結合を解除
     *
     * 現在結合されているすべてのパラメータの結合を解除する。
     */
    abstract unbindAll(): void;


    /**
     * すべてのパラメータの結合を解除 (子孫含む)
     *
     * 現在結合されているすべてのパラメータの結合を解除する。
     *
     * もしパラメータを持つオブジェクトの子オブジェクトも BindingBlock
     *    インタフェースを持っていれば、子孫も含めて結合を解除する。
     */
    abstract unbindAllRecursively(): void;

}



namespace BindingBlock {



/**
 * アニメーション可能パラメータの情報
 *
 * @see [[BindingBlock.enumSupportedParameters]]
 */
export class Parameter {

    private _id: string;

    private _types: Type[];


    /**
     * @param id  パラメータ ID
     * @param types  サポートする型のリスト
     */
    constructor( id: string, types: Type[] )
    {
        this._id  = id;
        this._types = types.concat();  // 複製
    }


    /**
     * パラメータ ID
     */
    get id(): string { return this._id; }


    /**
     * サポートする型のリスト
     *
     * パラメータに結合可能なアニメーション関数の型の配列である。
     *
     * 配列は 1 またはそれ以上の型を含む。
     *
     * @see [[Curve.isTypeSupported]]
     */
    get types(): Type[] { return this._types; }

}



} // namespace BindingBlock



export default BindingBlock;
