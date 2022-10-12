/**
 * 地図画像プロバイダ
 *
 * レンダラーに地図画像を与えるための抽象クラスである。
 *
 * このインスタンスには状態 ([[Status]] 型) があり、[[status]] メソッ
 * ドにより状態を確認することができる。
 *
 * 初期状態は [[READY]] または [[NOT_READY]] でなければならず、状態の
 * 変化は [[NOT_READY]] から [[READY]] または [[NOT_READY]] から
 * [[FAILED]] しか存在しない。READY 以外の状態では [[status]] を除くメ
 * ソッドを呼び出すことはできない。
 *
 * 初期状態が [[NOT_READY]] になる可能性があるプロバイダは、[[status]]
 * メソッドをオーバーライドする必要がある。
 *
 * 以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッド
 * をオーバーライドした具象クラスを使用しなければならない。
 *
 * - [[requestTile]]
 * - [[cancelRequest]]
 * - [[getImageSize]]
 * - [[getZoomLevelRange]]
 *
 * @typeParam ID - 要求 ID の型
 *
 * この型パラメータは、[[requestTile]] の戻り値と [[cancelRequest]] の
 * パラメータの型が一致した定義になるようにするための便宜的なものである。
 *
 * `ID` がどのような型であっても `ImageProvider<ID>` のインスタンスは、
 * `ImageProvider = ImageProvider<unknown>` 型の変数
 * ([[Viewer.Option.dem_provider]]) を通してフレームワークに渡される。
 *
 * 一般的にこのような場合、[[cancelRequest]] の `id` パラメータ は
 * `unknown` 型または `unknown` のスーパークラス (存在しない) でなけれ
 * ば置換可能性が満たさず危険性を伴うが、フレームワークは必ず `this`
 * の [[requestTile]] が返したオブジェクトを `this` の [[cancelRequest]]
 * に与えることを保証しているので問題は起きない。
 *
 * なお、TypeScript では `--strictFunctionTypes` を指定していても、
 * `ImageProvider<unknown>` 型の変数に `ImageProvider<ID>` 型の
 * インスタンスを代入することが許されるのでコンパイルエラーは起きない。

 * 詳細は TypeScript 2.6 の
 * [Strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types)
 * を参照のこと。
 *
 * @see [[StandardImageProvider]], [[Viewer.constructor]]
 */
abstract class ImageProvider<ID = unknown> {


    protected constructor() {
    }


    /**
     * 状態の取得
     *
     * 現在の [[ImageProvider]] インスタンスの状態を返す。
     *
     * `callback` を与えたとき、状態が [[NOT_READY]] から [[READY]] ま
     * たは [[FAILED]] に変化したときに `callback` が呼び出される。
     * [[NOT_READY]] 以外の状態で `callback` 与えても、それは無視され
     * コールバック関数は登録されない。
     *
     * デフォルトの実装は、常に [[READY]] を返却し状態は変化しない。
     *
     * 継承クラスで必要に応じて実装される。
     *
     * @param callback - 状態変化コールバック関数
     *
     * @return 現在の [[ImageProvider]] インスタンスの状態
     *
     * @virtual
     */
    status( callback?: ImageProvider.StatusCallback ): ImageProvider.Status
    {
        return ImageProvider.Status.READY;
    }


    /**
     * 地図タイル画像を要求
     *
     * 座標が (`z`, `x`, `y`) の地図タイル画像を要求する。
     *
     * 指定したタイル画像の取得が成功または失敗したときに `callback`
     * が非同期に呼び出されなければならない。だたし [[cancelRequest]]
     * により要求が取り消されたとき、`callback` は呼び出しても呼び出さ
     * なくてもよい。また非同期呼び出しである必要もない。
     *
     * `callback` が返す [[TileImage]] インスタンスの画像は不変が想定
     * されるので、違う呼び出しの間で同じ画像インスタンスを返すことも
     * 可能である。
     *
     * @param z - ズームレベル
     * @param x - X タイル座標
     * @param y - Y タイル座標
     * @param callback - 要求コールバック関数
     *
     * @return 要求 ID ([[cancelRequest]] に与えるオブジェクト)
     */
    abstract requestTile( z: number,
                          x: number,
                          y: number,
                          callback: ImageProvider.RequestCallback ): ID;


    /**
     * 地図タイル画像の要求を取り消す
     *
     * [[requestTile]] メソッドによる要求を可能であれば取り消す。
     *
     * @param id - 要求 ID ([[requestTile]] から得たオブジェクト)
     */
    abstract cancelRequest( id: ID ): void;


    /**
     * 地図タイル画像の寸法を取得
     *
     * サーバーが提供する地図タイル画像の寸法をする。
     * 地図タイル画像は正方形を前提とし、水平方向の画素数を返す。
     *
     * 制限: `this` が同じなら常に同じ値を返さなければならない。
     *
     * @return 地図タイル画像の画素数
     */
    abstract getImageSize(): number;


    /**
     * 地図画像ズームレベルの範囲を取得
     *
     * サーバーが提供する地図タイル画像のズームレベルの範囲を取得する。
     *
     * 制限: `this` が同じなら常に同じ範囲を返さなければならない。
     */
    abstract getZoomLevelRange(): ImageProvider.Range;

}



namespace ImageProvider {


/**
 * 地図画像ズームレベル範囲
 *
 * @see [[ImageProvider.getZoomLevelRange]]
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
     * @param max  最大ズームレベル (`min` または `min` より大きい整数)
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
 * 地図タイル画像の型
 *
 * @see [[RequestCallback]], [[ImageProvider.requestTile]]
 */
export type TileImage = ImageBitmap | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;


/**
 * 地図タイル画像要求コールバック関数型
 *
 * 地図タイル画像の取得に成功または失敗したときに呼び出される関数の型
 * である。
 *
 * この関数は [[ImageProvider.requestTile]] の `callback` 引数に与える。
 *
 * 画像の取得に成功したときは、`image` に [[TileImage]] のインスタンス、
 * 失敗したときは `null` を与える。
 *
 * ただし [[ImageProvider.cancelRequest]] により要求が取り消されたとき、
 * コールバック関数の呼び出しは無視されるので `image` は任意の値でよい。
 */
export interface RequestCallback {

     /**
      * @param image - 地図タイル画像
      */
     ( image: TileImage | null ): void;

}


/**
 * [[ImageProvider]] 状態の列挙型
 *
 * @see [[ImageProvider.status]]
 */
export const enum Status {

    /**
     * 準備中
     */
    NOT_READY = "@@_ImageProvider.Status.NOT_READY",

    /**
     * 準備完了
     */
    READY = "@@_ImageProvider.Status.READY",

    /**
     * 失敗状態
     */
    FAILED = "@@_ImageProvider.Status.FAILED",

};


/**
 * 状態変化コールバック関数型
 *
 * @see [[ImageProvider.status]]
 */
export interface StatusCallback {

    /**
     * @param status - [[READY]] または [[FAILED]] ([[NOT_READY]] から遷移した状態)
     */
    ( status: Status ): void;

}


} // namespace ImageProvider



export default ImageProvider;
