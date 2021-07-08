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
     * @param {object}       debug   詳細は B3dCollection#$debug 非公開プロパティ
     */
    constructor( glenv, debug )
    {
        const preamble = B3dMaterial._getPreamble( debug );
        super( glenv, preamble + vs_code, preamble + fs_code );

        this.bindProgram();
        this.setInteger( "u_teximage", B3dMaterial.TEXUNIT_TEXIMAGE );

        this._clip_coloring = debug.clip_coloring;
    }


    /**
     * @summary マテリアルパラメータを設定
     *
     * @desc
     * <p>事前に material.bindProgram() すること。</p>
     *
     * @param {mapray.B3dScene.B3dStage} stage  レンダリングステージ
     * @param {mapray.Matrix}          to_a0cs  メッシュの位置座標から A0CS への変換行列
     * @param {mapray.Texture}        teximage
     */
    setParameters( stage, to_a0cs, teximage )
    {
        console.assert( teximage );

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

        // テクスチャ画像
        // uniform sampler2D u_teximage
        this.bindTexture2D( B3dMaterial.TEXUNIT_TEXIMAGE, teximage.handle );

        // クリップされたタイルを着色
        if ( this._clip_coloring ) {
            // TEST
            this.setVector3( "u_clip_color", stage._clip_flag ? [0, 0, 0.2] : [0, 0, 0] );
        }
    }


    /**
     * @summary シェーダの前文を取得
     *
     * @param {object} debug
     *
     * @private
     */
    static
    _getPreamble( debug )
    {
        const lines = [];

        if ( debug.clip_coloring ) {
            lines.push( "#define CLIP_COLORING" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }
}


B3dMaterial.TEXUNIT_TEXIMAGE = 0;  // u_teximage 用のテクスチャユニット


// 計算用一時領域
B3dMaterial._obj_to_clip = GeoMath.createMatrixf();
B3dMaterial._obj_to_view = GeoMath.createMatrixf();


export default B3dMaterial;
