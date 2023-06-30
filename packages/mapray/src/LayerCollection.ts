import GLEnv from "./GLEnv";
import Viewer from "./Viewer";
import Layer from "./Layer";
import ImageProvider from "./ImageProvider";


/**
 * 地図レイヤー管理
 *
 * 地図レイヤーを管理するオブジェクトである。
 * インスタンスは {@link mapray.Viewer#layers} から得ることができる。
 *
 * @see [[Layer]]
 */
class LayerCollection {

    private _viewer: Viewer;

    private _glenv: GLEnv;

    private _layers: Layer[];

    private _draw_layers?: Layer[];


    /**
     * @param viewer  Viewer
     * @param layers  初期化プロパティ配列
     */
    constructor( viewer: Viewer, layers?: (Layer.Option | ImageProvider)[] )
    {
        this._viewer      = viewer;
        this._glenv       = viewer.glenv;
        this._layers      = [];

        // 初期レイヤーを追加
        if ( layers ) {
            for ( let i = 0; i < layers.length; ++i ) {
                this.add( layers[i] );
            }
        }
    }


    /**
     * Viewerを取得
     * @internal
     */
    get viewer(): Viewer { return this._viewer; }

    /**
     * WebGL 環境を取得
     * @internal
     */
    get glenv(): GLEnv { return this._glenv; }


    /**
     * レイヤー数
     */
    get num_layers(): number { return this._layers.length; }


    /**
     * レイヤーを取得
     *
     * @param  index  レイヤーの場所
     * @return Layer  レイヤー
     */
    getLayer( index: number )
    {
        return this._layers[index];
    }


    /**
     * すべてのレイヤーを削除
     */
    clear()
    {
        while ( this.num_layers > 0 ) {
            this.remove( 0 );
        }
    }


    /**
     * レイヤーを末尾に追加
     *
     * @param layer          レイヤーのプロパティ
     */
    add( layer: Layer.Option | ImageProvider )
    {
        this.insert( this.num_layers, layer );
    }


    /**
     * レイヤーを末尾に追加
     *
     * @param index          挿入場所
     * @param layer  レイヤーのプロパティ
     */
    insert( index: number, layer: Layer.Option | ImageProvider )
    {
        this._layers.splice( index, 0, new Layer( this, layer ) );
        this.dirtyDrawingLayers();
    }


    /**
     * 特定のレイヤーを削除
     *
     * @param index  削除場所
     */
    remove( index: number )
    {
        this._layers.splice( index, 1 );
        this.dirtyDrawingLayers();
    }


    /**
     * 描画レイヤー数を取得
     *
     * @return 描画レイヤー数
     */
    get num_drawing_layers(): number
    {
        if ( !this._draw_layers ) {
            this._draw_layers = this._updateDrawingLayers();
        }
        return this._draw_layers.length;
    }


    /**
     * 描画レイヤーを取得
     *
     * @param  index  レイヤーの場所
     * @return Layer  レイヤー
     */
    getDrawingLayer( index: number ): Layer
    {
        if ( !this._draw_layers ) {
            this._draw_layers = this._updateDrawingLayers();
        }
        return this._draw_layers[index];
    }


    /**
     * フレームの最後の処理
     * @internal
     */
    endFrame()
    {
        const layers = this._layers;

        for ( let i = 0; i < layers.length; ++i ) {
            layers[i].tile_cache.endFrame();
        }
    }


    /**
     * 取り消し処理
     * @internal
     */
    dispose()
    {
        const layers = this._layers;

        for ( let i = 0; i < layers.length; ++i ) {
            layers[i].tile_cache.dispose();
        }
    }


    /**
     * 描画レイヤー配列を無効化
     * @internal
     */
    dirtyDrawingLayers()
    {
        this._draw_layers = undefined;
    }


    /**
     * 描画レイヤー配列を更新
     * @internal
     */
    private _updateDrawingLayers(): Layer[]
    {
        const num_layers = this.num_layers;

        const draw_layers = [];
        for ( let i = 0; i < num_layers; ++i ) {
            const layer = this._layers[i];
            if ( layer.image_provider.status() === ImageProvider.Status.READY && layer.visibility === true ) {
                draw_layers.push( layer );
            }
        }
        return draw_layers;
    }

}


export default LayerCollection;
