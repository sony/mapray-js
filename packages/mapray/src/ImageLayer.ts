import Viewer from "./Viewer";
import ImageProvider from "./ImageProvider";
import TileTextureCache from "./TileTextureCache";
import SurfaceMaterial from "./SurfaceMaterial";
import WireframeMaterial from "./WireframeMaterial";
import LayerCollection from "./LayerCollection";
import Layer from "./Layer";
import { Vector3 } from "./GeoMath";



/**
 * 画像レイヤー
 *
 * 画像レイヤーを表現するオブジェクトである。
 *
 * @see {@link LayerCollection}
 */
class ImageLayer extends Layer {

    private _provider: ImageProvider;

    private _info!: Required<ImageProvider.Info>;

    private _status: Layer.Status = Layer.Status.NOT_LOADED;

    private _draw_type: ImageLayer.DrawType;

    private _material: SurfaceMaterial;

    private _tile_cache: TileTextureCache;

    /**
     * @param owner         レイヤー管理
     * @param init          初期化プロパティ
     */
    constructor( owner: LayerCollection, init: ImageLayer.Option | ImageProvider )
    {
        const props: ImageLayer.Option = ImageLayer.isOption( init ) ? init : { type: Layer.Type.IMAGE, image_provider: init };
        super( owner, props );

        this._provider = props.image_provider;
        this._draw_type = props.draw_type ?? ImageLayer.DrawType.NORMAL;

        this._tile_cache = new TileTextureCache( this._glenv, this._provider, { pole_info: new Viewer.PoleInfo( props.pole ) } );

        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( this._draw_type === ImageLayer.DrawType.NIGHT ) {
            if ( !render_cache.surface_night_material ) {
                render_cache.surface_night_material = new SurfaceMaterial( this._viewer, { nightMaterial: true } );
            }
            this._material = render_cache.surface_night_material;
        }
        else {
            if ( !render_cache.surface_material ) {
                render_cache.surface_material = new SurfaceMaterial( this._viewer );
                render_cache.wireframe_material = new WireframeMaterial( this._viewer );
            }
            this._material = render_cache.surface_material;
        }
    }


    override async init(): Promise<void>
    {
        await this._loadProvider();
        await this._tile_cache.init();
    }


    /**
     * 描画タイプを取得
     */
    getDrawType(): ImageLayer.DrawType { return this._draw_type; }


    /**
     * タイルテクスチャキャッシュを取得
     * @internal
     */
    getTileCache(): TileTextureCache { return this._tile_cache; }


    getZoomLevelRange(): ImageProvider.Range
    {
        return this._info.zoom_level_range;
    }


    /**
     * 画像プロバイダを取得
     */
    get provider(): ImageProvider
    {
        return this._provider;
    }

    /**
     * 画像プロバイダを設定
     *
     * @param provider  画像プロバイダ
     */
    async setProvider( provider: ImageProvider )
    {
        if ( this._provider === provider ) {
            return;
        }

        const tile_cache = new TileTextureCache( this._glenv, provider );
        try {
            await tile_cache.init();

            this._tile_cache.dispose();
            this._provider = provider;
            this._tile_cache = tile_cache;

            // プロバイダを変更またはプロバイダの状態が変化したら描画レイヤーを更新
            this._owner.dirtyDrawingLayers();
        }
        catch ( err ) {
            tile_cache.dispose();
        }
    }


    private async _loadProvider(): Promise<void>
    {
        try {
            this._status = Layer.Status.LOADING;
            this._info = await this._provider.init();
            this._status = Layer.Status.LOADED;
            // プロバイダの状態が変化したら描画レイヤーを更新
            this._owner.dirtyDrawingLayers();
        }
        catch ( err ) {
            this._status = Layer.Status.ERROR;
            throw err;
        }
    }



    /**
     * マテリアルを取得
     *
     * @return マテリアル
     * @internal
     */
    override getMateral(): SurfaceMaterial
    {
        return this._material;
    }


    /**
     * 描画の準備ができているかを取得
     * @internal
     */
    override isReady(): boolean
    {
        return this._status === Layer.Status.LOADED;
    }


    /**
     * フレームの最後の処理
     * @internal
     */
    endFrame(): void
    {
        this._tile_cache.endFrame();
    }


    /**
     * 取り消し処理
     * @internal
     */
    dispose(): void
    {
        this._tile_cache.endFrame();
    }


}



namespace ImageLayer {



export interface Option extends Layer.Option {

    /** レイヤータイプ */
    type: Layer.Type.IMAGE;

    /** 画像プロバイダ */
    image_provider: ImageProvider;

    /** 描画タイプ */
    draw_type?: DrawType;

    /** 北極と南極の極地に関するオプション
     * Groundの極地表示が無効であればレイヤーの極地表示も無効となる
    */
    pole?: PoleOption;

}

export function isOption( value: Option | ImageProvider ): value is Option
{
    return "image_provider" in value;
}



/**
 * 描画タイプ
 */
export enum DrawType {

    /**
     * 通常のレイヤー
     */
    NORMAL = "@@_ImageLayer.DrawType.NORMAL",

    /**
     * 夜部分のみ描画するレイヤー
     */
    NIGHT = "@@_ImageLayer.DrawType.NIGHT",

}



/**
 * 北側と南側の極地に関するレイヤー用オプションの型
 *
 * @see {@link Option.pole}
 */
export interface PoleOption {

    /**
     * 北側極地の表示色
     *
     * @defaultValue `[0.8, 0.8, 0.8]`
     */
    north_color?: Vector3;

    /**
     * 南側極地の表示色
     *
     * @defaultValue `[0.8, 0.8, 0.8]`
     */
    south_color?: Vector3;

}



} // namespace ImageLayer



export default ImageLayer;
