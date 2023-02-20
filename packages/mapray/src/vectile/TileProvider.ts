/**
 * ベクトルタイルのプロバイダに関する機能を提供する。
 *
 * mvt 形式のベクトルタイルデータを供給するデータプロバイダ関連の機能
 * を提供する。
 *
 * @module
 */

import { RequestResult } from "../RequestResult";
import { Area as PrivateArea } from "../AreaUtil";


namespace TileProvider {

    /**
     * ベクトルタイルのメタデータの型
     *
     * @see [[TileProvider.requestMeta]]
     */
    export interface MetaData {

        /**
         * タイルツリーの最小レベルを表す。
         *
         * この値より低いレベルのタイルはデータが存在しても使用されない。
         *
         * そのようなレベルを表示する場面では、タイルの幾何を表示しない。
         *
         * `min_level` は 0 から `max_level` の整数でなければならない。
         *
         * @remarks
         *
         * 例えば tippecanoe コマンドが生成した `metadata.json` なら、
         * `minzoom` プロパティを数値に変換した値を指定できる。
         */
        min_level: number;


        /**
         * タイルツリーの最大レベルを表す。
         *
         * この値より高いレベルのタイルはデータが存在しても使用されない。
         *
         * そのようなレベルを表示する場面では、レベル `max_level` のタイル
         * を使用して表示する。
         *
         * `max_level` は `min_level` 以上の整数でなければならない。
         *
         * @remarks
         *
         * 例えば tippecanoe コマンドが生成した `metadata.json` なら、
         * `maxzoom` プロパティを数値に変換した値を指定できる。
         */
        max_level: number;

    }


    /**
     * ベクトルタイルの地表領域
     *
     * [[TileProvider.requestTile]] に与えられるベクトルタイルの地表領域を
     * 表す型である。
     *
     * 座標の定義は
     * [ズームレベル・タイル座標](https://maps.gsi.go.jp/development/siyou.html#siyou-zm)
     * を参照のこと。
     */
    export interface Area extends PrivateArea {

        /**
         * タイルのズームレベル
         */
        readonly z: number;


        /**
         * タイル x 座標
         */
        readonly x: number;


        /**
         * タイル y 座標
         */
        readonly y: number;

    }

}


/**
 * ベクトルタイルのデータプロバイダ
 *
 * レンダラーにベクトルタイルのデータを与えるための抽象クラスである。
 *
 * 以下の抽象メソッドは既定の動作がないので、API 利用者はこれらのメソッ
 * ドをオーバライドした具象クラスを使用しなければならない。
 *
 * - [[requestMeta]]
 * - [[requestTile]]
 */
abstract class TileProvider {

    protected constructor()
    {}


    /**
     * ベクトルタイルのメタデータを要求する。
     */
    abstract requestMeta(): RequestResult<TileProvider.MetaData>;


    /**
     * 指定したベクトルタイルのタイルデータを要求する。
     */
    abstract requestTile( area: TileProvider.Area ): RequestResult<ArrayBuffer>;

};


export { TileProvider };
