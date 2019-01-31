import EntityMaterial from "./EntityMaterial";
import basic_vs_code from "./shader/basic.vert";
import basic_fs_code from "./shader/basic.frag";


/**
 * @summary 基本マテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 */
class BasicMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, basic_vs_code, basic_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", BasicMaterial.TEXUNIT_IMAGE );
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        var props = primitive.properties;

        // u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // テクスチャのバインド
        var diffuse_tex = props["diffuse-map"];
        this.bindTexture2D( BasicMaterial.TEXUNIT_IMAGE, diffuse_tex.handle );
    }

}


// クラス定数の定義
{
    BasicMaterial.TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット
}


export default BasicMaterial;
