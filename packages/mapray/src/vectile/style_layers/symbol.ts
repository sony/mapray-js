/**
 * @module
 *
 * `symbol` 型スタイルレイヤーに対する [[StyleLayer]], [[LayerFlake]],
 * [[LayerFeature]] の具象クラスを定義する。
 */

import { StyleLayer, LayerFlake, LayerFeature } from "../style_layer";
import type { EvaluationListener, LayerJson } from "../style_layer";
import type { StyleManager } from "../style_manager";
import type { FlakeContext } from "../style_flake";
import { Property, Specification as PropSpec } from "../property";
import { GeomType, ResolvedImage } from "../expression";
import { Feature, PointFeature, TileLayer } from "../tile_layer";
import { DIST_FACTOR, DIST_LOWER } from "../sdfield";
import { TextImageCache, ImageHandle, ImageInfo } from "../sdfield_cache";
import { ImageManager, SdfImage, ColorImage } from "../image";
import GLEnv from "../../GLEnv";
import Primitive from "../../Primitive";
import Mesh, { MeshData } from "../../Mesh";
import GeoMath, { Vector2, Vector3, Vector4, Matrix } from "../../GeoMath";
import AreaUtil from "../../AreaUtil";
import RenderStage from "../../RenderStage";
import EntityMaterial from "../../EntityMaterial";
import { cfa_assert } from "../../util/assertion";

import symbol_vs_code from "../../shader/vectile/symbol.vert";
import symbol_sdfield_fs_code from "../../shader/vectile/symbol_sdfield.frag";
import symbol_color_fs_code from "../../shader/vectile/symbol_color.frag";


/**
 * symbol 型のレイヤーを表現する。
 *
 * @see [style-spec/layers/symbol](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#symbol)
 *
 * @internal 今のところクラスは非公開。公開する場合は不要な部分を internal にすること。
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

    readonly prop_icon_image:   Property;
    readonly prop_icon_size:    Property;
    readonly prop_icon_color:   Property;
    readonly prop_icon_opacity: Property;
    readonly prop_icon_anchor:  Property;
    readonly prop_icon_offset:  Property;
    readonly prop_icon_halo_color: Property;
    readonly prop_icon_halo_width: Property;


    /**
     * レンダリングに使うテキスト画像キャッシュ
     *
     * @internal
     */
    readonly __text_image_cache: TextImageCache;


    /**
     * アイコン用の画像管理
     *
     * @internal
     */
    readonly __image_manager: ImageManager;


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

        this.prop_icon_image   = this.__getProperty( 'icon-image' );
        this.prop_icon_size    = this.__getProperty( 'icon-size' );
        this.prop_icon_color   = this.__getProperty( 'icon-color' );
        this.prop_icon_opacity = this.__getProperty( 'icon-opacity' );
        this.prop_icon_anchor  = this.__getProperty( 'icon-anchor' );
        this.prop_icon_offset  = this.__getProperty( 'icon-offset' );
        this.prop_icon_halo_color = this.__getProperty( 'icon-halo-color' );
        this.prop_icon_halo_width = this.__getProperty( 'icon-halo-width' );

        this.__text_image_cache = this._ensure_text_image_cache();
        this.__image_manager    = owner.__image_manager;
    }


    /**
     * 画像キャッシュの準備と取得
     */
    private _ensure_text_image_cache(): TextImageCache
    {
        const viewer = this.style_manager.viewer;

        const    text_cache_key = viewer.glenv;
        const shared_text_cache = SymbolLayer._shared_text_image_caches.get( text_cache_key );

        let text_image_cache: TextImageCache;

        if ( shared_text_cache ) {
            // すでに共有されているキャッシュ
            text_image_cache = shared_text_cache;
        }
        else {
            // 新規に作成するキャッシュ
            text_image_cache = new TextImageCache( viewer.glenv );
            SymbolLayer._shared_text_image_caches.set( text_cache_key, text_image_cache );
        }

        return text_image_cache;
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
    getMaterial( glenv: GLEnv,
                 stype: 'sdf' | 'color' ): SymbolMaterial
    {
        let map = SymbolLayer._material_cache.get( glenv );

        if ( map === undefined ) {
            map = new Map();
            SymbolLayer._material_cache.set( glenv, map );
        }

        const key = `stype: ${stype}`;

        let material = map.get( key );

        if ( material === undefined ) {
            // 存在しないので新たにマテリアルを生成
            material = new SymbolMaterial( glenv, stype );
            map.set( key, material );
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
        {
            name: 'icon-image',
            category: 'layout',
            value_type: 'resolvedImage',
        },
        {
            name: 'icon-size',
            category: 'layout',
            value_type: 'number',
            default_value: 1.0,
        },
        {
            name: 'icon-color',
            category: 'paint',
            value_type: 'color',
            default_value: "#000000",
        },
        {
            name: 'icon-opacity',
            category: 'paint',
            value_type: 'number',
            default_value: 1.0,
        },
        {
            name: 'icon-anchor',
            category: 'layout',
            value_type: 'string',
            default_value: 'center',
        },
        {
            name: 'icon-offset',
            category: 'layout',
            value_type: 'array',
            element_type: 'number',
            default_value: [0, 0],
        },
        {
            name: 'icon-halo-color',
            category: 'paint',
            value_type: 'color',
            default_value: "rgba(0, 0, 0, 0)",
        },
        {
            name: 'icon-halo-width',
            category: 'paint',
            value_type: 'number',
            default_value: 0,
        },
    ];


    /**
     * マテリアル・キャッシュ
     */
    private static readonly _material_cache = new WeakMap<GLEnv, Map<string, SymbolMaterial>>();


    /**
     * `SymbolLayer` インスタンス間で共有する `TextImageCache` インスタンス
     *
     * これは、違う `StyleManager` インスタンスの `SymbolLayer`
     * インスタンス間でも共有する。
     */
    private static readonly _shared_text_image_caches =
        new WeakMap<GLEnv, TextImageCache>();

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
            // LayerFlake インスタンスの再評価が終わったとき、ここに到達する。
            // 再評価は LayerFlake.getPrimitives() の実行前に行われる。

            if ( summary.evaluated_properties.size === 0 ) {
                // 変化した layout プロパティは存在しない
                return;
            }

            // ここに到達した場合、LayerFlake インスタンスの、何らかの
            // layout プロパティの評価値が変化した可能性がある


            // 現在は特別な最適化を行っていないので、何れかの layout
            // プロパティが変化した可能性があれば、
            // LayerFlake._layer_features のすべてのフィーチャを更新
            for ( const layer_feature of this._layer_features.values() ) {
                cfa_assert( layer_feature instanceof SymbolFeature );
                layer_feature.updatePrimitive( flake_ctx );
            }
        };
    }


    // from LayerFlake
    override getPrimitives( flake_ctx: FlakeContext ): Primitive[]
    {
        const flake_primitives: Primitive[] = [];

        for ( const layer_feature of this._layer_features.values() ) {
            cfa_assert( layer_feature instanceof SymbolFeature );
            const feature_primitives = layer_feature.createPrimitives( flake_ctx );
            Array.prototype.push.apply( flake_primitives, feature_primitives );
        }

        return flake_primitives;
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

        ({ text_field:  this._text_field,
           text_size:   this._text_size,
           text_font:   this._text_font,
           text_anchor: this._text_anchor,
           text_offset: this._text_offset,
           icon_name:   this._icon_name,
           icon_size:   this._icon_size,
           icon_offset: this._icon_offset,
           icon_anchor: this._icon_anchor,
        } = this._getEvaluatedLayoutValues());

        this._gres_text = this._buildTextGraphicsResource( flake_ctx );
        this._gres_icon = this._buildIconGraphicsResource( flake_ctx );

        this._position = GeoMath.createVector3f( this._get_local_position( flake_ctx ) );
    }


    // from LayerFeature
    override dispose(): void
    {
        if ( this._gres_text ) {
            this._gres_text.image_handle.dispose();
        }

        if ( this._gres_icon && this._gres_icon.tag === 'sdf-icon' ) {
            this._gres_icon.image_handle.dispose();
        }
    }


    /**
     * layout プロパティの評価値が変化した可能性があるときに呼び出す。
     */
    updatePrimitive( flake_ctx: FlakeContext ): void
    {
        const {
            text_field,
            text_size,
            text_font,
            text_anchor,
            text_offset,
            icon_name,
            icon_size,
            icon_anchor,
            icon_offset,
        } = this._getEvaluatedLayoutValues();

        // テキスト

        const is_text_changed =
            (text_field !== this._text_field) ||
            (text_size  !== this._text_size)  ||
            !equalsArray( text_font, this._text_font ) ||
            (text_anchor !== this._text_anchor) ||
            !equalsArray( text_offset, this._text_offset );

        if ( is_text_changed ) {
            this._text_field  = text_field;
            this._text_size   = text_size;
            this._text_font   = text_font;
            this._text_anchor = text_anchor;
            this._text_offset = text_offset;

            if ( this._gres_text ) {
                // 既存のグラフィックス資源を破棄
                this._gres_text.image_handle.dispose();
                this._gres_text = null;
            }

            this._gres_text = this._buildTextGraphicsResource( flake_ctx );
        }

        // アイコン

        const is_icon_changed =
            (icon_name   !== this._icon_name)   ||
            (icon_size   !== this._icon_size)   ||
            (icon_anchor !== this._icon_anchor) ||
            (icon_offset !== this._icon_offset);

        if ( is_icon_changed ) {
            this._icon_name   = icon_name;
            this._icon_size   = icon_size;
            this._icon_anchor = icon_anchor;
            this._icon_offset = icon_offset;

            if ( this._gres_icon && this._gres_icon.tag === 'sdf-icon' ) {
                // 既存のグラフィックス資源を破棄
                this._gres_icon.image_handle.dispose();
                this._gres_icon = null;
            }

            this._gres_icon = this._buildIconGraphicsResource( flake_ctx );
        }
    }


    /**
     * プリミティブを作成
     */
    createPrimitives( flake_ctx: FlakeContext ): Primitive[]
    {
        const     glenv = flake_ctx.stage.glenv;
        const sym_layer = this.layer_flake.style_layer;

        const primitives: Primitive[] = [];

        const transform = this._createTransform();

        // テキスト
        if ( this._gres_text ) {
            const color = this.getEvaluatedColor( sym_layer.prop_text_color,
                                                  GeoMath.createVector4f() );

            const opacity = this.getEvaluatedValue( sym_layer.prop_text_opacity ) as number;

            const halo_color = this.getEvaluatedColor( sym_layer.prop_text_halo_color,
                                                       GeoMath.createVector4f() );

            const halo_width = this.getEvaluatedValue( sym_layer.prop_text_halo_width ) as number;

            adjustHaloOpacity( halo_width, halo_color );

            const gres = this._gres_text;

            // 必要ならメッシュとテクスチャを作り直す
            if ( gres.image_handle.checkRebuild( halo_width ) ) {
                const image_info = gres.image_handle.getImageInfo();

                const build_info: MeshBuildInfo = {
                    anchor:       this._text_anchor,
                    offset:       [this._text_offset[0] * this._text_size,
                                   this._text_offset[1] * this._text_size],
                    scale:        1,
                    depth_factor: this._calculateTextDepthFactor(),
                };

                gres.mesh = createSymbolMesh( glenv, image_info, build_info );
                gres.img_psize[0] = 1 / image_info.texture_width;
                gres.img_psize[1] = 1 / image_info.texture_height;
            }

            const props: SymbolMaterialProperty = {
                u_position:   this._position,
                u_image:      gres.image_handle.getTexture(),
                u_img_psize:  gres.img_psize,
                u_color:      color,
                u_opacity:    opacity,
                u_halo_color: halo_color,
                u_halo_width: getShaderHaloWidth( halo_width ),
            };

            const prim = new Primitive( glenv,
                                        gres.mesh,
                                        sym_layer.getMaterial( glenv, 'sdf' ),
                                        transform );
            prim.properties = props;

            primitives.push( prim );
        }

        // アイコン
        if ( this._gres_icon ) {
            const color = this.getEvaluatedColor( sym_layer.prop_icon_color,
                                                  GeoMath.createVector4f() );

            const opacity = this.getEvaluatedValue( sym_layer.prop_icon_opacity ) as number;

            const halo_color = this.getEvaluatedColor( sym_layer.prop_icon_halo_color,
                                                       GeoMath.createVector4f() );

            const halo_width = this.getEvaluatedValue( sym_layer.prop_icon_halo_width ) as number
                / this._icon_size;  // スケール済みの縁取り幅

            adjustHaloOpacity( halo_width, halo_color );

            const gres = this._gres_icon;
            if ( gres.tag === 'sdf-icon' ) {
                /* SdfIconGraphicsResource */

                // 必要ならメッシュとテクスチャを作り直す
                if ( gres.image_handle.checkRebuild( halo_width ) ) {
                    const image_info = gres.image_handle.getImageInfo();

                    const build_info: MeshBuildInfo = {
                        anchor:       this._icon_anchor,
                        offset:       this._icon_offset,
                        scale:        this._icon_size,
                        depth_factor: this._calculateIconDepthFactor( gres.src_image.image.height ),
                    };

                    gres.mesh = createSymbolMesh( glenv, image_info, build_info );
                    gres.img_psize[0] = 1 / image_info.texture_width  / this._icon_size;
                    gres.img_psize[1] = 1 / image_info.texture_height / this._icon_size;
                }

                const props: SymbolMaterialProperty = {
                    u_position:   this._position,
                    u_image:      gres.image_handle.getTexture(),
                    u_img_psize:  gres.img_psize,
                    u_color:      color,
                    u_opacity:    opacity,
                    u_halo_color: halo_color,
                    u_halo_width: getShaderHaloWidth( halo_width ),
                };

                const prim = new Primitive( glenv,
                                            gres.mesh,
                                            sym_layer.getMaterial( glenv, 'sdf' ),
                                            transform );
                prim.properties = props;

                primitives.push( prim );
            }
            else {
                /* ColorIconGraphicsResource */

                const props: SymbolMaterialProperty = {
                    u_position:   this._position,
                    u_image:      gres.texture,
                    u_img_psize:  gres.img_psize,
                    u_color:      color,
                    u_opacity:    opacity,
                    u_halo_color: halo_color,
                    u_halo_width: getShaderHaloWidth( halo_width ),
                };

                const prim = new Primitive( glenv,
                                            gres.mesh,
                                            sym_layer.getMaterial( glenv, 'color' ),
                                            transform );
                prim.properties = props;

                primitives.push( prim );
            }
        }

        return primitives;
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

        const icon_image = this.getEvaluatedValue( sym_layer.prop_icon_image ) as ResolvedImage | null;
        const icon_name  = (icon_image !== null && icon_image.available) ? icon_image.name : null;

        return {
            text_field:  this.getEvaluatedValue( sym_layer.prop_text_field )  as string,
            text_size:   this.getEvaluatedValue( sym_layer.prop_text_size )   as number,
            text_font:   this.getEvaluatedValue( sym_layer.prop_text_font )   as string[],
            text_anchor: this.getEvaluatedValue( sym_layer.prop_text_anchor ) as string,
            text_offset: this.getEvaluatedValue( sym_layer.prop_text_offset ) as [number, number],

            icon_name,
            icon_size:   this.getEvaluatedValue( sym_layer.prop_icon_size )   as number,
            icon_anchor: this.getEvaluatedValue( sym_layer.prop_icon_anchor ) as string,
            icon_offset: this.getEvaluatedValue( sym_layer.prop_icon_offset ) as [number, number],
        };
    }


    /**
     * グラフィックス資源を構築 (テキスト)
     *
     * `this` に設定済みのパラメータからグラフィックス資源を構築する。
     */
    private _buildTextGraphicsResource( flake_ctx: FlakeContext ): TextGraphicsResource | null
    {
        if ( this._text_field.length === 0 || this._text_size <= 0 ) {
            // テキストが空文字列、またはサイズが 0 以下ならグラフィッ
            // クス資源を作らない。つまり Primitive を作らない。
            return null;
        }

        const sym_layer = this.layer_flake.style_layer;

        const image_cache = sym_layer.__text_image_cache;

        const halo_width = this.getEvaluatedValue( sym_layer.prop_text_halo_width ) as number;

        const image_handle = image_cache.getHandle( this._text_field,
                                                    this._getTextFontString(),
                                                    this._text_size,
                                                    halo_width );

        const image_info = image_handle.getImageInfo();

        const build_info: MeshBuildInfo = {
            anchor:       this._text_anchor,
            offset:       [this._text_offset[0] * this._text_size,
                           this._text_offset[1] * this._text_size],
            scale:        1,
            depth_factor: this._calculateTextDepthFactor(),
        };

        return {
            mesh: createSymbolMesh( flake_ctx.stage.glenv, image_info, build_info ),
            image_handle,
            img_psize: GeoMath.createVector2f( [1 / image_info.texture_width,
                                                1 / image_info.texture_height] ),
        };
    }


    /**
     * グラフィックス資源を構築 (アイコン)
     *
     * `this` に設定済みのパラメータからグラフィックス資源を構築する。
     */
    private _buildIconGraphicsResource( flake_ctx: FlakeContext ): IconGraphicsResource | null
    {
        if ( this._icon_name === null || this._icon_size <= 0 ) {
            // アイコンが存在しない、またはサイズが 0 以下ならグラフィッ
            // クス資源を作らない。つまり Primitive を作らない。
            return null;
        }

        const build_info: MeshBuildInfo = {
            anchor:       this._icon_anchor,
            offset:       this._icon_offset,
            scale:        this._icon_size,
            depth_factor: 0,  // 後で設定
        };

        const image_manager = this.layer_flake.style_layer.__image_manager;

        const image = image_manager.findImage( this._icon_name );

        if ( image instanceof SdfImage ) {
            // SdfImage アイコン
            const sym_layer = this.layer_flake.style_layer;

            const image_cache = image_manager.sdf_image_cache;

            const halo_width = this.getEvaluatedValue( sym_layer.prop_icon_halo_width ) as number
                / this._icon_size;  // スケール済みの縁取り幅

            const image_handle = image_cache.getHandle( this._icon_name, halo_width );

            const image_info = image_handle.getImageInfo();

            build_info.depth_factor = this._calculateIconDepthFactor( image.image.height );

            return {
                tag:  'sdf-icon',

                src_image: image,

                mesh: createSymbolMesh( flake_ctx.stage.glenv, image_info, build_info ),

                image_handle,

                img_psize: GeoMath.createVector2f( [1 / image_info.texture_width  / this._icon_size,
                                                    1 / image_info.texture_height / this._icon_size] ),
            };
        }
        else {
            // ColorImage アイコン
            cfa_assert( image instanceof ColorImage );

            const icon_height = image.image_upper[1] - image.image_lower[1];

            build_info.depth_factor = this._calculateIconDepthFactor( icon_height );

            return {
                tag:  'color-icon',

                mesh: createSymbolMesh( flake_ctx.stage.glenv, {
                    texture_width:   image.texture_size[0],
                    texture_height:  image.texture_size[1],
                    display_lower_x: image.image_lower[0],
                    display_lower_y: image.image_lower[1],
                    display_upper_x: image.image_upper[0],
                    display_upper_y: image.image_upper[1],
                    anchor_lower_x:  image.image_lower[0],
                    anchor_lower_y:  image.image_lower[1],
                    anchor_upper_x:  image.image_upper[0],
                    anchor_upper_y:  image.image_upper[1],
                },
                                        build_info ),
                texture: image.texture,

                img_psize: GeoMath.createVector2f( [1 / image.texture_size[0] / this._icon_size,
                                                    1 / image.texture_size[1] / this._icon_size] ),
            };
        }
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
     * 文字列を手前に移動する量 (画素数相当)
     */
    private _calculateTextDepthFactor(): number
    {
        // TODO: 計算方法を検討
        return 1.75 * this._text_size;
    }


    /**
     * アイコンを手前に移動する量 (画素数相当)
     */
    private _calculateIconDepthFactor( icon_height: number ): number
    {
        // TODO: 計算方法を検討
        return 1.75 * icon_height * this._icon_size;
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

    private _icon_name: string | null;
    private _icon_size: number;
    private _icon_anchor: string;
    private _icon_offset: [number, number];

    // テキストのグラフィックス資源
    private _gres_text: TextGraphicsResource | null;

    // アイコンのグラフィックス資源
    private _gres_icon: IconGraphicsResource | null;

    // 位置 (モデル座標系)
    private readonly _position: Vector3;

}


/**
 * シンボル用のメッシュを生成
 */
function createSymbolMesh( glenv: GLEnv,
                           image_info: ImageInfo,
                           build_info: MeshBuildInfo ): Mesh
{
    const mesh_data: MeshData = {
        vtype: [
            { name: "a_offset",   size: 3 },
            { name: "a_texcoord", size: 2 },
        ],
        vertices: createSymbolVertices( image_info, build_info ),
        indices:  [0, 1, 2, 2, 1, 3],
    };

    return new Mesh( glenv, mesh_data );
}


/**
 * シンボル用の頂点配列を生成
 */
function createSymbolVertices( image_info: ImageInfo,
                               build_info: MeshBuildInfo ): number[]
{
    // アンカーの座標
    let anchor_x = (image_info.anchor_lower_x + image_info.anchor_upper_x) / 2;
    let anchor_y = (image_info.anchor_lower_y + image_info.anchor_upper_y) / 2;
    const at_dir = anchor_translate_direction[build_info.anchor];
    if ( at_dir !== undefined ) {
        anchor_x += at_dir[0] * (image_info.anchor_upper_x - image_info.anchor_lower_x) / 2;
        anchor_y += at_dir[1] * (image_info.anchor_upper_y - image_info.anchor_lower_y) / 2;
    }

    // オフセットによるアンカーの移動
    anchor_x -= build_info.offset[0];
    anchor_y += build_info.offset[1];

    // スクリーン座標オフセット
    const offset_lx = (image_info.display_lower_x - anchor_x) * build_info.scale;
    const offset_rx = (image_info.display_upper_x - anchor_x) * build_info.scale;
    const offset_by = (image_info.display_lower_y - anchor_y) * build_info.scale;
    const offset_ty = (image_info.display_upper_y - anchor_y) * build_info.scale;

    // 文字を手前に移動する係数
    const dfactor = build_info.depth_factor;

    // テクスチャ座標
    const tc_lx = image_info.display_lower_x / image_info.texture_width;
    const tc_rx = image_info.display_upper_x / image_info.texture_width;
    const tc_by = image_info.display_lower_y / image_info.texture_height;
    const tc_ty = image_info.display_upper_y / image_info.texture_height;

    // 頂点配列を設定
    const vertices: number[] = [];

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
 * シェーダの `u_halo_width` に設定する値である。
 *
 * 詳細は定数 `DIST_FACTOR` の説明を参照のこと。
 */
function getShaderHaloWidth( halo_width: number ): number
{
    return (halo_width - DIST_LOWER) * DIST_FACTOR;
}


/**
 * 縁取りの不透明度を調整する。
 *
 * 縁取りが細いとき、距離補間の誤差が目立つので、`halo_color` の不透明
 * 度を下げて、目立ちにくいようにする。
 */
function adjustHaloOpacity( halo_width: number,
                            halo_color: Vector4 ): void
{
    if ( halo_width < 1.0 ) {
        const factor = Math.max( 0, halo_width );
        for ( let i = 0; i < 4; ++i ) {
            halo_color[i] *= factor;
        }
    }
}


/**
 * メッシュの生成情報
 */
interface MeshBuildInfo {

    /**
     * アンカー名
     *
     * `text-anchor`, `icon-anchor` に指定するアンカーの名前である。
     */
    anchor: string;


    /**
     * アンカーのオフセット量
     *
     * 表示スケール無しでの表示の画素単位の変位量を表している。
     *
     * そのため、アンカー点がこの量の逆方向に動くことと同等である。
     *
     * テキストの場合は `text-offset` に `text-size` を掛けた値、
     * アイコンの場合は `icon-offset` の値が設定される。
     *
     * @remarks
     *
     * キャンバス座標系と同じ。
     */
    offset: [number, number];


    /**
     * 表示スケール
     *
     * テキストの場合は 1、アイコンの場合は `icon-size` の値が設定される。
     */
    scale: number;


    /**
     * 深度を変位させるための係数
     */
    depth_factor: number;

}


/**
 * グラフィックス資源
 */
interface GraphicsResource {

    /**
     * シンボルのメッシュ
     */
    mesh: Mesh;


    /**
     * テクスチャ空間での画面画素の寸法
     */
    img_psize: Vector2;

}


/**
 * SDF 画像用のグラフィックス資源
 */
interface SdfGraphicsResource extends GraphicsResource {

    /**
     * シンボルの画像ハンドル
     */
    image_handle: ImageHandle;

}


/**
 * テキスト用のグラフィックス資源
 */
interface TextGraphicsResource extends SdfGraphicsResource {
}


/**
 * SDF アイコン (SdfImage) 用のグラフィックス資源
 */
interface SdfIconGraphicsResource extends SdfGraphicsResource {

    tag: 'sdf-icon';

    /**
     * 元画像
     */
    src_image: SdfImage;

}


/**
 * 通常アイコン (ColorImage) 用のグラフィックス資源
 */
interface ColorIconGraphicsResource extends GraphicsResource {

    tag: 'color-icon';


    /**
     * シンボルのテクスチャ
     */
    texture: WebGLTexture;

}


/**
 * アイコン用のグラフィックス資源
 */
type IconGraphicsResource = SdfIconGraphicsResource | ColorIconGraphicsResource;


/**
 * symbol 型レイヤーのマテリアル
 */
class SymbolMaterial extends EntityMaterial {

    constructor( glenv:   GLEnv,
                 stype: 'sdf' | 'color',
                 options: MaterailOption = {} )
    {
        const preamble = SymbolMaterial._getPreamble( options );
        const  fs_code = (stype === 'sdf') ? symbol_sdfield_fs_code : symbol_color_fs_code;

        super( glenv,
               preamble + symbol_vs_code,
               preamble + fs_code );

        // 不変パラメータを事前設定
        this.bindProgram();
        this.setInteger( "u_image", SymbolMaterial.TEXUNIT_IMAGE );
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

        const props = primitive.properties as SymbolMaterialProperty;

        // mat4 u_obj_to_view
        this.setObjToView( stage, primitive );

        // mat4 u_view_to_clip
        const view_to_clip = SymbolMaterial._view_to_clip;
        GeoMath.copyMatrix( stage._view_to_clip, view_to_clip );
        this.setMatrix( "u_view_to_clip", view_to_clip );

        // 画面パラメータ: {2/w, 2/h, pixel_step}
        // vec3 u_sparam
        const sparam = SymbolMaterial._sparam;
        sparam[0] = 2 / stage._width;
        sparam[1] = 2 / stage._height;
        sparam[2] = stage.pixel_step;
        this.setVector3( "u_sparam", sparam );

        if ( stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ) {
            // テクスチャのバインド
            // sampler2D u_image
            const image_tex = props["u_image"];
            this.bindTexture2D( SymbolMaterial.TEXUNIT_IMAGE, image_tex );

            // フィーチャー位置 (モデル座標系)
            this.setVector3( "u_position", props["u_position"] );

            // テクスチャ空間での画面画素の寸法
            this.setVector2( "u_img_psize", props["u_img_psize"] );

            // シンボル本体の RGBA 色
            this.setVector4( "u_color", props["u_color"] );

            // シンボル全体の不透明度
            this.setFloat( "u_opacity", props["u_opacity"] );

            // シンボル縁取りの RGBA 色
            this.setVector4( "u_halo_color", props["u_halo_color"] );

            // シンボル縁取り太さ - DIST_LOWER
            this.setFloat( "u_halo_width", GeoMath.clamp( props["u_halo_width"],
                                                          0.0, SymbolMaterial.MAX_HALO_WIDTH ) );
        }
    }


    /**
     * シェーダの前文を取得
     *
     * @private
     */
    private static _getPreamble( _options: MaterailOption ): string
    {
        const lines = [];

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
 * 中央アンカーに対するアンカーの方向 (テクスチャー座標系)
 */
const anchor_translate_direction: {
    [key: string]: [number, number] | undefined
} = {
    // 'center':    [ 0 ,  0],  デフォルト値、または認識できないアンカー
    'left':         [-1 ,  0],
    'right':        [+1 ,  0],
    'top':          [ 0 , +1],
    'bottom':       [ 0 , -1],
    'top-left':     [-1 , +1],
    'top-right':    [+1 , +1],
    'bottom-left':  [-1 , -1],
    'bottom-right': [+1 , -1],
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
 * [[SymbolMaterial]] 用のプロパティ型
 */
interface SymbolMaterialProperty {

    u_position: Vector3;

    u_image:     WebGLTexture;
    u_img_psize: Vector2;
    u_color:     Vector4;
    u_opacity:   number;

    u_halo_color: Vector4;
    u_halo_width: number;

}


/**
 * マテリアル構築子のオプション
 */
interface MaterailOption {
}
