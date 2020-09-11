import Material from "./Material";
import GeoMath from "./GeoMath";
import vs_code from "./shader/b3d_cube.vert";
import fs_code from "./shader/b3d_cube.frag";


/**
 * @summary B3D 立方体マテリアル
 * @memberof mapray
 * @extends mapray.Material
 * @private
 */
class B3dCubeMaterial extends Material {

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
     * @param {mapray.Vector3}          color  表示色
     */
    setParameters( stage, to_a0cs, color )
    {
        // mat4 u_obj_to_clip
        let obj_to_clip = B3dCubeMaterial._obj_to_clip;
        GeoMath.mul_GA( stage._a0cs_to_clip, to_a0cs, obj_to_clip );
        this.setMatrix( "u_obj_to_clip", obj_to_clip );

        // vec3 u_color
        this.setVector3( "u_color", color );
    }

}


// 計算用一時領域
B3dCubeMaterial._obj_to_clip = GeoMath.createMatrixf();


export default B3dCubeMaterial;
