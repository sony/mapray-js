import EntityMaterial from "./EntityMaterial";
import GeoMath from "./GeoMath";
import markerline_vs_code from "./shader/markerline.vert";
import markerline_fs_code from "./shader/markerline.frag";


/**
 * @summary 太さ付き線分専用マテリアル
 * @memberof mapray
 * @extends mapray.EntityMaterial
 * @private
 */
class MarkerLineMaterial extends EntityMaterial {

    /**
     * @param {mapray.GLEnv} glenv
     */
    constructor( glenv )
    {
        super( glenv, markerline_vs_code, markerline_fs_code );
    }


    /**
     * @override
     */
    isTranslucent( stage, primitive )
    {
        var   props = primitive.properties;
        var opacity = (props.opacity !== undefined) ? props.opacity : MarkerLineMaterial.DEFAULT_OPACITY;
        return opacity < 1.0;
    }


    /**
     * @override
     */
    setParameters( stage, primitive )
    {
        var props = primitive.properties;

        // u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h, h/w}
        // vec3 u_sparam
        var sparam = MarkerLineMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        sparam[2] = stage._height / stage._width;
        this.setVector3( "u_sparam", sparam );

        // 線の太さの半分: {u, v}
        // vec2 u_thickness
        var param_width = props.width || MarkerLineMaterial.DEFAULT_WIDTH;

        var thickness = MarkerLineMaterial._thickness;
        thickness[0] = param_width / 2;
        thickness[1] = param_width / 2;
        this.setVector2( "u_thickness", thickness );

        // 線の基本色
        // vec4 u_color
        var param_color   = (props.color   !== undefined) ? props.color   : MarkerLineMaterial.DEFAULT_COLOR;
        var param_opacity = (props.opacity !== undefined) ? props.opacity : MarkerLineMaterial.DEFAULT_OPACITY;

        var color = MarkerLineMaterial._color;
        GeoMath.copyVector3( param_color, color );
        color[3] = param_opacity;
        this.setVector4( "u_color", color );
    }

}


// クラス定数の定義
{
    MarkerLineMaterial.DEFAULT_WIDTH   = 1.0;
    MarkerLineMaterial.DEFAULT_COLOR   = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
    MarkerLineMaterial.DEFAULT_OPACITY = 1.0;

    // 計算用一時領域
    MarkerLineMaterial._sparam    = GeoMath.createVector3f();
    MarkerLineMaterial._thickness = GeoMath.createVector2f();
    MarkerLineMaterial._color     = GeoMath.createVector4f();
}


export default MarkerLineMaterial;
