import Layer from "./Layer";
import ImageProvider from "./ImageProvider";


/**
 * @summary 地図レイヤー管理
 * @classdesc
 * <p>地図レイヤーを管理するオブジェクトである。</p>
 * <p>インスタンスは {@link mapray.Viewer#layers} から得ることができる。</p>
 *
 * @hideconstructor
 * @memberof mapray
 * @see mapray.Layer
 */
class LayerCollection {

    /**
     * @param {mapray.GLEnv} glenv   WebGL 環境
     * @param {array}        layers  初期化プロパティ配列
     */
    constructor( glenv, layers )
    {
        this._glenv       = glenv;
        this._layers      = [];
        this._draw_layers = null;

        // 初期レイヤーを追加
        for ( var i = 0; i < layers.length; ++i ) {
            this.add( layers[i] );
        }
    }


    /**
     * @summary WebGL 環境を取得
     * @type {mapray.GLEnv}
     * @readonly
     * @package
     */
    get glenv() { return this._glenv; }


    /**
     * @summary レイヤー数
     * @type {number}
     * @readonly
     */
    get num_layers() { return this._layers.length; }


    /**
     * @summary レイヤーを取得
     *
     * @param  {number} index  レイヤーの場所
     * @return {mapray.Layer}    レイヤー
     */
    getLayer( index )
    {
        return this._layers[index];
    }


    /**
     * @summary すべてのレイヤーを削除
     */
    clear()
    {
        while ( this.num_layers() > 0 ) {
            this.remove( 0 );
        }
    }


    /**
     * @summary レイヤーを末尾に追加
     *
     * @param {object|mapray.ImageProvider} layer          レイヤーのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider  画像プロバイダ
     * @param {boolean}              [layer.visibility]    可視性フラグ
     * @param {number}               [layer.opacity]       不透明度
     */
    add( layer )
    {
        this.insert( this.num_layers, layer );
    }


    /**
     * @summary レイヤーを末尾に追加
     *
     * @param {number}                      index          挿入場所
     * @param {object|mapray.ImageProvider} layer          レイヤーのプロパティ
     * @param {mapray.ImageProvider} layer.image_provider  画像プロバイダ
     * @param {boolean}              [layer.visibility]    可視性フラグ
     * @param {number}               [layer.opacity]       不透明度
     */
    insert( index, layer )
    {
        this._layers.splice( index, 0, new Layer( this, layer ) );
        this.dirtyDrawingLayers();
    }


    /**
     * @summary 特定のレイヤーを削除
     *
     * @param {number} index  削除場所
     */
    remove( index )
    {
        this._layers.splice( index, 1 );
        this.dirtyDrawingLayers();
    }


    /**
     * @summary 描画レイヤー数を取得
     *
     * @return {number}  描画レイヤー数
     * @package
     */
    numDrawingLayers()
    {
        if ( this._draw_layers === null ) {
            this._updataDrawingLayers();
        }
        return this._draw_layers.length;
    }


    /**
     * @summary 描画レイヤーを取得
     *
     * @param  {number} index  レイヤーの場所
     * @return {mapray.Layer}  レイヤー
     * @package
     */
    getDrawingLayer( index )
    {
        if ( this._draw_layers === null ) {
            this._updataDrawingLayers();
        }
        return this._draw_layers[index];
    }


    /**
     * @summary フレームの最後の処理
     * @package
     */
    endFrame()
    {
        var layers = this._layers;

        for ( var i = 0; i < layers.length; ++i ) {
            layers[i].tile_cache.endFrame();
        }
    }


    /**
     * @summary 取り消し処理
     * @package
     */
    cancel()
    {
        var layers = this._layers;

        for ( var i = 0; i < layers.length; ++i ) {
            layers[i].tile_cache.cancel();
        }
    }


    /**
     * @summary 描画レイヤー配列を無効化
     * @package
     */
    dirtyDrawingLayers()
    {
        this._draw_layers = null;
    }


    /**
     * @summary 描画レイヤー配列を更新
     * @private
     */
    _updataDrawingLayers()
    {
        var num_layers = this.num_layers;

        var draw_layers = [];
        for ( var i = 0; i < num_layers; ++i ) {
            var layer = this._layers[i];
            if ( layer.image_provider.status() === ImageProvider.Status.READY && layer.visibility === true ) {
                draw_layers.push( layer );
            }
        }

        this._draw_layers = draw_layers;
    }

}


export default LayerCollection;
