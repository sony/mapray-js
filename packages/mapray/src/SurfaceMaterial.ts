import FlakeMaterial from "./FlakeMaterial";
import GeoMath from "./GeoMath";
import type { Matrix } from "./GeoMath";
import TileTextureCache from "./TileTextureCache";
import type GLEnv from "./GLEnv";
import type Viewer from "./Viewer";
import type RenderStage from "./RenderStage";
import type RenderFlake from "./RenderFlake";
import type FlakeMesh from "./FlakeMesh";
import type TileTexture from "./TileTexture";
import surface_vs_code from "./shader/surface.vert";
import surface_fs_code from "./shader/surface.frag";
import rid_fs_code from "./shader/rid.frag";
import ImageLayer from "./ImageLayer";


/**
 * 地表面マテリアル
 */
class SurfaceMaterial extends FlakeMaterial {

    /**
     * @param viewer  - 所有者である Viewer
     * @param options - 生成オプション
     */
    constructor( viewer: Viewer,
                 options: SurfaceMaterial.Option = {} )
    {
        const preamble = SurfaceMaterial._getPreamble( options );

        super( viewer,
               preamble + surface_vs_code,
               preamble + ( options.ridMaterial ? rid_fs_code : surface_fs_code ) );

        this.bindProgram();
        this.setInteger( "u_image_hi", SurfaceMaterial.TEXUNIT_IMAGE_HI );
        this.setInteger( "u_image_lo", SurfaceMaterial.TEXUNIT_IMAGE_LO );

        if ( options.ridMaterial ) {
            this._setRenderId( 1 );
        }

        this._viewer             = viewer;
        this._tile_texture_cache = viewer.tile_texture_cache;
        this._dummy_tile_texture = this._createDummyTileTexture( viewer.glenv, [128, 128, 128, 255] );

        this._image_zbias = 0;

        this._flake_to_gocs = GeoMath.createMatrixf();
    }

    /**
     * シェーダの前文を取得
     *
     * @param options - オプション指定
     */
    private static _getPreamble( options: SurfaceMaterial.Option ): string
    {
        const is_night = options.nightMaterial === true;
        const is_from_space = options.atmosphereFromSpaceMaterial === true;
        const is_from_atmosphere = options.atmosphereMaterial === true;

        const lines = [];

        // マクロの定義
        if ( is_night ) {
            lines.push( "#define NIGHTIMAGE" );
        }

        if ( is_from_space || is_from_atmosphere ) {
            lines.push( "#define ATMOSPHERE" );
        }

        if ( is_from_space ) {
            lines.push( "#define FROMSPACE" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }


    // from FlakeMaterial
    override numDrawings(): number
    {
        return 1 + this._viewer.layers.num_drawing_layers;
    }


    // from FlakeMaterial
    override setFlakeParameter( stage:  RenderStage,
                                rflake: RenderFlake,
                                mesh:   FlakeMesh,
                                index:  number ): boolean
    {
        this.setCommonParameter( stage, mesh );

        const param = this._getMaterialParameter( rflake, index );

        if ( param ) {
            const layer = this._viewer.layers.getDrawingLayer( index - 1 ) as ImageLayer;

            this.setVector4( "u_corner_lod", param.corner_lod );

            this.setVector4( "u_texcoord_rect_hi", param.image_hi.texcoord_rect );
            this.setVector4( "u_texcoord_rect_lo", param.image_lo.texcoord_rect );

            this.setVector2( "u_image_param", [param.image_lo.lod,
                                               ( param.image_hi.lod === param.image_lo.lod ) ?
                                               0 : 1 / ( param.image_hi.lod - param.image_lo.lod )] );

            this.setFloat( "u_opacity", ( index === 0 ) ? 1.0 : layer.getOpacity() );

            if ( index > 0 && layer.getDrawType() === ImageLayer.DrawType.NIGHT ) {
                this.setVector3( "u_sun_direction", this._viewer.sun.sun_direction );
                mesh.mul_flake_to_gocs( identity_matrix, this._flake_to_gocs );
                this.setMatrix( "u_obj_to_gocs", this._flake_to_gocs );
            }

            if ( index === 0 && this._viewer.atmosphere ) {
                this.setVector3( "u_sun_direction", this._viewer.sun.sun_direction );
                mesh.mul_flake_to_gocs( identity_matrix, this._flake_to_gocs );
                this.setMatrix( "u_obj_to_gocs", this._flake_to_gocs );
                const view_to_gocs = stage.view_to_gocs;
                this.setVector3( "u_camera_position", [view_to_gocs[12], view_to_gocs[13], view_to_gocs[14]] );
                const cameraHeight = Math.sqrt(
                    view_to_gocs[12] * view_to_gocs[12] +
                    view_to_gocs[13] * view_to_gocs[13] +
                    view_to_gocs[14] * view_to_gocs[14]
                );
                this.setFloat( "u_camera_height", cameraHeight );
                this.setFloat( "u_camera_height2", cameraHeight * cameraHeight );

                const parameters = this._viewer.atmosphere.parameters;
                this.setFloat( "u_kr",              parameters.g_kr );
                this.setFloat( "u_km",              parameters.g_km );
                this.setFloat( "u_scale_depth",     parameters.g_scale_depth );
                this.setFloat( "u_esun",            parameters.g_esun );
                this.setFloat( "u_exposure",        parameters.g_exposure );
            }

            this.bindTexture2D( SurfaceMaterial.TEXUNIT_IMAGE_HI, param.image_hi.texture );
            this.bindTexture2D( SurfaceMaterial.TEXUNIT_IMAGE_LO, param.image_lo.texture );

            return true;
        }
        else {
            return false;
        }
    }


    /**
     * [[SurfaceMaterial]] のパラメータを取得
     *
     * @remarks
     * `_image_zbias` を更新する。
     */
    private _getMaterialParameter( rflake: RenderFlake,
                                   index:  number ): MaterialParameter | null
    {
        const tex_cache = ( index === 0 ) ? this._tile_texture_cache : ( this._viewer.layers.getDrawingLayer( index - 1 ) as ImageLayer ).getTileCache();
        this._image_zbias = tex_cache.getImageZBias();

        const flake = rflake.flake;
        const zg = flake.z;

        if ( zg < tex_cache.getImageZMin() ) {
            return null;
        }

        const  x = flake.x;
        const  y = flake.y;
        const zi = Math.ceil( rflake.lod + this._image_zbias );

        if ( zg < zi ) {
            return null;
        }

        const tiles = tex_cache.findNearestAncestors( zg, x, y, zi );
        if ( index >= 1 && tiles[0] === null ) {
            return null;
        }

        return {
            corner_lod: [rflake.lod_00, rflake.lod_10, rflake.lod_01, rflake.lod_11],
            image_hi: this._getImageParameter( tiles[0], zg, x, y, zi     ),
            image_lo: this._getImageParameter( tiles[1], zg, x, y, zi - 1 )
        };
    }


    /**
     * 画像パラメータを取得
     */
    private _getImageParameter( tile: TileTexture | null,
                                zg: number,
                                x:  number,
                                y:  number,
                                zi: number ): ImageParameter
    {
        if ( tile ) {
            const pow = Math.pow( 2, tile.z - zg );
            return {
                lod:           tile.z - this._image_zbias,
                texture:       tile.texture,
                texcoord_rect: [x*pow - tile.x, 1 - ( y + 1 )*pow + tile.y, pow, pow]
            };
        }
        else {
            const pow = Math.pow( 2, -zg );
            return {
                lod:           -this._image_zbias,
                texture:       this._dummy_tile_texture,
                texcoord_rect: [x*pow - Math.floor( pow * ( x + 0.5 ) ), 1 - ( y + 1 )*pow + Math.floor( pow * ( y + 0.5 ) ), pow, pow]
            };
        }
    }


    /**
     * ダミーテクスチャを作成
     */
    private _createDummyTileTexture( glenv:  GLEnv,
                                     pixels: ArrayLike<number> ): WebGLTexture
    {
        const      gl = glenv.context;
        const  target = gl.TEXTURE_2D;
        const texture = gl.createTexture();

        if ( texture === null ) {
            throw new Error( "failed to createTexture()" );
        }

        gl.bindTexture( target, texture );
        gl.texImage2D( target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array( pixels ) );
        gl.bindTexture( target, null );

        return texture;
    }


    private readonly _viewer: Viewer;
    private readonly _tile_texture_cache: TileTextureCache;
    private readonly _dummy_tile_texture: WebGLTexture;
    private          _image_zbias: number;
    private readonly _flake_to_gocs: Matrix;

    private static readonly TEXUNIT_IMAGE_HI = 0;  // 高レベル画像のテクスチャユニット
    private static readonly TEXUNIT_IMAGE_LO = 1;  // 低レベル画像のテクスチャユニット

}


namespace SurfaceMaterial {

/**
 * 構築オプション
 */
export interface Option {

    /**
     * @defaultValue `false`
     */
    ridMaterial?: boolean;

    /**
     * @defaultValue `false`
     */
    nightMaterial?: boolean;

    /**
     * @defaultValue `false`
     */
    atmosphereFromSpaceMaterial?: boolean;

    /**
     * @defaultValue `false`
     */
    atmosphereMaterial?: boolean;

}

} // namespace SurfaceMaterial


/**
 * 恒等行列
 */
const identity_matrix = GeoMath.setIdentity( GeoMath.createMatrix() );


/**
 * マテリアルのパラメータ
 */
interface MaterialParameter {

    /**
     * 四隅の地表詳細レベル
     */
    corner_lod: [lod_00: number, lod_10: number, lod_01: number, lod_11: number];

    /**
     * 高レベル画像の情報
     */
    image_hi: ImageParameter;

    /**
     * 低レベル画像の情報
     */
    image_lo: ImageParameter;

}


/**
 * 画像の情報
 */
interface ImageParameter {

    /**
     * 詳細レベル
     */
    lod: number;

    /**
     * テクスチャ
     */
    texture: WebGLTexture;

    /**
     * 切り取り矩形
     */
    texcoord_rect: [s: number, t: number, w: number, h: number];

}


export default SurfaceMaterial;
