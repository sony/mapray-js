/**
 * @module
 *
 * すべてのスタイルレイヤー型を登録する関数 [[registerLayerTypes]] を
 * 定義する。
 *
 * この関数は `Viewer` モジュールが一度だけ呼び出す。
 *
 * 実装者は [[StyleLayer]] のサブクラスを新しく定義した場合、
 * `layer_creator_list` 変数に情報を追加すること。
 */

import { registerLayerCreator } from "../style_manager";
import type { LayerCreator } from "../style_manager";

import { SymbolLayer } from "./symbol";


/**
 * レイヤー型に対する [[StyleLayer]] サブクラスのインスタンスを生成す
 * るための関数リストである。
 */
const layer_creator_list: {
    layer_type: string,        // スタイルファイル上でのレイヤーの型名
    creator:    LayerCreator,  // StyleLayer インスタンスを生成する関数
}[] = [
    {
        layer_type: 'symbol',
        creator:    ( owner, json_layer ) => new SymbolLayer( owner, json_layer ),
    },
];


/**
 * `vectile/style_layers/` で定義される、すべてのレイヤー型を登録する。
 */
export function registerLayerTypes(): void
{
    for ( const { layer_type, creator } of layer_creator_list ) {
        registerLayerCreator( layer_type, creator );
    }
}
