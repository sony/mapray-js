import Material from "./Material";
import Resource, { URLResource } from "./Resource";
import Texture from "./Texture";
import Dom from "./util/Dom";
import GeoMath, { Vector4, Matrix } from "./GeoMath";
import vs_code from "./shader/cloud.vert";
import fs_code from "./shader/cloud.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";
import Sun from "./Sun";

import CloudVisualizer from "./CloudVisualizer";

/**
 * 雲表現マテリアル
 * @internal
 */
class CloudMaterial extends Material {

    private _viewer: Viewer;

    private _width!: number;

    private _height!: number;

    /*
     *    0                             1   texture coordinate
     *    +-----+-----+-----+-----+-----+
     *    |  x  |  x  |  x  | ... |  x  |
     *    +-----+-----+-----+-----+-----+
     *    |  |<--------------------->|  |   interporated region
     *   >|  |<                     >|  |<  margin (unavailable range)
     */
    private _margin: number;

    private _image: Texture;

    private _gradient_mode: CloudVisualizer.GradientMode;

    /**
     * @param viewer   所有者である Viewer
     * @param gradient_array gradient生成のためのcolor配列(RGBA)
     * @param gradient_mode  gradientの表現方法
     */
    constructor( viewer: Viewer, gradient_array: Vector4[], gradient_mode: CloudVisualizer.GradientMode = CloudVisualizer.GradientMode.LINEAR )
    {
        super( viewer.glenv, vs_code, fs_code );

        this._viewer = viewer;

        this._gradient_mode = gradient_mode;

        this._margin = 0.0;

        this._image = this._createImage( gradient_array, gradient_mode );
    }


    /**
     * パラメータを設定
     *
     * @param  render_stage     呼び出し側オブジェクト
     * @param  gocs_to_clip     gocs_to_clip
     * @param  view_to_gocs     view_to_gocs
     * @param  sun              Sun  Class
     * @param  fade             CloudVisualizer parameter
     * @param  intensity        CloudVisualizer parameter
     *
     * @return 描画の有無
     */
    setParameter( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix, sun: Sun, fade: number, intensity: number ): boolean
    {
        this.setMatrix ( "u_gocs_to_clip", gocs_to_clip );
        this.setFloat  ( "u_intensity", intensity );
        this.setFloat  ( "u_margin", this._margin );
        this.setVector3( "u_sun_direction" , sun.sun_direction );

        this.setFloat  ( "u_cloud_frame", fade );

        this.setInteger( "u_image", CloudMaterial.ListOfTextureUnit.TEXUNIT_IMAGE );
        this.bindTexture2D( CloudMaterial.ListOfTextureUnit.TEXUNIT_IMAGE, this._image.handle );

        return true;
    }


    /**
     * テクスチャ画像を生成
     * @param gradient_array gradient生成のためのcolor配列(RGBA)
     * @param gradient_mode  gradientの表現方法
     */
    private _createImage( gradient_array: Vector4[], gradient_mode: CloudVisualizer.GradientMode )
    {
        this._width = gradient_array.length;
        this._height = 1;

        const context = Dom.createCanvasContext( this._width, this._height );

        const canvas_data = context.createImageData( this._width, this._height );
        let index = 0;
        for ( let i=0; i < gradient_array.length; i++ ) {
            canvas_data.data[index++] = gradient_array[i][0] * 255;
            canvas_data.data[index++] = gradient_array[i][1] * 255;
            canvas_data.data[index++] = gradient_array[i][2] * 255;
            canvas_data.data[index++] = gradient_array[i][3] * 255;
        }
        context.putImageData( canvas_data, 0, 0 );

        let filter = undefined;
        if ( gradient_mode === CloudVisualizer.GradientMode.STEP ) {
            this._margin = 0.0;
            filter = this._viewer.glenv.context.NEAREST;
        }
        else {
            this._margin = 0.5 / gradient_array.length;
            filter = this._viewer.glenv.context.LINEAR;
        }
        return new Texture( this._viewer.glenv, context.canvas, {
                wrap_s: this._viewer.glenv.context.CLAMP_TO_EDGE,
                wrap_t: this._viewer.glenv.context.CLAMP_TO_EDGE,
                mag_filter: filter,
                min_filter: filter,
        } );
    }
}



namespace CloudMaterial {



export enum ListOfTextureUnit {
    TEXUNIT_IMAGE,       // 画像のテクスチャユニット
};



} // namespace CloudMaterial



export default CloudMaterial;
