import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import text_vs_code from "./shader/text_stroke.vert";
import text_fs_code from "./shader/text_stroke.frag";


/**
 * @summary テキストマテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 * @see mapray.TextEntity
 */
class TextStrokeMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, text_vs_code, text_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", TextStrokeMaterial.TEXUNIT_IMAGE );
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
        var props = primitive.properties;

        // mat4 u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h}
        // vec2 u_sparam
        var sparam = TextStrokeMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        // テクスチャのバインド
        // sampler2D u_image
        var image_tex = props["image"];
        this.bindTexture2D( TextStrokeMaterial.TEXUNIT_IMAGE, image_tex.handle );
    }

}


// クラス定数の定義
{
    TextStrokeMaterial.TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット

    // 計算用一時領域
    TextStrokeMaterial._sparam = GeoMath.createVector2f();
}


export default TextStrokeMaterial;
