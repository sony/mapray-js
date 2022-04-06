import { OJson } from "../util/json_type";
import { Provider } from "./provider";


/**
 * ベクトル地図スタイル用の [[Provider]] インスタンスを生成する。
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
     * 実装はこれらのパラメータの情報を参照し、適切な [[Provider]]
     * インスタンスを返さなければならない。ただしそのようなプロバイダ
     * を判断できない、または生成できないときは `null` を返す。
     *
     * @param source_id    スタイルに記述されたソース ID
     * @param json_source  スタイルに記述されたソース情報
     */
    abstract create( source_id:   string,
                     json_source: OJson ): Provider | null;

};
