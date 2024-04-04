import { cfa_assert } from "./util/assertion";
import Util from "./util/Util";


/**
 * 画像プロバイダ
 *
 * レンダラーにラスターデータを与えるためのクラスです。
 * コンストラクタの引数によって実際の処理が決定されます。
 * 独自の画像プロバイダを作成する際は、通常このクラスを直接継承するのではなく {@link ImageProvider.Hook} を用いる方法で行います。
 *
 * @example
 * ```ts
 * viewer.setImageProvider(new ImageProvider({
 *     init: () => {
 *         ...
 *     },
 *     requestTile: () => {
 *         ...
 *     },
 * }));
 * ```
 *
 * Hookの定義方法の詳細は {@link ImageProvider.Hook} を参照してください。
 * @see {@link mapray.Viewer.setImageProvider}
 * @see {@link mapray.LayerCollection.add}
 */
class ImageProvider {

    private _status = ImageProvider.Status.NOT_INITIALIZED;

    private readonly _init_resolvers = Util.withResolvers<Required<ImageProvider.Info>>();

    private readonly _hook: ImageProvider.Hook;

    // init 後に確定する値
    private _info!: Required<ImageProvider.Info>;

    /**
     * 引数により与えるフックにより、このプロバイダの動作（初期化処理や読み込み処理）が決定する。
     * @param hook 画像プロバイダの動作を決定するフック
     */
    constructor( hook: ImageProvider.Hook ) {
        this._hook = hook;
    }


    /**
     * 初期化を行う
     *
     * @see {@link ImageProvider.Hook.init}
     */
    async init(): Promise<Required<ImageProvider.Info>>
    {
        if ( this._status !== ImageProvider.Status.NOT_INITIALIZED ) {
            return await this._init_resolvers.promise;
        }
        this._status = ImageProvider.Status.INITIALIZING;
        try {
            const info = await this._hook.init();
            this._info = ImageProvider.applyInfoWithDefaults( info );
            this._status = ImageProvider.Status.INITIALIZED;
            this._init_resolvers.resolve( this._info );
            return this._info;
        }
        catch ( err ) {
            this._status = ImageProvider.Status.ERROR;
            this._init_resolvers.reject( err );
            throw err;
        }
    }

    /**
     * タイル画像をリクエストする
     *
     * 2回以上呼ばれた場合は、処理をスキップし初回と同様の値を返却する。
     * @param z タイルのZ
     * @param x タイルのX
     * @param y タイルのY
     * @param options.signal リクエストキャンセル用のシグナル
     * @see {@link ImageProvider.Hook.requestTile}
     */
    async requestTile( z: number, x: number, y: number, options?: { signal?: AbortSignal } ): Promise<ImageProvider.SupportedImageTypes> {
        return await this._hook.requestTile( z, x, y, options );
    }

    /**
     * タイル画像をリクエストできる状態である場合は `true` を返す。
     */
    isReady(): boolean
    {
        return this._status === ImageProvider.Status.INITIALIZED;
    }

    getInfo(): Required<ImageProvider.Info>
    {
        switch ( this._status ) {
            case ImageProvider.Status.NOT_INITIALIZED:
            case ImageProvider.Status.INITIALIZING:    throw new Error( "info is missing: provider not loaded" );
            case ImageProvider.Status.ERROR:           throw new Error( "info is missing: provider failed to initialize" );
            default:                                   return this._info;
        }
    }
}



/**
 * 画像プロバイダに関連する型や値が含まれます。
 */
namespace ImageProvider {



/**
 * 画像プロバイダフック
 *
 * 独自の画像プロバイダを作成する際に利用します。
 *
 * オブジェクトによる実装
 * 単純な動作の場合は下記のように簡易的に実装することができます。
 * @example
 * ```ts
 * viewer.setImageProvider(new ImageProvider({
 *     init: () => {
 *         // 必要に応じて初期化します。
 *     },
 *     requestTile: ( z, x, y ) => {
 *         // タイルを取得します。
 *     },
 * }));
 * ```
 *
 * クラスによる実装
 * 下記のように実装することで、複雑なプロバイダを記述することができます。
 * @example
 * ```ts
 * // クラスとして定義
 * class ProviderHook implements mapray.ImageProvider.Hook {
 *     constructor( id, option ) {
 *         // タイルへのアクセスに必要な情報などを受け取る
 *     }
 *     async init() {
 *         // 認証やログインなどを行い、アクセスできるようにする
 *     }
 *     async requestTile( z, x, y ) {
 *         // 実際にデータにアクセスする
 *     }
 * }
 *
 * // インスタンス化して実装
 * viewer.setImageProvider( new ProviderHook( "id", { token: "xxxxxx" } ) );
 * ```
 *
 */
export interface Hook {

    /**
     * タイルプロバイダを初期化しリクエストできる状態にします。
     *
     * - リクエストできる状態に遷移できなかった場合は必ず例外をスローします
     * - この関数は2回以上呼ばれることはありません
     *
     * @param signal 中断信号（可能であれば処理を中断する）
     * @returns タイルプロバイダの情報
     */
    init( options?: { signal?: AbortSignal } ): Promise<ImageProvider.Info>;


    /**
     * タイルをリクエストします。
     *
     * 座標が (z, x, y) のタイルデータを要求します。
     * {@link Hook.init} の呼び出しに成功した場合に、レンダラが必要なタイミングで何度も呼び出します。
     *
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     * @param  signal  中断信号（可能であれば処理を中断する）
     *
     * @return リクエスト結果
     */
    requestTile( z: number, x: number, y: number, options?: { signal?: AbortSignal } ): Promise<ImageProvider.SupportedImageTypes>;

}



/**
 * ImageProvider の情報です。
 * {@link Hook.init} の戻り値型です。
 */
export interface Info {

    /**
     * タイルの幅及び高さの画素数
     *
     * @default 256
     */
    image_size?: number;

    /**
     * タイルのズームレベルの範囲
     */
    zoom_level_range: ImageProvider.Range;

    /**
     * タイルのピクセルフォーマット
     *
     * @default ImageProvider.ColorPixelFormat
     */
    pixel_format?: ImageProvider.ColorPixelFormat;

}


/**
 * 省略された値を default値 で埋めます。
 * @internal
 */
export function applyInfoWithDefaults( info: Info ): Required<Info>
{
    return {
        image_size: info.image_size ?? DEFAULT_IMAGE_SIZE,
        zoom_level_range: info.zoom_level_range,
        pixel_format: info.pixel_format ?? DEFAULT_PIXEL_FORMAT,
    };
}


/**
 * 範囲
 *
 * @see {@link ImageProvider.getZoomLevelRange}
 */
export class Range {

    /**
     * 最小値
     */
    readonly min: number;

    /**
     * 最大値
     */
    readonly max: number;


    /**
     * @param min  最小値
     * @param max  最大値
     */
    constructor( min: number, max: number )
    {
        cfa_assert( !isNaN( min ) && !isNaN( max ) );
        cfa_assert( min <= max );
        this.min = min;
        this.max = max;
    }

}


export type SupportedImageTypes = TexImageSource | null;


/**
 * ピクセル値が色であることを意味します。
 * 通常はこちらのフォーマットです。
 */
export interface ColorPixelFormat {
    type: "color";
}



/** @internal */
export const enum Status {

    /**
     * 初期状態であり、読み込みが開始されていない状態。
     */
    NOT_INITIALIZED = "@@_ImageProvider.Status.NOT_INITIALIZED",

    /**
     * 読み込みが開始されたが、まだ完了していない状態。
     * 正常に処理が完了すると INITIALIZED 、何らかのエラーが発生した場合は ERROR となる。
     */
    INITIALIZING = "@@_ImageProvider.Status.INITIALIZING",

    /**
     * 読み込みが完了し、リクエストを処理できる状態。
     */
    INITIALIZED = "@@_ImageProvider.Status.INITIALIZED",

    /**
     * エラーが発生し、リクエストを処理できない状態。
     */
    ERROR = "@@_ImageProvider.Status.ERROR",
}



} // namespace ImageProvider



export const DEFAULT_IMAGE_SIZE = 256;
export const DEFAULT_PIXEL_FORMAT: ImageProvider.ColorPixelFormat = {
    type: "color",
};



export default ImageProvider;
