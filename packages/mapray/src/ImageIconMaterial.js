import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import image_icon_vs_code from "./shader/image_icon.vert";
import image_icon_fs_code from "./shader/image_icon.frag";
import rid_fs_code from "./shader/image_icon_rid.frag";
import RenderStage from "./RenderStage";


/**
 * @summary イメージアイコンマテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 * @see mapray.ImageIconEntity
 */
class ImageIconMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv, options = {} )
    {
        super( glenv, image_icon_vs_code, options.ridMaterial ? rid_fs_code : image_icon_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", ImageIconMaterial.TEXUNIT_IMAGE );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        // 半透明画像は非対応
        return false;
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
        var sparam = ImageIconMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        // AlphaClipParam
        const alpha_clip_threshold = props["alpha_clipping"] ? props["alpha_clip_threshold"] : -1;
        this.setFloat( "u_alpha_clip_threshold", alpha_clip_threshold );

        // MaskColor
        const mask_color = props["mask_color"];
        this.setVector3( "u_mask_color", mask_color ?? INVALID_MASK_COLOR );

        // 透明度
        this.setFloat( "u_trans_factor", stage.getTranslucentMode() ? 0.5 : 1.0 );

        // テクスチャのバインド
        // sampler2D u_image
        const image = props["image"];
        this.bindTexture2D( ImageIconMaterial.TEXUNIT_IMAGE, image.handle );
    }

}


// クラス定数の定義
{
    ImageIconMaterial.TEXUNIT_IMAGE = 0;       // 画像のテクスチャユニット

    // 計算用一時領域
    ImageIconMaterial._sparam = GeoMath.createVector2f();
    ImageIconMaterial._bg_color = GeoMath.createVector3f();
    ImageIconMaterial._fg_color = GeoMath.createVector3f();
}

const INVALID_MASK_COLOR = [-1, -1, -1];


export default ImageIconMaterial;
