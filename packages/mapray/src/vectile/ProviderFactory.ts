import { OJson } from "../util/json_type";
import { TileProvider } from "./TileProvider";
import { SpriteProvider } from "./SpriteProvider";


/**
 * ベクトル地図スタイル用の [[TileProvider]] と [[SpriteProvider]] の
 * インスタンスを生成するための抽象クラスである。
 *
 * @see [[StyleManager.constructor]]
 */
export abstract class ProviderFactory {

    protected constructor()
    {}


    /**
     * ベクトルタイルのデータソース情報に対応するプロバイダを生成する。
     *
     * `source_id` パラメータは
     * [sources](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/)
     * オブジェクトのプロパティ名に対応する。
     *
     * `json_source` パラメータは
     * [vector](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#vector)
     * オブジェクトの形式に従っている。
     *
     * `json_source.type` の値は常に `"vector"` であるが、その他のプロ
     * パティはオプションである。
     *
     * 実装はこれらのパラメータの情報を参照し、適切な [[TileProvider]]
     * インスタンスを返さなければならない。ただしそのようなプロバイダ
     * を判断できない、または生成できないときは `null` を返してもよい。
     *
     * @param source_id   - スタイルに記述されたソース ID
     * @param json_source - スタイルに記述されたソース情報
     */
    abstract createTileProvider( source_id:   string,
                                 json_source: OJson ): TileProvider | null;


    /**
     * スプライト指定に対応するプロバイダを生成する。
     *
     * `location` パラメータにはスタイルの
     * [sprite](https://docs.mapbox.com/mapbox-gl-js/style-spec/root/#sprite)
     * プロパティに記述された文字列が設定されて呼び出される。
     *
     * ただし、スタイルに `sprite` プロパティが存在しない場合、`location`
     * パラメータが省略されて呼び出される。
     *
     * 実装は `location` を参照し、適切な [[SpriteProvider]] インスタンスを
     * 返さなければならない。ただしそのようなプロバイダを判断できない、または
     * 生成できないときは `null` を返してもよい。
     *
     * @param location - スタイルに記述されたスプライト指定
     */
    abstract createSpriteProvider( location?: string ): SpriteProvider | null;

};
