import EntityMaterial from "./EntityMaterial";
import Texture from "./Texture";
import model_vs_code from "./shader/model.vert";
import model_fs_code from "./shader/model.frag";


/**
 * @summary 基本マテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 */
class ModelMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, model_vs_code, model_fs_code );

        // 均一色テクスチャ
        this._white_texture = new Texture( glenv, null, { usage: Texture.Usage.COLOR, color: [1, 1, 1, 1] } );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_base_image", ModelMaterial.TEXUNIT_BASE_IMAGE );
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        var props = primitive.properties;
        var pbrMR = props.pbrMetallicRoughness;

        // u_obj_to_clip, u_obj_to_view
        this.setObjToClip( stage, primitive );
        this.setObjToView( stage, primitive );

        // 基本色係数
        this.setVector4( "u_base_color", pbrMR["baseColorFactor"] );

        // ライト逆方向 (視点座標系) と強さ
        this.setVector3( "u_light_dir", [0, 0, 1] );

        // テクスチャのバインド
        var base_image_texture = this._selectTexture( pbrMR["baseColorTexture"], this._white_texture );
        this.bindTexture2D( ModelMaterial.TEXUNIT_BASE_IMAGE, base_image_texture.handle );
    }


    /**
     * テクスチャを選択
     * @param  {object}         texinfo
     * @param  {mapray.Texture} alt_texure
     * @return {mapray.Texture}
     * @private
     */
    _selectTexture( texinfo, alt_texure )
    {
        if ( texinfo !== null ) {
            return texinfo.texture;
        }
        else {
            return alt_texure;
        }
    }

}


// クラス定数の定義
{
    ModelMaterial.TEXUNIT_BASE_IMAGE = 0;  // 基本色画像のテクスチャユニット
}


export default ModelMaterial;
