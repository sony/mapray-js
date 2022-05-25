/**
 * @module
 *
 * `symbol` 型スタイルレイヤーに対する [[StyleLayer]], [[LayerFlake]],
 * [[LayerFeature]] の具象クラスを定義する。
 */

import { StyleLayer, LayerFlake, LayerFeature } from "../style";
import type { StyleManager, EvaluationListener, FlakeContext, LayerJson } from "../style";
import { Property, Specification as PropSpec } from "../property";
import { GeomType } from "../expression";
import { Feature, PointFeature, TileLayer } from "../tile_layer";
import GLEnv from "../../GLEnv";
import Primitive from "../../Primitive";
import Mesh, { MeshData } from "../../Mesh";
import Texture from "../../Texture";
import GeoMath, { Vector3, Vector4, Matrix } from "../../GeoMath";
import AreaUtil from "../../AreaUtil";
import RenderStage from "../../RenderStage";
import EntityMaterial from "../../EntityMaterial";
import Dom from "../../util/Dom";
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


    constructor( owner:   StyleManager,
                 json_layer: LayerJson )
    {
        super( owner, json_layer, SymbolLayer.prop_specs );

        this.prop_text_field   = this.__getProperty( 'text-field' );
        this.prop_text_size    = this.__getProperty( 'text-size' );
        this.prop_text_color   = this.__getProperty( 'text-color' );
        this.prop_text_opacity = this.__getProperty( 'text-opacity' );
        this.prop_text_font    = this.__getProperty( 'text-font' );
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
     */
    getTextMaterial( glenv: GLEnv ): SymbolTextMaterial
    {
        if ( !SymbolLayer._text_material ) {
            SymbolLayer._text_material = new SymbolTextMaterial( glenv );
        }

        return SymbolLayer._text_material;
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
    ];


    /**
     * マテリアル・キャッシュ
     */
    private static _text_material?: SymbolTextMaterial = undefined;

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

        const values     = this._getEvaluatedLayoutValues();
        this._text_field = values.text_field;
        this._text_size  = values.text_size;
        this._text_font  = values.text_font;

        const gres    = this._buildGraphicsResources( flake_ctx );
        this._mesh    = gres.mesh;
        this._texture = gres.texture;
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
            !equalsArray( values.text_font, this._text_font );

        if ( is_changed ) {
            this._text_field = values.text_field;
            this._text_size  = values.text_size;
            this._text_font  = values.text_font;

            const gres    = this._buildGraphicsResources( flake_ctx );
            this._mesh    = gres.mesh;
            this._texture = gres.texture;
        }
    }


    /**
     * プリミティブを作成
     */
    createPrimitive( flake_ctx: FlakeContext ): Primitive
    {
        const     glenv = flake_ctx.stage.glenv;
        const sym_layer = this.layer_flake.style_layer;

        const text_color = this.getEvaluatedColor( sym_layer.prop_text_color,
                                                   GeoMath.createVector4f() );

        text_color[3] *= this.getEvaluatedValue( sym_layer.prop_text_opacity ) as number;

        const props: SymbolTextMaterialProperty = {
            text_image: this._texture,
            text_color: text_color,
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

        const text_field = this.getEvaluatedValue( sym_layer.prop_text_field ) as string;
        const text_size  = this.getEvaluatedValue( sym_layer.prop_text_size )  as number;
        const text_font  = this.getEvaluatedValue( sym_layer.prop_text_font )  as string[];

        return {
            text_field,
            text_size,
            text_font,
        };
    }


    /**
     * グラフィックス資源を構築
     *
     * `this` に設定済みのパラメータからグラフィックス資源を構築する。
     */
    private _buildGraphicsResources( flake_ctx: FlakeContext ) /* auto-type */
    {
        const glenv = flake_ctx.stage.glenv;

        const src_image_data = this._createTextSourceImageData();

        const mesh_data: MeshData = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
            ],
            vertices: this._createVertices( src_image_data, flake_ctx ),
            indices:  [0, 1, 2, 2, 1, 3],
        };

        return {
            mesh:    new Mesh( glenv, mesh_data ),
            texture: new Texture( glenv, src_image_data.canvas, { usage: Texture.Usage.TEXT } ),
        };
    }


    /**
     * 頂点配列を生成
     */
    private _createVertices( src_image_data: TextSourceImageData,
                             flake_ctx:      FlakeContext ): number[]
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

        // 頂点配列を設定
        const vertices: number[] = [];

        // 画像サイズの逆数
        const xn = 1 / src_image_data.canvas_width;
        const yn = 1 / src_image_data.canvas_height;

        // 文字列の横幅 (キャンバス座標系)
        const xsize = src_image_data.right_x - src_image_data.left_x;

        // ベースライン左端の位置 (キャンバス座標系)
        const xc = src_image_data.left_x;
        const yc = src_image_data.baseline_y;

        // ベースラインより上と下の高さ (キャンバス座標系)
        const lower = src_image_data.lower_y - src_image_data.baseline_y;
        const upper = src_image_data.baseline_y - src_image_data.upper_y;

        // 左下
        vertices.push( xm, ym, zm );                                // a_position
        vertices.push( -xsize / 2, -lower );                        // a_offset
        vertices.push( xc * xn, 1 - (yc + lower) * yn );            // a_texcoord

        // 右下
        vertices.push( xm, ym, zm );                                // a_position
        vertices.push( xsize / 2, -lower );                         // a_offset
        vertices.push( (xc + xsize) * xn, 1 - (yc + lower) * yn );  // a_texcoord

        // 左上
        vertices.push( xm, ym, zm );                                // a_position
        vertices.push( -xsize / 2, upper );                         // a_offset
        vertices.push( xc * xn, 1 - (yc - upper) * yn );            // a_texcoord

        // 右上
        vertices.push( xm, ym, zm );                                // a_position
        vertices.push( xsize / 2, upper );                          // a_offset
        vertices.push( (xc + xsize) * xn, 1 - (yc - upper) * yn );  // a_texcoord

        return vertices;
    }


    /**
     * テキストの元画像の情報を生成
     */
    private _createTextSourceImageData(): TextSourceImageData
    {
        // 描画サイズを見積もる
        const width = this._createCanvasContext( 1, 1 ).measureText( this._text_field ).width;
        const upper = this._text_size * SymbolFeature.TEXT_UPPER;
        const lower = this._text_size * SymbolFeature.TEXT_LOWER;

        // 描画用キャンバスを作成
        const canvas_width  = Math.max( Math.ceil( width ), 1 );
        const canvas_height = Math.max( Math.ceil( upper ) + Math.ceil( lower ), 1 );
        const context = this._createCanvasContext( canvas_width, canvas_height );

        // テキストをキャンバスへ描画
        const left_x     = 0;
        const baseline_y = Math.ceil( upper );
        context.fillText( this._text_field, left_x, baseline_y );

        return {
            canvas: context.canvas,
            canvas_width,
            canvas_height,
            baseline_y,
            left_x,
            right_x: width,
            upper_y: baseline_y - upper,
            lower_y: baseline_y + lower,
        };
    }


    /**
     * テキストの測定用と描画用の Canvas コンテキストを生成
     */
    private _createCanvasContext( width:  number,
                                  height: number ): CanvasRenderingContext2D
    {
        const context = Dom.createCanvasContext( width, height );
        context.textAlign    = "left";
        context.textBaseline = "alphabetic";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";
        context.font         = this._getTextFontString();

        return context;
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
    private _text_field: string;
    private _text_size:  number;
    private _text_font:  string[];

    // 構築済みのグラフィックス資源
    private    _mesh: Mesh;
    private _texture: Texture;

    // クラス定数
    private static readonly TEXT_UPPER = 1.1;
    private static readonly TEXT_LOWER = 0.38;

}


/**
 * [[SymbolFeature]] 内で使用する型
 */
interface TextSourceImageData {

    /**
     * キャンバスの HTML 要素
     */
    canvas: HTMLCanvasElement;

    /**
     * キャンバスの水平画素数 (>= 1)
     */
    canvas_width: number;

    /**
     * キャンバスの垂直画素数 (>= 1)
     */
    canvas_height: number;

    /**
     * 文字列のベースラインの Y 座標 (キャンバス座標系)
     */
    baseline_y: number;

    /**
     * 文字列の左端 X 座標 (キャンバス座標系)
     */
    left_x: number;

    /**
     * 文字列の右端 X 座標 (キャンバス座標系)
     */
    right_x: number;

    /**
     * 文字列の上端 Y 座標 (キャンバス座標系)
     */
    upper_y: number;

    /**
     * 文字列の下端 Y 座標 (キャンバス座標系)
     */
    lower_y: number;

}


/**
 * symbol 型レイヤーのテキスト用のマテリアル
 */
class SymbolTextMaterial extends EntityMaterial {

    constructor( glenv: GLEnv )
    {
        super( glenv, symbol_text_vs_code, symbol_text_fs_code );

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

        // mat4 u_obj_to_clip
        this.setObjToClip( stage, primitive );

        // 画面パラメータ: {2/w, 2/h}
        // vec2 u_sparam
        const sparam = SymbolTextMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        this.setVector2( "u_sparam", sparam );

        if ( stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ) {
            // テクスチャのバインド
            // sampler2D u_image
            const image_tex = props["text_image"];
            this.bindTexture2D( SymbolTextMaterial.TEXUNIT_IMAGE, image_tex.handle );

            // テキストの色と不透明度
            this.setVector4( "u_color", props.text_color );
        }
    }


    private static readonly TEXUNIT_IMAGE = 0;  // 画像のテクスチャユニット

    // 計算用一時領域
    private static readonly _sparam = GeoMath.createVector2f();

}


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

    text_image: Texture;
    text_color: Vector4;

}
