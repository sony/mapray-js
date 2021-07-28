import Material from "./Material";
import GeoMath from "./GeoMath";
import vs_code from "./shader/sun.vert";
import fs_code from "./shader/sun.frag";


/**
 * @summary 太陽マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.Material
 * @private
 */
class SunMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer   所有者である Viewer
     */
    constructor( viewer )
    {
      super( viewer.glenv,
             vs_code,
             fs_code );
    }


    /**
     * @summary パラメータを設定
     *
     * @param  {mapray.RenderStage} render_stage  呼び出し側オブジェクト
     * @param  {mapray.Matrix} gocs_to_clip       gocs_to_clip
     * @param  {mapray.Matrix} view_to_gocs       view_to_gocs
     * @param  {mapray.Sun} sun                   Sun  Class
     * @param  {float} radius                     SunVisualizer parameter
     * @param  {float} intensity                  SunVisualizer parameter
     * @param  {object} parameters                大気パラメータ
     * @return {boolean}                          描画の有無
     *
     */
    setParameter( render_stage, gocs_to_clip, view_to_gocs, sun, radius, intensity, parameters )
    {
        const camMat = view_to_gocs;
        const cx = camMat[12];
        const cy = camMat[13];
        const cz = camMat[14];

        const array = [ camMat[0], camMat[1], camMat[2],  0,
                        camMat[4], camMat[5], camMat[6],  0,
                        camMat[8], camMat[9], camMat[10], 0,
                                0,         0,          0, 1];

        this.setMatrix ( "u_gocs_to_clip", gocs_to_clip );
        this.setFloat  ( "u_intensity", intensity );
        this.setMatrix ( "u_camera_direction_matrix", array );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        const camera_height = Math.sqrt( cx*cx + cy*cy + cz*cz ) * 0.000001;  // 1/1000000

        this.setVector3( "u_camera_position" , [cx * 0.000001, cy * 0.000001, cz * 0.000001] ); // 1/1000000
        this.setVector3( "u_sun_vector" , sun.sun_direction );
        this.setFloat  ( "u_camera_height", camera_height );
        this.setFloat  ( "u_camera_height2", camera_height * camera_height );
        this.setFloat  ( "u_kr",              parameters.kr );
        this.setFloat  ( "u_km",              parameters.km );
        this.setFloat  ( "u_scale_depth",     parameters.scale_depth );
        this.setFloat  ( "u_esun",            parameters.esun );
        this.setFloat  ( "u_exposure",        parameters.exposure );

        // 平面
        const plane_vector = [ camMat[8], camMat[9], camMat[10] ];

        const camera_distance = (render_stage._viewer.camera.far - render_stage._viewer.camera.near) / 2 + render_stage._viewer.camera.near;
        const camera_vector = [ camMat[8] * camera_distance, camMat[9] * camera_distance, camMat[10] * camera_distance ];
        const px = cx + camera_vector[0];
        const py = cy + camera_vector[1];
        const pz = cz + camera_vector[2];

        // sun
        const sun_length = 149597870000.0;
        const sunx = sun_length * sun.sun_direction[0];
        const suny = sun_length * sun.sun_direction[1];
        const sunz = sun_length * sun.sun_direction[2];
        const sun_vector = [ sunx - px, suny - py, sunz - pz ];

        let pan = GeoMath.dot3( camera_vector, plane_vector );
        let pbn = GeoMath.dot3( sun_vector,    plane_vector );

        if ( Math.abs(pan) < 0.000001 ) { pan = 0.0; }
        if ( Math.abs(pbn) < 0.000001 ) { pbn = 0.0; }

        if ( ! ( ( pan >= 0 && pbn <= 0 ) ||
                 ( pan <= 0 && pbn >= 0 ) ) ) {
            // カメラの背面
            return false;
        }

        const apan = Math.abs(pan);
        const apbn = Math.abs(pbn);

        const vec_ab = [ sunx - cx, suny - cy, sunz - cz ];
        const ratio = apan / ( apan + apbn );
        const cposx = cx + ( vec_ab[0] * ratio );
        const cposy = cy + ( vec_ab[1] * ratio );
        const cposz = cz + ( vec_ab[2] * ratio );

        // billboard
        const billboard_matrix = array;
        billboard_matrix[12] = cposx;
        billboard_matrix[13] = cposy;
        billboard_matrix[14] = cposz;
        this.setMatrix ( "u_billboard_matrix", billboard_matrix );

        const lx = cposx - cx;
        const ly = cposy - cy;
        const lz = cposz - cz;
        const sun_distance = Math.sqrt( lx*lx + ly*ly + lz*lz );
        const sun_scale = sun_distance / 2.5 * radius;
        this.setFloat ( "u_sun_scale", sun_scale );

        return true;
    }
}


export default SunMaterial;
