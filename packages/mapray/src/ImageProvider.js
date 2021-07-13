/**
 * @summary 地図画像プロバイダ
 * @classdesc
 * <p>レンダラーに地図画像を与えるための抽象クラスである。</p>
 *
 * <p>このインスタンスには状態 ( {@link mapray.ImageProvider.Status} 型) があり、{@link mapray.ImageProvider#status|status()}
 *    メソッドにより状態を確認することができる。<p>
 *
 * <p>初期状態は READY または NOT_READY でなければならず、状態の変化は NOT_READY から READY または NOT_READY から FAILED しか存在しない。<p>
 * <p>READY 以外の状態では {@link mapray.ImageProvider#status|status()} を除くメソッドを呼び出すことはできない。<p>
 *
 * <p>初期状態が NOT_READY になる可能性があるプロバイダは、{@link mapray.ImageProvider#status|status()} メソッドをオーバーライドする必要がある。</p>
 *
 * <p>以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバーライドした具象クラスを使用しなければならない。</p>
 * <ul>
 *   <li>{@link mapray.ImageProvider#requestTile|requestTile()}</li>
 *   <li>{@link mapray.ImageProvider#cancelRequest|cancelRequest()}</li>
 *   <li>{@link mapray.ImageProvider#getImageSize|getImageSize()}</li>
 *   <li>{@link mapray.ImageProvider#getZoomLevelRange|getZoomLevelRange()}</li>
 * </ul>
 *
 * @memberof mapray
 * @abstract
 * @protected
 * @see mapray.StandardImageProvider
 * @see mapray.Viewer
 */
class ImageProvider {


    constructor() {
    }


    /**
     * @summary 状態の取得
     * @desc
     * <p>現在の ImageProvider 状態を返す。</p>
     * <p>callback を与えたとき、状態が NOT_READY から READY または FAILED に変化したときに callback が呼び出される。
     * NOT_READY 以外の状態で callback 与えても、それは無視されコールバック関数は登録されない。</p>
     *
     * @param  {mapray.ImageProvider.StatusCallback} [callback]  状態変化コールバック関数
     * @return {mapray.ImageProvider.Status}                     現在の ImageProvider 状態
     * @abstract
     */
    status( callback )
    {
        return Status.READY;
    }


    /**
     * @summary 地図タイル画像を要求
     * @desc
     * <p>座標が (z, x, y) の地図タイル画像を要求する。</p>
     * <p>指定したタイル画像の取得が成功または失敗したときに callback が非同期に呼び出されなければならない。</p>
     * <p>だたし [cancelRequest()]{@link mapray.ImageProvider#cancelRequest} により要求が取り消されたとき、callback は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。</p>
     * @param  {number}   z  ズームレベル
     * @param  {number}   x  X タイル座標
     * @param  {number}   y  Y タイル座標
     * @param  {mapray.ImageProvider.RequestCallback} callback  要求コールバック関数
     * @return {object}   要求 ID ([cancelRequest()]{@link mapray.ImageProvider#cancelRequest} に与えるオブジェクト)
     * @abstract
     */
    requestTile( z, x, y, callback )
    {
        throw new Error( "mapray.ImageProvider#requestTile() method has not been overridden." );
    }


    /**
     * @summary 地図タイル画像の要求を取り消す
     * <p>[requestTile()]{@link mapray.ImageProvider#requestTile} による要求を可能であれば取り消す。</p>
     * @param {object} id  要求 ID ([requestTile()]{@link mapray.ImageProvider#requestTile} から得たオブジェクト)
     * @abstract
     */
    cancelRequest( id )
    {
        throw new Error( "mapray.ImageProvider#cancelRequest() method has not been overridden." );
    }


    /**
     * @summary 地図タイル画像の寸法を取得
     * @desc
     * <p>サーバーが提供する地図タイル画像の寸法をする。</p>
     * <p>地図タイル画像は正方形を前提とし、水平方向の画素数を返す。</p>
     * <p>制限: this が同じなら常に同じ値を返さなければならない。</p>
     * @return {number}  地図タイル画像の画素数
     * @abstract
     */
    getImageSize()
    {
        throw new Error( "mapray.ImageProvider#getImageSize() method has not been overridden." );
    }


    /**
     * @summary 地図画像ズームレベルの範囲を取得
     * @desc
     * <p>サーバーが提供する地図タイル画像のズームレベルの範囲を取得する。</p>
     * <p>制限: this が同じなら常に同じ範囲を返さなければならない。</p>
     * @return {mapray.ImageProvider.Range}  ズームレベルの範囲
     * @abstract
     */
    getZoomLevelRange()
    {
        throw new Error( "mapray.ImageProvider#getZoomLevelRange() method has not been overridden." );
    }

}


/**
 * @summary 地図画像ズームレベル範囲
 * @memberof mapray.ImageProvider
 * @see mapray.ImageProvider#getZoomLevelRange
 */
class Range {

    /**
     * @param {number} min  最小ズームレベル (0 または 0 より大きい整数)
     * @param {number} max  最大ズームレベル (min または min より大きい整数)
     */
    constructor( min, max )
    {
        this._min = min;
        this._max = max;
    }


    /**
     * @summary 最小ズームレベル
     * @type {number}
     * @readonly
     */
    get min() { return this._min; }


    /**
     * @summary 最大ズームレベル
     * @type {number}
     * @readonly
     */
    get max() { return this._max; }

}

ImageProvider.Range = Range;


/**
 * @summary 地図タイル画像要求コールバック関数型
 * @desc
 * <p>地図タイル画像の取得に成功または失敗したときに呼び出される関数の型である。</p>
 * <p>この関数は [requestTile()]{@link mapray.ImageProvider#requestTile} の callback 引数に与える。</p>
 * <p>画像の取得に成功したときは、image に Image のインスタンス、失敗したときは null を与える。</p>
 * <p>ただし [cancelRequest()]{@link mapray.ImageProvider#cancelRequest} により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので image は任意の値でよい。<p>
 * @param {Image} image  地図タイル画像または null
 * @callback RequestCallback
 * @memberof mapray.ImageProvider
 */


/**
 * @summary ImageProvider 状態の列挙型
 * @enum {object}
 * @memberof mapray.ImageProvider
 * @constant
 * @see mapray.ImageProvider#status
 */
var Status = {

    /**
     * 準備中
     */
    NOT_READY: { id: "NOT_READY" },

    /**
     * 準備完了
     */
    READY: { id: "READY" },

    /**
     * 失敗状態
     */
    FAILED: { id: "FAILED" }

};

ImageProvider.Status = Status;


/**
 * @summary 状態変化コールバック関数型
 *
 * @param {mapray.ImageProvider.Status} status  READY または FAILED (NOT_READEY から遷移した状態)
 * @callback StatusCallback
 * @memberof mapray.ImageProvider
 */


export default ImageProvider;
