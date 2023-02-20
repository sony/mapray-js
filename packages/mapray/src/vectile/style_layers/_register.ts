/**
 * @module
 *
 * すべてのスタイルレイヤー型を登録する関数 [[registerLayerTypes]] を
 * 定義する。
 *
 * 実装者は [[StyleLayer]] のサブクラスを新しく定義した場合、
 * `layer_module_list` 変数にモジュール情報を追加すること。
 */

import { registerLayerModule } from "../style_manager";
import type { LayerCreator } from "../style_manager";

import { SymbolLayer } from "./symbol";


/**
 * レイヤー型に対するモジュール情報
 */
interface LayerModule {

    /**
     * スタイルファイル上でのレイヤーの型名
     */
    layer_type: string;


    /**
     * [[StyleLayer]] インスタンスを生成する関数
     */
    creator: LayerCreator;


    /**
     * モジュールの準備完了を確認するためのオブジェクト
     *
     * @remarks
     *
     * モジュールの準備が必要ないレイヤーは設定不要である。
     */
    readiness?: Promise<void>;

}


/**
 * 各レイヤー型に対するモジュール情報のリストである。
 */
const layer_module_list: LayerModule[] = [
    // symbol layer
    {
        layer_type: 'symbol',
        creator:    ( owner, json_layer ) => new SymbolLayer( owner, json_layer ),
    },
];


/**
 * `vectile/style_layers/` で定義される、すべてのレイヤー型を登録する。
 *
 * @remarks
 *
 * この関数は `Viewer` モジュールが一度だけ (`Viewer` インスタンス毎で
 * はない) 呼び出す。
 */
export function registerLayerTypes(): void
{
    for ( const { layer_type, creator, readiness } of layer_module_list ) {

        registerLayerModule( layer_type,
                             creator,
                             readiness ?? Promise.resolve() );

    }
}
