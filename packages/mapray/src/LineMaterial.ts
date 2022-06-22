import GLEnv from "./GLEnv";
import Primitive from "./Primitive";
import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import vs_code from "./shader/line.vert";
import fs_code from "./shader/line.frag";
import AbstractLineEntity from "./AbstractLineEntity";
import RenderStage from "./RenderStage";


/**
 * 太さ付き線分専用マテリアル
 * @internal
 */
class LineMaterial extends EntityMaterial {

    private readonly is_path: boolean;


    /**
     * @param glenv     - WebGL 環境
     * @param is_path   - パスであるかを示す
     */
    constructor( glenv: GLEnv, is_path: boolean, options?: LineMaterial.Option )
    {
        const preamble = LineMaterial._getPreamble( is_path, options );
        super( glenv, preamble + vs_code, preamble + fs_code );

        this.is_path = is_path;
    }


    override isTranslucent( stage: RenderStage, primitive: Primitive )
    {
        const   props = primitive.properties;
        // @ts-ignore
        const opacity = props?.opacity ?? DEFAULT_OPACITY;
        return opacity < 1.0;
    }


    override setParameters( stage: RenderStage, primitive: Primitive )
    {
        super.setParameters( stage, primitive );

        const props = primitive.properties;

        // u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h, h/w}
        // vec3 u_sparam
        const sparam = _sparam;
        sparam[0] = 2 / stage.width;
        sparam[1] = 2 / stage.height;
        sparam[2] = stage.height / stage.width;
        this.setVector3( "u_sparam", sparam );

        // 線の太さの半分: {u, v}
        // vec2 u_thickness
        // @ts-ignore
        const param_width = props.width || DEFAULT_WIDTH;

        const thickness = _thickness;
        thickness[0] = param_width / 2;
        thickness[1] = param_width / 2;
        this.setVector2( "u_thickness", thickness );

        if (stage.getRenderTarget() === RenderStage.RenderTarget.SCENE) {
            // 線の基本色
            // vec4 u_color
            // @ts-ignore
            const param_color   = props?.color ?? DEFAULT_COLOR;
            // @ts-ignore
            const param_opacity = props?.opacity ?? DEFAULT_OPACITY;

            const color = GeoMath.copyVector3( param_color, _color );
            color[3] = param_opacity;
            this.setVector4( "u_color", color );
        }

        // RID rendering also requires u_lower_length and u_upper_length.
        if ( this.is_path ) {
            // @ts-ignore
            const lower_length = props["lower_length"];
            this.setFloat( "u_lower_length", lower_length );

            // @ts-ignore
            const upper_length = props["upper_length"];
            this.setFloat( "u_upper_length", upper_length );
        }
    }


    /**
     * シェーダの前文を取得
     */
    private static _getPreamble( is_path: boolean, options?: LineMaterial.Option )
    {
        const lines = [];

        if ( is_path ) {
            lines.push( "#define PATH" );
        }

        if ( options?.ridMaterial ) {
            lines.push( "#define RID" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }
}



namespace LineMaterial {



export interface Option {
    ridMaterial?: boolean;
}



} // namespace LineMaterial



const DEFAULT_WIDTH   = 1.0;
const DEFAULT_COLOR   = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
const DEFAULT_OPACITY = 1.0;
const DEFAULT_LOWER_LENGTH = 0.0;
const DEFAULT_UPPER_LENGTH = 0.0;

// 計算用一時領域
const _sparam    = GeoMath.createVector3f();
const _thickness = GeoMath.createVector2f();
const _color     = GeoMath.createVector4f();



export default LineMaterial;
