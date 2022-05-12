import Scene from "./Scene";
import Entity from "./Entity";
import CredentialMode from "./CredentialMode";
import Resource, { URLResource } from "./Resource";


/**
 * ローダークラス
 */
abstract class Loader {

    protected _scene: Scene;

    protected _resource: Resource;

    private _status: Loader.Status;

    private _onLoad: Loader.FinishCallback;

    protected _onEntity: Loader.EntityCallback;

    /**
     * @param scene 読み込み先のシーン
     * @param resource
     * @param options
     */
    constructor( scene: Scene, resource: Resource, options: Loader.Option = {} ) {
        this._scene = scene;
        if (!(resource instanceof Resource)) {
            throw new Error("Unsupported Resource Type: " + resource);
        }
        this._resource = resource;
        this._status = Loader.Status.NOT_LOADED;
        this._onLoad = options.onLoad || Loader.defaultOnLoadCallback;
        this._onEntity = options.onEntity || Loader.defaultOnEntityCallback;
    }


    /**
     * 読み込み先のシーン
     */
    get scene(): Scene { return this._scene; }


    /**
     * シーンリソース
     */
    get resource(): Resource { return this._resource; }


    /**
     * ローダー読み込みの状態
     */
    get status(): Loader.Status { return this._status; }


    /**
     *
     */
    private _setStatus( status: Loader.Status ) {
        this._status = status;
    }


    /**
     * 読み込みを実行します。
     */
    load(): Promise<void>
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
     * 読み込み処理の実態。継承クラスによって実装される。
     */
    protected abstract _load(): Promise<void>;


    /**
     * 読み込みの取り消し
     *
     * 終了コールバック関数は `isSuccess == false` で呼び出される。
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
     * キャンセル時に行う処理。継承クラスによって実装される。
     */
    protected _cancel()
    {
    }


    /**
     * 取り消し状態のとき例外を投げる
     */
    protected _check_cancel()
    {
        if ( this.status === Loader.Status.CANCELED ) {
            throw new Error( "canceled" );
        }
    }
}



namespace Loader {



export interface Option {
    /**
     * 全ての読み込み完了時に呼ばれる
     */
    onLoad?: FinishCallback,

    /**
     * エンティティが読み込まれるたびに呼ばれる
     */
    onEntity?: Loader.EntityCallback,
}



/**
 * Entity読み込みコールバック
 *
 * 読み込み処理の中でEntityが生成される際に呼ばれる。
 * 一度の読み込み(load()呼び出し)において複数のエンティティが生成される場合は、エンティティが生成されるたびに呼ばれる。
 * この関数をLoaderに指定する場合は、callback処理の中でEntityをsceneへ追加する必要がある。
 * geojsonのように、要素ごとにプロパティを含められるような場合は、propにより値にアクセスする。
 *
 * @example
 * ```ts
 * const loader = new mapray.SceneLoader( viewer.scene, resource, {
 *         onEntity: ( loader, entity, prop ) => {
 *             entity.setScale( [ 2, 2, 2 ] );
 *             loader.scene.addEntity( entity );
 *         }
 * } );
 * loader.load();
 * ```
 *
 * @param  loader Loader
 * @param  entity 読み込まれたEntity
 * @param  prop エンティティ生成の元となるオブジェクト
 */
export type EntityCallback = ( loader: Loader, entity: Entity, prop: object ) => void;



/**
 * 終了コールバック
 *
 * シーンの読み込みが終了したときに呼び出される関数の型である。
 *
 * @param loader     読み込みを実行したローダー
 * @param isSuccess  成功したとき true, 失敗したとき false
 */
export type FinishCallback = ( loader: Loader, isSuccess: boolean ) => void;



export enum Status {
    NOT_LOADED,
    LOADING,
    LOADED,
    CANCELED,
    ERROR,
    ABORTED,
};


export function defaultOnLoadCallback( loader: Loader, isSuccess: boolean ): void
{
}


export function defaultOnEntityCallback( loader: Loader, entity: Entity, prop: object ): void
{
    loader.scene.addEntity( entity );
}



} // namespace Loader



export default Loader;
