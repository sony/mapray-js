import Type from "./Type_impl.js";
import GeoMath from "../GeoMath";


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
     */
    constructor()
    {
        super( "boolean" );
    }


    /**
     * @private
     */
    _postinit()
    {
        this._number_type = Type.find( "number" );
        this._convertibles.add( this._number_type );
    }


    /**
     * @override
     */
    isConvertible( from: Type )
    {
        return this._convertibles.has( from );
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
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


    /**
     * @override
     */
    getDefaultValue()
    {
        return false;
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * @summary 数値型
 *
 * @classdesc
 * <p>登録名: "number"</p>
 * <p>実装型: number</p>
 * <p>次の型へ変換可能: {@link mapray.animation.BooleanType}</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class NumberType extends Type
{

    private _boolean_type?: Type;
    private _convertibles: Set<Type> = new Set( [this] );

    /**
     */
    constructor()
    {
        super( "number" );
    }


    /**
     * @private
     */
    _postinit()
    {
        this._boolean_type = Type.find( "boolean" );
        this._convertibles.add( this._boolean_type );
    }


    /**
     * @override
     */
    isConvertible( from: Type )
    {
        return this._convertibles.has( from );
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
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


    /**
     * @override
     */
    getDefaultValue()
    {
        return 0;
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * @summary 文字列型
 *
 * @classdesc
 * <p>登録名: "string"</p>
 * <p>実装型: string</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class StringType extends Type
{

    /**
     */
    constructor()
    {
        super( "string" );
    }


    /**
     * @private
     */
    _postinit()
    {
    }


    /**
     * @override
     */
    isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
    {
        return value;
    }


    /**
     * @override
     */
    getDefaultValue()
    {
        return "";
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return value;
    }

}


/**
 * @summary 2 次ベクトル型
 *
 * @classdesc
 * <p>登録名: "vector2"</p>
 * <p>実装型: {@link mapray.Vector2}</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class Vector2Type extends Type
{

    /**
     */
    constructor()
    {
        super( "vector2" );
    }


    /**
     * @private
     */
    _postinit()
    {
    }


    /**
     * @override
     */
    isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
    {
        return value;
    }


    /**
     * @override
     */
    getDefaultValue()
    {
        return GeoMath.createVector2();
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return GeoMath.createVector2( value );
    }

}


/**
 * @summary 3 次ベクトル型
 *
 * @classdesc
 * <p>登録名: "vector3"</p>
 * <p>実装型: {@link mapray.Vector3}</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class Vector3Type extends Type
{

    /**
     */
    constructor()
    {
        super( "vector3" );
    }


    /**
     * @private
     */
    _postinit()
    {
    }


    /**
     * @override
     */
    isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
    {
        return value;
    }


    /**
     * @override
     */
    getDefaultValue()
    {
        return GeoMath.createVector3();
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return GeoMath.createVector3( value );
    }

}


/**
 * @summary 4 次ベクトル型
 *
 * @classdesc
 * <p>登録名: "vector4"</p>
 * <p>実装型: {@link mapray.Vector4}</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class Vector4Type extends Type
{

    /**
     */
    constructor()
    {
        super( "vector4" );
    }


    /**
     * @private
     */
    _postinit()
    {
    }


    /**
     * @override
     */
    isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
    {
        return value;
    }


    /**
     * @override
     */
    getDefaultValue()
    {
        return GeoMath.createVector4();
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return GeoMath.createVector4( value );
    }

}


/**
 * @summary 行列型
 *
 * @classdesc
 * <p>登録名: "matrix"</p>
 * <p>実装型: {@link mapray.Matrix}</p>
 *
 * @memberof mapray.animation
 * @extends mapray.animation.Type
 * @hideconstructor
 */
class MatrixType extends Type
{

    /**
     */
    constructor()
    {
        super( "matrix" );
    }


    /**
     * @private
     */
    _postinit()
    {
    }


    /**
     * @override
     */
    isConvertible( from: Type ): boolean
    {
        return from === this;
    }


    /**
     * @override
     */
    convertValue( from: Type, value: any )
    {
        return value;
    }


    /**
     * @override
     */
    getDefaultValue()
    {
        return GeoMath.setIdentity( GeoMath.createMatrix() );
    }


    /**
     * @override
     */
    getCloneValue( value: any )
    {
        return GeoMath.createMatrix( value );
    }

}


/**
 * @summary 事前定義型を登録
 *
 * @private
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
        type._postinit();
    }
}
