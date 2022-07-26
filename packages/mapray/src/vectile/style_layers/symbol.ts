/**
 * @module
 *
 * `symbol` 型スタイルレイヤーに対する [[StyleLayer]], [[LayerFlake]],
 * [[LayerFeature]] の具象クラスを定義する。
 */

import { DIST_FACTOR, DIST_LOWER } from "./symbol_base";
import { StyleLayer, LayerFlake, LayerFeature } from "../style_layer";
import type { EvaluationListener, LayerJson } from "../style_layer";
import type { StyleManager } from "../style_manager";
import type { FlakeContext } from "../style_flake";
import { Property, Specification as PropSpec } from "../property";
import { GeomType } from "../expression";
import { Feature, PointFeature, TileLayer } from "../tile_layer";
import { ImageCache, ImageHandle, ImageInfo } from "./symbol_cache";
import GLEnv from "../../GLEnv";
import Primitive from "../../Primitive";
import Mesh, { MeshData } from "../../Mesh";
import GeoMath, { Vector2, Vector3, Vector4, Matrix } from "../../GeoMath";
import AreaUtil from "../../AreaUtil";
import RenderStage from "../../RenderStage";
import EntityMaterial from "../../EntityMaterial";
import type Viewer from "../../Viewer";
import { cfa_assert } from "../../util/assertion";

import symbol_text_vs_code from "../../shader/vectile/symbol_text.vert";
import symbol_text_fs_code from "../../shader/vectile/symbol_text.frag";


/**
 * symbol 型のレイヤーを表現する。
 *
 * @see [style-spec/layers/symbol](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#symbol)
 */
export class SymbolLayer extends StyleLayer {

    readonly prop_text_field:   Property;
    readonly prop_text_size:    Property;
    readonly prop_text_color:   Property;
    readonly prop_text_opacity: Property;
    readonly prop_text_font:    Property;
    readonly prop_text_anchor:  Property;
    readonly prop_text_offset:  Property;
    readonly prop_text_halo_color: Property;
    readonly prop_text_halo_width: Property;


    /**
     * 現在のレンダリングに使う画像キャッシュ
     *
     * レンダリング中は、非 `null` が保証されている。
     *
     * @internal
     */
    __image_cache: ImageCache | null;


    constructor( owner:   StyleManager,
                 json_layer: LayerJson )
    {
        super( owner, json_layer, SymbolLayer.prop_specs );

        this.prop_text_field   = this.__getProperty( 'text-field' );
        this.prop_text_size    = this.__getProperty( 'text-size' );
        this.prop_text_color   = this.__getProperty( 'text-color' );
        this.prop_text_opacity = this.__getProperty( 'text-opacity' );
        this.prop_text_font    = this.__getProperty( 'text-font' );
        this.prop_text_anchor  = this.__getProperty( 'text-anchor' );
        this.prop_text_offset  = this.__getProperty( 'text-offset' );
        this.prop_text_halo_color = this.__getProperty( 'text-halo-color' );
        this.prop_text_halo_width = this.__getProperty( 'text-halo-width' );

        this.__image_cache = null;
    }


    // from StyleLayer
    override __install_viewer( viewer: Viewer | null ): void
    {
        if ( viewer !== null ) {
            const shared_cache = SymbolLayer._shared_image_caches.get( viewer.glenv );

            if ( shared_cache ) {
                // すでに共有されているキャッシュ
                this.__image_cache = shared_cache;
            }
            else {
                // 新規に作成するキャッシュ
                this.__image_cache = new ImageCache( viewer.glenv );
                SymbolLayer._shared_image_caches.set( viewer.glenv, this.__image_cache );
            }
        }
        else {
            // StyleManager が Viewer から外された
            this.__image_cache = null;
        }
    }


    // from StyleLayer
    override __createLayerFlake( tile_layer: TileLayer,
                                 flake_ctx:  FlakeContext ): LayerFlake
    {
        return new SymbolFlake( this, tile_layer, flake_ctx );
    }


    // from StyleLayer
    override __isSupported( geom_type: GeomType )
    {
        // 今のところ PointFeature しか想定していない
        return geom_type === GeomType.POINT;
    }


    /**
     * マテリアルを取得
     */
    getTextMaterial( glenv: GLEnv ): SymbolTextMaterial
    {
        const is_sharp = this.style_manager.bitmap_sharpening;

        const name = is_sharp ? '_text_material_sharp' : '_text_material_normal';

        let material = SymbolLayer[name].get( glenv );

        if ( material === undefined ) {
            // 存在しないので新たにマテリアルを生成
            material = new SymbolTextMaterial( glenv, { is_sharp } );
            SymbolLayer[name].set( glenv, material );
        }

        return material;
    }


    /**
     * プロパティ仕様のリスト
     */
    private static readonly prop_specs: PropSpec[] = [
        {
            name: 'text-field',
            category: 'layout',
            value_type: 'string',
            default_value: "",
        },
        {
            name: 'text-size',
            category: 'layout',
            value_type: 'number',
            default_value: 16,
        },
        {
            name: 'text-color',
            category: 'paint',
            value_type: 'color',
            default_value: "#000000",
        },
        {
            name: 'text-opacity',
            category: 'paint',
            value_type: 'number',
            default_value: 1.0,
        },
        {
            name: 'text-font',
            category: 'layout',
            value_type: 'array',
            element_type: 'string',
            default_value: ["Open Sans Regular",
                            "Arial Unicode MS Regular"],
        },
        {
            name: 'text-anchor',
            category: 'layout',
            value_type: 'string',
            default_value: 'center',
        },
        {
            name: 'text-offset',
            category: 'layout',
            value_type: 'array',
            element_type: 'number',
            default_value: [0, 0],
        },
        {
            name: 'text-halo-color',
            category: 'paint',
            value_type: 'color',
            default_value: "rgba(0, 0, 0, 0)",
        },
        {
            name: 'text-halo-width',
            category: 'paint',
            value_type: 'number',
            default_value: 0,
        },
    ];


    /**
     * マテリアル・キャッシュ
     */
    private static readonly _text_material_normal = new WeakMap<GLEnv, SymbolTextMaterial>();
    private static readonly _text_material_sharp  = new WeakMap<GLEnv, SymbolTextMaterial>();


    /**
     * `SymbolLayer` インスタンス間で共有する `ImageCache` インスタンス
     */
    private static readonly _shared_image_caches = new WeakMap<GLEnv, ImageCache>();

}


/**
 * [[SymbolLayer]] 用の [[LayerFlake]] 実装クラス
 */
class SymbolFlake extends LayerFlake<SymbolLayer> {

    /**
     * メッシュの原点位置 (GOCS)
     */
    readonly origin_position: Vector3;


    constructor( style_layer: SymbolLayer,
                 tile_layer:  TileLayer,
                 flake_ctx:   FlakeContext )
    {
        super( style_layer, tile_layer, flake_ctx );

        this.origin_position = AreaUtil.getCenter( flake_ctx, GeoMath.createVector3() );
    }


    // from LayerFlake
    override createLayerFeature( feature:   Feature,
                                 flake_ctx: FlakeContext ): LayerFeature
    {
        if ( !(feature instanceof PointFeature) ) {
            throw new Error( "Unexcepted GeomType" );
        }

        return new SymbolFeature( feature, this, flake_ctx );
    }


    // from LayerFlake
    override completeInitialization( _flake_ctx: FlakeContext ): void
    {
    }


    // from LayerFlake
    override startEvaluation( flake_ctx: FlakeContext ): EvaluationListener
    {
        return summary => {

            if ( summary.evaluated_properties.size === 0 ) {
                // 変化した layout プロパティは存在しない
                return;
            }

            const sym_layer = this.style_layer;

            if ( !summary.evaluated_properties.has( sym_layer.prop_text_field ) &&
                !summary.evaluated_properties.has( sym_layer.prop_text_size ) ) {
                // 対象のプロパティは変化していない
                return;
            }

            for ( const layer_feature of this._layer_features.values() ) {
                cfa_assert( layer_feature instanceof SymbolFeature );
                layer_feature.updatePrimitive( flake_ctx );
            }
        }
    }


    // from LayerFlake
    override getPrimitives( flake_ctx: FlakeContext ): Primitive[]
    {
        const result: Primitive[] = [];

        for ( const layer_feature of this._layer_features.values() ) {
            cfa_assert( layer_feature instanceof SymbolFeature );
            result.push( layer_feature.createPrimitive( flake_ctx ) );
        }

        return result;
    }

}


/**
 * [[SymbolLayer]] 用の [[LayerFeature]] 実装クラス
 */
class SymbolFeature extends LayerFeature<SymbolFlake, PointFeature> {

    constructor( feature:     PointFeature,
                 layer_flake: SymbolFlake,
                 flake_ctx:   FlakeContext )
    {
        super( feature, layer_flake, flake_ctx );

        const values = this._getEvaluatedLayoutValues();
        this._text_field  = values.text_field;
        this._text_size   = values.text_size;
        this._text_font   = values.text_font;
        this._text_anchor = values.text_anchor;
        this._text_offset = values.text_offset;

        const gres = this._buildGraphicsResources( flake_ctx );
        this._mesh = gres.mesh;
        this._image_handle = gres.image_handle;
        this._img_isize = gres.img_isize;

        this._position = GeoMath.createVector3f( this._get_local_position( flake_ctx ) );
    }


    // from LayerFeature
    override dispose(): void
    {
        this._image_handle.dispose();
    }


    /**
     * layout プロパティの評価値が変化した可能性があるときに呼び出す。
     */
    updatePrimitive( flake_ctx: FlakeContext ): void
    {
        const values = this._getEvaluatedLayoutValues();

        const is_changed =
            (values.text_field !== this._text_field) ||
            (values.text_size  !== this._text_size)  ||
            !equalsArray( values.text_font, this._text_font ) ||
            (values.text_anchor !== this._text_anchor) ||
            !equalsArray( values.text_offset, this._text_offset );

        if ( is_changed ) {
            this._text_field  = values.text_field;
            this._text_size   = values.text_size;
            this._text_font   = values.text_font;
            this._text_anchor = values.text_anchor;
            this._text_offset = values.text_offset;

            const gres = this._buildGraphicsResources( flake_ctx );
            this._mesh = gres.mesh;
            this._image_handle = gres.image_handle;
            this._img_isize = gres.img_isize;
        }
    }


    /**
     * プリミティブを作成
     */
    createPrimitive( flake_ctx: FlakeContext ): Primitive
    {
        const     glenv = flake_ctx.stage.glenv;
        const sym_layer = this.layer_flake.style_layer;

        const color = this.getEvaluatedColor( sym_layer.prop_text_color,
                                              GeoMath.createVector4f() );

        const opacity = this.getEvaluatedValue( sym_layer.prop_text_opacity ) as number;

        const halo_color = this.getEvaluatedColor( sym_layer.prop_text_halo_color,
                                                   GeoMath.createVector4f() );

        const halo_width = this.getEvaluatedValue( sym_layer.prop_text_halo_width ) as number;

        if ( halo_width < 1.0 ) {
            // 縁取りが細いとき、距離補間の誤差が目立つので、
            // 縁取りの不透明度を下げて、目立ちにくいようにする
            const factor = Math.max( 0, halo_width );
            for ( let i = 0; i < 4; ++i ) {
                halo_color[i] *= factor;
            }
        }

        // 必要ならメッシュとテクスチャを作り直す
        if ( this._image_handle.checkRebuild( halo_width ) ) {
            const image_info = this._image_handle.getImageInfo();
            this._mesh = this._createSymbolMesh( glenv, image_info );
            this._img_isize[0] = 1 / image_info.texture_width;
            this._img_isize[1] = 1 / image_info.texture_height;
        }

        const props: SymbolTextMaterialProperty = {
            u_position:   this._position,
            u_image:      this._image_handle.getTexture(),
            u_img_isize:  this._img_isize,
            u_color:      color,
            u_opacity:    opacity,
            u_halo_color: halo_color,
            u_halo_width: (halo_width - DIST_LOWER) * DIST_FACTOR,
        };

        const primitive = new Primitive( glenv,
                                         this._mesh,
                                         sym_layer.getTextMaterial( glenv ),
                                         this._createTransform() );
        primitive.properties = props;

        return primitive;
    }


    /**
     * モデル座標系から COCS への変換行列を生成
     */
    private _createTransform(): Matrix
    {
        const matrix = GeoMath.setIdentity( GeoMath.createMatrix() );
        const center = this.layer_flake.origin_position;

        for ( let i = 0; i < 3; ++i ) {
            matrix[12 + i] = center[i];
        }

        return matrix;
    }


    /**
     * layout プロパティ一式の評価値を取得
     */
    private _getEvaluatedLayoutValues() /* auto-type */
    {
        const sym_layer = this.layer_flake.style_layer;

        const text_field  = this.getEvaluatedValue( sym_layer.prop_text_field )  as string;
        const text_size   = this.getEvaluatedValue( sym_layer.prop_text_size )   as number;
        const text_font   = this.getEvaluatedValue( sym_layer.prop_text_font )   as string[];
        const text_anchor = this.getEvaluatedValue( sym_layer.prop_text_anchor ) as string;
        const text_offset = this.getEvaluatedValue( sym_layer.prop_text_offset ) as [number, number];

        return {
            text_field,
            text_size,
            text_font,
            text_anchor,
            text_offset,
        };
    }


    /**
     * グラフィックス資源を構築
     *
     * `this` に設定済みのパラメータからグラフィックス資源を構築する。
     */
    private _buildGraphicsResources( flake_ctx: FlakeContext ) /* auto-type */
    {
        const sym_layer = this.layer_flake.style_layer;
        cfa_assert( sym_layer.__image_cache );

        const image_cache = sym_layer.__image_cache;

        const halo_width = this.getEvaluatedValue( sym_layer.prop_text_halo_width ) as number;

        const image_handle = image_cache.getHandle( this._text_field,
                                                    this._getTextFontString(),
                                                    this._text_size,
                                                    halo_width );

        const image_info = image_handle.getImageInfo();

        return {
            mesh: this._createSymbolMesh( flake_ctx.stage.glenv, image_info ),
            image_handle,
            img_isize: GeoMath.createVector2f( [1 / image_info.texture_width,
                                                1 / image_info.texture_height] ),
        };
    }


    /**
     * フィーチャーの位置を取得 (モデル座標)
     */
    private _get_local_position( flake_ctx: FlakeContext ): Vector3
    {
        const  pi = Math.PI;
        const pot = Math.pow( 2, 1 - flake_ctx.z );  // 2^(1 - Z)

        // ALCS 座標
        const coords = this.feature.points.vertices;
        const xa = coords[0];
        const ya = coords[1];

        // 単位球メルカトル座標
        const x = -pi + pot * (flake_ctx.x + xa) * pi;
        const y =  pi - pot * (flake_ctx.y + ya) * pi;

        // 関連値の計算
        const  e_py = Math.exp( y );  // e^y
        const  e_my = 1 / e_py;       // e^-y
        const sinλ = Math.sin( x );
        const cosλ = Math.cos( x );
        const sinφ = (e_py - e_my) / (e_py + e_my);
        const cosφ = 2 / (e_py + e_my);

        // 地心からの距離
        const h = flake_ctx.dem_sampler.sample( x, y );
        const r = GeoMath.EARTH_RADIUS + h;

        // GOCS 座標
        const xg = r * (cosφ * cosλ);
        const yg = r * (cosφ * sinλ);
        const zg = r * sinφ;

        // テキストの位置 (モデル座標系)
        const origin = this.layer_flake.origin_position;
        const xm = xg - origin[0];
        const ym = yg - origin[1];
        const zm = zg - origin[2];

        return [xm, ym, zm];
    }


    /**
     * シンボル用のメッシュを生成
     */
    private _createSymbolMesh( glenv: GLEnv,
                               image_info: ImageInfo ): Mesh
    {
        const mesh_data: MeshData = {
            vtype: [
                { name: "a_offset",   size: 3 },
                { name: "a_texcoord", size: 2 },
            ],
            vertices: this._createSymbolVertices( image_info ),
            indices:  [0, 1, 2, 2, 1, 3],
        };

        return new Mesh( glenv, mesh_data );
    }


    /**
     * シンボル用の頂点配列を生成
     */
    private _createSymbolVertices( image_info: ImageInfo ): number[]
    {
        // 頂点配列を設定
        const vertices: number[] = [];

        // 中央アンカーの座標
        const center_anchor_x = (image_info.anchor_lower_x + image_info.anchor_upper_x) / 2;
        const center_anchor_y = (image_info.anchor_lower_y + image_info.anchor_upper_y) / 2;

        // スクリーン座標オフセット (初期値は中央アンカー用)
        let offset_lx = image_info.display_lower_x - center_anchor_x;
        let offset_rx = image_info.display_upper_x - center_anchor_x;
        let offset_by = image_info.display_lower_y - center_anchor_y;
        let offset_ty = image_info.display_upper_y - center_anchor_y;

        // アンカーによるオフセットの変換
        const at_dir = anchor_translate_direction[this._text_anchor];
        if ( at_dir !== undefined ) {
            const delta_x = at_dir[0] * (image_info.anchor_upper_x - image_info.anchor_lower_x) / 2;
            const delta_y = at_dir[1] * (image_info.anchor_upper_y - image_info.anchor_lower_y) / 2;
            offset_lx += delta_x;
            offset_rx += delta_x;
            offset_by += delta_y;
            offset_ty += delta_y;
        }

        // 'text-offset' プロパティによるオフセットの変換
        // この値はキャンバス座標系の em 単位
        offset_lx += this._text_offset[0] * this._text_size;
        offset_rx += this._text_offset[0] * this._text_size;
        offset_by -= this._text_offset[1] * this._text_size;
        offset_ty -= this._text_offset[1] * this._text_size;

        // 文字を手前に移動する係数
        const dfactor = this._calculateDepthFactor();

        // テクスチャ座標
        const tc_lx = image_info.display_lower_x;
        const tc_rx = image_info.display_upper_x;
        const tc_by = image_info.display_lower_y;
        const tc_ty = image_info.display_upper_y;

        // 左下
        vertices.push( offset_lx, offset_by, dfactor );  // a_offset
        vertices.push( tc_lx, tc_by );                   // a_texcoord

        // 右下
        vertices.push( offset_rx, offset_by, dfactor );  // a_offset
        vertices.push( tc_rx, tc_by );                   // a_texcoord

        // 左上
        vertices.push( offset_lx, offset_ty, dfactor );  // a_offset
        vertices.push( tc_lx, tc_ty );                   // a_texcoord

        // 右上
        vertices.push( offset_rx, offset_ty, dfactor );  // a_offset
        vertices.push( tc_rx, tc_ty );                   // a_texcoord

        return vertices;
    }


    /**
     * 文字列を手前に移動する量 (画素数相当)
     */
    private _calculateDepthFactor(): number
    {
        // TODO: 計算方法を検討
        return 1.75 * this._text_size;
    }


    /**
     * Canvas コンテキストに与えるフォント情報を取得
     *
     * @see https://developer.mozilla.org/ja/docs/Web/API/CanvasRenderingContext2D/font
     */
    private _getTextFontString(): string
    {
        const   style = "normal";
        const variant = "normal";
        const  weight = "normal";
        const  family = this._text_font.map( x => '"' + x + '"' ).join( ", " );

        return `${style} ${variant} ${weight} ${this._text_size}px ${family}`;
    }


    // グラフィックス資源を構築したときのパラメータ
    private _text_field:  string;
    private _text_size:   number;
    private _text_font:   string[];
    private _text_anchor: string;
    private _text_offset: [number, number];

    // 構築済みのグラフィックス資源
    private _mesh: Mesh;
    private _image_handle: ImageHandle;
    private _img_isize: Vector2;  // _texture の画素数の逆数

    // 位置 (モデル座標系)
    private readonly _position: Vector3;

}


/**
 * symbol 型レイヤーのテキスト用のマテリアル
 */
class SymbolTextMaterial extends EntityMaterial {

    constructor( glenv:   GLEnv,
                 options: MaterailOption = {} )
    {
        const preamble = SymbolTextMaterial._getPreamble( options );

        super( glenv,
               preamble + symbol_text_vs_code,
               preamble + symbol_text_fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", SymbolTextMaterial.TEXUNIT_IMAGE );
    }


    // virtual override from EntityMaterial
    isTranslucent( _stage:     RenderStage,
                   _primitive: Primitive ): boolean
    {
        return true;
    }


    // virtual override from EntityMaterial
    setParameters( stage:     RenderStage,
                   primitive: Primitive ): void
    {
        super.setParameters( stage, primitive );

        const props = primitive.properties as SymbolTextMaterialProperty;

        // mat4 u_obj_to_view
        this.setObjToView( stage, primitive );

        // mat4 u_view_to_clip
        const view_to_clip = SymbolTextMaterial._view_to_clip;
        GeoMath.copyMatrix( stage._view_to_clip, view_to_clip );
        this.setMatrix( "u_view_to_clip", view_to_clip );

        // 画面パラメータ: {2/w, 2/h, pixel_step}
        // vec3 u_sparam
        const sparam = SymbolTextMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        sparam[2] = stage.pixel_step;
        this.setVector3( "u_sparam", sparam );

        if ( stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ) {
            // テクスチャのバインド
            // sampler2D u_image
            const image_tex = props["u_image"];
            this.bindTexture2D( SymbolTextMaterial.TEXUNIT_IMAGE, image_tex );

            // フィーチャー位置 (モデル座標系)
            this.setVector3( "u_position", props["u_position"] );

            // u_image の画素数の逆数
            this.setVector2( "u_img_isize", props["u_img_isize"] );

            // シンボル本体の RGBA 色
            this.setVector4( "u_color", props["u_color"] );

            // シンボル全体の不透明度
            this.setFloat( "u_opacity", props["u_opacity"] );

            // シンボル縁取りの RGBA 色
            this.setVector4( "u_halo_color", props["u_halo_color"] );

            // シンボル縁取り太さ - DIST_LOWER
            this.setFloat( "u_halo_width", GeoMath.clamp( props["u_halo_width"],
                                                          0.0, SymbolTextMaterial.MAX_HALO_WIDTH ) );
        }
    }


    /**
     * シェーダの前文を取得
     *
     * @private
     */
    private static _getPreamble( options: MaterailOption ): string
    {
        const lines = [];

        lines.push( `#define BITMAP_SHARPENING (${options.is_sharp ?? false})` );
        lines.push( `#define _DIST_FACTOR_ (float(${DIST_FACTOR}))` );
        lines.push( `#define _DIST_LOWER_ (float(${DIST_LOWER}))` );

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }


    private static readonly TEXUNIT_IMAGE  = 0;      // 画像のテクスチャユニット
    private static readonly MAX_HALO_WIDTH = 0.999;  // u_halo_width の最大値


    // 計算用一時領域
    private static readonly _sparam = GeoMath.createVector3f();
    private static readonly _view_to_clip = GeoMath.createMatrixf();

}


/**
 * アンカーによる平行移動の方向 (スクリーン座標系)
 */
const anchor_translate_direction: {
    [key: string]: [number, number] | undefined
} = {
    // 'center':    [ 0 ,  0],  デフォルト値、または認識できないアンカー
    'left':         [+1 ,  0],
    'right':        [-1 ,  0],
    'top':          [ 0 , -1],
    'bottom':       [ 0 , +1],
    'top-left':     [+1 , -1],
    'top-right':    [-1 , -1],
    'bottom-left':  [+1 , +1],
    'bottom-right': [-1 , +1],
};


/**
 * 配列の同一性をテストする。
 *
 * 長さが同じで、各要素に対して `===` が成り立つときだけ同一とみなす。
 */
function equalsArray<T>( a: ArrayLike<T>,
                         b: ArrayLike<T> ): boolean
{
    if ( a.length !== b.length ) {
        return false;
    }

    for ( let i = 0; i < a.length; ++i ) {
        if ( a[i] !== b[i] ) {
            return false;
        }
    }

    return true;
}


/**
 * [[SymbolTextMaterial]] 用のプロパティ型
 */
interface SymbolTextMaterialProperty {

    u_position: Vector3;

    u_image:     WebGLTexture;
    u_img_isize: Vector2;
    u_color:     Vector4;
    u_opacity:   number;

    u_halo_color: Vector4;
    u_halo_width: number;

}


/**
 * マテリアル構築子のオプション
 */
interface MaterailOption {

    /**
     * シンボルの表示を鮮明化するか？
     *
     * @default false
     */
    is_sharp?: boolean;

}
