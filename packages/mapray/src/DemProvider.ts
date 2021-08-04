/**
 * @summary DEM データプロバイダ
 * @classdesc
 * <p>レンダラーに DEM データを与えるための抽象クラスである。</p>
 * <p>以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバライドした具象クラスを使用しなければならない。</p>
 * <ul>
 *   <li>[requestTile()]{@link mapray.DemProvider#requestTile}</li>
 *   <li>[cancelRequest()]{@link mapray.DemProvider#cancelRequest}</li>
 * </ul>
 * <p>[getResolutionPower()]{@link mapray.DemProvider#getResolutionPower} の既定の実装は 8 を返す。DEM タイルの解像度が 256 以外のときはこのメソッドをオーバーロードする必要がある。</p>
 * @memberof mapray
 * @abstract
 * @protected
 * @see mapray.StandardDemProvider
 * @see mapray.Viewer
 */
class DemProvider {

    /**
     * @summary DEM タイルデータを要求
     * @desc
     * <p>座標が (z, x, y) の DEM タイルデータを要求する。</p>
     * <p>指定したタイルデータの取得が成功または失敗したときに callback が非同期に呼び出されなければならない。</p>
     * <p>だたし [cancelRequest()]{@link mapray.DemProvider#cancelRequest} により要求が取り消されたとき、callback は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。</p>
     * @param  {number}   z  ズームレベル
     * @param  {number}   x  X タイル座標
     * @param  {number}   y  Y タイル座標
     * @param  {mapray.DemProvider.RequestCallback} callback  要求コールバック関数
     * @return {object}   要求 ID ([cancelRequest()]{@link mapray.DemProvider#cancelRequest} に与えるオブジェクト)
     * @abstract
     */
    requestTile( z, x, y, callback )
    {
        throw new Error( "mapray.DemProvider#requestTile() method has not been overridden." );
    }


    /**
     * @summary DEM タイルデータの要求を取り消す
     * <p>[requestTile()]{@link mapray.DemProvider#requestTile} による要求を可能であれば取り消す。</p>
     * @param {object} id  要求 ID ([requestTile()]{@link mapray.DemProvider#requestTile} から得たオブジェクト)
     * @abstract
     */
    cancelRequest( id )
    {
        throw new Error( "mapray.DemProvider#cancelRequest() method has not been overridden." );
    }


    /** 
     * @summary 解像度の指数を取得
     * @desc
     * <p>DEM タイルデータ解像度の、2 を底とする対数を取得する。DEM タイルデータの解像度は必ず 2 のべき乗である。</p>
     * <p>制限: this が同じなら常に同じ値を返さなければならない。</p>
     * @return {number}  解像度指数
     * @abstract
     */
    getResolutionPower()
    {
        return 8;
    }

}


/**
 * @summary DEM タイルデータ要求コールバック関数型
 * @desc
 * <p>DEM タイルデータの取得に成功または失敗したときに呼び出される関数の型である。</p>
 * <p>この関数は [requestTile()]{@link mapray.DemProvider#requestTile} の callback 引数に与える。</p>
 * <p>データの取得に成功したときは、data に ArrayBuffer のインスタンス、失敗したときは null を与える。</p>
 * <p>ただし [cancelRequest()]{@link mapray.DemProvider#cancelRequest} により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので data は任意の値でよい。<p>
 * @param {ArrayBuffer} data  DEM タイルデータまたは null
 * @callback RequestCallback
 * @memberof mapray.DemProvider
 */


export default DemProvider;
