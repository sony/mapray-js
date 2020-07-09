import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import line_vs_code from "./shader/line.vert";
import line_fs_code from "./shader/line.frag";
import AbstractLineEntity from "./AbstractLineEntity";
import { RenderTarget } from "./RenderStage";


/**
 * @summary 太さ付き線分専用マテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 */
class LineMaterial extends EntityMaterial {
    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv, line_type, options = {} )
    {
        const preamble = LineMaterial._getPreamble( line_type, options );
        super( glenv, preamble + line_vs_code, preamble + line_fs_code );

        this._line_type = line_type;
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        var   props = primitive.properties;
        var opacity = (props.opacity !== undefined) ? props.opacity : LineMaterial.DEFAULT_OPACITY;
        return opacity < 1.0;
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        super.setParameters( stage, primitive );

        var props = primitive.properties;

        // u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h, h/w}
        // vec3 u_sparam
        var sparam = LineMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        sparam[2] = stage._height / stage._width;
        this.setVector3( "u_sparam", sparam );

        // 線の太さの半分: {u, v}
        // vec2 u_thickness
        var param_width = props.width || LineMaterial.DEFAULT_WIDTH;

        var thickness = LineMaterial._thickness;
        thickness[0] = param_width / 2;
        thickness[1] = param_width / 2;
        this.setVector2( "u_thickness", thickness );

        if (stage.getRenderTarget() === RenderTarget.SCENE) {
            // 線の基本色
            // vec4 u_color
            var param_color   = (props.color   !== undefined) ? props.color   : LineMaterial.DEFAULT_COLOR;
            var param_opacity = (props.opacity !== undefined) ? props.opacity : LineMaterial.DEFAULT_OPACITY;

            var color = LineMaterial._color;
            GeoMath.copyVector3( param_color, color );
            color[3] = param_opacity;
            this.setVector4( "u_color", color );
        }

        // RID rendering also requires u_lower_length and u_upper_length.
        if ( this._line_type == AbstractLineEntity.LineType.PATH ) {
            var lower_length = props["lower_length"];
            this.setFloat( "u_lower_length", lower_length );

            var upper_length = props["upper_length"];
            this.setFloat( "u_upper_length", upper_length );
        }
    }


    /**
     * @summary シェーダの前文を取得
     *
     * @param {AbstractLineEntity.LineType} line_type
     * @param {object} options
     *
     * @private
     */
    static
    _getPreamble( line_type, options )
    {
        const lines = [];

        if ( line_type == AbstractLineEntity.LineType.PATH ) {
            lines.push( "#define PATH" );
        }

        if ( options.ridMaterial ) {
            lines.push( "#define RID" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }
}


// クラス定数の定義
{
    LineMaterial.DEFAULT_WIDTH   = 1.0;
    LineMaterial.DEFAULT_COLOR   = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
    LineMaterial.DEFAULT_OPACITY = 1.0;
    LineMaterial.DEFAULT_LOWER_LENGTH = 0.0;
    LineMaterial.DEFAULT_UPPER_LENGTH = 0.0;

    // 計算用一時領域
    LineMaterial._sparam    = GeoMath.createVector3f();
    LineMaterial._thickness = GeoMath.createVector2f();
    LineMaterial._color     = GeoMath.createVector4f();
}


export default LineMaterial;
