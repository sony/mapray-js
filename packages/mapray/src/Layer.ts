import GLEnv from "./GLEnv";
import Viewer from "./Viewer";
import LayerCollection from "./LayerCollection";
import FlakeMaterial from "./FlakeMaterial";



/**
 * レイヤー基底クラス
 *
 * {@link ImageLayer} と {@link ContourLayer} の共通機能を提供するクラスである。
 */
abstract class Layer {

    protected _owner: LayerCollection;

    protected _glenv: GLEnv;

    protected _viewer: Viewer;

    private _visibility: boolean;

    private _opacity: number;


    /**
     * @param owner         地図レイヤー管理
     * @param init          初期化プロパティ
     */
    constructor( owner: LayerCollection, init: Layer.Option )
    {
        this._owner = owner;
        this._glenv = owner.glenv;
        this._viewer = owner.viewer;

        this._visibility = init.visibility ?? true;
        this._opacity    = init.opacity    ?? 1.0;
    }



    async init(): Promise<void>
    {
        return Promise.resolve();
    }


    /**
     * 可視性フラグを取得
     */
    getVisibility(): boolean { return this._visibility; }


    /**
     * 不透明度を取得
     */
    getOpacity(): number { return this._opacity; }


    /**
     * 可視性フラグを設定
     *
     * @param visibility  可視性フラグ
     */
    setVisibility( visibility: boolean )
    {
        if ( this._visibility !== visibility ) {
            // レイヤーの可視性が変化したら描画レイヤーを更新
            this._owner.dirtyDrawingLayers();
        }

        this._visibility = visibility;
    }


    /**
     * 不透明度を設定
     *
     * @param opacity  不透明度
     */
    setOpacity( opacity: number )
    {
        this._opacity = opacity;
    }


    /**
     * マテリアルを取得
     *
     * @return マテリアル
     * @internal
     */
    abstract getMateral(): FlakeMaterial


    /**
     * 描画の準備ができているかを取得
     * @internal
     */
    isReady() : boolean
    {
        return true;
    }


    /**
     * フレームの最後の処理
     * 継承クラスによって実装される。
     * @internal
     */
    endFrame(): void
    {
    }


    /**
     * 取り消し処理
     * 継承クラスによって実装される。
     * @internal
     */
    dispose(): void
    {
    }


}



namespace Layer {



export interface Option {

    /** 可視性フラグ */
    visibility?: boolean;

    /** 不透明度 */
    opacity?: number;

    /** レイヤータイプ */
    type: Type;
}



export enum Type {

    /**
     * 画像レイヤー
     */
    IMAGE = "@@_Layer.Type.IMAGE",


    /**
     * 等高線レイヤー
     */
    CONTOUR = "@@_Layer.Type.CONTOUR"

}



/**
 * レイヤの状態。
 *
 * 下記のように状態遷移する。これ以外の状態遷移は起こらない。
 *
 * ```text
 *              init()
 * NOT_LOADED ---------> LOADING ---------> LOADED
 *                          |
 *                          `-------------> ERROR
  * ```
 */
export const enum Status {

    /**
     * 初期状態であり、読み込みが開始されていない状態。
     */
    NOT_LOADED = "@@_TileProvider.Status.NOT_LOADED",

    /**
     * 読み込みが開始されたが、まだ完了していない状態。
     * 正常に処理が完了すると LOADED 、何らかのエラーが発生した場合は DESTROYED となる。
     * また、LOADING 中に dispose() が呼ばれた場合、即座に DESTROYED に遷移する。
     */
    LOADING = "@@_TileProvider.Status.LOADING",

    /**
     * 読み込みが完了し、リクエストを処理できる状態。
     */
    LOADED = "@@_TileProvider.Status.LOADED",

    /**
     * エラーが発生し、リクエストを処理できない状態。
     */
    ERROR = "@@_TileProvider.Status.ERROR",
}



} // namespace Layer



export default Layer;
