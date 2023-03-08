import { expression } from "mapbox-gl/dist/style-spec/index.es.js";
import { Json, clone as json_clone } from "../util/json_type";
import { cfa_assert } from "../util/assertion";


/**
 * グローバルの状態
 *
 * @privateRemarks
 *
 * 元々の定義は `src/style-spec/expression/index.js` の
 * `GlobalProperties` にある。
 */
export interface Context {

    zoom: number

    /**
     * image 演算子のための画像名の配列
     *
     * これは Mapray が独自に追加したプロパティである。
     */
    image_names: string[];

}


/**
 * ジオメトリ種別の型
 *
 * @remarks `UNKNOWN` は存在しない。
 */
export const enum GeomType {

    POINT = 1,

    LINESTRING = 2,

    POLYGON = 3,

}


/**
 * フィーチャの定数情報
 *
 * @privateRemarks
 *
 * 元々の定義は `src/style-spec/expression/index.js` にある。
 */
export interface Feature {

    /**
     * ジオメトリ種別
     *
     * `vector_tile.proto` の `Tile.Feature.type` に対応する。
     */
    type: GeomType


    /**
     * フィーチャの識別子
     *
     * `vector_tile.proto` の `Tile.Feature.id` に対応する。
     */
    id?: number


    /**
     * プロパティの辞書
     *
     * `vector_tile.proto` の `Tile.Feature.tags` に対応する。
     */
    properties: { [key: string]: boolean | number | string }

}


/**
 * フィーチャの状態
 *
 * @privateRemarks
 *
 * 元々の定義は `src/style-spec/expression/index.js` にある。
 */
export interface FeatureState {

    [id: string]: unknown;

}


/**
 * `image` 演算子の評価値の型
 *
 * `style-spec/expression/types/resolved_image.js` を参考にした。
 */
export interface ResolvedImage {

    /**
     * 評価された画像名
     *
     * `image` 演算子の第 1 パラメータを評価した値が設定される。
     */
    name: string,

    /**
     * 画像の有無
     *
     * [[Context.image_names]] に `name` の値が存在するとき `true`, そ
     * れ以外のとき `false` が設定される。
     */
    available: boolean

}


/**
 * 式の仕様情報を表現する。
 *
 * この値は [[MapboxExpr.constructor]] の `expr_spec` 引数に指定される。
 */
export type Specification = {
    value_type:     'number';
    default_value?: number;
} | {
    value_type:     'string';
    default_value?: string;
} | {
    value_type:     'boolean';
    default_value?: boolean;
} | {
    value_type:     'color';
    default_value?: string;
} | {
    value_type:     'resolvedImage';
    default_value?: null;
} | {
    value_type:     'array';
    element_type:   'number';
    num_elements?:  number;
    default_value?: number[];
} | {
    value_type:     'array';
    element_type:   'string';
    num_elements?:  number;
    default_value?: string[];
}


/**
 * `expression.createExpression()` の引数の型
 *
 * @privateRemarks
 *
 * `src/style-spec/style-spec.js` を参考にした。
 */
type MBSpecification = {
    type:     string;
    value?:   number | string;
    length?:  number;
    default?: unknown;
}


/**
 * Mapbox スタイル仕様の式 (Expression) を表現する。
 *
 * 構築子に JSON 形式の式を与えて、評価可能な式インスタンスを生成する。
 *
 * 式インスタンスは {@link evaluate}() により評価し、その評価結果を得
 * ることができる。
 *
 * @remarks
 *
 * Mapbox スタイル仕様の式に関しては
 * {@link https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/
 * Expressions} を参照されたい。
 *
 * このクラスの実装は
 * {@link https://github.com/mapbox/mapbox-gl-js/issues/7670
 * Evaluate an expression, outside of rendering}
 * を参考にした。
 */
export class MapboxExpr {

    constructor( json_expr: Json );

    constructor( json_expr: Json,
                 expr_spec: Specification );

    constructor( json_expr:  Json,
                 value_type: Specification['value_type'] );


    /**
     * 初期化
     *
     * @param json_expr  - JSON 形式の式
     * @param expr_spec  - 式の仕様
     * @param value_type - 評価値の型
     *
     * @throws `Error`  構文解析または型検査に失敗
     */
    constructor( json_expr:     Json,
                 spec_or_type?: Specification | Specification['value_type'] )
    {
        // prop_spec は StylePropertySpecification 型に対応
        // 定義は style-spec/style-spec.js を参照

        let prop_spec: MBSpecification | undefined;

        if ( typeof spec_or_type === 'string' ) {
            const value_type: Specification['value_type'] = spec_or_type; // CFA 型検査
            prop_spec = { type: value_type };
        }
        else if ( spec_or_type !== undefined ) {
            const expr_spec: Specification = spec_or_type; // CFA 型検査
            prop_spec = MapboxExpr.createPropSpec( expr_spec );
        }
        else {
            // value_type も expr_spec も指定されていない
            spec_or_type as undefined; // CFA 型検査
            cfa_assert( prop_spec === undefined );
        }

        // json_expr の構文解析と型検査
        const { result, value } = expression.createExpression( json_expr, prop_spec );

        if ( result === 'success' ) {
            // ここでの value は StyleExpression 型
            this._style_expr = value;
        }
        else {  // result === 'error'
            // ここでの value は Array<ParsingError> 型
            // 複数のエラーが存在する可能性があるが、先頭だけを投げることにする
            throw value[0];
        }
    }


    /**
     * 生成: Specification -> MBSpecification
     */
    private static createPropSpec( expr_spec: Specification )
    {
        const prop_spec: MBSpecification = {
            type: expr_spec.value_type
        };

        if ( expr_spec.value_type === 'array' ) {
            if ( expr_spec.element_type !== undefined ) {
                prop_spec.value = expr_spec.element_type;
            }

            if ( expr_spec.num_elements !== undefined ) {
                prop_spec.length = expr_spec.num_elements;
            }
        }

        if ( expr_spec.default_value !== undefined ) {
            // 配列でありえるので deep copy が必要
            prop_spec.default = json_clone( expr_spec.default_value );
        }

        return prop_spec;
    }


    /**
     * 式インスタンスを評価する。
     *
     * [[constructor]] の `json_expr` 引数に与えた式を評価して、その評
     * 価値を返す。
     *
     * だだし、評価値が `expr_spec` 引数に与えた型と一致しないときは、
     * 既定値 (`expr_spec.default_value`) を返す。`expr_spec` に既定値
     * を指定していないときは `null` を返す。
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
        // 元々の evaluate() は style-spec/expression/index.js にある。

        // image_names が非 undefined で、canonical が undefined のと
        // きの動作が保証されているかどうかは不明
        const canonical = undefined; // CanonicalTileID

        return this._style_expr.evaluate( context, fdata, fstate, canonical, context.image_names );
    }


    /**
     * 構文解析済みの式オブジェクト
     *
     * @privateRemarks
     * 元々は StyleExpression 型で、定義は style-spec/expression/index.js にある。
     */
    private _style_expr: any;

}


/**
 * プロパティ値が式かどうかを確認する。
 *
 * @remarks 再帰的な検証は行わない。
 *
 * @param json_value  スタイルのプロパティに指定できる JSON 形式の値
 */
export function
isExpression( json_value: Json ): json_value is Json[]
{
    return expression.isExpression( json_value );
}
