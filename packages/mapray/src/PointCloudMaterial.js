import Material from "./Material";
import GeoMath from "./GeoMath";
import PointCloud from "./PointCloud";
import point_cloud_vs_code from "./shader/point_cloud.vert";
import point_cloud_fs_code from "./shader/point_cloud.frag";
import point_cloud_debug_wire_vs_code from "./shader/point_cloud_debug_wire.vert";
import point_cloud_debug_wire_fs_code from "./shader/point_cloud_debug_wire.frag";
import point_cloud_debug_face_vs_code from "./shader/point_cloud_debug_face.vert";
import point_cloud_debug_face_fs_code from "./shader/point_cloud_debug_face.frag";



/**
 * @summary 点群マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.RenderStage.Material
 * @private
 */
class PointCloudMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer  所有者である Viewer
     */
    constructor( viewer, options={} )
    {
        const preamble = PointCloudMaterial._getPreamble( options );

        super( viewer.glenv, preamble + point_cloud_vs_code, preamble + point_cloud_fs_code );

        this.bindProgram();
        this.setFloat( "u_point_size", 10 );
        this.setFloat( "u_debug", -1.0 );

        this._local_to_clip = GeoMath.createMatrixf();
    }

    /**
     * @summary 点の大きさを設定
     * @param {number} val 設定する値
     */
    setPointSize( val ) {
        this.setFloat( "u_point_size", val );
    }

    /**
     * @summary デバッグ値を設定
     * @param {number} val 設定する値
     */
    setDebug( val ) {
        this.setFloat( "u_debug", val );
    }

    /**
     * @summary 描画位置を設定
     * @param {number} val 設定する値
     */
    setDebugBoundsParameter( stage, center )
    {
        mul_local_to_gocs( stage._gocs_to_clip, center, this._local_to_clip );
        this.setMatrix( "u_obj_to_clip", this._local_to_clip );
        return true;
    }

    /**
     * @summary シェーダの前文を取得
     * @private
     */
    static
    _getPreamble( options )
    {
        const lines = [];

        const point_shape_type = options.point_shape_type || PointCloud.PointShapeType.CIRCLE;

        lines.push( "#define POINT_SHAPE_TYPE " + point_shape_type.shader_code );

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }
    

}



const mul_local_to_gocs = ( mat, center, dst ) => {
    const
        m00 = mat[ 0], m01 = mat[ 4], m02 = mat[ 8], m03 = mat[12],
        m10 = mat[ 1], m11 = mat[ 5], m12 = mat[ 9], m13 = mat[13],
        m20 = mat[ 2], m21 = mat[ 6], m22 = mat[10], m23 = mat[14],
        m30 = mat[ 3], m31 = mat[ 7], m32 = mat[11], m33 = mat[15];

    const
        t03 = center[0],
        t13 = center[1],
        t23 = center[2];

    dst[ 0] = m00;
    dst[ 1] = m10;
    dst[ 2] = m20;
    dst[ 3] = m30;

    dst[ 4] = m01;
    dst[ 5] = m11;
    dst[ 6] = m21;
    dst[ 7] = m31;

    dst[ 8] = m02;
    dst[ 9] = m12;
    dst[10] = m22;
    dst[11] = m32;

    dst[12] = m00*t03 + m01*t13 + m02*t23 + m03;
    dst[13] = m10*t03 + m11*t13 + m12*t23 + m13;
    dst[14] = m20*t03 + m21*t13 + m22*t23 + m23;
    dst[15] = m30*t03 + m31*t13 + m32*t23 + m33;

    return dst;
}



/**
 * @summary デバッグ用点群マテリアル(ワイヤーフレーム)
 * @memberof mapray.RenderStage
 * @extends mapray.RenderStage.Material
 * @private
 */
class PointCloudDebugWireMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer  所有者である Viewer
     */
    constructor( viewer )
    {
        super( viewer.glenv, point_cloud_debug_wire_vs_code, point_cloud_debug_wire_fs_code );

        this.bindProgram();
        this._color = GeoMath.createVector3([ 0.0, 0.2, 0.4 ]);
        this.setVector3( "u_color", this._color );
        this._local_to_clip = GeoMath.createMatrixf();
    }

    setDebugBoundsParameter( stage, center, color )
    {
        mul_local_to_gocs( stage._gocs_to_clip, center, this._local_to_clip );
        this.setMatrix( "u_obj_to_clip", this._local_to_clip );
        if ( color ) {
            this._color[0] = color[0];
            this._color[1] = color[1];
            this._color[2] = color[2];
        }
        this.setVector3( "u_color", this._color );
        return true;
    }
}



/**
 * @summary デバッグ用点群マテリアル(サーフェス)
 * @memberof mapray.RenderStage
 * @extends mapray.RenderStage.Material
 * @private
 */
class PointCloudDebugFaceMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer  所有者である Viewer
     */
    constructor( viewer )
    {
        super( viewer.glenv, point_cloud_debug_face_vs_code, point_cloud_debug_face_fs_code );

        this.bindProgram();
        this._color = GeoMath.createVector4([ 0.3, 0.9, 1.0, 0.5 ]);
        this.setVector4( "u_color", this._color );
        this._local_to_clip = GeoMath.createMatrixf();
    }

    setDebugBoundsParameter( stage, center, color )
    {
        mul_local_to_gocs( stage._gocs_to_clip, center, this._local_to_clip );
        this.setMatrix( "u_obj_to_clip", this._local_to_clip );
        if ( color ) {
            this._color[0] = color[0];
            this._color[1] = color[1];
            this._color[2] = color[2];
            this._color[3] = color[3] || 0.0;
        }
        this.setVector4( "u_color", this._color );
        return true;
    }
}



export default PointCloudMaterial;
export { PointCloudDebugWireMaterial, PointCloudDebugFaceMaterial };
