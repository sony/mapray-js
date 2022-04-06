/**
 * JSON のデータ型に関する機能
 *
 * @module
 */


/**
 * JSON オブジェクトの型
 */
export type Json = boolean | number | string | null | Json[] | OJson;


/**
 * object 型の JSON オブジェクトの型
 */
export interface OJson {

    [key: string]: Json | undefined;

}


/**
 * object 型の JSON オブジェクトかどうかを検証
 *
 * @remarks 再帰的な検証は行わない。
 */
export function
isObject( x: Json | undefined ): x is OJson
{
    return typeof x === 'object' && x !== null && !(x instanceof Array);
}


/**
 * array 型の JSON オブジェクトかどうかを検証
 *
 * @remarks 再帰的な検証は行わない。
 */
export function
isArray( x: Json | undefined ): x is Json[]
{
    return x instanceof Array;
}


/**
 * `x` と同じ内容のオブジェクトを生成する。
 */
export function
clone<T extends Json | undefined>( x: T ): T
{
    if ( isObject( x ) ) {
        // object を deep copy
        const o_json: any = {};  // TODO: OJson にすると return でエラー
        for ( const prop in x ) {
            o_json[prop] = clone( x[prop] );
        }
        return o_json;
    }
    else if ( isArray( x ) ) {
        // array を deep copy
        const a_json: any = [];  // TODO: Json[] にすると return でエラー
        for ( const elem of x ) {
            a_json.push( elem );
        }
        return a_json;
    }
    else {
        // 値オブジェクトなので複製なし
        return x;
    }
}
