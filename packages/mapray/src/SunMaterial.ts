import Material from "./Material";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import vs_code from "./shader/sun.vert";
import fs_code from "./shader/sun.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";
import Sun from "./Sun";
import SunVisualizer from "./SunVisualizer";

/**
 * 太陽表現マテリアル
 * @internal
 */
class SunMaterial extends Material {

    private _viewer: Viewer;

    private _matrix: Matrix;


    /**
     * @param  viewer   所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer.glenv, vs_code, fs_code );

        this._viewer = viewer;

        this._matrix = GeoMath.createMatrix();
    }


    /**
     * パラメータを設定
     *
     * @param  render_stage     呼び出し側オブジェクト
     * @param  gocs_to_clip     gocs_to_clip
     * @param  view_to_gocs     view_to_gocs
     * @param  sun              Sun  Class
     * @param  radius           SunVisualizer parameter
     * @param  intensity        SunVisualizer parameter
     * @param  parameters       大気パラメータ
     * @return                  描画の有無
     */
    setParameter( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix, sun: Sun, radius: number, intensity: number, parameters: SunVisualizer.Parameters ): boolean
    {
        const camMat = view_to_gocs;
        const camera_pos = GeoMath.createVector3([ view_to_gocs[12], view_to_gocs[13], view_to_gocs[14] ]);
        const camera_dir = GeoMath.createVector3([ view_to_gocs[ 8], view_to_gocs[ 9], view_to_gocs[10] ]);
        const tmp_vec = GeoMath.createVector3();

        const array = GeoMath.createMatrix([
                camMat[ 0], camMat[ 1], camMat[ 2], 0,
                camMat[ 4], camMat[ 5], camMat[ 6], 0,
                camMat[ 8], camMat[ 9], camMat[10], 0,
                         0,          0,          0, 1
        ]);

        this.setFloat  ( "u_intensity", intensity );
        this.setMatrix ( "u_camera_direction_matrix", array );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        const camera_height = GeoMath.length3( camera_pos ) * 0.000001;  // 1/1000000

        this.setVector3( "u_camera_position" , GeoMath.scale3( 0.000001, camera_pos, GeoMath.createVector3() ) ); // 1/1000000
        this.setVector3( "u_sun_vector" , sun.sun_direction );
        this.setFloat  ( "u_camera_height", camera_height );
        this.setFloat  ( "u_kr",              parameters.kr );
        this.setFloat  ( "u_km",              parameters.km );
        this.setFloat  ( "u_scale_depth",     parameters.scale_depth );
        this.setFloat  ( "u_esun",            parameters.esun );

        const camera_dist = (this._viewer.camera.far + this._viewer.camera.near) / 2.0;
        const camera_vec = GeoMath.scale3( camera_dist, camera_dir, GeoMath.createVector3() );
        const pos = GeoMath.add3( camera_pos, camera_vec, GeoMath.createVector3() );

        // sun
        const sun_dist = 149597870000.0;
        const sun_pos = GeoMath.scale3( sun_dist, sun.sun_direction, GeoMath.createVector3() );
        const sun_vec = GeoMath.sub3( sun_pos, pos, GeoMath.createVector3() );

        let pan = GeoMath.dot3( camera_vec, camera_dir );
        let pbn = GeoMath.dot3( sun_vec, camera_dir );

        if ( Math.abs( pan ) < 0.000001 ) { pan = 0.0; }
        if ( Math.abs( pbn ) < 0.000001 ) { pbn = 0.0; }

        if ( ! ( ( pan >= 0 && pbn <= 0 ) ||
                 ( pan <= 0 && pbn >= 0 ) ) ) {
            // カメラの背面
            return false;
        }

        const apan = Math.abs(pan);
        const apbn = Math.abs(pbn);

        const vec_ab = GeoMath.sub3( sun_pos, camera_pos, tmp_vec );
        const ratio = apan / ( apan + apbn );
        const cpos = GeoMath.add3( camera_pos, GeoMath.scale3( ratio, vec_ab, tmp_vec ), GeoMath.createVector3() );

        const tmp_mat = this._matrix;

        const sun_distance = GeoMath.length3( GeoMath.sub3( cpos, camera_pos, tmp_vec ) );
        const sun_scale = sun_distance / 2.5 * radius;

        // billboard
        const billboard_mat = array;
        billboard_mat[  0 ] *= sun_scale;
        billboard_mat[  1 ] *= sun_scale;
        billboard_mat[  2 ] *= sun_scale;
        billboard_mat[  4 ] *= sun_scale;
        billboard_mat[  5 ] *= sun_scale;
        billboard_mat[  6 ] *= sun_scale;
        billboard_mat[  8 ] *= sun_scale;
        billboard_mat[  9 ] *= sun_scale;
        billboard_mat[ 10 ] *= sun_scale;
        billboard_mat[ 12 ] = cpos[ 0 ];
        billboard_mat[ 13 ] = cpos[ 1 ];
        billboard_mat[ 14 ] = cpos[ 2 ];
        const gocs_to_billboard_mat = GeoMath.mul_GA( gocs_to_clip, billboard_mat, tmp_mat );
        this.setMatrix ( "u_billboard_matrix", gocs_to_billboard_mat );

        return true;
    }
}


export default SunMaterial;
