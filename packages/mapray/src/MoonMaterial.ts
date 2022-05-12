import Material from "./Material";
import Resource, { URLResource } from "./Resource";
import { IconLoaderItem, ImageIconLoader } from "./IconLoader";
import Texture from "./Texture";
import Dom from "./util/Dom";
import GeoMath, { Matrix } from "./GeoMath";
import vs_code from "./shader/moon.vert";
import fs_code from "./shader/moon.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";
import Sun from "./Sun";
import Moon from "./Moon";

/**
 * 月表現マテリアル
 * @internal
 */
class MoonMaterial extends Material {

    private _viewer: Viewer;
    private _mask_mode: boolean;
    private _width!: number;
    private _height!: number;
    private _context!: CanvasRenderingContext2D;

    private _image!: Texture;
    private _image_src!: (string | URLResource);
    private _icon!: IconLoaderItem;

    private _matrix_1: Matrix;
    private _matrix_2: Matrix;

    /**
     * @param viewer   所有者である Viewer
     * @param image_src image source
     * @param options  オプション
     */
    constructor( viewer: Viewer, image_src: (string | URLResource), options: MoonMaterial.Options = {} )
    {
        const preamble = MoonMaterial._getPreamble( options );

        super( viewer.glenv, preamble + vs_code, preamble + fs_code );

        this._viewer = viewer;
        this._mask_mode = (options.mask !== undefined) ? options.mask : false;

        this._matrix_1 = GeoMath.createMatrix();
        this._matrix_2 = GeoMath.createMatrix();

        if ( !this._mask_mode ) {
            this._width = 512;
            this._height = 512;
            this._context = Dom.createCanvasContext( this._width, this._height );

            this._image = new Texture( viewer.glenv, this._context.canvas, { } );

            this.setImage( image_src );
        }
    }


    /**
     * シェーダの前文を取得
     *
     * @param options  オプション
     */
    private static _getPreamble( options: MoonMaterial.Options ): string
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
     * パラメータを設定
     *
     * @param  render_stage     呼び出し側オブジェクト
     * @param  gocs_to_clip     gocs_to_clip
     * @param  view_to_gocs     view_to_gocs
     * @param  sun              Sun  Class
     * @param  moon             Moon  Class
     * @param  radius           MoonVisualizer parameter
     * @param  intensity        MoonVisualizer parameter
     *
     * @return 描画の有無
     */
    setParameter( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix, sun: Sun, moon: Moon, radius: number, intensity: number ): boolean
    {
        const camera_pos = GeoMath.createVector3([ view_to_gocs[12], view_to_gocs[13], view_to_gocs[14] ]);
        const camera_dir = GeoMath.createVector3([ view_to_gocs[ 8], view_to_gocs[ 9], view_to_gocs[10] ]);
        const tmp_vec = GeoMath.createVector3();

        const moon_direction = moon.moon_direction;

        const camera_dist = this._viewer.camera.near + 1737150 + 10;
        const camera_vec = GeoMath.scale3( camera_dist, camera_dir, GeoMath.createVector3() );
        const pos = GeoMath.add3( camera_pos, camera_vec, GeoMath.createVector3() );

        const moon_dist = 384400000.0;
        const moon_pos = GeoMath.scale3( moon_dist, moon_direction, GeoMath.createVector3() );
        const moon_vec = GeoMath.sub3( moon_pos, pos, GeoMath.createVector3() );

        let pan = GeoMath.dot3( camera_vec, camera_dir );
        let pbn = GeoMath.dot3( moon_vec,   camera_dir );

        if ( Math.abs( pan ) < 0.000001 ) { pan = 0.0; }
        if ( Math.abs( pbn ) < 0.000001 ) { pbn = 0.0; }

        if ( ! ( ( pan >= 0 && pbn <= 0 ) ||
                 ( pan <= 0 && pbn >= 0 ) ) ) {
            // カメラの背面
            // console.log('moon:カメラの背面');
            return false;
        }

        const canvas_size = this._viewer.camera.canvas_size;
        this.setVector2( "u_resolution" , [ canvas_size.width / 2.0, canvas_size.height / 2.0 ] );
        this.setFloat  ( "u_radius", radius );
        this.setFloat  ( "u_intensity", intensity );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        this.setVector3( "u_moon_direction", moon_direction );

        if ( this._mask_mode === false ) {
            // texture
            this.setInteger( "u_image", MoonMaterial.ListOfTextureUnit.TEXUNIT_IMAGE );
            this.bindTexture2D( MoonMaterial.ListOfTextureUnit.TEXUNIT_IMAGE, this._image.handle );
        }

        const tmp_mat1 = this._matrix_1;
        const tmp_mat2 = this._matrix_2;

        const apan = Math.abs( pan );
        const apbn = Math.abs( pbn );
        const ratio = apan / ( apan + apbn );

        const vec_ab = GeoMath.sub3( moon_pos, camera_pos, tmp_vec );
        const cpos = GeoMath.add3( camera_pos, GeoMath.scale3( ratio, vec_ab, tmp_vec ), GeoMath.createVector3() );

        // billboard
        let billboard_mat = GeoMath.setIdentity( tmp_mat1 );
        billboard_mat[ 12 ] = cpos[ 0 ];
        billboard_mat[ 13 ] = cpos[ 1 ];
        billboard_mat[ 14 ] = cpos[ 2 ];
        const gocs_to_billboard_mat = GeoMath.mul_GA( gocs_to_clip, billboard_mat, tmp_mat1 );
        this.setMatrix ( "u_billboard_matrix", gocs_to_billboard_mat );

        const moon_dist1 = GeoMath.length3( GeoMath.sub3( cpos, camera_pos, tmp_vec ) );
        const moon_dist2 = GeoMath.length3( GeoMath.sub3( moon_vec, camera_pos, tmp_vec ) );

        const planet_factor = 173715.0;
        const moon_scale = moon_dist1 / moon_dist2 * radius * planet_factor;

        // 月の方向は moon_direction から求める
        const moon_mat = GeoMath.setIdentity( tmp_mat1 );
        { // set scale
            moon_mat[ 0] = moon_mat[ 5] = moon_mat[10] = moon_scale;
        }
        { // rotate
            const mat = GeoMath.setIdentity( tmp_mat2 );
            const moon_rotation = Math.atan2( moon_direction[ 0 ], moon_direction[ 1 ] ) + 90.0 * GeoMath.DEGREE;
            const sin = Math.sin( moon_rotation );
            const cos = Math.cos( moon_rotation );
            mat[0] =  cos;
            mat[1] =  sin;
            mat[4] = -sin;
            mat[5] =  cos;
            GeoMath.mul_AA( moon_mat, mat, moon_mat );
        }
        { // rotate
            const mat = GeoMath.setIdentity( tmp_mat2 );
            const moon_tilt = - ( 5.14 + 23.44 ) * GeoMath.DEGREE;
            const sin = Math.sin( moon_tilt );
            const cos = Math.cos( moon_tilt );
            mat[ 0] =  cos;
            mat[ 2] = -sin;
            mat[ 8] =  sin;
            mat[10] =  cos;
            GeoMath.mul_AA( moon_mat, mat, moon_mat );
        }
        this.setMatrix( "u_moon_matrix", moon_mat );

        return true;
    }


    /**
     * テクスチャ画像を設定
     * @param image_src  画像のパス
     */
    setImage( image_src: (string | URLResource) ): void
    {
        if ( this._image_src === image_src ) {
            return;
        }

        // 画像のパスが変更された
        this._image_src = image_src;
        const resource = (
            image_src instanceof Resource ? image_src :
            new URLResource( image_src, { })
            // new URLResource( image_src, { transform: this._props.transform })
        );

        const iconLoader = new ImageIconLoader();
        this._icon = iconLoader.load( resource );
        this._icon.onEnd((item: { _icon: CanvasImageSource; }) => {
                this._context.drawImage( item._icon, 0, 0, this._width, this._height );
                this._image = new Texture( this._viewer.glenv, this._context.canvas, { } );
        });
    }
}



namespace MoonMaterial {



export interface Options {
    mask?: boolean;
};



export enum ListOfTextureUnit {
    TEXUNIT_IMAGE,       // 画像のテクスチャユニット
    // TEXUNIT_IMAGE_MASK = 1;  // 画像マスクのテクスチャユニット
};



} // namespace MoonMaterial



export default MoonMaterial;
