import type GLEnv from "./GLEnv";
import type Primitive from "./Primitive";
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

    constructor( glenv: GLEnv, option: PolygonMaterial.Option = {} )
    {
        super( glenv, polygon_vs_code, option.ridMaterial ? rid_fs_code : polygon_fs_code );
    }


    override isTranslucent( stage: RenderStage, primitive: Primitive )
    {
        // @ts-ignore
        const   props = primitive.properties;
        // @ts-ignore
        const opacity = props.opacity ?? DEFAULT_OPACITY;
        return opacity < 1.0;
    }


    override setParameters( stage: RenderStage, primitive: Primitive )
    {
        super.setParameters( stage, primitive );

        // @ts-ignore
        const props = primitive.properties;

        // 変換行列
        // u_obj_to_clip, u_obj_to_view
        this.setObjToClip( stage, primitive );
        this.setObjToView( stage, primitive );

        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            // 基本色
            // vec4 u_color
            // @ts-ignore
            const param_color   = props.color   ?? DEFAULT_COLOR;
            // @ts-ignore
            const param_opacity = props.opacity ?? DEFAULT_OPACITY;
            // @ts-ignore
            const lighting = props.lighting as boolean;

            const color = COLOR_CACHE;
            GeoMath.copyVector3( param_color, color );
            color[3] = param_opacity;
            this.setVector4( "u_color", color );

            // 照光の有無
            // bool u_lighting
            this.setBoolean( "u_lighting", lighting );

            // ライト逆方向 (視点座標系) と強さ
            // vec3 u_light_dir
            this.setVector3( "u_light_dir", [0, 0, 1] );
        }
    }

}



const DEFAULT_COLOR   = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
const DEFAULT_OPACITY = 1.0;

// 計算用一時領域
const COLOR_CACHE = GeoMath.createVector4f();



namespace PolygonMaterial {



export interface Option {
    ridMaterial?: boolean;
}



} // namespace PolygonMaterial



export default PolygonMaterial;
