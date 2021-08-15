import AnimationError from "./AnimationError";


/**
 * アニメーション値の型
 *
 * アニメーションする値の型を表現するための抽象クラスである。
 * Binder インスタンスと結合するパラメータ値の型と、Curve インスタンスが返却する値の型を表現する。
 *
 * Type の具象クラスのインスタンスは [[Type.register Type.register()]]
 *    により登録し、[[Type.find Type.find()]] により取得することができる。
 *
 * 特定の Type の具象クラスのインスタンスは 1 つしか存在しない。そのため Type インスタンスが表す型の同一性は
 *    `===` 演算子で判断することができる。
 */
abstract class Type
{
    private _name: string;

    /**
     * @param name  型の登録名
     */
    protected constructor( name: string )
    {
        this._name = name;
    }


    /**
     * 型名
     */
    get name(): string { return this._name; }


    /**
     * 変換可能か？
     *
     * from 型の値を this 型の値への変換が可能かどうかを返す。
     * this と from が同一なら、必ず true を返す。
     * このメソッドが true を返した場合は convertValue() により from 型の値を
     * this 型の値に変換することが可能である。
     *
     * @param from  変換元の型
     * @return  変換可能なら true, そうでないなら false
     *
     * @see {@link mapray.animation.Type.convertValue}
     */
    abstract isConvertible( from: Type ): boolean;


    /**
     * 値を変換
     *
     * value を this 型へ変換したオブジェクトを返す。
     * 変換結果が value と同じ値の場合、value 自身を返すことも可能である。
     *
     * 事前条件
     * - value は from 型のオブジェクトである
     * - this.isConvertible( from ) == true
     *
     * @param from  変換元の型
     * @param value 変換元の値 (from 型)
     * @return 変換された値 (this 型)
     *
     * @see {@link mapray.animation.Type.isConvertible}
     */
    abstract convertValue( from: Type, value: any ): any;


    /**
     * 既定値を取得
     *
     * this 型の既定値を返す。
     *
     * @return 既定値 (this 型)
     */
    abstract getDefaultValue(): any;


    /**
     * 値の複製を取得
     *
     * value の新しい複製を返す。
     * ただし value がイミュータブルの場合、value 自身を返すことも可能である。
     *
     * - 事前条件: value は this 型のオブジェクトである
     *
     * @param value  複製元の値 (this 型)
     * @return 複製された値 (this 型)
     */
    abstract getCloneValue( value: any ): any;


    /**
     * 型を登録
     *
     * 名前を name として type 型を登録する。
     * 登録された type は name により検索することができる。
     *
     * @param  name  型の名前
     * @param  type Type インスタンス
     * @return
     *
     * @throws {@link mapray.animation.Type.AlreadyRegisteredError}  name がすでに登録されているとき
     *
     * @see {@link mapray.animation.Type.find}
     */
    static register( name: string, type: Type ): Type
    {
        if ( type_register_map.has( name ) ) {
            // name はすでに登録済み
            throw new Type.AlreadyRegisteredError( "specified name (" + name + ") has already been registered" );
        }

        type_register_map.set( name, type );

        return type;
    }


    /**
     * 型を検索
     *
     * 名前が name として登録された Type インスタンスを返す。
     * name の型が登録されている場合、name に対して常に同じインスタンスを返す。
     *
     * @param  name  型の名前
     * @return 検索結果
     *
     * @throws {@link mapray.animation.Type.NotRegisteredError}  name に対応する型が登録されていないとき
     *
     * @see {@link mapray.animation.Type.register}
     */
    static find( name: string ): Type
    {
        let type = type_register_map.get( name );

        if ( type === undefined ) {
            // name は登録されていない
            throw new Type.NotRegisteredError( "type with the specified name (" + name + ") is not registered" );
        }

        return type;
    }

}



namespace Type {



/**
 * 型の多重登録エラー
 * @see {@link mapray.animation.Type.register}
 */
export class AlreadyRegisteredError extends AnimationError {

    /**
     * @param message  エラーの説明
     */
    constructor( message: string )
    {
        super( message );
        this.name = "mapray.animation.Type.AlreadyRegisteredError";
    }

}



/**
 * 型の未登録エラー
 * @see {@link mapray.animation.Type.find}
 */
export class NotRegisteredError extends AnimationError {

    /**
     * @param message  エラーの説明
     */
    constructor( message: string )
    {
        super( message );
        this.name = "mapray.animation.Type.NotRegisteredError";
    }

}



} // namespace Type



/**
 * 型の登録情報
 */
const type_register_map = new Map<string, Type>();


export default Type;
