import Material from "./Material";
import GeoMath from "./GeoMath";
import RenderStage from "./RenderStage";
import GLEnv from "./GLEnv";
import type Primitive from "./Primitive";
import { cfa_assert } from "./util/assertion";


/**
 * エンティティ・マテリアル
 *
 * このクラスは、{@link RenderStage.getRenderTarget()} の値により異なる動作をする。
 *
 * - {@link RenderStage.RenderTarget.SCENE} の場合は、通常通り描画を行う。
 *   {@link setParameters} は、描画に必要な全てのパラメータを設定します。
 * - {@link RenderStage.RenderTarget.RID} の場合は、
 *   {@link setParameters} は、RID描画に必要なパラメータのみ設定します（一般にテクスチャや色情報は除外される）。
 *   このクラスでの実装は、{@link setParameters} により、`u_rid` が設定されるようになっています。
 */
abstract class EntityMaterial extends Material {

    /**
     * @param glenv   - WebGL 環境
     * @param vs_code - 頂点シェーダのソースコード
     * @param fs_code - フラグメントシェーダのソースコード
     */
    protected constructor( glenv:   GLEnv,
                           vs_code: string,
                           fs_code: string )
    {
        super( glenv, vs_code, fs_code );
    }


    /**
     * 背景との混合が必要か？
     *
     * @param stage     - レンダリングステージ
     * @param primitive - プリミティブ
     *
     * @return 背景との混合が必要なとき `true`, それ以外のとき `false`
     *
     * @defaultValue `false`
     *
     * @virtual
     */
    isTranslucent( stage:     RenderStage,
                   primitive: Primitive ): boolean
    {
        return false;
    }


    /**
     * マテリアルパラメータを設定
     *
     * 事前に `material.bindProgram()` すること。
     *
     * @param stage     - レンダリングステージ
     * @param primitive - プリミティブ
     *
     * @virtual
     */
    setParameters( stage:     RenderStage,
                   primitive: Primitive ): void
    {
        if (stage.getRenderTarget() === RenderStage.RenderTarget.RID) {
            cfa_assert( primitive.rid !== undefined );
            this._setRenderId( primitive.rid );
        }
    }


    /**
     * `u_obj_to_clip` 変数を設定
     *
     * @param stage     - レンダリングステージ
     * @param primitive - プリミティブ
     */
    protected setObjToClip( stage:     RenderStage,
                            primitive: Primitive ): void
    {
        const obj_to_gocs = primitive.transform;
        const obj_to_clip = EntityMaterial._obj_to_clip;

        // obj_to_clip = gocs_to_clip * obj_to_gocs
        GeoMath.mul_GA( stage.gocs_to_clip, obj_to_gocs, obj_to_clip );

        this.setMatrix( "u_obj_to_clip", obj_to_clip );
    }


    /**
     * `u_obj_to_view` 変数を設定
     *
     * @param stage     - レンダリングステージ
     * @param primitive - プリミティブ
     */
    protected setObjToView( stage:     RenderStage,
                            primitive: Primitive ): void
    {
        const obj_to_gocs = primitive.transform;
        const obj_to_view = EntityMaterial._obj_to_view;

        // obj_to_view = gocs_to_view * obj_to_gocs
        GeoMath.mul_AA( stage.gocs_to_view, obj_to_gocs, obj_to_view );

        this.setMatrix( "u_obj_to_view", obj_to_view );
    }

    private static readonly _obj_to_clip = GeoMath.createMatrixf();  // 計算用一時領域
    private static readonly _obj_to_view = GeoMath.createMatrixf();  // 計算用一時領域

}


export default EntityMaterial;
