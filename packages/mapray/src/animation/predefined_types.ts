import Type from "./Type_impl.js";
import GeoMath, { Vector3 } from "../GeoMath";


/**
 * 真理値型
 *
 * - 登録名: "boolean"
 * - 実装型: boolean
 * 次の型へ変換可能: {@link mapray.animation.NumberType}
 */
class BooleanType extends Type
{

    private _number_type?: Type;
    private _convertibles: Set<Type> = new Set( [this] );

    /**
     * @internal
     */
    constructor()
    {
        super( "boolean" );
    }


    /**
     * @internal
     */
    postinit()
    {
        this._number_type = Type.find( "number" );
        this._convertibles.add( this._number_type );
    }


    override isConvertible( from: Type )
    {
        return this._convertibles.has( from );
    }


    override convertValue( from: Type, value: any )
    {
        if ( from === this ) {
            // 同一型
            return value;
        }
        else {
            // assert: from === this._number_type
            return value >= 0.5;
        }
    }


    override getDefaultValue()
    {
        return false;
    }


    override getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * 数値型
 *
 * | 登録名 | "number" |
 * | 実装型 | number |
 * | 次の型へ変換可能 | [[BooleanType]] |
 */
class NumberType extends Type
{

    private _boolean_type?: Type;
    private _convertibles: Set<Type> = new Set( [this] );

    /**
     * @internal
     */
    constructor()
    {
        super( "number" );
    }


    /**
     * @internal
     */
    postinit()
    {
        this._boolean_type = Type.find( "boolean" );
        this._convertibles.add( this._boolean_type );
    }


    override isConvertible( from: Type )
    {
        return this._convertibles.has( from );
    }


    override convertValue( from: Type, value: any )
    {
        if ( from === this ) {
            // 同一型
            return value;
        }
        else {
            // assert: from === this._boolean_type
            return value ? 1 : 0;
        }
    }


    override getDefaultValue()
    {
        return 0;
    }


    override getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * 文字列型
 *
 * - 登録名: "string"
 * - 実装型: string
 */
class StringType extends Type
{

    /**
     * @internal
     */
    constructor()
    {
        super( "string" );
    }


    /**
     * @internal
     */
    postinit()
    {
    }


    override isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    override convertValue( from: Type, value: any )
    {
        return value;
    }


    override getDefaultValue()
    {
        return "";
    }


    override getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * 2 次ベクトル型
 *
 * | 登録名 | "vector2" |
 * | 実装型 | [[Vector2]] |
 */
class Vector2Type extends Type
{

    /**
     * @internal
     */
    constructor()
    {
        super( "vector2" );
    }


    /**
     * @internal
     */
    postinit()
    {
    }


    override isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    override convertValue( from: Type, value: any )
    {
        return value;
    }


    override getDefaultValue()
    {
        return GeoMath.createVector2();
    }


    override getCloneValue( value: any )
    {
        return GeoMath.createVector2( value );
    }

}


/**
 * 3 次ベクトル型
 *
 * | 登録名 | "vector3" |
 * | 実装型 | [[Vector3]] |
 */
class Vector3Type extends Type
{

    /**
     * @internal
     */
    constructor()
    {
        super( "vector3" );
    }


    /**
     * @internal
     */
    postinit()
    {
    }


    override isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    override convertValue( from: Type, value: any )
    {
        return value;
    }


    override getDefaultValue()
    {
        return GeoMath.createVector3();
    }


    override getCloneValue( value: any )
    {
        return GeoMath.createVector3( value );
    }

}


/**
 * 4 次ベクトル型
 *
 * | 登録名 | "vector4" |
 * | 実装型 | {@link mapray.Vector4} |
 */
class Vector4Type extends Type
{

    /**
     * @internal
     */
    constructor()
    {
        super( "vector4" );
    }


    /**
     * @internal
     */
    postinit()
    {
    }


    override isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    override convertValue( from: Type, value: any )
    {
        return value;
    }


    override getDefaultValue()
    {
        return GeoMath.createVector4();
    }


    override getCloneValue( value: any )
    {
        return GeoMath.createVector4( value );
    }

}


/**
 * 行列型
 *
 * | 登録名 | "matrix" |
 * | 実装型 | [[Matrix]] |
 */
class MatrixType extends Type
{

    /**
     * @internal
     */
    constructor()
    {
        super( "matrix" );
    }


    /**
     * @internal
     */
    postinit()
    {
    }


    override isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    override convertValue( from: Type, value: any )
    {
        return value;
    }


    override getDefaultValue()
    {
        return GeoMath.setIdentity( GeoMath.createMatrix() );
    }


    override getCloneValue( value: any )
    {
        return GeoMath.createMatrix( value );
    }

}


/**
 * 事前定義型を登録
 */
export function
registerPredefinedTypes()
{
    const type_classes = [
        BooleanType,
        NumberType,
        StringType,
        Vector3Type,
        Vector2Type,
        Vector4Type,
        MatrixType
    ];

    const type_instances = [];

    // 型を登録
    for ( let type_class of type_classes ) {
        let type = new type_class();
        Type.register( type.name, type );
        type_instances.push( type );
    }

    // 登録後の処理
    for ( let type of type_instances ) {
        type.postinit();
    }
}
