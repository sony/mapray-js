import EasyBindingBlock from "./animation/EasyBindingBlock";


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
        this._viewer     = viewer;
        this._glenv      = glenv;
        this._enode_list = [];  // ENode のリスト
        this._loaders    = [];  // 現在読み込み中の SceneLoader (取り消し用)

        // animation.BindingBlock
        this._animation = new EasyBindingBlock();
        this._animation.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
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
     * @summary アニメーションパラメータ設定
     *
     * @type {mapray.animation.BindingBlock}
     * @readonly
     */
    get animation() { return this._animation; }


    /**
     * エンティティ数
     * @type {number}
     * @readonly
     */
    get num_entities() { return this._enode_list.length; }


    /**
     * @summary すべてのエンティティを削除
     */
    clearEntities()
    {
        this._enode_list = [];
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
        this._enode_list.push( new ENode( entity ) );
    }


    /**
     * @summary エンティティを削除
     * @param {mapray.Entity} entity  エンティティ
     */
    removeEntity( entity )
    {
        var array = this._enode_list;

        for ( var i = 0; i < array.length; ++i ) {
            if ( array[i].entity === entity ) {
                array.splice( i, 1 );
                break;
            }
        }
    }


    /**
     * @summary エンティティを取得
     * @param  {number} index    インデックス
     * @return {mapray.Entity}   エンティティ
     */
    getEntity( index )
    {
        return this._enode_list[index].entity;
    }


    /**
     * @summary シーンを描画
     * @param {mapray.RenderStage} stage  レンダリングステージ
     * @package
     */
    draw( stage )
    {
        this._prepare_entities();

        // プリミティブの配列を生成
        var op_prims = [];  // 不透明プリミティブ
        var tp_prims = [];  // 半透明プリミティブ

        for ( let {entity} of this._enode_list ) {
            this._add_primitives( stage, entity, op_prims, tp_prims );
        }

        // プリミティブ配列を整列してから描画
        this._draw_opaque_primitives( stage, op_prims );
        this._draw_translucent_primitives( stage, tp_prims );
    }


    /**
     * @summary 描画前のエンティティの準備
     * @private
     */
    _prepare_entities()
    {
        var dem_area_updated = this._viewer.globe.dem_area_updated;

        for ( let enode of this._enode_list ) {
            let producer = enode.entity.getPrimitiveProducer();

            if ( (producer === null) || !producer.needsElevation() ) {
                // producer が存在しないとき、または
                // producer が標高を必要としないときは何もしない
                continue;
            }

            if ( producer.checkToCreateRegions() || enode.regions === null ) {
                // 領域情報が分からない、または領域情報が変化した可能性があるとき
                enode.regions = producer.createRegions();
                if ( enode.regions.length > 0 ) {
                    enode.regions.forEach( region => { region.compile(); } );
                    producer.onChangeElevation( enode.regions );
                }
            }
            else {
                if ( dem_area_updated.isEmpty() ) {
                    // 更新された DEM 領域は存在しない
                    // 標高の変化はないので以下の処理を省く
                    continue;
                }

                var regions = [];  // 標高に変化があった領域

                enode.regions.forEach( region => {
                    if ( region.intersectsWith( dem_area_updated ) ) {
                        // 領域の標高に変化があった
                        regions.push( region );
                    }
                } );

                if ( regions.length > 0 ) {
                    // 標高が変化した可能性がある領域を通知
                    producer.onChangeElevation( regions );
                }
            }
        }
    }


    /**
     * 視体積に含まれるプリミティブを追加
     * @private
     */
    _add_primitives( stage, entity, op_prims, tp_prims )
    {
        let producer = entity.getPrimitiveProducer();
        if ( producer === null ) return;

        for ( let primitive of producer.getPrimitives( stage ) ) {
            if ( primitive.isVisible( stage ) ) {
                let dst_prims = primitive.isTranslucent( stage ) ? tp_prims : op_prims;
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


    /**
     * @summary FlakePrimitiveProducer の反復可能オブジェクトを取得
     *
     * @return {iterable.<mapray.Entity.FlakePrimitiveProducer>}
     *
     * @package
     */
    getFlakePrimitiveProducers()
    {
        let producers = [];

        for ( let {entity} of this._enode_list ) {
            let prod = entity.getFlakePrimitiveProducer();
            if ( prod !== null ) {
                producers.push( prod );
            }
        }

        return producers;
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     *
     * @private
     */
    _unbindDescendantAnimations()
    {
        // すべてのエンティティを解除
        for ( let {entity} of this._enode_list ) {
            entity.animation.unbindAllRecursively();
        }
    }

}


/**
 * エンティティ管理用ノード
 *
 * @memberof mapray.Scene
 * @private
 */
class ENode {

    /**
     * @param {mapray.Entity} entity  管理対象のエンティティ
     */
    constructor( entity )
    {
        /**
         * @summary 管理対象のエンティティ
         * @member mapray.Scene.ENode#entity
         * @type {mapray.Entity}
         * @readonly
         */
        this.entity = entity;

        this.regions = null;
    }

}


export default Scene;
