import { ProviderFactory } from "./ProviderFactory";
import { Provider } from "./provider";
import { OJson } from "../util/json_type";
import { StandardProvider } from "./StandardProvider";


/**
 * 機能が単純な [[ProviderFactory]] の実装クラスである。
 *
 * - 生成されるすべてのプロバイダは、[[StandardProvider]] インスタンス
 *   に限定される。これらは同じオプションで生成される。
 *
 * - プロバイダが生成されるソースは
 *   [url](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#vector-url)
 *   プロパティの値が `http://` または `https://` で始まり `/` で終わ
 *   るものに限られる。
 *
 * - この `url` プロパティの値が [[StandardProvider.constructor]] の
 *   `prefix` パラメータとして使用される。
 */
export class SimpleProviderFactory extends ProviderFactory {

    /**
     * @param provider_options - [[StandardProvider]] インスタンスの生
     *                           成に使用されるオプション
     */
    constructor( provider_options?: StandardProvider.Option )
    {
        super();

        // 複製するべきだが省略する
        this._provider_options = provider_options;
    }


    // from ProviderFactory
    override create( _source_id: string,
                     json_source: OJson ): Provider | null
    {
        if ( typeof json_source['url'] !== 'string' ) {
            // url プロパティが指定されていない
            return null;
        }

        const url = json_source['url'];

        if ( !SimpleProviderFactory._url_regex.test( url ) ) {
            // パターンに一致しない URL は対象外
            return null;
        }

        return new StandardProvider( url, this._provider_options );
    }


    /**
     * 対象とする URL のパターン
     */
    private static readonly _url_regex = new RegExp( "^https?://.+/$" );


    /**
     * プロバイダ生成オプション
     */
    private readonly _provider_options?: StandardProvider.Option;

}
