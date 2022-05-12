import Viewer from "./Viewer";
import Material from "./Material";
import RenderStage from "./RenderStage";
import GeoMath, { Vector3, Vector4, Matrix } from "./GeoMath";
import PointCloud from "./PointCloud";
import point_cloud_vs_code from "./shader/point_cloud.vert";
import point_cloud_fs_code from "./shader/point_cloud.frag";
import point_cloud_debug_wire_vs_code from "./shader/point_cloud_debug_wire.vert";
import point_cloud_debug_wire_fs_code from "./shader/point_cloud_debug_wire.frag";
import point_cloud_debug_face_vs_code from "./shader/point_cloud_debug_face.vert";
import point_cloud_debug_face_fs_code from "./shader/point_cloud_debug_face.frag";
import point_cloud_pick_vs_code from "./shader/point_cloud_pick.vert";
import point_cloud_pick_fs_code from "./shader/point_cloud_pick.frag";

/**
 * 点群マテリアル
 * @internal
 */
class PointCloudMaterial extends Material {

    protected _local_to_clip: Matrix;


    /**
     * @param viewer  所有者である Viewer
     */
    constructor( viewer: Viewer, options: PointCloudMaterial.Option, vs = point_cloud_vs_code, fs = point_cloud_fs_code )
    {
        const preamble = PointCloudMaterial._getPreamble( options );

        super( viewer.glenv, preamble + vs, preamble + fs );

        this.bindProgram();
        this.setFloat( "u_point_size", 10 );
        this.setFloat( "u_debug", -1.0 );

        this._local_to_clip = GeoMath.createMatrixf();
    }


    /**
     * 点の大きさを設定
     * @param val 設定する値
     */
    setPointSize( val: number ) {
        this.setFloat( "u_point_size", val );
    }


    /**
     * デバッグ値を設定
     * @param val 設定する値
     */
    setDebug( val: number ) {
        this.setFloat( "u_debug", val );
    }


    /**
     * 描画位置を設定
     * @param val 設定する値
     */
    setDebugBoundsParameter( stage: RenderStage, center: Vector3 )
    {
        mul_local_to_gocs( stage.gocs_to_clip, center, this._local_to_clip );
        this.setMatrix( "u_obj_to_clip", this._local_to_clip );
        return true;
    }


    /**
     * シェーダの前文を取得
     */
    private static _getPreamble( options: PointCloudMaterial.Option )
    {
        const lines = [];

        const point_shape_type_code = PointCloudMaterial._getShapeTypeShaderValue( options.point_shape_type );

        lines.push( "#define POINT_SHAPE_TYPE " + point_shape_type_code );

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }


    /**
     * [[PointCloud.PointShapeType]]のシェーダコード内での値
     */
    private static _getShapeTypeShaderValue( pointShapeType: PointCloud.PointShapeType ): number
    {
        switch( pointShapeType ) {
            case PointCloud.PointShapeType.RECTANGLE:          return 0;
            case PointCloud.PointShapeType.CIRCLE:             return 1;
            case PointCloud.PointShapeType.CIRCLE_WITH_BORDER: return 2;
            case PointCloud.PointShapeType.GRADIENT_CIRCLE:    return 3;
        }
    }

    setRenderId( id: number ) {}

}



/**
 * @internal
 */
namespace PointCloudMaterial {



export interface Option {
    point_shape_type: PointCloud.PointShapeType;
}



} // namespace PointCloudMaterial



/**
 * デバッグ用点群マテリアル(ワイヤーフレーム)
 * @internal
 */
class PointCloudDebugWireMaterial extends Material {

    private _color: Vector3;

    private _local_to_clip: Matrix;


    /**
     * @param viewer  所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer.glenv, point_cloud_debug_wire_vs_code, point_cloud_debug_wire_fs_code );

        this.bindProgram();
        this._color = GeoMath.createVector3([ 0.0, 0.2, 0.4 ]);
        this.setVector3( "u_color", this._color );
        this._local_to_clip = GeoMath.createMatrixf();
    }

    setDebugBoundsParameter( stage: RenderStage, center: Vector3, color: Vector3 )
    {
        mul_local_to_gocs( stage.gocs_to_clip, center, this._local_to_clip );
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
 * デバッグ用点群マテリアル(サーフェス)
 * @internal
 */
class PointCloudDebugFaceMaterial extends Material {

    private _color: Vector4;

    private _local_to_clip: Matrix;


    /**
     * @param viewer  所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer.glenv, point_cloud_debug_face_vs_code, point_cloud_debug_face_fs_code );

        this.bindProgram();
        this._color = GeoMath.createVector4([ 0.3, 0.9, 1.0, 0.5 ]);
        this.setVector4( "u_color", this._color );
        this._local_to_clip = GeoMath.createMatrixf();
    }

    setDebugBoundsParameter( stage: RenderStage, center: Vector3, color: Vector3 )
    {
        mul_local_to_gocs( stage.gocs_to_clip, center, this._local_to_clip );
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



/**
 * Pick用点群マテリアル
 */
export class PointCloudPickMaterial extends PointCloudMaterial {

    /**
     * @param viewer  所有者である Viewer
     */
    constructor( viewer: Viewer, options: PointCloudMaterial.Option )
    {
        super( viewer, options, point_cloud_pick_vs_code, point_cloud_pick_fs_code );
    }

    /**
     * RIDを設定する
     * @param id render id (RID)
     */
    setRenderId( id: number ) {
        this.setVector4( "u_rid", [
                ( id >> 12 & 0xF ) / 0xF,
                ( id >>  8 & 0xF ) / 0xF,
                ( id >>  4 & 0xF ) / 0xF,
                ( id       & 0xF ) / 0xF
        ] );
    }
}



const mul_local_to_gocs = ( mat: Matrix, center: Vector3, dst: Matrix ) => {
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



export default PointCloudMaterial;
export { PointCloudDebugWireMaterial, PointCloudDebugFaceMaterial };
