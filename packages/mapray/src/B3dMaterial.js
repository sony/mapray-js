import Material from "./Material";
import GeoMath from "./GeoMath";
import vs_code from "./shader/b3d_basic.vert";
import fs_code from "./shader/b3d_basic.frag";


/**
 * @summary B3D マテリアル
 * @memberof mapray
 * @extends mapray.Material
 * @private
 */
class B3dMaterial extends Material {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, vs_code, fs_code );
    }


    /**
     * @summary マテリアルパラメータを設定
     *
     * @desc
     * <p>事前に material.bindProgram() すること。</p>
     *
     * @param {mapray.B3dTree.B3dStage} stage  レンダリングステージ
     * @param {mapray.Matrix}         to_a0cs  メッシュの位置座標から A0CS への変換行列
     */
    setParameters( stage, to_a0cs )
    {
        // mat4 u_obj_to_clip
        let obj_to_clip = B3dMaterial._obj_to_clip;
        GeoMath.mul_GA( stage._a0cs_to_clip, to_a0cs, obj_to_clip );
        this.setMatrix( "u_obj_to_clip", obj_to_clip );

        // mat4 u_obj_to_view
        let obj_to_view = B3dMaterial._obj_to_view;
        GeoMath.mul_AA( stage._a0cs_to_view, to_a0cs, obj_to_view );
        this.setMatrix( "u_obj_to_view", obj_to_view );

        // ライト逆方向 (視点座標系) と強さ
        // vec3 u_light_dir
        this.setVector3( "u_light_dir", [0, 0, 0.5] );

        // 環境光
        // float u_ambient
        this.setFloat( "u_ambient", 0.5 );
    }

}


// 計算用一時領域
B3dMaterial._obj_to_clip = GeoMath.createMatrixf();
B3dMaterial._obj_to_view = GeoMath.createMatrixf();


export default B3dMaterial;
