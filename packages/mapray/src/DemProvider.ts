import Util from "./util/Util";


/**
 * DEM データプロバイダ
 *
 * レンダラーに DEM データを与えるための抽象クラスです。
 *
 * @see {@link StandardDemProvider}, {@link Viewer.constructor}
 */
class DemProvider {

    private _status = DemProvider.Status.NOT_INITIALIZED;

    private readonly _init_resolvers = Util.withResolvers<Required<DemProvider.Info>>();

    private readonly _hook: DemProvider.Hook;

    // init 後に確定する値
    private _info!: Required<DemProvider.Info>;


    constructor( hook: DemProvider.Hook ) {
        this._hook = hook;
    }


    /**
     * 初期化を行う
     *
     * 2回以上呼ばれた場合は、処理をスキップし初回と同様の値を返却する。
     */
    async init(): Promise<Required<DemProvider.Info>>
    {
        if ( this._status !== DemProvider.Status.NOT_INITIALIZED ) {
            return await this._init_resolvers.promise;
        }
        this._status = DemProvider.Status.INITIALIZING;
        try {
            const info = await this._hook.init();
            this._info = DemProvider.applyInfoWithDefaults( info );
            this._status = DemProvider.Status.INITIALIZED;
            this._init_resolvers.resolve( this._info );
            return this._info;
        }
        catch ( err ) {
            this._status = DemProvider.Status.ERROR;
            this._init_resolvers.reject( err );
            throw err;
        }
    }


    async requestTile( z: number, x: number, y: number, options?: { signal?: AbortSignal } ): Promise<ArrayBuffer>
    {
        return await this._hook.requestTile( z, x, y, options );
    }


    /**
     * リクエストできる状態であるかを返却します。
     */
    isReady(): boolean
    {
        return this._status === DemProvider.Status.INITIALIZED;
    }


    /**
     * タイルの情報を取得する。
     * 初期化に成功していなければ例外をスローする
     */
    getInfo(): Required<DemProvider.Info>
    {
        switch ( this._status ) {
            case DemProvider.Status.NOT_INITIALIZED:
            case DemProvider.Status.INITIALIZING:    throw new Error( "info is missing: provider not loaded" );
            case DemProvider.Status.ERROR:      throw new Error( "info is missing: provider failed to initialize" );
            default:                            return this._info;
        }
    }

}



namespace DemProvider {



export interface Hook {

    /**
     * タイルプロバイダを初期化しリクエストできる状態にする。
     * また、このプロバイダが持つプロパティについても、この関数に成功した時点でアクセス可能になる。
     *
     * リクエストできる状態に遷移できなかった場合は必ず例外をスローしなければならない。
     */
    init( options?: { signal?: AbortSignal } ): Promise<DemProvider.Info>;


    /**
     * タイルをリクエストします。
     *
     * 座標が (z, x, y) のタイルデータを要求する。
     *
     * だたし [[cancelRequest]] により要求が取り消されたとき、`callback` は呼び出しても呼び出さなくてもよい。
     * また非同期呼び出しである必要もない。`callback` によって得たデータに値を上書きしてはならない。
     *
     * @param  z  ズームレベル
     * @param  x  X タイル座標
     * @param  y  Y タイル座標
     *
     * @return リクエストオブジェクト
     */
    requestTile( z: number, x: number, y: number, options?: { signal?: AbortSignal } ): Promise<ArrayBuffer>;

}



export interface Info {

    /**
     * 解像度の指数
     *
     * DEM タイルデータ解像度の 2 を底とする対数を取得する。DEM タイルデータの解像度は必ず 2 のべき乗である。
     *
     * @default 8
     */
    resolution_power?: number;
}



/**
 * 省略された値を default値 で埋めます。
 * @internal
 */
export function applyInfoWithDefaults( info: Info ): Required<Info>
{
    return {
        resolution_power: info.resolution_power ?? DEFAULT_RESOLUTION_POWER,
    };
}


const DEFAULT_RESOLUTION_POWER = 8;



export const enum Status {

    /**
     * 初期状態であり、読み込みが開始されていない状態。
     */
    NOT_INITIALIZED = "@@_DemProvider.Status.NOT_INITIALIZED",

    /**
     * 読み込みが開始されたが、まだ完了していない状態。
     * 正常に処理が完了すると INITIALIZED 、何らかのエラーが発生した場合は ERROR となる。
     */
    INITIALIZING = "@@_DemProvider.Status.INITIALIZING",

    /**
     * 読み込みが完了し、リクエストを処理できる状態。
     */
    INITIALIZED = "@@_DemProvider.Status.INITIALIZED",

    /**
     * エラーが発生し、リクエストを処理できない状態。
     */
    ERROR = "@@_DemProvider.Status.ERROR",
}


} // namespace DemProvider


export default DemProvider;
