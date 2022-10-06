/**
 * DEM データプロバイダ
 *
 * レンダラーに DEM データを与えるための抽象クラスである。
 *
 * 以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッド
 * をオーバライドした具象クラスを使用しなければならない。
 *
 * - [[DemProvider.requestTile requestTile()]]
 * - [[DemProvider.cancelRequest cancelRequest()]]
 *
 * [[DemProvider.getResolutionPower getResolutionPower()]] の既定の実
 * 装は 8 を返す。DEM タイルの解像度が 256 以外のときはこのメソッドを
 * オーバーロードする必要がある。
 *
 * @typeParam ID - 要求 ID の型
 *
 * この型パラメータは、[[requestTile]] の戻り値と [[cancelRequest]] の
 * パラメータの型が一致した定義になるようにするための便宜的なものである。
 *
 * `ID` がどのような型であっても `DemProvider<ID>` のインスタンスは、
 * `DemProvider = DemProvider<unknown>` 型の変数
 * ([[Viewer.Option.dem_provider]]) を通してフレームワークに渡される。
 *
 * 一般的にこのような場合、[[cancelRequest]] の `id` パラメータ は
 * `unknown` 型または `unknown` のスーパークラス (存在しない) でなけれ
 * ば置換可能性が満たさず危険性を伴うが、フレームワークは必ず `this`
 * の [[requestTile]] が返したオブジェクトを `this` の [[cancelRequest]]
 * に与えることを保証しているので問題は起きない。
 *
 * なお、TypeScript では `--strictFunctionTypes` を指定していても、
 * `DemProvider<unknown>` 型の変数に `DemProvider<ID>` 型のインスタンスを
 * 代入することが許されるのでコンパイルエラーは起きない。

 * 詳細は TypeScript 2.6 の
 * [Strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types)
 * を参照のこと。
 *
 * @see [[StandardDemProvider]], [[Viewer.constructor]]
 */
abstract class DemProvider<ID = unknown> {

    /**
     * DEM タイルデータを要求
     *
     * 座標が (z, x, y) の DEM タイルデータを要求する。
     *
     * 指定したタイルデータの取得が成功または失敗したときに `callback` が非同期に呼び出されなければならない。
     *
     * だたし [[cancelRequest]] により要求が取り消されたとき、`callback` は呼び出しても呼び出さなくてもよい。
     * また非同期呼び出しである必要もない。`callback` によって得たデータに値を上書きしてはならない。
     *
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     * @param  callback  要求コールバック関数
     *
     * @return 要求 ID ([[DemProvider.cancelRequest cancelRequest()]] に与えるオブジェクト)
     */
    abstract requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): ID;


    /**
     * DEM タイルデータの要求を取り消す
     *
     * [[DemProvider.requestTile requestTile()]] による要求を可能であれば取り消す。
     *
     * @param id  要求 ID ([[DemProvider.requestTile requestTile()]] から得たオブジェクト)
     */
    abstract cancelRequest( id: ID ): void;


    /**
     * 解像度の指数を取得
     *
     * DEM タイルデータ解像度の、2 を底とする対数を取得する。DEM タイルデータの解像度は必ず 2 のべき乗である。
     *
     * 制限: this が同じなら常に同じ値を返さなければならない。
     *
     * @return 解像度指数
     */
    getResolutionPower(): number
    {
        return 8;
    }

}



namespace DemProvider {



/**
 * DEM タイルデータ要求コールバック関数型
 *
 * DEM タイルデータの取得に成功または失敗したときに呼び出される関数の
 * 型である。この関数は [[DemProvider.requestTile requestTile()]] の
 * `callback` 引数に与える。
 *
 * データの取得に成功したときは、`data` に `ArrayBuffer` のインスタンス、
 * 失敗したときは `null` を与える。`data` に値を上書きしてはならない。
 * ただし [[DemProvider.cancelRequest cancelRequest()]] により要求が取り
 * 消されたとき、コールバック関数の呼び出しは無視されるので `data` は
 * 任意の値でよい。
 */
export interface RequestCallback {

    /**
     * @param data  DEM タイルデータまたは `null`
     */
    ( data: ArrayBuffer | null ): void;

}


} // namespace DemProvider



export default DemProvider;
