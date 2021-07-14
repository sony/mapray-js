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
abstract class ImageProvider {


    constructor() {
    }


    /**
     * 状態の取得
     *
     * 現在の ImageProvider 状態を返す。
     * callback を与えたとき、状態が NOT_READY から READY または FAILED に変化したときに callback が呼び出される。
     * NOT_READY 以外の状態で callback 与えても、それは無視されコールバック関数は登録されない。
     *
     * デフォルトの実装は、常に READY を返却し状態は変化しない。
     * 継承クラスで必要に応じて実装される。
     *
     * @param  callback  状態変化コールバック関数
     * @return 現在の ImageProvider 状態
     */
    status( callback?: ImageProvider.StatusCallback ): ImageProvider.Status
    {
        return Status.READY;
    }


    /**
     * 地図タイル画像を要求
     *
     * 座標が (z, x, y) の地図タイル画像を要求する。
     * 指定したタイル画像の取得が成功または失敗したときに callback が非同期に呼び出されなければならない。
     * だたし [cancelRequest()]{@link mapray.ImageProvider#cancelRequest} により要求が取り消されたとき、callback は呼び出しても呼び出さなくてもよい。また非同期呼び出しである必要もない。
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     * @param  callback  要求コールバック関数
     * @return 要求 ID ([cancelRequest()]{@link mapray.ImageProvider#cancelRequest} に与えるオブジェクト)
     */
    abstract requestTile( z: number, x: number, y: number, callback: ImageProvider.RequestCallback ): object;


    /**
     * 地図タイル画像の要求を取り消す
     * [requestTile()]{@link mapray.ImageProvider#requestTile} による要求を可能であれば取り消す。
     * @param id  要求 ID ([requestTile()]{@link mapray.ImageProvider#requestTile} から得たオブジェクト)
     */
    abstract cancelRequest( id: object );


    /**
     * 地図タイル画像の寸法を取得
     *
     * サーバーが提供する地図タイル画像の寸法をする。
     * 地図タイル画像は正方形を前提とし、水平方向の画素数を返す。
     *
     * 制限: this が同じなら常に同じ値を返さなければならない。
     * @return 地図タイル画像の画素数
     */
    abstract getImageSize(): number;


    /**
     * 地図画像ズームレベルの範囲を取得
     *
     * サーバーが提供する地図タイル画像のズームレベルの範囲を取得する。
     * 制限: this が同じなら常に同じ範囲を返さなければならない。
     */
    abstract getZoomLevelRange(): ImageProvider.Range;

}



namespace ImageProvider {



/**
 * 地図画像ズームレベル範囲
 * @see mapray.ImageProvider#getZoomLevelRange
 */
export class Range {

    /**
     * 最小ズームレベル (0 または 0 より大きい整数)
     */
    private _min: number;

    /**
     * 最大ズームレベル (min または min より大きい整数)
     */
    private _max: number;


    /**
     * @param min  最小ズームレベル (0 または 0 より大きい整数)
     * @param max  最大ズームレベル (min または min より大きい整数)
     */
    constructor( min: number, max: number )
    {
        this._min = min;
        this._max = max;
    }


    /**
     * 最小ズームレベル
     */
    get min(): number { return this._min; }


    /**
     * 最大ズームレベル
     */
    get max(): number { return this._max; }

}



/**
 * 地図タイル画像要求コールバック関数型
 * 地図タイル画像の取得に成功または失敗したときに呼び出される関数の型である。
 * この関数は [requestTile]{@link mapray.ImageProvider.requestTile} の callback 引数に与える。
 * 画像の取得に成功したときは、image に Image のインスタンス、失敗したときは null を与える。
 * ただし [cancelRequest  mapray.cancelRequest] により要求が取り消されたとき、コールバック関数の呼び出しは無視されるので image は任意の値でよい。
 * @param image  地図タイル画像または null
 */
export type RequestCallback = (image: Image | null) => void;



/**
 * ImageProvider 状態の列挙型
 * @see mapray.ImageProvider#status
 */
export enum Status {

    /**
     * 準備中
     */
    NOT_READY,

    /**
     * 準備完了
     */
    READY,

    /**
     * 失敗状態
     */
    FAILED,

};



/**
 * 状態変化コールバック関数型
 *
 * @param status READY または FAILED (NOT_READEY から遷移した状態)
 */
export type StatusCallback = (status: Status) => void;



} // namespace ImageProvider



export default ImageProvider;
