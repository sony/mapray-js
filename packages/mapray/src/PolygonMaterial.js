import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import polygon_vs_code from "./shader/polygon.vert";
import polygon_fs_code from "./shader/polygon.frag";
import rid_fs_code from "./shader/rid.frag";
import RenderStage from "./RenderStage";


/**
 * @summary 多角形分専用マテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 */
class PolygonMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv, options = {} )
    {
        super( glenv, polygon_vs_code, options.ridMaterial ? rid_fs_code : polygon_fs_code );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        var   props = primitive.properties;
        var opacity = (props.opacity !== undefined) ? props.opacity : PolygonMaterial.DEFAULT_OPACITY;
        return opacity < 1.0;
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        super.setParameters( stage, primitive );

        var props = primitive.properties;

        // 変換行列
        // u_obj_to_clip, u_obj_to_view
        this.setObjToClip( stage, primitive );
        this.setObjToView( stage, primitive );

        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            // 基本色
            // vec4 u_color
            var param_color   = (props.color   !== undefined) ? props.color   : PolygonMaterial.DEFAULT_COLOR;
            var param_opacity = (props.opacity !== undefined) ? props.opacity : PolygonMaterial.DEFAULT_OPACITY;

            var color = PolygonMaterial._color;
            GeoMath.copyVector3( param_color, color );
            color[3] = param_opacity;
            this.setVector4( "u_color", color );

            // 照光の有無
            // bool u_lighting
            this.setBoolean( "u_lighting", props.lighting );

            // ライト逆方向 (視点座標系) と強さ
            // vec3 u_light_dir
            this.setVector3( "u_light_dir", [0, 0, 1] );
        }
    }

}


// クラス定数の定義
{
    PolygonMaterial.DEFAULT_COLOR   = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
    PolygonMaterial.DEFAULT_OPACITY = 1.0;

    // 計算用一時領域
    PolygonMaterial._color = GeoMath.createVector4f();
}


export default PolygonMaterial;
