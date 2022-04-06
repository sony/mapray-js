/**
 * ベクトルタイルのプロバイダに関する機能を提供する。
 *
 * mvt 形式のベクトルタイルデータを供給するデータプロバイダ関連の機能
 * を提供する。
 *
 * @module
 */

import { Area as PrivateArea } from "../AreaUtil";


export namespace Provider {

    /**
     * プロパティ [[RequestResult.canceller]] の型である。
     */
    export interface RequestCanceller {

        (): void;

    }


    /**
     * データ要求メソッドの戻り値の型
     *
     * @typeParam T - データ要求で返されるデータの型
     */
    export interface RequestResult<T> {

        /**
         * 要求されたデータを受け取るための `Promise` インスタンスである。
         *
         * これは要求したデータを取得できたとき `T` 型のインスタンスで
         * 解決し、取得できなかったとき `null` で解決する。
         *
         * ただし `this` の [[canceller]] プロパティの関数が呼び出され
         * た後は、`T` 型のインスタンス、または `null` のどちらで解決
         * してもよい。
         *
         * 注意: 上記は何れも解決 (resolve) であり、拒否 (reject) でない。
         */
        promise: Promise<T | null>;


        /**
         * 要求を取り消すときに呼び出される関数である。
         *
         * 取り消す方法がないときは、取り消す処理を行わなくてもよい。
         */
        canceller: RequestCanceller;

    }


    /**
     * ベクトルタイルのメタデータの型
     *
     * @see [[Provider.requestMeta]]
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
     * [[Provider.requestTile]] に与えられるベクトルタイルの地表領域を
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
export abstract class Provider {

    protected constructor()
    {}


    /**
     * ベクトルタイルのメタデータを要求する。
     */
    abstract requestMeta(): Provider.RequestResult<Provider.MetaData>;


    /**
     * 指定したベクトルタイルのタイルデータを要求する。
     */
    abstract requestTile( area: Provider.Area ): Provider.RequestResult<ArrayBuffer>;

};
