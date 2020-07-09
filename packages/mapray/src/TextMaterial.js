import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import text_vs_code from "./shader/text.vert";
import text_fs_code from "./shader/text.frag";
import rid_fs_code from "./shader/rid.frag";
import { RenderTarget } from "./RenderStage";


/**
 * @summary テキストマテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 * @see mapray.TextEntity
 */
class TextMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv, options = {} )
    {
        super( glenv, text_vs_code, options.ridMaterial ? rid_fs_code : text_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", TextMaterial.TEXUNIT_IMAGE );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        var  props = primitive.properties;
        // If drawing background color, alpha is disable.
        return !props.enable_bg;
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
        var sparam = TextMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        if (stage.getRenderTarget() === RenderTarget.SCENE) {
            // テクスチャのバインド
            // sampler2D u_image
            var image_tex = props["image"];
            this.bindTexture2D( TextMaterial.TEXUNIT_IMAGE, image_tex.handle );
        }
    }

}


// クラス定数の定義
{
    TextMaterial.TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット

    // 計算用一時領域
    TextMaterial._sparam = GeoMath.createVector2f();
}


export default TextMaterial;
