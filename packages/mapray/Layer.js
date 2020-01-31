import ImageProvider from "./ImageProvider";
import TileTextureCache from "./TileTextureCache";


/**
 * @summary 地図レイヤー
 * @classdesc
 * <p>地図レイヤーを表現するオブジェクトである。</p>
 *
 * @hideconstructor
 * @memberof mapray
 * @see mapray.LayerCollection
 */
class Layer {

    /**
     * @param {mapray.LayerCollection}      owner         地図レイヤー管理
     * @param {object|mapray.ImageProvider} init          初期化プロパティ
     * @param {mapray.ImageProvider} init.image_provider  画像プロバイダ
     * @param {boolean}              [init.visibility]    可視性フラグ
     * @param {number}               [init.opacity]       不透明度
     * @package
     */
    constructor( owner, init )
    {
        this._owner = owner;
        this._glenv = owner.glenv;

        var props = (init instanceof ImageProvider) ? { image_provider: init } : init;
        this._image_provider = props.image_provider;
        this._visibility     = props.visibility || true;
        this._opacity        = props.opacity    || 1.0;

        this._tile_cache = new TileTextureCache( this._glenv, this._image_provider );

        // プロバイダの状態が変化したら描画レイヤーを更新
        this._image_provider.status( (status) => { owner.dirtyDrawingLayers(); } );
    }


    /**
     * @summary 画像プロバイダを取得
     * @type {mapray.ImageProvider}
     * @readonly
     */
    get image_provider() { return this._image_provider; }


    /**
     * @summary 可視性フラグを取得
     * @type {boolean}
     * @readonly
     */
    get visibility() { return this._visibility; }


    /**
     * @summary 不透明度を取得
     * @type {number}
     * @readonly
     */
    get opacity() { return this._opacity; }


    /**
     * @summary タイルテクスチャキャッシュを取得
     * @type {mapray.TileTextureCache}
     * @readonly
     * @package
     */
    get tile_cache() { return this._tile_cache; }


    /**
     * @summary 画像プロバイダを設定
     *
     * @param {mapray.ImageProvider} provider  画像プロバイダ
     */
    setImageProvider( provider )
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
     * @summary 可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     */
    setVisibility( visibility )
    {
        if ( this._visibility != visibility ) {
            // レイヤーの可視性が変化したら描画レイヤーを更新
            this._owner.dirtyDrawingLayers();
        }

        this._visibility = visibility;
    }


    /**
     * @summary 不透明度を設定
     *
     * @param {number} opacity  不透明度
     */
    setOpacity( opacity )
    {
        this._opacity = opacity;
    }

}


export default Layer;
