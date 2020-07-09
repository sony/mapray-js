import Material from "./Material";
import GeoMath from "./GeoMath";
import { RenderTarget } from "./RenderStage";


/**
 * @summary エンティティ・マテリアル
 * @classdesc
 *   このクラスは、mapray.RenderStage.getRenderTarget()の値により異なる動作をする。
 *   <ul>
 *   <li>
 *   mapray.RenderStage.RenderTarget.SCENEの場合は、通常通り描画を行う。
 *   setParametersは、描画に必要な全てのパラメータを設定します。
 *   <li>mapray.RenderStage.RenderTarget.RIDの場合は、
 *   setParametersは、RID描画に必要なパラメータのみ設定します（一般にテクスチャや色情報は除外される）。
 *   このクラスでの実装は、setParameters()により、u_ridが設定されるようになっています。
 *   </ul>
 * @memberof mapray
 * @extends mapray.Material
 * @private
 */
class EntityMaterial extends Material {

    /**
     * @param {mapray.GLEnv} glenv    WebGL 環境
     * @param {string}     vs_code  頂点シェーダのソースコード
     * @param {string}     fs_code  フラグメントシェーダのソースコード
     */
    constructor( glenv, vs_code, fs_code )
    {
        super( glenv, vs_code, fs_code );
    }


    /**
     * @summary 背景との混合が必要か？
     * @param  {mapray.RenderStage} stage      レンダリングステージ
     * @param  {mapray.Primitive}   primitive  プリミティブ
     * @return {boolean}                     背景との混合が必要なとき true, それ以外のとき false
     * @default false
     * @abstract
     */
    isTranslucent( stage, primitive )
    {
        return false;
    }


    /**
     * @summary マテリアルパラメータを設定
     * @desc
     * <p>事前に material.bindProgram() すること。</p>
     * @param {mapray.RenderStage} stage      レンダリングステージ
     * @param {mapray.Primitive}   primitive  プリミティブ
     * @abstract
     */
    setParameters( stage, primitive )
    {
        if (stage.getRenderTarget() === RenderTarget.RID) {
            this._setRenderId( primitive.rid );
        }
    }


    /**
     * @summary u_obj_to_clip 変数を設定
     * @param {mapray.RenderStage} stage      レンダリングステージ
     * @param {mapray.Primitive}   primitive  プリミティブ
     * @protected
     */
    setObjToClip( stage, primitive )
    {
        var obj_to_gocs = primitive.transform;
        var obj_to_clip = EntityMaterial._obj_to_clip;

        // obj_to_clip = gocs_to_clip * obj_to_gocs
        GeoMath.mul_GA( stage._gocs_to_clip, obj_to_gocs, obj_to_clip );

        this.setMatrix( "u_obj_to_clip", obj_to_clip );
    }


    /**
     * @summary u_obj_to_view 変数を設定
     * @param {mapray.RenderStage} stage      レンダリングステージ
     * @param {mapray.Primitive}   primitive  プリミティブ
     * @protected
     */
    setObjToView( stage, primitive )
    {
        var obj_to_gocs = primitive.transform;
        var obj_to_view = EntityMaterial._obj_to_view;

        // obj_to_view = gocs_to_view * obj_to_gocs
        GeoMath.mul_AA( stage._gocs_to_view, obj_to_gocs, obj_to_view );

        this.setMatrix( "u_obj_to_view", obj_to_view );
    }

    /**
     * @private
     */
    _setRenderId( id ) {
        this.setVector4( "u_rid", [
                (id >> 12 & 0xF) / 0xF,
                (id >>  8 & 0xF) / 0xF,
                (id >>  4 & 0xF) / 0xF,
                (id       & 0xF) / 0xF
        ]);
    }
}


// クラス定数の定義
{
    EntityMaterial._obj_to_clip  = GeoMath.createMatrixf();  // 計算用一時領域
    EntityMaterial._obj_to_view  = GeoMath.createMatrixf();  // 計算用一時領域
}


export default EntityMaterial;
