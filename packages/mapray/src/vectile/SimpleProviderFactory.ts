import { ProviderFactory } from "./ProviderFactory";
import { StandardTileProvider } from "./StandardTileProvider";
import { StandardSpriteProvider } from "./StandardSpriteProvider";
import type { TileProvider } from "./TileProvider";
import type { SpriteProvider } from "./SpriteProvider";
import type { OJson } from "../util/json_type";


/**
 * 機能が単純な [[ProviderFactory]] の実装クラスである。
 *
 * タイル用のプロバイダに関しては次の制限がある。
 *
 * - 生成されるすべての [[TileProvider]] インスタンスは、
 *   [[StandardTileProvider]] インスタンスに限定される。
 * - スタイルにソースが複数存在する場合でも、[[StandardTileProvider]]
 *   インスタンスの生成には同じオプションしか使用されない。
 * - [[StandardTileProvider]] インスタンスが生成されるソースは、スタイルの
 *   [url](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#vector-url)
 *   プロパティの値が `http://` または `https://` で始まり `/` で終わ
 *   るものに限られる。
 * - この `url` プロパティの値が [[StandardTileProvider.constructor]] の
 *   `prefix` パラメータとして使用される。
 *
 * スプライト用のプロバイダに関しては次の制限がある。
 *
 * - 生成されるすべての [[SpriteProvider]] インスタンスは、
 *   [[StandardSpriteProvider]] インスタンスに限定される。
 * - [[StandardSpriteProvider]] インスタンスが生成されるスプライトは、スタイルの
 *   [sprite](https://docs.mapbox.com/mapbox-gl-js/style-spec/root/#sprite)
 *   プロパティの値が `http://` または `https://` で始まるものに限られる。
 * - この `sprite` プロパティの値が [[StandardSpriteProvider.constructor]]
 *   の `prefix` パラメータとして使用される。
 * - ただし `sprite` プロパティが存在しない場合、スプライト用のプロバイダ
 *   は生成しない。
 */
class SimpleProviderFactory extends ProviderFactory {

    /**
     * 初期化
     *
     * @param options - プロバイダのインスタンス生成に使用されるオプション
     *
     * @remarks
     *
     * `this` が使用されている間に `options` の内容を変更したときの動作は
     *  未定義である。
     */
    constructor( options?: SimpleProviderFactory.Option )
    {
        super();

        // 複製するべきだが省略する
        this._tile_options   = options?.tile_options;
        this._sprite_options = options?.sprite_options;
    }


    // from ProviderFactory
    override createTileProvider( _source_id: string,
                                 json_source: OJson ): TileProvider | null
    {
        if ( typeof json_source['url'] !== 'string' ) {
            // url プロパティが指定されていない
            return null;
        }

        const url = json_source['url'];

        if ( !SimpleProviderFactory._tile_url_regex.test( url ) ) {
            // パターンに一致しない URL は対象外
            return null;
        }

        return new StandardTileProvider( url, this._tile_options );
    }


    // from ProviderFactory
    override createSpriteProvider( location?: string ): SpriteProvider | null
    {
        if ( !location ) {
            // スタイルに sprite プロパティが存在しない
            return null;
        }

        if ( !SimpleProviderFactory._sprite_url_regex.test( location ) ) {
            // パターンに一致しない URL は対象外
            return null;
        }

        return new StandardSpriteProvider( location, this._sprite_options );
    }


    /**
     * 対象とする URL のパターン (タイル)
     */
    private static readonly _tile_url_regex = new RegExp( "^https?://.+/$" );


    /**
     * 対象とする URL のパターン (スプライト)
     */
    private static readonly _sprite_url_regex = new RegExp( "^https?://.+$" );


    /**
     * `StandardTileProvider` 生成オプション
     */
    private readonly _tile_options?: StandardTileProvider.Option;


    /**
     * `StandardSpriteProvider` 生成オプション
     */
    private readonly _sprite_options?: StandardSpriteProvider.Option;

}


namespace SimpleProviderFactory {


/**
 * プロバイダ生成のオプションの型
 *
 * @see [[SimpleProviderFactory.constructor]]
 */
export interface Option {

    /**
     * [[StandardTileProvider]] 用のオプション
     */
    tile_options?: StandardTileProvider.Option;


    /**
     * [[StandardSpriteProvider]] 用のオプション
     */
    sprite_options?: StandardSpriteProvider.Option;

}


}


export { SimpleProviderFactory };
