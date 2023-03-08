/**
 * ベクトル地図のレイヤープロパティに関連する機能を提供する。
 *
 * @module
 */

import { Json } from "../util/json_type";
import { MapboxExpr,
         Context,
         Feature,
         FeatureState,
         Specification as ExprSpec,
         isExpression } from "./expression";


/**
 * レイヤーのプロパティの仕様情報を表現する。
 */
export type Specification = {

    /**
     * プロパティ名
     */
    name: string;


    /**
     * プロパティ種別
     */
    category: 'paint' | 'layout';

} & ExprSpec;


/**
 * Property クラス内で使う。
 */
interface Evaluator {

    evaluate( context: Context,
              fdata?:  Feature,
              fstate?: FeatureState ) : unknown;

}


/**
 * Property クラス内で使う。
 */
class ConstantEvaluator implements Evaluator {

    constructor( value: unknown )
    {
        this._value = value;
    }

    evaluate()
    {
        return this._value;
    }

    private _value: unknown;

}


/**
 * 定数式または色リテラルを評価する Evaluator インスタンスを生成
 */
function
createConstantEvaluator( context: Context,
                         json_value: Json,
                         prop_spec:  Specification ): Evaluator
{
    const expr = new MapboxExpr( json_value, prop_spec );

    return new ConstantEvaluator( expr.evaluate( context ) );
}


/**
 * レイヤー内のプロパティ値を表現する。
 */
export class Property {

    /**
     * プロパティ名
     */
    public readonly name: string;


    /**
     * @throws {Error}  構文解析または型検査に失敗
     *
     * @param prop_spec   プロパティの仕様情報
     * @param json_value  スタイルで指定されたプロパティ値
     */
    constructor( context: Context,
                 prop_spec: Specification,
                 json_value?: Json )
    {
        this.name        = prop_spec['name'];
        this._is_layout  = (prop_spec['category'] === 'layout');
        this._has_zoom   = false;
        this._has_fdata  = false;
        this._has_fstate = false;

        let evaluator: Evaluator;

        // this._evaluator の設定
        if ( json_value !== undefined ) {
            /* プロパティが指定された */

            if ( isExpression( json_value ) ) {
                // プロパティは式である
                this.analyzeExpression( json_value );

                if ( this.isConstant() ) {
                    // 定数式
                    evaluator = createConstantEvaluator( context, json_value, prop_spec );
                }
                else {
                    // 非定数式
                    evaluator = new MapboxExpr( json_value, prop_spec );
                }
            }
            else if ( typeof json_value === 'string' && prop_spec['value_type'] === 'color' ) {
                // プロパティは色リテラル
                evaluator = createConstantEvaluator( context, json_value, prop_spec );
            }
            else {
                // プロパティはその他のリテラル
                // TODO: 型チェックする
                evaluator = new ConstantEvaluator( json_value );
            }
        }
        else {
            /* プロパティは指定されなかった */

            // 既定値が存在すれば、その値に評価するようにする
            const default_value = prop_spec['default_value'];

            let constant_value;

            if ( default_value !== undefined ) {
                if ( prop_spec['value_type'] === 'color' ) {
                    // color 型のプロパティは、値が指定されていないとき
                    // default_value を色オブジェクトに変換したものに評価
                    const to_color = createConstantEvaluator( context, default_value, prop_spec );
                    constant_value = to_color.evaluate( context );
                }
                else {
                    // color 型以外のプロパティは、値が指定されていないとき default_value に評価
                    constant_value = default_value;
                }
            }
            else {
                // 既定値が指定されていないときは null に評価
                constant_value = null;
            }

            evaluator = new ConstantEvaluator( constant_value );
        }

        this._evaluator = evaluator;
    }


    /**
     * `layout` に属するプロパティか？
     */
    isLayoutType(): boolean
    {
        return this._is_layout;
    }


    /**
     * 式の評価値は状態によらず一定値であるか？
     *
     * これは
     * `!this.hasZoom() && !this.hasFData() && !this.hasFState()`
     * と同値である。
     */
    private isConstant(): boolean
    {
        return !this._has_zoom && !this._has_fdata && !this._has_fstate;
    }


    /**
     * 式は `zoom` 演算が評価される可能性があるか？
     */
    hasZoom(): boolean
    {
        return this._has_zoom;
    }


    /**
     * 式はフィーチャデータを使った演算が評価される可能性があるか？
     */
    hasFData(): boolean
    {
        return this._has_fdata;
    }


    /**
     * 式はフィーチャ状態を使った演算が評価される可能性があるか？
     */
    hasFState(): boolean
    {
        return this._has_fstate;
    }


    /**
     * 式インスタンスを評価する。
     *
     * [[constructor]] の `json_expr` に与えた式を評価して、その評価値
     * を返す。
     *
     * だだし、評価値が `prop_spec` に与えた型と一致しないときは、既定
     * 値 (`prop_spec.default_value`) を返す。`prop_spec` に既定値を指
     * 定していないときは `null` を返す。
     *
     * @param context - グローバルの状態
     * @param fdata   - フィーチャの固定情報
     * @param fstate  - フィーチャの状態
     *
     * @returns  評価結果を表すオブジェクト
     */
    evaluate( context: Context,
              fdata?:  Feature,
              fstate?: FeatureState ) : unknown
    {
        return this._evaluator.evaluate( context, fdata, fstate );
    }


    /**
     * `json_expr` を解析して、`this._has_*` プロパティを設定する。
     *
     *  TODO: `let` などの評価が特殊な式も考慮する必要がある。
     */
    private analyzeExpression( json_expr: Json[] ): void
    {
        const op = json_expr[0];  // 演算子

        if ( op === 'literal' ) {
            // 引数は評価されないので無視
            return;
        }
        else if ( op === 'zoom' ) {
            this._has_zoom = true;
        }
        else if ( op === 'feature-state' ) {
            this._has_fstate = true;
        }
        else if ( ((op === 'get' || op === 'has') && json_expr.length === 2) ||
                  op === 'id' || op === 'geometry-type' || op === 'properties' ) {
            this._has_fdata = true;
        }

        // op のすべての引数を解析
        for ( let i = 1; i < json_expr.length; ++i ) {
            const arg = json_expr[i];
            if ( isExpression( arg ) ) {
                this.analyzeExpression( arg );
            }
        }
    }


    private readonly _is_layout: boolean;
    private   _has_zoom: boolean;
    private  _has_fdata: boolean;
    private _has_fstate: boolean;
    private readonly _evaluator: Evaluator;

}
