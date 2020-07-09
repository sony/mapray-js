import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import image_icon_vs_code from "./shader/image_icon.vert";
import image_icon_fs_code from "./shader/image_icon.frag";
import rid_fs_code from "./shader/rid.frag";
import { RenderTarget } from "./RenderStage";


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
        // this.setInteger( "u_image_mask", ImageIconMaterial.TEXUNIT_IMAGE_MASK );
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

        if (stage.getRenderTarget() === RenderTarget.SCENE) {
            // テクスチャのバインド
            // sampler2D u_image
            var image = props["image"];
            this.bindTexture2D( ImageIconMaterial.TEXUNIT_IMAGE, image.handle );

            // テクスチャマスクのバインド
            // sampler2D u_image_mask
            // var image_mask = props["image_mask"];
            // this.bindTexture2D( ImageIconMaterial.TEXUNIT_IMAGE_MASK, image_mask.handle );
        }
    }

}


// クラス定数の定義
{
    ImageIconMaterial.TEXUNIT_IMAGE = 0;       // 画像のテクスチャユニット
    // ImageIconMaterial.TEXUNIT_IMAGE_MASK = 1;  // 画像マスクのテクスチャユニット

    // 計算用一時領域
    ImageIconMaterial._sparam = GeoMath.createVector2f();
    ImageIconMaterial._bg_color = GeoMath.createVector3f();
    ImageIconMaterial._fg_color = GeoMath.createVector3f();
}


export default ImageIconMaterial;
