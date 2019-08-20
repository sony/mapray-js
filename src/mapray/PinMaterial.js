import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import pin_vs_code from "./shader/pin.vert";
import pin_fs_code from "./shader/pin.frag";


/**
 * @summary テキストマテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 * @see mapray.TextEntity
 */
class PinMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, pin_vs_code, pin_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", PinMaterial.TEXUNIT_IMAGE );
        this.setInteger( "u_image_mask", PinMaterial.TEXUNIT_IMAGE_MASK );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        return false;
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
        var sparam = PinMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        // テクスチャのバインド
        // sampler2D u_image
        var image = props["image"];
        this.bindTexture2D( PinMaterial.TEXUNIT_IMAGE, image.handle );

        // テクスチャマスクのバインド
        // sampler2D u_image_mask
        var image_mask = props["image_mask"];
        this.bindTexture2D( PinMaterial.TEXUNIT_IMAGE_MASK, image_mask.handle );
    }

}


// クラス定数の定義
{
    PinMaterial.TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット
    PinMaterial.TEXUNIT_IMAGE_MASK = 1;  // 画像のテクスチャユニット

    // 計算用一時領域
    PinMaterial._sparam = GeoMath.createVector2f();
    PinMaterial._bg_color = GeoMath.createVector3f();
    PinMaterial._fg_color = GeoMath.createVector3f();
}


export default PinMaterial;
