import Util from "./util/Util";
import { cfa_assert } from "./util/assertion";

/**
 * 点群データプロバイダ
 *
 * レンダラーに点群データを与えるためのクラスです。
 * コンストラクタの引数によって実際の処理が決定されます。
 * 独自の点群プロバイダを作成する際は、通常このクラスを直接継承するのではなく {@link PointCloudProvider.Hook} を用いる方法で行います。
 *
 */
class PointCloudProvider {

    private _status = PointCloudProvider.Status.NOT_INITIALIZED;

    private readonly _init_resolvers = Util.withResolvers<Required<PointCloudProvider.Info>>();

    private readonly _hook: PointCloudProvider.Hook;

    protected _time_info_handler?: PointCloudProvider.TimeInfoHandler;

    // init 後に確定する値
    private _info!: Required<PointCloudProvider.Info>;

    /* init 後に確定する */
    private _version!: {
        major: number;
        minor: number;
    };

    private _requests: number;


    constructor( hook: PointCloudProvider.Hook, option: PointCloudProvider.Option = {} ) {
        this._hook = hook;
        this._time_info_handler = option?.time_info_handler;
        this._requests = 0;
    }


    /**
     * 初期化します。
     *
     * @see {@link PointCloudProvider.Hook.init}
     */
    async init(): Promise<Required<PointCloudProvider.Info>>
    {
        if ( this._status !== PointCloudProvider.Status.NOT_INITIALIZED ) {
            return await this._init_resolvers.promise;
        }
        this._status = PointCloudProvider.Status.INITIALIZING;
        try {
            const info = PointCloudProvider.applyInfoWithDefaults( await this._hook.init() );
            const [ major, minor ] = info.version.split( "." ).map( str => parseInt( str ) );
            if ( major !== 0 || minor !== 0 ) {
                console.log("Warning: Unknown Version: " + major + "." + minor);
            }
            this._version = { major, minor };
            this._info = info;
            this._status = PointCloudProvider.Status.INITIALIZED;
            this._init_resolvers.resolve( this._info );
            return this._info;
        }
        catch ( err ) {
            this._status = PointCloudProvider.Status.ERROR;
            this._init_resolvers.reject( err );
            throw err;
        }
    }


    getInfo(): Required<PointCloudProvider.Info>
    {
        switch ( this._status ) {
            case PointCloudProvider.Status.NOT_INITIALIZED:
            case PointCloudProvider.Status.INITIALIZING:    throw new Error( "info is missing: provider not loaded" );
            case PointCloudProvider.Status.ERROR:           throw new Error( "info is missing: provider failed to initialize" );
            default:                                        return this._info;
        }
    }


    /**
     * リクエスト可能な状態かを返す。
     * 初期化が完了しているかだけではなく、現在処理中のリクエスト数も考慮した上でリクエスト可能な状態か判断する。
     */
    isReady(): boolean {
        return this._status == PointCloudProvider.Status.INITIALIZED && this.getNumberOfRequests() < 10;
    }


    /**
     * タイル画像をリクエストする
     * 2回以上呼ばれた場合は、処理をスキップし初回と同様の値を返却する。
     * @param level レベル
     * @param x x
     * @param y y
     * @param z z
     * @param options.signal リクエストキャンセル用のシグナル
     * @see {@link PointCloudProvider.Hook.requestTile}
     */
    async requestTile( level: number, x: number, y: number, z: number, options?: { signal?: AbortSignal } ): Promise<PointCloudProvider.Data>
    {
        cfa_assert( this._status === PointCloudProvider.Status.INITIALIZED );
        this._requests++;

        try {

            const start = Date.now();
            const ret = await this._hook.requestTile( level, x, y, z, options );
            if ( this._time_info_handler ) {
                const path = level + "/" + x + "/" + y + "/" + z;
                const end = Date.now();
                if ( ret.times ) {
                    ret.times.path = path;
                    ret.times.start = start;
                    ret.times.end = end;
                }
                else {
                    ret.times = { path, start, end };
                }
                this._time_info_handler( ret.times );
            }

            return ret;

        }
        finally {
            this._requests--;
        }
    }


    flushQueue() {
    }


    toString() {
        return "PointCloudProvider";
    }


    /**
     * 読み込み情報のハンドラを指定する
     * @param time_info_handler 読み込み情報取得時のハンドラ
     */
    setTimeInfoHandler( time_info_handler: PointCloudProvider.TimeInfoHandler ): void
    {
        if ( this._time_info_handler === time_info_handler ) {
            return;
        }
        this._time_info_handler = time_info_handler;
        this.onChangeTimeInfoHandler( true );
    }


    /**
     * 読み込み情報のハンドラを破棄する
     */
    clearTimeInfoHandler(): void
    {
        if ( !this._time_info_handler ) {
            return;
        }
        this._time_info_handler = undefined;
        this.onChangeTimeInfoHandler( false );
    }


    /**
     * 読み込み情報のハンドラが変更されたことを通知します。
     */
    protected onChangeTimeInfoHandler( time_info_handler_available: boolean ): void
    {
    }


    /**
     * 読み込み情報のハンドラが指定されているかを取得します。
     */
    protected isTimeInfoHandlerAvailable(): boolean
    {
        return this._time_info_handler !== undefined;
    }


    /**
     * 実行中のリクエスト数を返す
     */
    getNumberOfRequests(): number
    {
        return this._requests;
    }


    /**
     * 破棄
     */
    destroy() {
        this._status = PointCloudProvider.Status.ERROR;
    }

}




namespace PointCloudProvider {



/**
 * 点群プロバイダフック
 *
 * 独自の点群プロバイダを作成する際に利用します。
 *
 * オブジェクトによる実装
 * 単純な動作の場合は下記のように簡易的に実装することができます。
 * @example
 * ```ts
 * viewer.point_cloud_collection.add(new PointCloudProvider({
 *     init: () => {
 *         // 必要に応じて初期化します。
 *     },
 *     requestTile: ( level, x, y, z ) => {
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
 * class ProviderHook implements mapray.PointCloudProvider.Hook {
 *     constructor( id, option ) {
 *         // タイルへのアクセスに必要な情報などを受け取る
 *     }
 *     async init() {
 *         // 認証やログインなどを行い、アクセスできるようにする
 *     }
 *     async requestTile( level, x, y, z ) {
 *         // 実際にデータにアクセスする
 *     }
 * }
 *
 * // インスタンス化して利用します。
 * viewer.point_cloud_collection.add( new ProviderHook( "id", { token: "xxxxxx" } ) );
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
    init( options?: { signal?: AbortSignal } ): Promise<PointCloudProvider.Info>;


    /**
     * タイルをリクエストします。
     *
     * 座標が (level, x, y, z) のタイルデータを要求します。
     * {@link Hook.init} の呼び出しに成功した場合に、レンダラが必要なタイミングで何度も呼び出します。
     *
     * @param  level レベル
     * @param  x     X タイル座標
     * @param  y     Y タイル座標
     * @param  z     Z タイル座標
     * @param  signal  中断信号（可能であれば処理を中断する）
     *
     * @return リクエスト結果
     */
    requestTile( level: number, x: number, y: number, z: number, options?: { signal?: AbortSignal } ): Promise<PointCloudProvider.Data>;

}


export interface Data {
    header: {
        childFlags: number;
        debug1: number;
        indices: Int32Array;
        average: Float32Array;
        eigenVector: [ Float32Array, Float32Array, Float32Array ];
        eigenVectorLength: [ number, number, number ];
    };
    body: Float32Array;
    times?: TimeInfo;
}



/** @internal */
export const enum Status {

    /**
     * 初期状態であり、読み込みが開始されていない状態。
     */
    NOT_INITIALIZED = "@@_PointCloudProvider.Status.NOT_INITIALIZED",

    /**
     * 読み込みが開始されたが、まだ完了していない状態。
     * 正常に処理が完了すると INITIALIZED 、何らかのエラーが発生した場合は ERROR となる。
     */
    INITIALIZING = "@@_PointCloudProvider.Status.INITIALIZING",

    /**
     * 読み込みが完了し、リクエストを処理できる状態。
     */
    INITIALIZED = "@@_PointCloudProvider.Status.INITIALIZED",

    /**
     * エラーが発生し、リクエストを処理できない状態。
     */
    ERROR = "@@_PointCloudProvider.Status.ERROR",
}


export interface Option {
    time_info_handler?: TimeInfoHandler;
}

/**
 * 時間計測
 */
export interface TimeInfo {
    path: string;
    start: number;
    end: number;
}


/**
 * 時間計測終了時のコールバック関数定義
 */
export type TimeInfoHandler = ( time_info: TimeInfo ) => void;


export interface CloudInfo {
    url: string;
    fileinfo: Info;
}


export interface Info {
    version?: string;
    format: string;
    url?: string | null;
    content_root: [level: number, x: number, y: number, z: number];
}


export function applyInfoWithDefaults( info: Info ): Required<Info>
{
    return {
        version: info.version ?? "0.0",
        format: info.format,
        url: info.url ?? null,
        content_root: info.content_root,
    };
}


export function isCloudInfo( info: CloudInfo | Info ): info is CloudInfo
{
    return "fileinfo" in info;
}


} // namespace PointCloudProvider



export default PointCloudProvider;
