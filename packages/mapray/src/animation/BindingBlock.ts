/**
 * @summary アニメーション設定の標準インタフェース
 *
 * @classdesc
 * <p>オブジェクトのアニメーション可能パラメータにアニメーションを設定 (バインド)
 +    するための標準的なインタフェースを提供する。<p>
 *
 * <p>具体的には内部で各パラメータに適した {@link mapray.animation.Binder Binder}
 *    インスタンスの生成し、ユーザーが簡単にアニメーションを設定できるようにする。<p>
 *
 * <p>一般的に、アニメーション可能パラメータを持つオブジェクトの <em>animation</em>
 *    プロパティから、このインタフェースを得ることができる。<p>
 *
 * <p>注意: アニメーションを設定しているパラメータは
 *    {@link mapray.animation.Updater Updater} のメソッドを通してのみ更新することができる。
 *    それ以外の手段でパラメータを更新した場合はパラメータ値に矛盾が生じる可能性がある。<p>
 *
 * @see {@link mapray.animation.Binder}
 * @see {@link mapray.animation.Updater}
 *
 * @memberof mapray.animation
 * @abstract
 */
class BindingBlock
{

    /**
     * @protected
     */
    constructor()
    {
    }


    /**
     * @summary アニメーション可能パラメータの情報を取得
     *
     * @desc
     * <p>アニメーションに対応したパラメータの情報を配列として取得する。</p>
     * <p>返される配列は 0 個またはそれ以上の要素を含み、要素間のパラメータ ID は重複しない。</p>
     * <p>this の生存期間中、(順序以外) 常に同じ内容を返す。</p>
     *
     * @return {mapray.animation.BindingBlock.Parameter[]}
     *
     * @abstract
     */
    enumSupportedParameters()
    {
        this._override_error( "enumSupportedParameters" );
    }


    /**
     * @summary パラメータは結合中か？
     *
     * @desc
     * <p>id が示すパラメータが結合されているとき true, 結合されていないとき false を返す。</p>
     * <p>ただし id が示すパラメータがアニメーションに対応していないときは false を返す。</p>
     *
     * @param {string} id  パラメータ ID
     *
     * @return {boolean}
     *
     * @abstract
     */
    isBound( id )
    {
        this._override_error( "isBound" );
    }


    /**
     * @summary パラメータに結合されている Updater インスタンスを取得
     *
     * @desc
     * <p>id が示すパラメータが結合されている Updater インスタンスを返す。</p>
     * <p>ただし this.isBound( id ) == false のときは null を返す。</p>
     *
     * @param {string} id  パラメータ ID
     *
     * @return {?mapray.animation.Updater}
     *
     * @abstract
     */
    getBoundUpdater( id )
    {
        this._override_error( "getBoundUpdater" );
    }


    /**
     * @summary パラメータに結合されている Curve インスタンスを取得
     *
     * @desc
     * <p>id が示すパラメータが結合されている Curve インスタンスを返す。</p>
     * <p>ただし this.isBound( id ) == false のときは null を返す。</p>
     *
     * @param {string} id  パラメータ ID
     *
     * @return {?mapray.animation.Curve}
     *
     * @abstract
     */
    getBoundCurve( id )
    {
        this._override_error( "getBoundCurve" );
    }


    /**
     * @summary パラメータにアニメーションを結合
     *
     * @desc
     * <p>id が示すパラメータと updater と curve を結びつける。ただし、すでに id
     *    が示すパラメータに結合があれば、先にその結合を解除してから行う。</p>
     *
     * <p>パラメータが結合されている間、updater によりそのパラメータを更新することができる。</p>
     *
     * @param {string}                        id  パラメータ ID
     * @param {mapray.animation.Updater} updater  アニメーションパラメータ更新管理
     * @param {mapray.animation.Curve}     curve  アニメーション関数
     *
     * @throws {@link mapray.animation.AnimationError}
     *         id が示すパラメータはアニメーションに対応していない
     *
     * @throws {@link mapray.animation.TypeMismatchError}
     *         id が示すパラメータの型と curve の型に互換性がないとき
     *
     * @see {@link mapray.animation.Binder}
     *
     * @abstract
     */
    bind( id, updater, curve )
    {
        this._override_error( "bind" );
    }


    /**
     * @summary パラメータの結合を解除
     *
     * @desc
     * <p>id が示すパラメータの結合を解除する。</p>
     * <p>ただし this.isBound( id ) == false のときは何もしない。</p>
     *
     * @param {string} id  パラメータ ID
     *
     * @abstract
     */
    unbind( id )
    {
        this._override_error( "unbind" );
    }


    /**
     * @summary すべてのパラメータの結合を解除
     *
     * @desc
     * <p>現在結合されているすべてのパラメータの結合を解除する。</p>
     *
     * @abstract
     */
    unbindAll()
    {
        this._override_error( "unbindAll" );
    }


    /**
     * @summary すべてのパラメータの結合を解除 (子孫含む)
     *
     * @desc
     * <p>現在結合されているすべてのパラメータの結合を解除する。</p>
     * <p>もしパラメータを持つオブジェクトの子オブジェクトも BindingBlock
     *    インタフェースを持っていれば、子孫も含めて結合を解除する。</p>
     *
     * @abstract
     */
    unbindAllRecursively()
    {
        this._override_error( "unbindAllRecursively" );
    }


    /**
     * @summary メソッドがオーバーライドされていない
     *
     * arguments.callee と Error#stack は互換性が低いので、関数名の取得に使わなかった
     *
     * @param {string} func_name
     *
     * @private
     */
    _override_error( func_name )
    {
        throw new Error( "BindingBlock#" + func_name + "() method has not been overridden in "
                         + this.constructor.name );
    }

}


/**
 * @summary アニメーション可能パラメータの情報
 *
 * @see {@link mapray.animation.BindingBlock#enumSupportedParameters}
 * @memberof mapray.animation.BindingBlock
 */
class Parameter {

    /**
     * @param {string}                     id  パラメータ ID
     * @param {mapray.animation.Type[]} types  サポートする型のリスト
     */
    constructor( id, types )
    {
        this._id    = id;
        this._types = types.concat();  // 複製
    }


    /**
     * @summary パラメータ ID
     *
     * @type {string}
     *
     * @readonly
     */
    get id() { return this._id; }


    /**
     * @summary サポートする型のリスト
     *
     * @desc
     * <p>パラメータに結合可能なアニメーション関数の型の配列である。</p>
     * <p>配列は 1 またはそれ以上の型を含む。</p>
     *
     * @type {mapray.animation.Type[]}
     *
     * @see {@link mapray.animation.Curve#isTypeSupported}
     *
     * @readonly
     */
    get types() { return this._types; }

}
BindingBlock.Parameter = Parameter;


export default BindingBlock;
