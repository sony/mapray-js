import Material from "./Material";
import Resource, { URLResource } from "./Resource";
import { ImageIconLoader } from "./IconLoader";
import Texture from "./Texture";
import Dom from "./util/Dom";
import GeoMath from "./GeoMath";
import vs_code from "./shader/moon.vert";
import fs_code from "./shader/moon.frag";


/**
 * @summary 月マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.Material
 * @private
 */
class MoonMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer   所有者である Viewer
     * @param {string|URLResource} image_src image source
     * @param {boolean} [options.mask=false]  大気内か？
     */
    constructor( viewer, image_src, options = {} )
    {
        const preamble = MoonMaterial._getPreamble( options );

        super( viewer.glenv,
               preamble + vs_code,
               preamble + fs_code );

        this._viewer = viewer;
        this._mask_mode = (options.mask !== undefined) ? options.mask : false;

        if ( this._mask_mode === false ) {
            this._width = 512;
            this._height = 512;
            this._context = Dom.createCanvasContext( this._width, this._height );

            this._image = new Texture( viewer.glenv, this._context.canvas, { } );

            this.setImage( image_src );
        }
    }


    /**
     * @summary シェーダの前文を取得
     *
     * @param {object}  options  オプション指定
     * @param {boolean} [options.mask=false]  マスク用か？
     *
     * @private
     */
    static
    _getPreamble( options )
    {
        const mask_moon = (options.mask !== undefined) ? options.mask : false;

        const lines = [];

        // UNLIT マクロの定義
        if ( mask_moon ) {
            lines.push( "#define MASK_MOON" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }


    /**
     * @summary パラメータを設定
     *
     * @param  {mapray.RenderStage} render_stage  呼び出し側オブジェクト
     * @param  {mapray.Matrix} gocs_to_clip       gocs_to_clip
     * @param  {mapray.Matrix} view_to_gocs       view_to_gocs
     * @param  {mapray.Sun} sun                   Sun  Class
     * @param  {mapray.Moon} moon                 Moon  Class
     * @param  {float} radius                     SunVisualizer parameter
     * @param  {float} intensity                  SunVisualizer parameter
     *
     * @return {boolean}                          描画の有無
     */
    setParameter( render_stage, gocs_to_clip, view_to_gocs, sun, moon, radius, intensity )
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
        this.setVector2( "u_resolution" , [ render_stage._width / 2.0, render_stage._height / 2.0 ] );
        this.setFloat  ( "u_radius", radius );
        this.setFloat  ( "u_intensity", intensity );
        this.setMatrix ( "u_camera_direction_matrix", array );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        // let moon_direction = sun.sun_direction;  //仮にsunを渡す
        const moon_direction = moon.moon_direction;
        this.setVector3( "u_moon_direction" , moon_direction );


        // 月の方向はmoon_directionから求める
        const moon_rotation = Math.atan2( moon_direction[0], moon_direction[1] ) + 90.0 * GeoMath.DEGREE;
        const rsin = Math.sin(moon_rotation);
        const rcos = Math.cos(moon_rotation);
        const moon_rotation_matrix = [
            rcos, -rsin, 0.0, 0.0,
            rsin,  rcos, 0.0, 0.0,
             0.0,   0.0, 1.0, 0.0,
             0.0,   0.0, 0.0, 1.0
        ];
        this.setMatrix ( "u_moon_matrix", moon_rotation_matrix );

        const moon_tilt = - ( 5.14 + 23.44 ) * GeoMath.DEGREE;
        const tsin = Math.sin(moon_tilt);
        const tcos = Math.cos(moon_tilt);
        const moon_tilt_matrix = [
           tcos,  0.0,  tsin, 0.0,
            0.0,  1.0,   0.0, 0.0,
          -tsin,  0.0,  tcos, 0.0,
            0.0,  0.0,   0.0, 1.0
        ];
        this.setMatrix ( "u_moon_tilt_matrix", moon_tilt_matrix );


        // position
        // 平面
        const plane_vector = [ camMat[8], camMat[9], camMat[10] ];

        // const camera_distance = (render_stage._viewer.camera.far - render_stage._viewer.camera.near) / 2 + render_stage._viewer.camera.near;
        const camera_distance = render_stage._viewer.camera.near + 1737150 + 10;
        const camera_vector = [ camMat[8] * camera_distance, camMat[9] * camera_distance, camMat[10] * camera_distance ];
        const px = cx + camera_vector[0];
        const py = cy + camera_vector[1];
        const pz = cz - camera_vector[2];

        // sun
        const moon_length = 384400000.0;
        // const moon_length = 6378137.0 + 1737150.0 + 10000000.0; //test
        const moonx = moon_length * moon_direction[0];
        const moony = moon_length * moon_direction[1];
        const moonz = moon_length * moon_direction[2];
        const moon_vector = [ moonx - px, moony - py, moonz - pz ];

        let pan = GeoMath.dot3( camera_vector, plane_vector );
        let pbn = GeoMath.dot3( moon_vector,   plane_vector );

        if ( Math.abs(pan) < 0.000001 ) { pan = 0.0; }
        if ( Math.abs(pbn) < 0.000001 ) { pbn = 0.0; }

        if ( ! ( ( pan >= 0 && pbn <= 0 ) ||
                 ( pan <= 0 && pbn >= 0 ) ) ) {
            // カメラの背面
            // console.log('moon:カメラの背面');
            return false;
        }

        const apan = Math.abs(pan);
        const apbn = Math.abs(pbn);

        const vec_ab = [ moonx - cx, moony - cy, moonz - cz ];
        const ratio = apan / ( apan + apbn );
        const cposx = cx + ( vec_ab[0] * ratio );
        const cposy = cy + ( vec_ab[1] * ratio );
        const cposz = cz + ( vec_ab[2] * ratio );
        // console.log('moon:', cposx, cposy, cposz);

        // billboard
        let billboard_matrix = GeoMath.setIdentity(GeoMath.createMatrix());;
        billboard_matrix[12] = cposx;
        billboard_matrix[13] = cposy;
        billboard_matrix[14] = cposz;
        this.setMatrix ( "u_billboard_matrix", billboard_matrix );

        const lx = cposx - cx;
        const ly = cposy - cy;
        const lz = cposz - cz;
        const moon_distance = Math.sqrt( lx*lx + ly*ly + lz*lz );

        const lx2 = moonx - cx;
        const ly2 = moony - cy;
        const lz2 = moonz - cz;
        const moon_distance2 = Math.sqrt( lx2*lx2 + ly2*ly2 + lz2*lz2 );

        const moon_scale = moon_distance / moon_distance2 * radius;
        this.setFloat ( "u_moon_scale", moon_scale );


        if ( this._mask_mode === false ) {
            // texture
            this.setInteger( "u_image", MoonMaterial.TEXUNIT_IMAGE );
            this.bindTexture2D( MoonMaterial.TEXUNIT_IMAGE, this._image.handle );
        }

        return true;
    }


    /**
     * @summary 画像を設定
     * @param {string} image_src  画像のパス
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
    MoonMaterial.TEXUNIT_IMAGE = 0;       // 画像のテクスチャユニット
    // SunMaterialT.TEXUNIT_IMAGE_MASK = 1;  // 画像マスクのテクスチャユニット
}


export default MoonMaterial;
