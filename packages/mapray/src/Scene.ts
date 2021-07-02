import BindingBlock from "./animation/BindingBlock";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import RenderStage from "./RenderStage";
import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import Primitive from "./Primitive";
import Entity from "./Entity";
import EntityRegion from "./EntityRegion";
import Loader from "./Loader";
import SceneLoader from "./SceneLoader";


/**
 * モデルシーン
 *
 * 表示するエンティティを管理するクラスである。
 * インスタンスは [[mapray.Viewer.scene]] から得ることができる。
 *
 */
class Scene {

    private _viewer: Viewer;

    private _glenv: GLEnv;

    private _enode_list: Scene.ENode[];

    private _loaders: Loader[];

    private _animation: BindingBlock;

    /** @internal */
    _PinEntity_pin_material?: object;
    /** @internal */
    _PinEntity_pin_material_pick?: object;

    /** @internal */
    _TextEntity_text_material?: object;
    /** @internal */
    _TextEntity_text_material_pick?: object;

    /** @internal */
    _SimpleTextEntity_text_material?: object;
    /** @internal */
    _SimpleTextEntity_text_material_pick?: object;

    /** @internal */
    _ImageEntity_image_material?: object;
    /** @internal */
    _ImageEntity_image_material_pick?: object;

    /** @internal */
    _PolygonEntity_material?: object;
    /** @internal */
    _PolygonEntity_material_pick?: object;


    /**
     * @param viewer  Viewer インスタンス (未構築)
     * @param glenv   GLEnv インスタンス
     * @internal
     */
    constructor( viewer: Viewer, glenv: GLEnv )
    {
        this._viewer     = viewer;
        this._glenv      = glenv;
        this._enode_list = [];  // ENode のリスト
        this._loaders    = [];  // 現在読み込み中の SceneLoader (取り消し用)

        const animation = new EasyBindingBlock();
        animation.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        // @ts-ignore
        this._animation = animation;

        this._PinEntity_pin_material = null;
        this._PinEntity_pin_material_pick = null;

        this._TextEntity_text_material = null;
        this._TextEntity_text_material_pick = null;

        this._SimpleTextEntity_text_material = null;
        this._SimpleTextEntity_text_material_pick = null;

        this._ImageEntity_image_material = null;
        this._ImageEntity_image_material_pick = null;

        this._PolygonEntity_material = null;
        this._PolygonEntity_material_pick = null;
    }


    /**
     * WebGL レンダリングコンテキスト情報
     * @internal
     */
    get glenv(): GLEnv { return this._glenv; }


    /**
     * this を保有する親オブジェクト
     */
    get viewer(): Viewer { return this._viewer; }


    /**
     * アニメーションパラメータ設定
     */
    get animation(): BindingBlock { return this._animation; }


    /**
     * エンティティ数
     */
    get num_entities(): number { return this._enode_list.length; }


    /**
     * すべてのエンティティを削除
     */
    clearEntities()
    {
        this._enode_list = [];
    }


    /**
     * エンティティを末尾に追加
     * @param entity  エンティティ
     */
    addEntity( entity: Entity )
    {
        if ( entity.scene !== this ) {
            throw new Error( "invalid entity" );
        }
        this._enode_list.push( new Scene.ENode( entity ) );
    }


    /**
     * エンティティを削除
     * @param entity  エンティティ
     */
    removeEntity( entity: Entity )
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
     * エンティティを取得
     * @param  index    インデックス
     * @return エンティティ
     */
    getEntity( index: number ): Entity
    {
        return this._enode_list[index].entity;
    }


    /**
     * シーンを描画
     * @param stage  レンダリングステージ
     * @internal
     */
    draw( stage: RenderStage )
    {
        this._prepare_entities();

        // プリミティブの配列を生成
        var op_prims: Primitive[] = [];  // 不透明プリミティブ
        var tp_prims: Primitive[] = [];  // 半透明プリミティブ
        var ac_prims: Primitive[] = [];  // アンカープリミティブ

        for ( let {entity} of this._enode_list ) {
            if ( !entity.visibility ) continue;
            this._add_primitives( stage, entity, op_prims, tp_prims, ac_prims );
        }

        // プリミティブ配列を整列してから描画
        this._draw_opaque_primitives( stage, op_prims );
        this._draw_translucent_primitives( stage, tp_prims );
        this._draw_anchor_primitives( stage, ac_prims );
    }


    /**
     * 描画前のエンティティの準備
     */
    private _prepare_entities()
    {
        var dem_area_updated = this._viewer.globe.dem_area_updated;

        for ( let enode of this._enode_list ) {
            let producer = enode.entity.getPrimitiveProducer();

            if ( (producer === null) || !producer.needsElevation() ) {
                // producer が存在しないとき、または
                // producer が標高を必要としないときは何もしない
                continue;
            }

            if ( producer.checkToCreateRegions() || !enode.regions ) {
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

                var regions: EntityRegion[] = [];  // 標高に変化があった領域

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
     */
    private _add_primitives( stage: RenderStage, entity: Entity,  op_prims: Primitive[], tp_prims: Primitive[], ac_prims: Primitive[] )
    {
        let producer = entity.getPrimitiveProducer();
        if ( producer === null ) return;

        for ( let primitive of producer.getPrimitives( stage ) ) {
            if ( primitive.isVisible( stage ) ) {
                let dst_prims = (
                  entity.anchor_mode ? ac_prims :
                  primitive.isTranslucent( stage ) ? tp_prims :
                  op_prims
                );
                stage.onPushPrimitive( primitive, entity );
                dst_prims.push( primitive );
            }
        }
    }


    /**
     * 不透明プリミティブを整列してから描画
     */
    private _draw_opaque_primitives( stage: RenderStage, primitives: Primitive[] )
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
     */
    private _draw_translucent_primitives( stage: RenderStage, primitives: Primitive[] )
    {
        // 半透明プリミティブの整列: 遠方 -> 近接 (Z 昇順)
        primitives.sort( function( a, b ) { return a.sort_z - b.sort_z; } );

        var gl = this._glenv.context;
        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            gl.enable( gl.BLEND );
        }
        else {
            gl.disable( gl.BLEND );
        }

        gl.depthMask( false );

        for ( var i = 0; i < primitives.length; ++i ) {
            primitives[i].draw( stage );
        }

        gl.disable( gl.BLEND );
        gl.depthMask( true );
    }


    /**
     * アンカープリミティブを整列してから描画。
     * [[RenderStage.AbstractRenderStage.getRenderTarget]] が [[mapray.AbstractRenderStage.RenderTarget.SCENE]] の場合は、
     *   隠面処理で隠れてえしまう部分は半透明で描画し、それ以外の部分は通常の描画を行う。結果的にアンカーオブジェクトが隠面において重なった場合は色が混ざった表示となる</p>
     * [[AbstractRenderStage#getRenderTarget]] が [[mapray.AbstractRenderStage.RenderTarget.RID]] の場合は、
     *   隠面処理で隠れてえしまう部分は強制的に描画し、それ以外の部分は通常の描画を行う。結果的にアンカーオブジェクトが隠面において重なった場合はzソートした順番でRIDが上書きされる
     * @see [[mapray.Entity.anchor_mode]]
     */
    private _draw_anchor_primitives( stage: RenderStage, primitives: Primitive[] )
    {
        // 不透明プリミティブの整列: 近接 -> 遠方 (Z 降順)
        primitives.sort( function( a, b ) { return b.sort_z - a.sort_z; } );

        var gl = this._glenv.context;
        gl.disable( gl.DEPTH_TEST );
        gl.depthMask( false );
        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            stage.setTranslucentMode( true );
            gl.enable( gl.BLEND );
        }
        else {
            gl.disable( gl.BLEND );
        }

        // 遠方 -> 近接 (Z 昇順)
        for ( var i = primitives.length-1; i >= 0; --i ) {
            primitives[i].draw( stage );
        }

        gl.depthMask( true );
        gl.enable( gl.DEPTH_TEST );

        stage.setTranslucentMode( false );
        // 近接 -> 遠方 (Z 降順)
        for ( var i = 0; i < primitives.length; ++i ) {
          primitives[i].draw( stage );
        }

        gl.disable( gl.BLEND );
    }


    /**
     * すべての SceneLoader の読み込みを取り消す
     * @internal
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
     * @param loader  登録するローダー
     * @internal
     */
    addLoader( loader: Loader )
    {
        this._loaders.push( loader );
    }


    /**
     * 読み込み中の SceneLoader を削除
     * @param loader  削除するローダー
     * @internal
     */
    removeLoader( loader: Loader )
    {
        var index = this._loaders.indexOf( loader );
        if ( index >= 0 ) {
            this._loaders.splice( index, 1 );
        }
    }


    /**
     * FlakePrimitiveProducer の反復可能オブジェクトを取得
     *
     * @internal
     */
    getFlakePrimitiveProducers(): Entity.FlakePrimitiveProducer[]
    {
        let producers = [];

        for ( let {entity} of this._enode_list ) {
            if ( !entity.visibility ) continue;
            let prod = entity.getFlakePrimitiveProducer();
            if ( prod !== null ) {
                producers.push( prod );
            }
        }

        return producers;
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     */
    private _unbindDescendantAnimations()
    {
        // すべてのエンティティを解除
        for ( let {entity} of this._enode_list ) {
            entity.animation.unbindAllRecursively();
        }
    }
}



namespace Scene {



/**
 * エンティティ管理用ノード
 * @internal
 */
export class ENode {

    entity: Entity;

    regions?: EntityRegion[];

    /**
     * @param {mapray.Entity} entity  管理対象のエンティティ
     */
    constructor( entity: Entity )
    {
        /**
         * 管理対象のエンティティ
         * @member mapray.Scene.ENode#entity
         * @type {mapray.Entity}
         * @readonly
         */
        this.entity = entity;

        this.regions = undefined;
    }

}



} // namespace Scene



export default Scene;
