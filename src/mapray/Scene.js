/**
 * @summary モデルシーン
 *
 * @classdesc
 * <p>表示するエンティティを管理するクラスである。</p>
 * <p>インスタンスは {@link mapray.Viewer#scene} から得ることができる。</p>
 *
 * @hideconstructor
 * @memberof mapray
 * @see mapray.SceneLoader
 */
class Scene {

    /**
     * @param {mapray.Viewer}  viewer  Viewer インスタンス (未構築)
     * @param {mapray.GLEnv}   glenv   GLEnv インスタンス
     */
    constructor( viewer, glenv )
    {
        this._viewer      = viewer;
        this._glenv       = glenv;
        this._entity_list = [];
        this._loaders     = [];  // 現在読み込み中の SceneLoader (取り消し用)
    }


    /**
     * WebGL レンダリングコンテキスト情報
     * @type {mapray.GLEnv}
     * @readonly
     * @package
     */
    get glenv() { return this._glenv; }


    /**
     * this を保有する親オブジェクト
     * @type {mapray.Viewer}
     * @readonly
     */
    get viewer() { return this._viewer; }


    /**
     * エンティティ数
     * @type {number}
     * @readonly
     */
    get num_entities() { return this._entity_list.length; }


    /**
     * @summary すべてのエンティティを削除
     */
    clearEntities()
    {
        this._entity_list = [];
    }


    /**
     * @summary エンティティを末尾に追加
     * @param {mapray.Entity} entity  エンティティ
     */
    addEntity( entity )
    {
        if ( entity.scene !== this ) {
            throw new Error( "invalid entity" );
        }
        this._entity_list.push( entity );
    }


    /**
     * @summary エンティティを削除
     * @param {mapray.Entity} entity  エンティティ
     */
    removeEntity( entity )
    {
        var array = this._entity_list;
        var index = array.indexOf( entity );
        if ( index >= 0 ) {
            array.splice( index, 1 );
        }
    }


    /**
     * @summary エンティティを取得
     * @param  {number} index    インデックス
     * @return {mapray.Entity}   エンティティ
     */
    getEntity( index )
    {
        return this._entity_list[index];
    }


    /**
     * @summary シーンを描画
     * @param {mapray.RenderStage} stage  レンダリングステージ
     * @package
     */
    draw( stage )
    {
        // プリミティブの配列を生成
        var op_prims = [];  // 不透明プリミティブ
        var tp_prims = [];  // 半透明プリミティブ

        for ( var i = 0; i < this._entity_list.length; ++i ) {
            var entity = this._entity_list[i];
            this._add_primitives( stage, entity, op_prims, tp_prims );
        }

        // プリミティブ配列を整列してから描画
        this._draw_opaque_primitives( stage, op_prims );
        this._draw_translucent_primitives( stage, tp_prims );
    }


    /**
     * 視体積に含まれるプリミティブを追加
     * @private
     */
    _add_primitives( stage, entity, op_prims, tp_prims )
    {
        var src_prims = entity.getPrimitives( stage );

        for ( var i = 0; i < src_prims.length; ++i ) {
            var primitive = src_prims[i];
            if ( primitive.isVisible( stage ) ) {
                var dst_prims = primitive.isTranslucent( stage ) ? tp_prims : op_prims;
                dst_prims.push( primitive );
            }
        }
    }


    /**
     * 不透明プリミティブを整列してから描画
     * @private
     */
    _draw_opaque_primitives( stage, primitives )
    {
        // 不透明プリミティブの整列: 近接 -> 遠方 (Z 降順)
        primitives.sort( function( a, b ) { return b.sort_z - a.sort_z; } );

        var gl = this._glenv.context;
        gl.disable( gl.BLEND );
        gl.depthMask( true );

        for ( var i = 0; i < primitives.length; ++i ) {
            primitives[i].draw( stage );
        }
    }


    /**
     * 半透明プリミティブを整列してから描画
     * @private
     */
    _draw_translucent_primitives( stage, primitives )
    {
        // 半透明プリミティブの整列: 遠方 -> 近接 (Z 昇順)
        primitives.sort( function( a, b ) { return a.sort_z - b.sort_z; } );

        var gl = this._glenv.context;
        gl.enable( gl.BLEND );
        gl.depthMask( false );

        for ( var i = 0; i < primitives.length; ++i ) {
            primitives[i].draw( stage );
        }
    }


    /**
     * すべての SceneLoader の読み込みを取り消す
     * @package
     */
    cancelLoaders()
    {
        var loaders = this._loaders.concat();  // 複製

        for ( var i = 0; i < loaders.length; ++i ) {
            loaders[i].cancel();
        }
    }


    /**
     * 読み込み中の SceneLoader を登録
     * @param {mapray.SceneLoader} loader  登録するローダー
     * @package
     */
    addLoader( loader )
    {
        this._loaders.push( loader );
    }


    /**
     * 読み込み中の SceneLoader を削除
     * @param {mapray.SceneLoader} loader  削除するローダー
     * @package
     */
    removeLoader( loader )
    {
        var index = this._loaders.indexOf( loader );
        if ( index >= 0 ) {
            this._loaders.splice( index, 1 );
        }
    }

}

export default Scene;
