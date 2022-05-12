import GLEnv from "./GLEnv";
import Viewer from "./Viewer";
import ImageProvider from "./ImageProvider";
import TileTextureCache from "./TileTextureCache";
import SurfaceMaterial from "./SurfaceMaterial";
import WireframeMaterial from "./WireframeMaterial";
import LayerCollection from "./LayerCollection";


/**
 * 地図レイヤー
 *
 * 地図レイヤーを表現するオブジェクトである。
 *
 * @see [[LayerCollection]]
 */
class Layer {

    private _owner: LayerCollection;

    private _glenv: GLEnv;

    private _viewer: Viewer;

    private _image_provider: ImageProvider;

    private _visibility: boolean;

    private _opacity: number;

    private _type: Layer.LayerType;

    private _material: SurfaceMaterial;

    private _tile_cache: TileTextureCache;

    /**
     * @param owner         地図レイヤー管理
     * @param init          初期化プロパティ
     */
    constructor( owner: LayerCollection, init: Layer.Option | ImageProvider )
    {
        this._owner = owner;
        this._glenv = owner.glenv;
        this._viewer = owner.viewer;

        var props = (init instanceof ImageProvider) ? { image_provider: init } : init;
        this._image_provider = props.image_provider;
        this._visibility     = props.visibility || true;
        this._opacity        = props.opacity    || 1.0;
        this._type = props.type === Layer.LayerType.NIGHT ? Layer.LayerType.NIGHT : Layer.LayerType.NORMAL;

        this._tile_cache = new TileTextureCache( this._glenv, this._image_provider );

        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( this._type === Layer.LayerType.NIGHT ) {
            if ( !render_cache.surface_night_material ) {
                render_cache.surface_night_material = new SurfaceMaterial( this._viewer, { nightMaterial: true } );
            }
            this._material = render_cache.surface_night_material;
        } else {
            if ( !render_cache.surface_material ) {
                render_cache.surface_material = new SurfaceMaterial( this._viewer );
                render_cache.wireframe_material = new WireframeMaterial( this._viewer );
            }
            this._material = render_cache.surface_material;
        }

        // プロバイダの状態が変化したら描画レイヤーを更新
        this._image_provider.status( (status) => { owner.dirtyDrawingLayers(); } );
    }


    /**
     * 画像プロバイダを取得
     */
    get image_provider(): ImageProvider { return this._image_provider; }


    /**
     * 可視性フラグを取得
     */
    get visibility(): boolean { return this._visibility; }


    /**
     * 不透明度を取得
     */
    get opacity(): number { return this._opacity; }


    /**
     * タイプを取得
     */
    get type(): Layer.LayerType { return this._type; }


    /**
     * タイルテクスチャキャッシュを取得
     * @internal
     */
    get tile_cache(): TileTextureCache { return this._tile_cache; }


    /**
     * 画像プロバイダを設定
     *
     * @param provider  画像プロバイダ
     */
    setImageProvider( provider: ImageProvider )
    {
        if ( this._image_provider !== provider ) {
            // プロバイダを変更またはプロバイダの状態が変化したら描画レイヤーを更新
            this._owner.dirtyDrawingLayers();
            provider.status( (status) => { this._owner.dirtyDrawingLayers(); } );
        }

        this._image_provider = provider;

        // タイルキャッシュを再構築
        this._tile_cache.cancel();
        this._tile_cache = new TileTextureCache( this._glenv, provider );
    }


    /**
     * 可視性フラグを設定
     *
     * @param visibility  可視性フラグ
     */
    setVisibility( visibility: boolean )
    {
        if ( this._visibility != visibility ) {
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
    getMateral(): SurfaceMaterial
    {
        return this._material;
    }
}



namespace Layer {



export interface Option {

    /** 画像プロバイダ */
    image_provider: ImageProvider;

    /** 可視性フラグ */
    visibility?: boolean;

    /** 不透明度 */
    opacity?: number;

    /** レイヤータイプ */
    type?: LayerType;

}



/**
 * レイヤータイプ
 */
export enum LayerType {

    /**
     * 通常のレイヤー
     */
    NORMAL,


    /**
     * 夜部分のみ描画するレイヤー
     */
    NIGHT,

};



} // namespace Layer



export default Layer;
