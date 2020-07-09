import FlakeMaterial from "./FlakeMaterial";
import GeoMath from "./GeoMath";
import TileTextureCache from "./TileTextureCache";
import surface_vs_code from "./shader/surface.vert";
import surface_fs_code from "./shader/surface.frag";
import rid_fs_code from "./shader/rid.frag";
import { RenderTarget } from "./RenderStage";


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
        super( viewer, surface_vs_code, options.ridMaterial ? rid_fs_code : surface_fs_code );

        this.bindProgram();
        this.setInteger( "u_image_hi", SurfaceMaterial.TEXUNIT_IMAGE_HI );
        this.setInteger( "u_image_lo", SurfaceMaterial.TEXUNIT_IMAGE_LO );

        this._tile_texture_cache = viewer.tile_texture_cache;
        this._layers             = viewer.layers;
        this._dummy_tile_texture = this._createDummyTileTexture( viewer.glenv );
        this._image_zbias = 0;
    }


    /**
     * @override
     */
    numDrawings()
    {
        return 1 + this._layers.numDrawingLayers();
    }


    /**
     * @override
     */
    setFlakeParameter( stage, rflake, mesh, index )
    {
        this.setCommonParameter( stage, mesh );

        var param = this._getMaterialParamater( rflake, index );

        if ( param !== null ) {
            this.setVector4( "u_corner_lod", param.corner_lod );

            this.setVector4( "u_texcoord_rect_hi", param.image_hi.texcoord_rect );
            this.setVector4( "u_texcoord_rect_lo", param.image_lo.texcoord_rect );

            this.setVector2( "u_image_param", [param.image_lo.lod,
                                               (param.image_hi.lod == param.image_lo.lod) ?
                                               0 : 1 / (param.image_hi.lod - param.image_lo.lod)] );

            this.setFloat( "u_opacity", (index == 0) ? 1.0 : this._layers.getDrawingLayer( index - 1 ).opacity );

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
        var tex_cache = (index == 0) ? this._tile_texture_cache : this._layers.getDrawingLayer( index - 1 ).tile_cache;
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

        return {
            corner_lod: [rflake.lod_00, rflake.lod_10, rflake.lod_01, rflake.lod_11],
            image_hi: this._getImageParamater( tiles[0], zg, x, y, zi     ),
            image_lo: this._getImageParamater( tiles[1], zg, x, y, zi - 1 )
        };
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


    /**
     * @private
     */
    _createDummyTileTexture( glenv )
    {
        var      gl = glenv.context;
        var  target = gl.TEXTURE_2D;
        var texture = gl.createTexture();
        var  pixels = [128, 128, 128, 255];

        gl.bindTexture( target, texture );
        gl.texImage2D( target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array( pixels ) );
        gl.bindTexture( target, null );

        return texture;
    }

}


SurfaceMaterial.TEXUNIT_IMAGE_HI = 0;  // 高レベル画像のテクスチャユニット
SurfaceMaterial.TEXUNIT_IMAGE_LO = 1;  // 低レベル画像のテクスチャユニット


export default SurfaceMaterial;
