/**
 * @summary 点群データプロバイダ
 * <p>このインスタンスには状態 ({@link mapray.PointCloudProvider.Status}型) があり、{@link mapray.PointCloudProvider.Status.INITIALIZED}以外の状態では新規に読み込み({@link mapray.PointCloudProvider#load})を行うことができない。</p>
 *
 * <p>以下の抽象メソッドは既定の動作がないので、利用者はこれらのメソッドをオーバーライドした具象クラスを使用しなければならない。</p>
 * <ul>
 *   <li>{@link mapray.PointCloudProvider#doInit}</li>
 *   <li>{@link mapray.PointCloudProvider#doLoad}</li>
 *   <li>{@link mapray.PointCloudProvider#doDestroy}</li>
 * </ul>
 *
 * @memberof mapray
 * @abstract
 * @protected
 */
class PointCloudProvider {

    constructor( option={} ) {
        this._status = PointCloudProvider.Status.NOT_INITIALIZED;
    }

    /**
     * @summary 初期化。
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
     * @summary リクエスト可能な状態かを返す。
     * 初期化が完了しているかだけではなく、現在処理中のリクエスト数も考慮した上でリクエスト可能な状態か判断する。
     * @return {boolean}
     * @protected
     */
    isReady() {
        return this._status == PointCloudProvider.Status.INITIALIZED && this.getNumberOfRequests() < 10;
    }

    /**
     * @summary 点群を読み込む
     * 継承クラスではdoLoad()を継承する
     * @param {number} level レベル
     * @param {number} x x
     * @param {number} y y
     * @param {number} z z
     * @returns {mapray.PointCloudProvider.Status.Request} request
     */
    load( level, x, y, z ) {
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
     * @summary 実行中のリクエストをキャンセルする
     * @param {number} id リクエストID
     */
    cancel( id ) {
        if ( this._status !== PointCloudProvider.Status.INITIALIZED ) throw new Error("invalid status");
        console.log("cancel not implemented");
    }

    /**
     * @summary 実行中のリクエスト数を返す
     * @abstract
     */
    getNumberOfRequests() {
        throw new Error("not implemented");
    }

    /**
     * @summary 破棄
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
     * @summary 初期化を行う
     * @protected
     * @abstract
     */
    async doInit() {
        throw new Error("not implemented");
    }

    /**
     * @summary 読み込みを行う
     * @protected
     * @abstract
     * @param {number} id リクエストid
     * @param {number} level レベル
     * @param {number} x x
     * @param {number} y y
     * @param {number} z z
     */
    async doLoad( id, level, x, y, z ) {
        throw new Error("not implemented");
    }

    /**
     * @summary 破棄を行う
     * @protected
     * @abstract
     */
    async doDestroy() {
        throw new Error("not implemented");
    }

    static get Status() { return Status; }
}

PointCloudProvider._id_max = 0;


/**
 * @typedef {Object} Request
 * @property {number} id リクエストID
 * @property {Promise} done リクエストの完了を示すプロミス
 * @memberof mapray.PointCloudProvider
 */


/**
 * @summary 状態の列挙型
 * @enum {object}
 * @memberof mapray.PointCloudProvider
 * @constant
 * @see mapray.PointCloudProvider#status
 */
const Status = {
    /**
     * 初期化前 (初期状態)
     */
    NOT_INITIALIZED: { id: "NOT_INITIALIZED" },

    /**
     * 初期化済み（読み込み可能）
     */
    INITIALIZED: { id: "INITIALIZED" },

    /**
     * 破棄状態
     */
    DESTROYED: { id: "DESTROYED" }
}


export default PointCloudProvider;
