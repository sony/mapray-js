import Resource, { URLResource } from "./Resource";


/**
 * @summary ローダークラス
 * @memberof mapray
 */
class Loader {

    constructor( scene, resource, options={} ) {
        this._scene = scene;
        if (!(resource instanceof Resource)) {
            throw new Error("Unsupported Resource Type: " + resource);
        }
        this._resource = resource;
        this._status = Loader.Status.NOT_LOADED;
        this._onLoad = options.onLoad || defaultOnLoadCallback;
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



    _setStatus( status ) {
        this._status = status;
    }


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
                    this._setStatus( Loader.Status.ABORTED );
                    // JSON データの取得に失敗
                    console.log( error );
                    this._scene.removeLoader( this );
                    this._onLoad( this, false );
                    throw error;
            } )
            .then( value => {
                    this._check_cancel();
                    this._setStatus( Loader.Status.LOADED );
                    this._scene.removeLoader( this );
                    this._onLoad( this, true );
                    return value;
            } )
        );
    }


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
            this._setStatus( Loader.Status.CANCELLED );
            this._resource.cancel();
            this._cancel();
            // this._scene.removeLoader( this );
            // this._onLoad( this, false );
        }
    }


    _cancel()
    {
    }


    /**
     * 取り消し状態のとき例外を投げる
     * @private
     */
    _check_cancel()
    {
        if ( this.status === Loader.Status.CANCELLED ) {
            throw new Error( "canceled" );
        }
    }
}

Loader.Status = {
    NOT_LOADED : "Not Loaded",
    LOADING    : "Loading",
    LOADED     : "Loaded",
    CANCELLED  : "Cancelled",
    ERROR      : "ERROR"
};

function defaultOnLoadCallback( loader, isSuccess )
{
}


export default Loader;