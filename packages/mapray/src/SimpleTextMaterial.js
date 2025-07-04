import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import text_vs_code from "./shader/simple_text.vert";
import text_fs_code from "./shader/simple_text.frag";
import rid_fs_code from "./shader/rid.frag";
import RenderStage from "./RenderStage";


/**
 * @summary テキストマテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 * @see mapray.TextEntity
 */
class SimpleTextMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv, options = {} )
    {
        super( glenv, text_vs_code, options.ridMaterial ? rid_fs_code : text_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", SimpleTextMaterial.TEXUNIT_IMAGE );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        // アンチエイリアス用のブレンドのため常に半透明
        return true;
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        super.setParameters( stage, primitive );

        var props = primitive.properties;

        // mat4 u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h}
        // vec2 u_sparam
        var sparam = SimpleTextMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            // 透明度
            this.setFloat( "u_trans_factor", stage.getTranslucentMode() ? 0.5 : 1.0 );

            // テクスチャのバインド
            // sampler2D u_image
            var image_tex = props["image"];
            this.bindTexture2D( SimpleTextMaterial.TEXUNIT_IMAGE, image_tex.handle );
        }
    }

}


// クラス定数の定義
{
    SimpleTextMaterial.TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット

    // 計算用一時領域
    SimpleTextMaterial._sparam = GeoMath.createVector2f();
}


export default SimpleTextMaterial;
