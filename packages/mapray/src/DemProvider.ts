/**
 * DEM データプロバイダ
 *
 * レンダラーに DEM データを与えるための抽象クラスである。
 * 以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバライドした具象クラスを使用しなければならない。
 * - [[DemProvider.requestTile requestTile()]]
 * - [[DemProvider.cancelRequest cancelRequest()]]
 *
 * [[DemProvider.getResolutionPower getResolutionPower()]] の既定の実装は 8 を返す。DEM タイルの解像度が 256 以外のときはこのメソッドをオーバーロードする必要がある。
 * @see mapray.StandardDemProvider
 * @see mapray.Viewer
 */
abstract class DemProvider<ID> {

    /**
     * DEM タイルデータを要求
     *
     * 座標が (z, x, y) の DEM タイルデータを要求する。
     * 指定したタイルデータの取得が成功または失敗したときに callback が非同期に呼び出されなければならない。
     * だたし [cancelRequest()]{@link mapray.DemProvider#cancelRequest} により要求が取り消されたとき、callback は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     * @param  callback  要求コールバック関数
     * @return {object}   要求 ID ([[DemProvider.cancelRequest cancelRequest()]] に与えるオブジェクト)
     * @abstract
     */
    abstract requestTile( z: number, x: number, y: number, callback: DemProvider.RequestCallback ): ID;


    /**
     * DEM タイルデータの要求を取り消す
     * [[DemProvider.requestTile requestTile()]] による要求を可能であれば取り消す。
     * @param id  要求 ID ([[DemProvider.requestTile requestTile()]] から得たオブジェクト)
     */
    abstract cancelRequest( id: ID ): void;


    /** 
     * 解像度の指数を取得
     *
     * DEM タイルデータ解像度の、2 を底とする対数を取得する。DEM タイルデータの解像度は必ず 2 のべき乗である。
     * 制限: this が同じなら常に同じ値を返さなければならない。
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
 * DEM タイルデータの取得に成功または失敗したときに呼び出される関数の型である。
 * この関数は [[DemProvider.requestTile requestTile()]] の callback 引数に与える。
 * データの取得に成功したときは、data に ArrayBuffer のインスタンス、失敗したときは null を与える。
 * ただし [[DemProvider.cancelRequest cancelRequest()]] により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので data は任意の値でよい。
 * @param data  DEM タイルデータまたは null
 */
export type RequestCallback = ( data?: ArrayBuffer ) => void;



} // namespace DemProvider



export default DemProvider;
