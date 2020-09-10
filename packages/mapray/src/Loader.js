import Resource, { URLResource } from "./Resource";


/**
 * @summary ローダークラス
 * @memberof mapray
 */
class Loader {

    /**
     * @param {mapray.Scene} scene 読み込み先のシーン
     * @param {mapray.Resource} resource 
     * @param {object} [options={}]
     * @param {object} [options.onLoad] 全ての読み込み完了時に呼ばれる
     * @param {mapray.Loader.EntityCallback} [options.onEntity] エンティティが読み込まれるたびに呼ばれる
     */
    constructor( scene, resource, options={} ) {
        this._scene = scene;
        if (!(resource instanceof Resource)) {
            throw new Error("Unsupported Resource Type: " + resource);
        }
        this._resource = resource;
        this._status = Loader.Status.NOT_LOADED;
        this._onLoad = options.onLoad || defaultOnLoadCallback;
        this._onEntity = options.onEntity || defaultOnEntityCallback;
    }


    /**
     * @summary 読み込み先のシーン
     * @type {mapray.Scene}
     * @readonly
     */
    get scene() { return this._scene; }


    /**
     * @summary シーンリソース
     * @type {string}
     * @readonly
     */
    get resource() { return this._resource; }


    /**
     * ローダー読み込みの状態
     * @readonly
     */
    get status() { return this._status; }


    /**
     * @private
     */
    _setStatus( status ) {
        this._status = status;
    }


    /**
     * @summary 読み込みを実行します。
     * @returns {Promise}
     */
    load()
    {
        if ( this.status !== Loader.Status.NOT_LOADED ) {
            return Promise.reject( new Error( "Illegal Status: " + this.status ) );
        }

        return (
            Promise.resolve()
            .then( () => {
                    this._setStatus( Loader.Status.LOADING );
                    this.scene.addLoader( this );
                    return this._load();
            } )
            .catch( error => {
                    // JSON データの取得に失敗 (キャンセルによる失敗の可能性あり)
                    console.log( error );
                    this._scene.removeLoader( this );
                    this._onLoad( this, false );
                    if ( this._status !== Loader.Status.CANCELED ) {
                        this._setStatus( Loader.Status.ABORTED );
                    }
                    throw error;
            } )
            .then( value => {
                    this._scene.removeLoader( this );
                    if ( this._status === Loader.Status.CANCELED ) {
                        this._onLoad( this, false );
                        throw new Error( "canceled" );
                    }
                    else {
                        this._setStatus( Loader.Status.LOADED );
                        this._onLoad( this, true );
                        return value;
                    }
            } )
        );
    }


    /**
     * @summary 読み込み処理の実態。継承クラスによって実装される。
     * @private
     */
    _load() {
        throw new Error( "_load() is not implemented in " + this.constructor.name );
    }


    /**
     * @summary 読み込みの取り消し
     * @desc
     * <p>終了コールバック関数は isSuccess == false で呼び出される。</p>
     */
    cancel()
    {
        if ( this._status === Loader.Status.LOADING || this._status === Loader.Status.LOADED ) {
            this._setStatus( Loader.Status.CANCELED );
            this._resource.cancel();
            this._cancel();
            // this._scene.removeLoader( this );
            // this._onLoad( this, false );
        }
    }


    /**
     * @summary キャンセル時に行う処理。継承クラスによって実装される。
     * @private
     */
    _cancel()
    {
    }


    /**
     * 取り消し状態のとき例外を投げる
     * @private
     */
    _check_cancel()
    {
        if ( this.status === Loader.Status.CANCELED ) {
            throw new Error( "canceled" );
        }
    }
}


/**
 * @summary Entity読み込みコールバック
 * @callback EntityCallback
 * @desc
 * <p>読み込み処理の中でEntityが生成される際に呼ばれる。
 * 一度の読み込み(load()呼び出し)において複数のエンティティが生成される場合は、エンティティが生成されるたびに呼ばれる。
 * この関数をLoaderに指定する場合は、callback処理の中でEntityをsceneへ追加する必要がある。
 * geojsonのように、要素ごとにプロパティを含められるような場合は、propにより値にアクセスする。
 * </p>
 *
 * @param  {mapray.Loader} loader Loader
 * @param  {mapray.Entity} entity 読み込まれたEntity
 * @param  {object} prop エンティティ生成の元となるオブジェクト
 *
 * @example
 * const loader = new mapray.SceneLoader( viewer.scene, resource, {
 *         onEntity: ( loader, entity, prop ) => {
 *             entity.setScale( [ 2, 2, 2 ] );
 *             loader.scene.addEntity( entity );
 *         }
 * } );
 * loader.load();
 * 
 * @memberof mapray.Loader
 */



Loader.Status = {
    NOT_LOADED : "Not Loaded",
    LOADING    : "Loading",
    LOADED     : "Loaded",
    CANCELED   : "Canceled",
    ERROR      : "ERROR"
};

function defaultOnLoadCallback( loader, isSuccess )
{
}

function defaultOnEntityCallback( loader, entity )
{
    loader.scene.addEntity( entity );
}


export default Loader;
