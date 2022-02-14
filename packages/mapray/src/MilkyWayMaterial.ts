import Material from "./Material";
import GLEnv from "./GLEnv";
import Resource, { URLResource } from "./Resource";
import { IconLoaderItem, ImageIconLoader } from "./IconLoader";
import Texture from "./Texture";
import Dom from "./util/Dom";
import GeoMath, { Matrix } from "./GeoMath";
import vs_code from "./shader/milkyway.vert";
import fs_code from "./shader/milkyway.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";

/**
 * 天の川表現マテリアル
 * @internal
 */
class MilkyWayMaterial extends Material {

    private _glenv: GLEnv;
    private _width!: number;
    private _height!: number;
    private _context!: CanvasRenderingContext2D;

    private _image!: Texture;
    private _image_src!: (string | URLResource);
    private _icon!: IconLoaderItem;

    private _matrix: Matrix;

    /**
     * @param viewer   所有者である Viewer
     * @param image_src image source
     */
    constructor( viewer: Viewer, image_src: (string | URLResource) )
    {
        super( viewer.glenv, vs_code, fs_code );

        this._glenv = viewer.glenv;

        this._width = 512;
        this._height = 512;
        this._context = Dom.createCanvasContext( this._width, this._height );

        this._matrix = GeoMath.createMatrix();
        this._image = new Texture( viewer.glenv, this._context.canvas, { } );

        this.setImage( image_src );
    }


    /**
     * パラメータを設定
     *
     * @param  render_stage     呼び出し側オブジェクト
     * @param  view_to_clip     view_to_clip
     * @param  longitude        longitude
     * @param  intensity        表示輝度
     *
     * @return 描画の有無
     */
    setParameter( render_stage: RenderStage, view_to_clip: Matrix, longitude: number, intensity: number )
    {
        const theta = longitude * GeoMath.DEGREE;
        const sin = Math.sin ( theta );
        const cos = Math.cos ( theta );
        const longitude_mat = GeoMath.setIdentity( this._matrix );
        longitude_mat[ 0 ] =  cos;
        longitude_mat[ 1 ] =  sin;
        longitude_mat[ 4 ] = -sin;
        longitude_mat[ 5 ] =  cos;
        const view_to_longitude_mat = GeoMath.mul_GA( view_to_clip, longitude_mat, this._matrix );
        this.setMatrix ( "u_longitude_matrix", view_to_longitude_mat );
        this.setFloat  ( "u_intensity", intensity );

        // texture
        this.setInteger( "u_image", MilkyWayMaterial.ListOfTextureUnit.TEXUNIT_IMAGE );
        this.bindTexture2D( MilkyWayMaterial.ListOfTextureUnit.TEXUNIT_IMAGE, this._image.handle );
    }


    /**
     * テクスチャ画像を設定
     * @param image_src  画像のパス
     */
    setImage( image_src: (string | URLResource) )
    {
        if ( this._image_src === image_src ) {
            return;
        }

        // 画像のパスが変更された
        this._image_src = image_src;
        const resource = (
            image_src instanceof Resource ? image_src:
            new URLResource( image_src, { })
            // new URLResource( image_src, { transform: this._props.transform })
        );

        const iconLoader = new ImageIconLoader();
        this._icon = iconLoader.load( resource );
        this._icon.onEnd((item: { _icon: CanvasImageSource; }) => {
                this._context.drawImage( item._icon, 0, 0, this._width, this._height );
                this._image = new Texture( this._glenv, this._context.canvas, { } );
        });
    }
}



namespace MilkyWayMaterial {



export enum ListOfTextureUnit {
    TEXUNIT_IMAGE,       // 画像のテクスチャユニット
    // TEXUNIT_IMAGE_MASK = 1;  // 画像マスクのテクスチャユニット
};



} // namespace MilkyWayMaterial



export default MilkyWayMaterial;
