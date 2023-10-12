import Material from "./Material";
import GeoMath from "./GeoMath";
import Resource, { URLResource } from "./Resource";
import { ImageIconLoader } from "./IconLoader";
import Texture from "./Texture";
import Dom from "./util/Dom";
import vs_code from "./shader/sun_texture.vert";
import fs_code from "./shader/sun_texture.frag";


/**
 * @summary 太陽マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.Material
 * @private
 */
class TextureSunMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer   所有者である Viewer
     * @param {string|URLResource} image_src image source
     */
    constructor( viewer, image_src )
    {
      super( viewer.glenv,
             vs_code,
             fs_code );

      this._viewer = viewer;

      this._width = 1024;
      this._height = 1024;
      this._context = Dom.createCanvasContext( this._width, this._height );

      this._image = new Texture( viewer.glenv, this._context.canvas, { } );

      this.setImage( image_src );
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

        this.setMatrix ( "u_gocs_to_clip", gocs_to_clip );
        this.setFloat  ( "u_intensity", intensity );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        const camera_height = Math.sqrt( cx*cx + cy*cy + cz*cz ) * 0.000001;  // 1/1000000

        this.setVector3( "u_camera_position" , [cx * 0.000001, cy * 0.000001, cz * 0.000001] ); // 1/1000000
        this.setVector3( "u_sun_vector" , sun.sun_direction );
        this.setFloat  ( "u_camera_height", camera_height );
        this.setFloat  ( "u_kr",              parameters.kr );
        this.setFloat  ( "u_km",              parameters.km );
        this.setFloat  ( "u_scale_depth",     parameters.scale_depth );
        this.setFloat  ( "u_esun",            parameters.esun );

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
        let billboard_matrix = array;
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

        // texture
        this.setInteger( "u_image", TextureSunMaterial.TEXUNIT_IMAGE );

        this.bindTexture2D( TextureSunMaterial.TEXUNIT_IMAGE, this._image.handle );

        return true;
    }


    /**
     * @summary 画像を設定
     * @param {string|URLResource} image_src image source
     */
    setImage( image_src )
    {
        if ( this._image_src !== image_src ) {
            // 画像のパスが変更された
            this._image_src = image_src;
            const resource = (
                image_src instanceof Resource ? image_src:
                new URLResource( image_src, { })
                // new URLResource( image_src, { transform: this._props.transform })
            );

            const iconLoader = new ImageIconLoader();
            this._icon = iconLoader.load( resource );
            this._icon.onEnd(item => {
                this._context.drawImage( item._icon, 0, 0, this._width, this._height );
                this._image = new Texture( this._viewer.glenv, this._context.canvas, { } );
            });
        }
    }

}

// クラス定数の定義
{
    TextureSunMaterial.TEXUNIT_IMAGE = 0;       // 画像のテクスチャユニット
    // SunMaterialT.TEXUNIT_IMAGE_MASK = 1;  // 画像マスクのテクスチャユニット
}


export default TextureSunMaterial;
