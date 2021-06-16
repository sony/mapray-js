import AnimationError from "./AnimationError";


/**
 * @summary アニメーション値の型
 *
 * @classdesc
 * <p>アニメーションする値の型を表現するための抽象クラスである。</p>
 * <p>Binder インスタンスと結合するパラメータ値の型と、Curve インスタンスが返却する値の型を表現する。</p>
 *
 * <p>Type の具象クラスのインスタンスは {@link mapray.animation.Type.register}()
 *    により登録し、{@link mapray.animation.Type.find}() により取得することができる。</p>
 *
 * <p>特定の Type の具象クラスのインスタンスは 1 つしか存在しない。そのため Type インスタンスが表す型の同一性は
 *    === 演算子で判断することができる。</p>
 *
 * @abstract
 * @memberof mapray.animation
 */
class Type
{

    /**
     * @param {string} name  型の登録名
     * @protected
     */
    constructor( name )
    {
        this._name = name;
    }


    /**
     * @summary 型名
     *
     * @type {string}
     * @readonly
     */
    get name() { return this._name; }


    /**
     * @summary 変換可能か？
     *
     * @desc
     * <p>from 型の値を this 型の値への変換が可能かどうかを返す。</p>
     * <p>this と from が同一なら、必ず true を返す。</p>
     * <p>このメソッドが true を返した場合は convertValue() により from 型の値を
     *    this 型の値に変換することが可能である。</p>
     *
     * @param {mapray.animation.Type} from  変換元の型
     *
     * @return {boolean}  変換可能かなら true, そうでないなら false
     *
     * @see {@link mapray.animation.Type#convertValue}
     *
     * @abstract
     */
    isConvertible( from )
    {
        this._override_error( "isConvertible" );
    }


    /**
     * @summary 値を変換
     *
     * @desc
     * <p>value を this 型へ変換したオブジェクトを返す。</p>
     * <p>変換結果が value と同じ値の場合、value 自身を返すことも可能である。</p>
     *
     * <p>事前条件1: value は from 型のオブジェクトである<br>
     *    事前条件2: this.isConvertible( from ) == true</p>
     *
     * @param {mapray.animation.Type} from  変換元の型
     * @param {object}               value  変換元の値 (from 型)
     *
     * @return {object}  変換された値 (this 型)
     *
     * @see {@link mapray.animation.Type#isConvertible}
     *
     * @abstract
     */
    convertValue( from, value )
    {
        this._override_error( "convertValue" );
    }


    /**
     * @summary 既定値を取得
     *
     * @desc
     * <p>this 型の既定値を返す。</p>
     *
     * @return {object}  既定値 (this 型)
     *
     * @abstract
     */
    getDefaultValue()
    {
        this._override_error( "getDefaultValue" );
    }


    /**
     * @summary 値の複製を取得
     *
     * @desc
     * <p>value の新しい複製を返す。</p>
     * <p>ただし value がイミュータブルの場合、value 自身を返すことも可能である。</p>
     *
     * <p>事前条件: value は this 型のオブジェクトである</p>
     *
     * @param {object} value  複製元の値 (this 型)
     *
     * @return {object}  複製された値 (this 型)
     *
     * @abstract
     */
    getCloneValue( value )
    {
        this._override_error( "getCloneValue" );
    }


    /**
     * @summary 型を登録
     *
     * @desc
     * <p>名前を name として type 型を登録する。</p>
     * <p>登録された type は name により検索することができる。</p>
     *
     * @param {string}                name  型の名前
     * @param {mapray.animation.Type} type  Type インスタンス
     *
     * @return {mapray.animation.Type}  type
     *
     * @throws {@link mapray.animation.Type.AlreadyRegisteredError}  name がすでに登録されているとき
     *
     * @see {@link mapray.animation.Type.find}
     */
    static
    register( name, type )
    {
        if ( type_register_map.has( name ) ) {
            // name はすでに登録済み
            throw new AlreadyRegisteredError( "specified name (" + name + ") has already been registered" );
        }

        type_register_map.set( name, type );

        return type;
    }


    /**
     * @summary 型を検索
     *
     * @desc
     * <p>名前が name として登録された Type インスタンスを返す。</p>
     *
     * <p>name の型が登録されている場合、name に対して常に同じインスタンスを返す。
     *
     * @param {string} name  型の名前
     *
     * @return {mapray.animation.Type}
     *
     * @throws {@link mapray.animation.Type.NotRegisteredError}  name に対応する型が登録されていないとき
     *
     * @see {@link mapray.animation.Type.register}
     */
    static
    find( name )
    {
        let type = type_register_map.get( name );

        if ( type === undefined ) {
            // name は登録されていない
            throw new NotRegisteredError( "type with the specified name (" + name + ") is not registered" );
        }

        return type;
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
        throw new Error( "Type#" + func_name + "() method has not been overridden in "
                         + this.constructor.name );
    }

}


/**
 * @summary 型の多重登録エラー
 *
 * @memberof mapray.animation.Type
 * @extends mapray.animation.AnimationError
 *
 * @see {@link mapray.animation.Type.register}
 */
class AlreadyRegisteredError extends AnimationError {

    /**
     * @param {string} message  エラーの説明
     */
    constructor( message )
    {
        super( message );
        this.name = "mapray.animation.Type.AlreadyRegisteredError";
    }

}
Type.AlreadyRegisteredError = AlreadyRegisteredError;


/**
 * @summary 型の未登録エラー
 *
 * @memberof mapray.animation.Type
 * @extends mapray.animation.AnimationError
 *
 * @see {@link mapray.animation.Type.find}
 */
class NotRegisteredError extends AnimationError {

    /**
     * @param {string} message  エラーの説明
     */
    constructor( message )
    {
        super( message );
        this.name = "mapray.animation.Type.NotRegisteredError";
    }

}
Type.NotRegisteredError = NotRegisteredError;


/**
 * @summary 型の登録情報
 *
 * @type {Map.<string, mapray.animation.Type>}
 * @readonly
 *
 * @private
 */
const type_register_map = new Map();


export default Type;
