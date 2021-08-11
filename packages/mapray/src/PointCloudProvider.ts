/**
 * 点群データプロバイダ
 *
 * このインスタンスには状態 ([[PointCloudProvider.Status]]型) があり、[[PointCloudProvider.Status.INITIALIZED]] 以外の状態では新規に読み込み([[load]])を行うことができない。
 *
 * 以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバーライドした具象クラスを使用しなければならない。
 * - [[doInit]]
 * - [[doLoad]]
 * - [[doDestroy]]
 */
abstract class PointCloudProvider {

    private _status: PointCloudProvider.Status;


    constructor( option={} ) {
        this._status = PointCloudProvider.Status.NOT_INITIALIZED;
    }


    /**
     * 初期化します。
     * 継承クラスではdoInit()を継承する
     */
    async init() {
        if (this._status !== PointCloudProvider.Status.NOT_INITIALIZED) throw new Error("invalid status");
        try {
            await this.doInit();
            this._status = PointCloudProvider.Status.INITIALIZED;
        }
        catch(e) {
            this._status = PointCloudProvider.Status.DESTROYED;
            throw e;
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
     * 点群を読み込む
     * 継承クラスでは [[doLoad]] を継承する
     * @param level レベル
     * @param x x
     * @param y y
     * @param z z
     */
    load( level: number, x: number, y: number, z: number ): PointCloudProvider.Request {
        if ( this._status !== PointCloudProvider.Status.INITIALIZED ) {
            return { id: -1, done: Promise.reject(new Error("invalid status")) };
        }
        const id = PointCloudProvider._id_max++;
        return {
            id,
            done: this.doLoad( id, level, x, y, z ),
        }
    }


    flushQueue() {
    }


    toString() {
        return "PointCloudProvider";
    }


    /**
     * 実行中のリクエストをキャンセルする
     * @param id リクエストID
     */
    cancel( id: number ) {
        if ( this._status !== PointCloudProvider.Status.INITIALIZED ) throw new Error("invalid status");
        this.doCancel( id );
    }

    protected doCancel( id: number ): void {
    }


    /**
     * 実行中のリクエスト数を返す
     */
    abstract getNumberOfRequests(): number;


    /**
     * 破棄
     * 継承クラスではdoDestroy()を継承する
     */
    async destroy() {
        if ( this._status !== PointCloudProvider.Status.INITIALIZED ) throw new Error("invalid status");
        try {
            await this.doDestroy();
        }
        finally {
            this._status = PointCloudProvider.Status.DESTROYED;
        }
    }


    /**
     * 初期化を行う
     */
    protected abstract doInit(): Promise<void>;


    /**
     * 読み込みを行う
     * @param id リクエストid
     * @param level レベル
     * @param x x
     * @param y y
     * @param z z
     */
    protected abstract doLoad( id: number, level: number, x: number, y: number, z: number ): Promise<PointCloudProvider.Data>;


    /**
     * 破棄を行う
     */
    protected abstract doDestroy(): Promise<void>;


    private static _id_max: number = 0;
}




namespace PointCloudProvider {


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
}


/**
 * リクエスト
 */
export interface Request {
    /** リクエストID */
    id: number,

    /** リクエストの完了を示すプロミス */
    done: Promise<Data>,
}



/**
 * 状態の列挙型
 *
 * ```text
 * NOT_LOADED ---------> INITIALIZED  ------------> DESTROYED 
 *              init()                  dispose()      ^      
 *                |                                    |      
 *                `------------------------------------'      
 *                                 error                      
 * ```
 *
 * @see [[PointCloudProvider._status]]
 */
export enum Status {
    /**
     * 初期化前 (初期状態)
     */
    NOT_INITIALIZED,

    /**
     * 初期化済み（読み込み可能）
     */
    INITIALIZED,

    /**
     * 破棄状態
     */
    DESTROYED,
}



} // namespace PointCloudProvider



export default PointCloudProvider;
