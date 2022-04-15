import FlakeMaterial from "./FlakeMaterial";
import GeoMath from "./GeoMath";
import TileTextureCache from "./TileTextureCache";
import surface_vs_code from "./shader/surface.vert";
import surface_fs_code from "./shader/surface.frag";
import rid_fs_code from "./shader/rid.frag";
import Layer from "./Layer";
import AreaUtil from "./AreaUtil";
import Color from "./util/Color";


/**
 * @summary 地表面マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.RenderStage.FlakeMaterial
 * @private
 */
class SurfaceMaterial extends FlakeMaterial {

    /**
     * @param {mapray.Viewer} viewer  所有者である Viewer
     */
    constructor( viewer, options = {} )
    {
        const preamble = SurfaceMaterial._getPreamble( options );

        super( viewer,
               preamble + surface_vs_code,
               preamble + ( options.ridMaterial ? rid_fs_code : surface_fs_code ) );

        this.bindProgram();
        this.setInteger( "u_image_hi", SurfaceMaterial.TEXUNIT_IMAGE_HI );
        this.setInteger( "u_image_lo", SurfaceMaterial.TEXUNIT_IMAGE_LO );

        this._viewer             = viewer;
        this._tile_texture_cache = viewer.tile_texture_cache;
        this._dummy_tile_texture = this._createDummyTileTexture( viewer.glenv, [128, 128, 128, 255] );

        if ( options.nightMaterial === true ) {
            this._north_pole_tile_texture = this._createDummyTileTexture( viewer.glenv, [3, 5, 14, 255] );
            this._south_pole_tile_texture = this._createDummyTileTexture( viewer.glenv, [43, 50, 85, 255] );
        }
        else {
            this._north_pole_tile_texture = (
                viewer.north_pole ? this._createDummyTileTexture( viewer.glenv, Color.floatColorToByteColor( viewer.north_pole.color, GeoMath.createVector4() ) ) :
                this._dummy_tile_texture
            );
            this._south_pole_tile_texture = (
                viewer.south_pole ? this._createDummyTileTexture( viewer.glenv, Color.floatColorToByteColor( viewer.south_pole.color, GeoMath.createVector4() ) ) :
                this._dummy_tile_texture
            );
        }

        this._image_zbias = 0;

        this._identity_matrix = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._flake_to_gocs = GeoMath.createMatrixf();
    }

    /**
     * @summary シェーダの前文を取得
     *
     * @param {object}  options  オプション指定
     * @param {boolean} [options.nightMaterial=false]  夜用マテリアルの場合 true
     *
     * @private
     */
    static
    _getPreamble( options )
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

    /**
     * @override
     */
    numDrawings()
    {
        return 1 + this._viewer.layers.num_drawing_layers;
    }


    /**
     * @override
     */
    setFlakeParameter( stage, rflake, mesh, index )
    {
        this.setCommonParameter( stage, mesh );

        var param = this._getMaterialParamater( rflake, index );

        if ( param !== null ) {
            const layer = this._viewer.layers.getDrawingLayer( index - 1 );

            this.setVector4( "u_corner_lod", param.corner_lod );

            this.setVector4( "u_texcoord_rect_hi", param.image_hi.texcoord_rect );
            this.setVector4( "u_texcoord_rect_lo", param.image_lo.texcoord_rect );

            this.setVector2( "u_image_param", [param.image_lo.lod,
                                               (param.image_hi.lod == param.image_lo.lod) ?
                                               0 : 1 / (param.image_hi.lod - param.image_lo.lod)] );

            this.setFloat( "u_opacity", (index == 0) ? 1.0 : layer.opacity );

            if ( index > 0 && layer.type === Layer.LayerType.NIGHT ) {
                this.setVector3( "u_sun_direction", this._viewer.sun.sun_direction );
                mesh.mul_flake_to_gocs( this._identity_matrix, this._flake_to_gocs );
                this.setMatrix( "u_obj_to_gocs", this._flake_to_gocs );
            }

            if ( index === 0 && this._viewer.atmosphere ) {
                this.setVector3( "u_sun_direction", this._viewer.sun.sun_direction );
                mesh.mul_flake_to_gocs( this._identity_matrix, this._flake_to_gocs );
                this.setMatrix( "u_obj_to_gocs", this._flake_to_gocs );
                this.setVector3( "u_camera_position", [stage._view_to_gocs[12], stage._view_to_gocs[13], stage._view_to_gocs[14]] );
                const cameraHeight = Math.sqrt(
                    stage._view_to_gocs[12] * stage._view_to_gocs[12] +
                    stage._view_to_gocs[13] * stage._view_to_gocs[13] +
                    stage._view_to_gocs[14] * stage._view_to_gocs[14]
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
     * @summary SurfaceMaterial のパラメータを取得
     * @desc
     * <pre>
     * オブジェクト構造
     * {
     *    // 四隅の地表詳細レベル
     *    corner_lod: [lod_00, lod_10, lod_01, lod_11],
     *
     *    // 高レベル画像の情報
     *    image_hi: { lod: (number), texture: (WebGLTexture), texcoord_rect: [s, t, w, h] },
     *
     *    // 低レベル画像の情報
     *    image_lo: { lod: (number), texture: (WebGLTexture), texcoord_rect: [s, t, w, h] }
     * }
     * </pre>
     * @private
     */
    _getMaterialParamater( rflake, index )
    {
        var tex_cache = (index == 0) ? this._tile_texture_cache : this._viewer.layers.getDrawingLayer( index - 1 ).tile_cache;
        this._image_zbias = tex_cache.getImageZBias();

        var flake = rflake.flake;
        var zg = flake.z;

        if ( zg < tex_cache.getImageZMin() ) {
            return null;
        }

        var  x = flake.x;
        var  y = flake.y;
        var zi = Math.ceil( rflake.lod + this._image_zbias );

        if ( zg < zi ) {
            return null;
        }

        var tiles = tex_cache.findNearestAncestors( zg, x, y, zi );
        if ( index >= 1 && tiles[0] === null ) {
            return null;
        }

        if ( flake.type === AreaUtil.Type.NORMAL ) {
            return {
                corner_lod: [rflake.lod_00, rflake.lod_10, rflake.lod_01, rflake.lod_11],
                image_hi: this._getImageParamater( tiles[0], zg, x, y, zi     ),
                image_lo: this._getImageParamater( tiles[1], zg, x, y, zi - 1 )
            };
        }
        else {
            return {
                corner_lod: [rflake.lod_00, rflake.lod_10, rflake.lod_01, rflake.lod_11],
                image_hi: this._getPoleImageParamater( tiles[0], zg, x, y, zi    , flake.type ),
                image_lo: this._getPoleImageParamater( tiles[1], zg, x, y, zi - 1, flake.type )
            };
        }
    }


    /**
     * @summary 画像パラメータを取得
     * @desc
     * <pre>
     * オブジェクト構造
     * {
     *    lod:           (number),
     *    texture:       (WebGLTexture),
     *    texcoord_rect: [s, t, w, h]
     * }
     * </pre>
     * @private
     */
    _getImageParamater( tile, zg, x, y, zi )
    {
        var pow;

        if ( tile !== null ) {
            pow = Math.pow( 2, tile.z - zg );
            return {
                lod:           tile.z - this._image_zbias,
                texture:       tile.texture,
                texcoord_rect: [x*pow - tile.x, 1 - (y + 1)*pow + tile.y, pow, pow]
            };
        }
        else {
            pow = Math.pow( 2, -zg );
            return {
                lod:           -this._image_zbias,
                texture:       this._dummy_tile_texture,
                texcoord_rect: [x*pow - Math.floor( pow * (x + 0.5) ), 1 - (y + 1)*pow + Math.floor( pow * (y + 0.5) ), pow, pow]
            };
        }
    }


    _getPoleImageParamater( tile, zg, x, y, zi, demType )
    {
        const pow = Math.pow( 2, -zg );
        return {
            lod:           -this._image_zbias,
            texture: demType === AreaUtil.Type.NORTH_POLE ? this._north_pole_tile_texture : this._south_pole_tile_texture,
            texcoord_rect: [x*pow - Math.floor( pow * (x + 0.5) ), 1 - (y + 1)*pow + Math.floor( pow * (y + 0.5) ), pow, pow]
        };
    }


    /**
     * @private
     */
    _createDummyTileTexture( glenv, pixels )
    {
        var      gl = glenv.context;
        var  target = gl.TEXTURE_2D;
        var texture = gl.createTexture();

        gl.bindTexture( target, texture );
        gl.texImage2D( target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array( pixels ) );
        gl.bindTexture( target, null );

        return texture;
    }

}


SurfaceMaterial.TEXUNIT_IMAGE_HI = 0;  // 高レベル画像のテクスチャユニット
SurfaceMaterial.TEXUNIT_IMAGE_LO = 1;  // 低レベル画像のテクスチャユニット


export default SurfaceMaterial;
