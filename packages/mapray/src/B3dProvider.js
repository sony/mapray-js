/**
 * @summary B3D データプロバイダ
 * @classdesc
 * <p>レンダラーに B3D データを与えるための抽象クラスである。</p>
 * <p>以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバライドした具象クラスを使用しなければならない。</p>
 * <ul>
 *   <li>[requestMeta()]{@link mapray.B3dProvider#requestMeta}</li>
 *   <li>[requestTile()]{@link mapray.B3dProvider#requestTile}</li>
 *   <li>[cancelRequest()]{@link mapray.B3dProvider#cancelRequest}</li>
 * </ul>
 * @memberof mapray
 * @abstract
 * @protected
 * @see mapray.StandardB3dProvider
 * @see mapray.Viewer
 */
class B3dProvider {

    /**
     * @summary B3D メタデータを要求
     * @desc
     * <p>指定したタイルデータの取得が成功または失敗したときに callback が非同期に呼び出されなければならない。</p>
     * <p>だたし [cancelRequest()]{@link mapray.B3dProvider#cancelRequest} により要求が取り消されたとき、callback
     *    は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。</p>
     * @param  {mapray.B3dProvider.RequestMetaCallback} callback  要求コールバック関数
     * @return {object}  要求 ID ([cancelRequest()]{@link mapray.B3dProvider#cancelRequest} に与えるオブジェクト)
     * @abstract
     */
    requestMeta( callback )
    {
        throw new Error( "mapray.B3dProvider#requestTile() method has not been overridden." );
    }


    /**
     * @summary B3D タイルデータを要求
     * @desc
     * <p>領域が area の B3D タイルデータを要求する。</p>
     * <p>指定したタイルデータの取得が成功または失敗したときに callback が非同期に呼び出されなければならない。</p>
     * <p>だたし [cancelRequest()]{@link mapray.B3dProvider#cancelRequest} により要求が取り消されたとき、callback
     *    は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。</p>
     * @param  {mapray.Area3D}  タイルの領域
     * @param  {mapray.B3dProvider.RequestTileCallback} callback  要求コールバック関数
     * @return {object}  要求 ID ([cancelRequest()]{@link mapray.B3dProvider#cancelRequest} に与えるオブジェクト)
     * @abstract
     */
    requestTile( area, callback )
    {
        throw new Error( "mapray.B3dProvider#requestTile() method has not been overridden." );
    }


    /**
     * @summary B3D タイルデータの要求を取り消す
     * <p>[requestMeta()]{@link mapray.B3dProvider#requestMeta} または
     *    [requestTile()]{@link mapray.B3dProvider#requestTile} による要求を可能であれば取り消す。</p>
     * @param {object} id  要求 ID ([requestTile()]{@link mapray.B3dProvider#requestTile} から得たオブジェクト)
     * @abstract
     */
    cancelRequest( id )
    {
        throw new Error( "mapray.B3dProvider#cancelRequest() method has not been overridden." );
    }

}


/**
 * @summary B3D メタデータ要求コールバック関数型
 * @desc
 * <p>B3D メタデータの取得に成功または失敗したときに呼び出される関数の型である。</p>
 * <p>この関数は [requestMeta()]{@link mapray.B3dProvider#requestMeta} の callback 引数に与える。</p>
 * <p>データの取得に成功したときは、data に JSON 形式の object のインスタンス、失敗したときは null を与える。</p>
 * <p>ただし [cancelRequest()]{@link mapray.B3dProvider#cancelRequest} により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので data は任意の値でよい。<p>
 * @param {object} data  B3D メタデータまたは null
 * @callback RequestMetaCallback
 * @memberof mapray.B3dProvider
 */


/**
 * @summary B3D タイルデータ要求コールバック関数型
 * @desc
 * <p>B3D タイルデータの取得に成功または失敗したときに呼び出される関数の型である。</p>
 * <p>この関数は [requestTile()]{@link mapray.B3dProvider#requestTile} の callback 引数に与える。</p>
 * <p>データの取得に成功したときは、data に ArrayBuffer のインスタンス、失敗したときは null を与える。</p>
 * <p>ただし [cancelRequest()]{@link mapray.B3dProvider#cancelRequest} により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので data は任意の値でよい。<p>
 * @param {ArrayBuffer} data  B3D タイルデータまたは null
 * @callback RequestTileCallback
 * @memberof mapray.B3dProvider
 */


export default B3dProvider;
