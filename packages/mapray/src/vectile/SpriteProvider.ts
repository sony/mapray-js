/**
 * スプライトのプロバイダに関する機能を提供する。
 *
 * @module
 */

import { RequestResult } from "../RequestResult";
import { Json, isObject as json_isObject } from "../util/json_type";


/**
 * スプライトのデータプロバイダ
 *
 * レンダラーにスプライトのデータを与えるための抽象クラスである。
 *
 * 以下の抽象メソッドは既定の動作がないので、API 利用者はこれらのメソッ
 * ドをオーバライドした具象クラスを使用しなければならない。
 *
 * - [[requestLayout]]
 * - [[requestSheet]]
 */
abstract class SpriteProvider {

    protected constructor()
    {}


    /**
     * スプライトのレイアウト情報を要求する。
     */
    abstract requestLayout(): RequestResult<SpriteProvider.Layout>;


    /**
     * スプライトの画像データを要求する。
     */
    abstract requestSheet(): RequestResult<SpriteProvider.Sheet>;


    /**
     * [index-file](https://docs.mapbox.com/mapbox-gl-js/style-spec/sprite/#index-file)
     * 形式のレイアウトデータを解析して [[Layout]] に変換する。
     *
     * @param json_layout - レイアウトデータ
     *
     * @throws SyntaxError  `json_layout` が 予期しないデータ形式のとき
     */
    static parseLayoutData( json_layout: Json ): SpriteProvider.Layout
    {
        if ( !json_isObject( json_layout ) ) {
            // 予期しないデータ形式
            throw new SyntaxError( "invalid layout data" );
        }

        const item_list: SpriteProvider.LayoutItem[] = [];

        // キーが文字列の列挙可能プロパティ (継承含む) を反復する。
        // Response.json で取得した JSON はこの条件で問題ないと思われる。
        for ( const id in json_layout ) {
            const item = json_layout[id];
            if ( !json_isObject( item ) ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            const x = item['x'];
            if ( typeof x !== 'number' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            const y = item['y'];
            if ( typeof y !== 'number' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            const width = item['width'];
            if ( typeof width !== 'number' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            const height = item['height'];
            if ( typeof height !== 'number' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            const sdf = item['sdf'] ?? false;
            if ( typeof sdf !== 'boolean' ) {
                // 予期しないデータ形式
                throw new SyntaxError( "invalid layout item data" );
            }

            // アイテム追加
            item_list.push( { id, x, y, width, height, sdf } );
        }

        return item_list;
    }

};


namespace SpriteProvider {


/**
 * スプライト画像内のアイコン単位のレイアウト情報の型
 *
 * Canvas の座標系と同じように、スプライト画像の左上を座標原点 (0, 0)
 * とし、右方向に x 座標が増加し、下方向に y 座標が増加する。
 *
 * @see [[requesLayout]]
 */
export interface LayoutItem {

    /**
     * アイコン識別名
     */
    id: string;


    /**
     * スプライト画像内でのアイコン左上の x 座標
     */
    x: number;


    /**
     * スプライト画像内でのアイコン左上の y 座標
     */
    y: number;


    /**
     * スプライト画像内でのアイコンの水平画素数
     */
    width: number;


    /**
     * スプライト画像内でのアイコンの垂直画素数
     */
    height: number;


    /**
     * SDFアイコンフラグ
     */
    sdf: boolean;
}


/**
 * アイコンのレイアウト情報の型
 *
 * これは [[LayoutItem]] インスタンスを反復できるオブジェクトの型を表す。
 *
 * @see [[requestLayout]], [[LayoutItem]]
 */
export type Layout = Iterable<LayoutItem>;


/**
 * スプライトの画像データの型
 *
 * @see [[requestSheet]]
 */
export type Sheet = TexImageSource;


}


export { SpriteProvider };
