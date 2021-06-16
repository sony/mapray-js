import Entity from "./Entity";
import Primitive from "./Primitive";
import GLEnv from "./GLEnv";
import Mesh from "./Mesh";
import Scene from "./Scene";
import Texture from "./Texture";
import TextMaterial from "./TextMaterial";
import SimpleTextMaterial from "./SimpleTextMaterial";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import RenderStage from "./RenderStage";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Dom from "./util/Dom";
import Color from "./util/Color";
import BindingBlock from "./animation/BindingBlock";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import Type from "./animation/Type";
import AbstractPointEntity from "./AbstractPointEntity";

/**
 * テキストエンティティ
 */
class TextEntity extends AbstractPointEntity<TextEntity.TextEntry> {

    private _text_parent_props: TextEntity.ParentProps;

    private _primitive_producer?: TextEntity.PrimitiveProducer;


    /**
     * @param scene        所属可能シーン
     * @param opts       オプション集合
     */
    constructor( scene: Scene, opts: TextEntity.Option = {} )
    {
        super( scene, opts );

        // テキストの親プロパティ
        this._text_parent_props = {
            font_style:   "normal",
            font_weight:  "normal",
            font_size:    TextEntity.DEFAULT_FONT_SIZE,
            font_family:  TextEntity.DEFAULT_FONT_FAMILY,
            color:        Color.generateOpacityColor( TextEntity.DEFAULT_COLOR as Vector3 ),
            stroke_color: Color.generateOpacityColor( TextEntity.DEFAULT_STROKE_COLOR as Vector3 ),
            stroke_width: TextEntity.DEFAULT_STROKE_WIDTH,
            bg_color:     Color.generateOpacityColor( TextEntity.DEFAULT_BG_COLOR as Vector3 ),
            enable_stroke: false,
            enable_bg: false
        };

        // @ts-ignore
        const block = this._animation as EasyBindingBlock;
        block.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        this._setupAnimationBindingBlock();

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    override getPrimitiveProducer()
    {
        return this._primitive_producer;
    }


    override onChangeAltitudeMode( prev_mode: AltitudeMode )
    {
        if ( this._primitive_producer ) {
          this._primitive_producer.onChangeAltitudeMode();
        }
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     */
    private _unbindDescendantAnimations()
    {
        // すべてのエントリーを解除
        for ( let entry of this._entries ) {
            entry.getAnimation().unbindAllRecursively();
        }
    }


    /**
     * アニメーションの BindingBlock を初期化
     */
    private _setupAnimationBindingBlock()
    {
        const block = this._animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const string  = Type.find( "string"  );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: font_style
        // パラメータ型: string
        //   フォントスタイル
        block.addEntry( "font_style", [string], null, (value: TextEntity.FontStyle) => {
            this.setFontStyle( value );
        } );
        
        // パラメータ名: font_weight
        // パラメータ型: string
        //   フォントの太さ
        block.addEntry( "font_weight", [string], null, (value: TextEntity.FontWeight) => {
            this.setFontWeight( value );
        } );
        
        // パラメータ名: font_size
        // パラメータ型: number
        //   フォントの大きさ
        block.addEntry( "font_size", [number], null, (value: number) => {
            this.setFontSize( value );
        } );
        
        // パラメータ名: color
        // パラメータ型: vector3
        //   テキストの色
        block.addEntry( "color", [vector3], null, (value: Vector3) => {
            this.setColor( value );
        } );
        
        // パラメータ名: stroke_color
        // パラメータ型: vector3
        //   縁の色
        block.addEntry( "stroke_color", [vector3], null, (value: Vector3) => {
            this.setStrokeColor( value );
        } );
        
        // パラメータ名: stroke_width
        // パラメータ型: number
        //   縁の線幅
        block.addEntry( "stroke_width", [number], null, (value: number) => {
            this.setStrokeLineWidth( value );
        } );
    }


    /**
     * フォントスタイルを設定
     * @param style  フォントスタイル
     */
    setFontStyle( style: TextEntity.FontStyle )
    {
        this._setValueProperty( "font_style", style );
    }


    /**
     * @summary フォントの太さを設定
     * @param weight  フォントの太さ
     */
    setFontWeight( weight: TextEntity.FontWeight )
    {
        this._setValueProperty( "font_weight", weight );
    }


    /**
     * フォントの大きさを設定
     * @param size  フォントの大きさ (Pixels)
     */
    setFontSize( size: number )
    {
        this._setValueProperty( "font_size", size );
    }


    /**
     * フォントファミリーを設定
     * @param family  フォントファミリー
     * @see https://developer.mozilla.org/ja/docs/Web/CSS/font-family
     */
    setFontFamily( family: string )
    {
        this._setValueProperty( "font_family", family );
    }


    /**
     * テキストの色を設定
     * @param color  テキストの色
     */
    setColor( color: Vector3 )
    {
        this._setColorProperty( "color", color );
    }

    /**
     * テキスト縁の色を設定
     * @param color  縁の色
     */
    setStrokeColor( color: Vector3 )
    {
        this._setColorProperty( "stroke_color", color );
    }

    /**
     * テキスト縁の太さを設定
     * @param width  縁の線幅
     */
    setStrokeLineWidth( width: number )
    {
        this._setValueProperty( "stroke_width", width );
    }

    /**
     * テキスト縁を有効にするかどうか
     * @param enable  trueなら有効
     */
    setEnableStroke( enable: boolean )
    {
        this._setValueProperty( "enable_stroke", enable );
        this._primitive_producer = new TextEntity.PrimitiveProducer( this );
    }

    /**
     * テキスト背景の色を設定
     * @param color  テキストの色
     */
    setBackgroundColor( color: Vector3 )
    {
        this._setColorProperty( "bg_color", color );
    }

    /**
     * テキスト背景を有効にするかどうか
     * @param enable  trueなら有効
     */
    setEnableBackground( enable: boolean )
    {
        this._setValueProperty( "enable_bg", enable );
        this._primitive_producer = new TextEntity.PrimitiveProducer( this );
    }

    /**
     * テキストを追加
     * @param text      テキスト
     * @param position  位置
     * @param props     プロパティ
     * @return          追加したEntry
     */
    addText( text: string, position: GeoPoint, props: TextEntity.EntryOption ): TextEntity.TextEntry
    {
        var entry = new TextEntity.TextEntry( this, text, position, props );
        this._entries.push( entry );
        this._primitive_producer = new TextEntity.PrimitiveProducer( this );
        this._primitive_producer.onAddTextEntry();
        return entry;
    }


    /**
     * 専用マテリアルを取得
     */
    private _getTextMaterial( render_target: RenderStage.RenderTarget )
    {
        var scene = this.scene;
        if ( render_target === RenderStage.RenderTarget.SCENE ) {
            if ( !scene._TextEntity_text_material ) {
                // scene にマテリアルをキャッシュ
                scene._TextEntity_text_material = new TextMaterial( scene.glenv );
            }
            return scene._TextEntity_text_material;
        }
        else if (render_target === RenderStage.RenderTarget.RID) {
            if ( !scene._TextEntity_text_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._TextEntity_text_material_pick = new TextMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._TextEntity_text_material_pick;
        }
        else {
            throw new Error("unknown render target: " + render_target);
        }
    }

    /**
     * テキストだけを描画する専用マテリアルを取得
     */
    private _getSimpleTextMaterial( render_target: RenderStage.RenderTarget )
    {
        var scene = this.scene;
        if ( render_target === RenderStage.RenderTarget.SCENE ) {
            if ( !scene._SimpleTextEntity_text_material ) {
                // scene にマテリアルをキャッシュ
                scene._SimpleTextEntity_text_material = new SimpleTextMaterial( scene.glenv );
            }
            return scene._SimpleTextEntity_text_material;
        }
        else if (render_target === RenderStage.RenderTarget.RID) {
            if ( !scene._SimpleTextEntity_text_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._SimpleTextEntity_text_material_pick = new SimpleTextMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._SimpleTextEntity_text_material_pick;
        }
        else {
            throw new Error("unknown render target: " + render_target);
        }
    }

    private _setValueProperty( name: string, value: any )
    {
        var props = this._text_parent_props;
        if ( props[name] != value ) {
            props[name] = value;
            if ( this._primitive_producer ) {
                this._primitive_producer.onChangeParentProperty();
            }
        }
    }


    private _setColorProperty( name: string, value: any )
    {
        var dst = this._text_parent_props[name] as Color;
        if ( dst.r != value[0] || dst.g != value[1] || dst.b != value[2] ) {
            Color.setOpacityColor( value, dst );
            if ( this._primitive_producer ) {
              this._primitive_producer.onChangeParentProperty();
            }
        }
    }


    private _setupByJson( json: TextEntity.Json )
    {
        var position = new GeoPoint();

        for ( let entry of json.entries ) {
            position.setFromArray( entry.position );
            this.addText( entry.text, position, entry );
        }

        if ( json.font_style    !== undefined ) this.setFontStyle( json.font_style );
        if ( json.font_weight   !== undefined ) this.setFontWeight( json.font_weight );
        if ( json.font_size     !== undefined ) this.setFontSize( json.font_size );
        if ( json.font_family   !== undefined ) this.setFontFamily( json.font_family );
        if ( json.color         !== undefined ) this.setColor( json.color );
        if ( json.stroke_color  !== undefined ) this.setStrokeColor ( json.stroke_color );
        if ( json.stroke_width  !== undefined ) this.setStrokeLineWidth ( json.stroke_width );
        if ( json.enable_stroke !== undefined ) this.setEnableStroke ( json.enable_stroke );
        if ( json.bg_color      !== undefined ) this.setBackgroundColor( json.bg_color );
        if ( json.enable_bg     !== undefined ) this.setEnableBackground ( json.enable_bg );
    }

    private _enableStroke( )
    {
        return this._text_parent_props["enable_stroke"];
    }

    
    /**
     * IDでEntryを取得
     * @param id  ID
     * @return IDが一致するEntry（無ければundefined）
     */
    getEntry( id: string ): TextEntity.TextEntry | undefined
    {
        return this._entries.find((entry) => entry.id === id);
    }
}



namespace TextEntity {



export interface Option extends Entity.Option {
    /**
     * 生成情報
     */
    json?: TextEntity.Json;
}



export interface Json extends Entity.Json {

    entries: EntryJson[];

    font_style?: FontStyle;

    font_weight?: FontWeight;

    font_size?: number;

    font_family?: string;

    stroke_color?: Vector3;

    stroke_width?: number;

    color?: Vector3;

    bg_color?: Vector3;

    enable_bg?: boolean;

    enable_stroke?: boolean,

}


export function isTextEntityJson( entityJson: Entity.Json ): entityJson is TextEntity.Json {
    return entityJson.type === "";
}



export interface EntryJson {
    position: [ x: number, y: number, z: number ];
    text: string;
}



export interface ParentProps {
    font_style: FontStyle;
    font_weight: FontWeight;
    font_size: number;
    font_family: string;
    color: Color,
    stroke_color: Color,
    stroke_width: number,
    bg_color: Color;
    enable_stroke: boolean,
    enable_bg: boolean,
    [name: string]: any,
}

export type FontStyle = "normal" | "italic" | "oblique";

export type FontWeight = "normal" | "bold";



export const DEFAULT_FONT_SIZE    = 16;
export const DEFAULT_FONT_FAMILY  = "sans-serif";
export const DEFAULT_COLOR        = [1, 1, 1];
export const DEFAULT_STROKE_COLOR = [0.0, 0.0, 0.0];
export const DEFAULT_STROKE_WIDTH = 0.48;
export const DEFAULT_BG_COLOR     = [0.3, 0.3, 0.3];

export const DEFAULT_TEXT_UPPER  = 1.1;
export const DEFAULT_TEXT_LOWER  = 0.38;
export const SAFETY_PIXEL_MARGIN = 1;
export const MAX_IMAGE_WIDTH     = 4096;



/**
 * @summary TextEntity の PrimitiveProducer
 *
 * TODO: relative で標高の変化のたびにテクスチャを生成する必要はないので
 *       Layout でのテクスチャの生成とメッシュの生成を分離する
 *
 * @private
 */
export class PrimitiveProducer extends Entity.PrimitiveProducer {

    private _glenv: GLEnv;

    private _dirty: boolean;

    private _transform: Matrix;

    private _properties: {
        enable_bg: boolean;
        image?: Texture;
    };

    private _primitive: Primitive;

    private _pickPrimitive: Primitive;

    private _primitives: Primitive[];

    private _pickPrimitives: Primitive[];

    /**
     * @param {mapray.TextEntity} entity
     */
    constructor( entity: TextEntity )
    {
        super( entity );

        this._glenv = entity.scene.glenv;
        this._dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            enable_bg: false,
            image: undefined  // テキスト画像
        };

        // プリミティブ
        var material = null, pickMaterial = null;
        if ( this._isSimpleText() ) {
            // @ts-ignore
            material = entity._getSimpleTextMaterial( RenderStage.RenderTarget.SCENE );
            // @ts-ignore
            pickMaterial = entity._getSimpleTextMaterial( RenderStage.RenderTarget.RID );
        } else {
            // @ts-ignore
            material = entity._getTextMaterial( RenderStage.RenderTarget.SCENE );
            // @ts-ignore
            pickMaterial = entity._getTextMaterial( RenderStage.RenderTarget.RID );
        }
        var primitive = new Primitive( this._glenv, null, material, this._transform );
        primitive.properties = this._properties;
        this._primitive = primitive;

        var pickPrimitive = new Primitive( this._glenv, null, pickMaterial, this._transform );
        pickPrimitive.properties = this._properties;
        this._pickPrimitive = pickPrimitive;

        // プリミティブ配列
        this._primitives = [];
        this._pickPrimitives = [];
    }


    override getEntity(): TextEntity {
        return super.getEntity() as TextEntity;
    }


    override createRegions()
    {
        const region = new EntityRegion();

        // @ts-ignore
        for ( let {position} of this.entity._entries ) {
            region.addPoint( position );
        }

        return [region];
    }


    override onChangeElevation( regions: EntityRegion[] )
    {
        this._dirty = true;
    }


    override getPrimitives( stage: RenderStage )
    {
        this._updatePrimitive();
        return stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ? this._primitives : this._pickPrimitives;
    }


    /**
     * 親プロパティが変更されたことを通知
     */
    onChangeParentProperty()
    {
        this._dirty = true;
    }


    /**
     * 子プロパティが変更されたことを通知
     */
    onChangeChildProperty()
    {
        this._dirty = true;
    }


    /**
     * 高度モードが変更されたことを通知
     */
    onChangeAltitudeMode()
    {
        this._dirty = true;
    }


    /**
     * テキストが追加されたことを通知
     */
    onAddTextEntry()
    {
        // 変化した可能性がある
        this.needToCreateRegions();
        this._dirty = true;
    }


    get transform(): Matrix {
        return this._transform;
    }


    /**
     * プリミティブの更新
     *
     * @desc
     * 入力:
     *   this.entity._entries
     *   this._dirty
     * 出力:
     *   this._transform
     *   this._properties.image
     *   this._primitive.mesh
     *   this._primitives
     *   this._dirty
     *
     * @return this._primitives
     */
    private _updatePrimitive(): Primitive[] | undefined
    {
        if ( !this._dirty ) {
            // 更新する必要はない
            return;
        }
        this._updateProperties();

        const entity = this.getEntity();
        // @ts-ignore
        if ( entity._entries.length == 0 ) {
            this._primitives = [];
            this._pickPrimitives = [];
            this._dirty = false;
            return;
        }

        // 各エントリーの GOCS 位置を生成 (平坦化配列)
        var gocs_array = this._createFlatGocsArray();

        // プリミティブの更新
        //   primitive.transform
        this._updateTransform( gocs_array );

        var layout = new Layout( this, gocs_array );
        if ( !layout.isValid() ) {
            // 更新に失敗
            this._primitives = [];
            this._dirty = false;
            return this._primitives;
        }

        // テクスチャ設定
        var properties = this._properties;
        if ( properties.image ) {
            properties.image.dispose();
        }
        properties.image = layout.texture;

        // メッシュ生成
        var vtype = [];
        if ( this._isSimpleText() ) {
            vtype = [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
                { name: "a_color",    size: 4 }
            ];
        } else {
            vtype = [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
            ];
        }
        var mesh_data = {
            vtype,
            vertices: layout.vertices,
            indices:  layout.indices
        };
        var mesh = new Mesh( this._glenv, mesh_data );

        // メッシュ設定
        //   primitive.mesh
        var primitive = this._primitive;
        if ( primitive.mesh ) {
            primitive.mesh.dispose();
        }
        primitive.mesh = mesh;

        var pickPrimitive = this._pickPrimitive;
        if ( pickPrimitive.mesh ) {
            pickPrimitive.mesh.dispose();
        }
        pickPrimitive.mesh = mesh;

        // 更新に成功
        this._primitives = [primitive];
        this._pickPrimitives = [pickPrimitive];
        this._dirty = false;

        return;
    }

    /**
     * @summary プロパティを更新
     *
     * @desc
     * <pre>
     * 入力:
     *   this.entity
     * 出力:
     *   this._properties
     * </pre>
     *
     * @private
     */
    _updateProperties()
    {
        let entity = this.getEntity();
        let props  = this._properties;

        // @ts-ignore
        props.enable_bg = entity._text_parent_props.enable_bg;
    }


    /**
     * プリミティブの更新
     *
     * 条件:
     *   this.entity._entries.length > 0
     * 入力:
     *   this.entity._entries.length
     * 出力:
     *   this._transform
     *
     * @param gocs_array  GOCS 平坦化配列
     */
    private _updateTransform( gocs_array: Float64Array )
    {
        // @ts-ignore
        var num_entries = this.getEntity()._entries.length;
        var        xsum = 0;
        var        ysum = 0;
        var        zsum = 0;

        for ( let i = 0; i < num_entries; ++i ) {
            let ibase = 3*i;
            xsum += gocs_array[ibase];
            ysum += gocs_array[ibase + 1];
            zsum += gocs_array[ibase + 2];
        }

        // 変換行列の更新
        var transform = this._transform;
        transform[12] = xsum / num_entries;
        transform[13] = ysum / num_entries;
        transform[14] = zsum / num_entries;
    }


    /**
     * GOCS 平坦化配列を取得
     *
     * 入力: this.entity._entries
     *
     * @return  GOCS 平坦化配列
     */
    private _createFlatGocsArray(): Float64Array
    {
        // @ts-ignore
        const num_points = this.getEntity()._entries.length;
        return GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                     new Float64Array( 3 * num_points ) );
    }


    /**
     * @summary GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * 入力: this.entity._entries
     *
     * @return {number[]}  GeoPoint 平坦化配列
     * @private
     */
    _getFlatGeoPoints_with_Absolute()
    {
        const owner      = this.getEntity();
        // @ts-ignore
        const entries    = owner._entries;
        const num_points = entries.length;
        const flat_array = new Float64Array( 3 * num_points );

        // flat_array[] に経度要素と緯度要素を設定
        for ( let i = 0; i < num_points; ++i ) {
            let pos = entries[i].position;
            flat_array[3*i]     = pos.longitude;
            flat_array[3*i + 1] = pos.latitude;
        }

        switch ( owner.altitude_mode ) {
        case AltitudeMode.RELATIVE:
        case AltitudeMode.CLAMP:
            // flat_array[] の高度要素に現在の標高を設定
            owner.scene.viewer.getExistingElevations( num_points, flat_array, 0, 3, flat_array, 2, 3 );

            if ( owner.altitude_mode === AltitudeMode.RELATIVE ) {
                // flat_array[] の高度要素に相対高度を加える
                for ( let i = 0; i < num_points; ++i ) {
                    flat_array[3*i + 2] += entries[i].position.altitude;
                }
            }
            break;

        default: // AltitudeMode.ABSOLUTE
            // flat_array[] の高度要素に絶対高度を設定
            for ( let i = 0; i < num_points; ++i ) {
                flat_array[3*i + 2] = entries[i].position.altitude;
            }
            break;
        }

        return flat_array;
    }

     /**
     * @summary シンプルテキストモードかどうかを確認
     *
     * @return {boolean}  シンプルテキストモードならtrue.
     * @private
     */
    _isSimpleText() 
    {
        let entity = this.getEntity();

        let enable = true;
        // check enable bg color or stroke;
        // @ts-ignore
        if ( entity._text_parent_props.enable_bg || entity._text_parent_props.enable_stroke ) {
            enable = false;
        }

        // check enable stroke
        let i = 0;
        // @ts-ignore
        const entries = entity._entries;
        while ( enable && entries.length > i ) {
            let entry = entries[i] as TextEntry;
            enable = !entry.enable_stroke;
            i++;
        }

        return enable;
    }

}


/**
 * テキスト要素
 */
export class TextEntry extends AbstractPointEntity.Entry {

    private _owner: TextEntity;

    private _text: string;

    private _position: GeoPoint;

    private _props: EntryOption;

    private _animation: BindingBlock;

    /**
     * @param owner                所有者
     * @param text                 テキスト
     * @param position             位置
     * @param props              プロパティ
     */
    constructor( owner: TextEntity, text: string, position: GeoPoint, props: EntryOption ) {
        super();
        this._owner    = owner;
        this._text     = text;
        this._position = position.clone();

        // animation.BindingBlock
        // @ts-ignore
        this._animation = new EasyBindingBlock();

        this._setupAnimationBindingBlock();

        this._props = Object.assign( {}, props );   // props の複製
        this._copyColorProperty( "color" );         // deep copy
        this._copyColorProperty( "stroke_color" );  // deep copy
        this._copyColorProperty( "bg_color" );      // deep copy
    }


    override getAnimation(): BindingBlock {
        return this._animation;
    }


    /**
     * @summary テキスト
     * @type {string}
     * @readonly
     * @package
     */
    get text()
    {
        return this._text;
    }


    /**
     * 位置
     * @internal
     */
    override get position(): GeoPoint
    {
        return this._position;
    }


    /**
     * ID
     */
    override get id(): string
    {
        return this._props.hasOwnProperty( "id" ) ? this._props.id as string : "";
    }


    /**
     * フォントサイズ (Pixels)
     * @internal
     */
    get size(): number
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.font_size || parent.font_size;
    }


    /**
     * テキストの色
     * @internal
     */
    get color(): Color
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.color || parent.color;
    }


    /**
     * フォント
     * @internal
     * @see https://developer.mozilla.org/ja/docs/Web/CSS/font
     */
    get font(): string
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;

        var   style = props.font_style  || parent.font_style;
        var variant = "normal";
        var  weight = props.font_weight || parent.font_weight;
        var  family = props.font_family || parent.font_family;

        return style + " " + variant + " " + weight + " " + this.size + "px " + family;
    }

    /**
     * テキスト縁の色
     * @internal
     */
    get stroke_color(): Color
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.stroke_color || parent.stroke_color;
    }

    /**
     * 縁の幅 (Pixels)
     * @internal
     */
    get stroke_width(): number
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.stroke_width || parent.stroke_width;
    }

    /**
     * @summary 縁を描画するか
     * @type {boolean}
     * @readonly
     * @package
     */
    get enable_stroke(): boolean
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.enable_stroke || parent.enable_stroke;
    }

    /**
     * @summary 背景色
     * @type {mapray.Color}
     * @readonly
     * @package
     */
    get bg_color(): Color
    {
        var props  = this._props;
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return props.bg_color || parent.bg_color;
    }

    /**
     * @summary 背景描画するか
     * @type {boolean}
     * @readonly
     * @package
     */
    get enable_background(): boolean
    {
        // Enable or Disable background can be set by parent.
        // @ts-ignore
        var parent = this._owner._text_parent_props;
        return parent.enable_bg;
    }


    /**
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */
    _setupAnimationBindingBlock()
    {
        // @ts-ignore
        const block = this.getAnimation() as EasyBindingBlock;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const string  = Type.find( "string"  );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [vector3], null, (value: Vector3) => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: font_style
        // パラメータ型: string
        //   フォントスタイル
        block.addEntry( "font_style", [string], null, (value: FontStyle) => {
            this.setFontStyle( value );
        } );
        
        // パラメータ名: font_weight
        // パラメータ型: string
        //   フォントの太さ
        block.addEntry( "font_weight", [string], null, (value: FontWeight) => {
            this.setFontWeight( value );
        } );
        
        // パラメータ名: font_size
        // パラメータ型: number
        //   フォントの大きさ
        block.addEntry( "font_size", [number], null, (value: number) => {
            this.setFontSize( value );
        } );
        
        // パラメータ名: color
        // パラメータ型: vector3
        //   テキストの色
        block.addEntry( "color", [vector3], null, (value: Vector3) => {
            this.setColor( value );
        } );
        
        // パラメータ名: stroke_color
        // パラメータ型: vector3
        //   縁の色
        block.addEntry( "stroke_color", [vector3], null, (value: Vector3) => {
            this.setStrokeColor( value );
        } );
        
        // パラメータ名: stroke_width
        // パラメータ型: number
        //   縁の線幅
        block.addEntry( "stroke_width", [number], null, (value: number) => {
            this.setStrokeLineWidth( value );
        } );

        // パラメータ名: text
        // パラメータ型: string
        //   テキスト
        block.addEntry( "text", [string], null, (value: string) => {
            this.setText( value );
        } );        
    }


    /**
     * テキスト原点位置を設定
     *
     * @param position  テキスト原点の位置
     */
    setPosition( position: GeoPoint )
    {
        if ( this._position.longitude !== position.longitude ||
             this._position.latitude  !== position.latitude  ||
             this._position.altitude  !== position.altitude ) {
            // 位置が変更された
            this._position.assign( position );
            const primitiveProducer = this._owner.getPrimitiveProducer();
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
    }


    /**
     * フォントスタイルを設定
     * @param style  フォントスタイル
     */
    setFontStyle( style: FontStyle )
    {
        this._setValueProperty( "font_style", style );
    }


    /**
     * フォントの太さを設定
     * @param weight  フォントの太さ
     */
    setFontWeight( weight: FontWeight )
    {
        this._setValueProperty( "font_weight", weight );
    }


    /**
     * フォントの大きさを設定
     * @param size  フォントの大きさ (Pixels)
     */
    setFontSize( size: number )
    {
        this._setValueProperty( "font_size", size );
    }


    /**
     * テキストの色を設定
     * @param color  テキストの色
     */
    setColor( color: Vector3 )
    {
        this._setColorProperty( "color", color );
    }


    /**
     * テキスト縁の色を設定
     * @param color  縁の色
     */
    setStrokeColor( color: Vector3 )
    {
        this._setColorProperty( "stroke_color", color );
    }


    /**
     * テキスト縁の太さを設定
     * @param width  縁の線幅
     */
    setStrokeLineWidth( width: number )
    {
        this._setValueProperty( "stroke_width", width );
    }


    /**
     * テキスト縁を有効にするかどうか
     * @param enable  trueなら有効
     */
    setEnableStroke( enable: boolean )
    {
        this._setValueProperty( "enable_stroke", enable );
        // @ts-ignore
        this._owner._primitive_producer = new PrimitiveProducer( this._owner );
    }


    /**
     * テキストを設定
     * @param text  テキスト
     */
    setText( text: string )
    {
        if ( this._text !== text ) {
            this._text = text;
            const primitiveProducer = this._owner.getPrimitiveProducer();
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
    }


    private _copyColorProperty( name: string )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            props[name] = Color.generateOpacityColor( props[name] );
        }
    }


    private _setValueProperty( name: string, value: any )
    {
        var props = this._props;
        if ( props[name] != value ) {
            props[name] = value;
            const primitiveProducer = this._owner.getPrimitiveProducer();
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
    }


    private _setColorProperty( name: string, value: Vector3 )
    {
        var dst = this._props[name];
        if ( dst )
        {
            if ( dst.r != value[0] || dst.g != value[1] || dst.b != value[2] ) {
                Color.setOpacityColor( value, dst );
                const primitiveProducer = this._owner.getPrimitiveProducer()
                if ( primitiveProducer ) {
                    primitiveProducer.onChangeChildProperty();
                }
            }
        }
        else
        {
            this._props[name] = Color.generateOpacityColor( value );
            const primitiveProducer = this._owner.getPrimitiveProducer()
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
    }
}



export interface EntryOption {
    /** フォントスタイル */
    font_style?: FontStyle;

    /** フォントの太さ */
    font_weight?: FontWeight;

    /** フォントの大きさ (Pixels) */
    font_size?: number;

    /** フォントファミリー */
    font_family?: string;

    /** テキストの色 */
    color?: Color;

    /** テキスト縁の色 */
    stroke_color?: Color;

    /** 背景色 */
    bg_color?: Color;

    /** テキスト縁の幅 */
    stroke_width?: number;

    /** テキストの縁取りを有効にするか */
    enable_stroke?: boolean;

    /** Entryを識別するID */
    id?: string;

    [name: string]: any;
}


export interface EntryProps {
    
}




/**
 * @summary テキスト画像を Canvas 上にレイアウト
 *
 * @memberof mapray.TextEntity
 * @private
 */
class Layout {

    private _owner: PrimitiveProducer;

    private _items: LItem[];

    private _is_valid: boolean;

    private _texture?: Texture;

    private _vertices: number[];

    private _indices?: number[];

    /**
     * @desc
     * 入力:
     *   owner._glenv
     *   owner.entity._entries
     *   owner._transform
     *
     * @param owner       所有者
     * @param gocs_array  GOCS 平坦化配列
     */
    constructor( owner: PrimitiveProducer, gocs_array: Float64Array )
    {
        this._owner = owner;
        this._items = this._createItemList();
        this._is_valid = true;

        var row_layouts = this._createRowLayouts();
        if ( row_layouts.length == 0 ) {
            // 有効なテキストが1つも無い
            this._is_valid = false;
            this._vertices = [];
            return;
        }

        // アイテムの配置の設定とキャンバスサイズの決定
        var size = this._setupLocation( row_layouts );

        if ( this._isSimpleTextWithAllItems( this._items ) ) { 
            this._texture  = this._createTextureForSimple( size.width, size.height );
            this._vertices = this._createVerticesForSimple( size.width, size.height, gocs_array );
        } else {
            this._texture  = this._createTexture( size.width, size.height );
            this._vertices = this._createVertices( size.width, size.height, gocs_array );
        }
        this._indices  = this._createIndices();
    }


    /**
     * 有効なオブジェクトか？
     *
     * 無効のとき、他のメソッドは呼び出せない。
     * @return 有効のとき true, 無効のとき false
     */
    isValid(): boolean
    {
        return this._is_valid;
    }


    /**
     * テクスチャ
     */
    get texture(): Texture
    {
        return this._texture as Texture;
    }


    /**
     * 頂点配列
     *
     * 条件:
     *   this._entries.length > 0
     * 入力:
     *   this._entries
     *   this._transform
     */
    get vertices(): number[]
    {
        return this._vertices;
    }


    /**
     * @summary インデックス配列
     * @type {Uint32Array}
     * @readonly
     */
    get indices()
    {
        return this._indices;
    }


    /**
     * レイアウトアイテムのリストを生成
     */
    private _createItemList(): LItem[]
    {
        var context = Dom.createCanvasContext( 1, 1 );

        var items = [];
        for ( let entry of this._owner.getEntity().entries ) {
            items.push( new LItem( this, entry as TextEntry, context ) );
        }

        return items;
    }


    /**
     * RowLayout のリストを生成
     */
    private _createRowLayouts(): RowLayout[]
    {
        // アイテムリストの複製
        var items = this._items.slice();

        // RowLayout 内であまり高さに差が出ないように、アイテムリストを高さで整列
        items.sort( function( a, b ) { return a.height_pixel - b.height_pixel; } );

        // リストを生成
        var row_layouts = [];
        while ( items.length > 0 ) {
            var row_layout = new RowLayout( items );
            if ( row_layout.isValid() ) {
                row_layouts.push( row_layout );
            }
        }

        return row_layouts;
    }


    /**
     * テクスチャを生成
     * @param width    横幅
     * @param height   高さ
     * @return テキストテクスチャ
     */
    private _createTexture( width: number, height: number ): Texture
    {
        var context = Dom.createCanvasContext( width, height );

        context.textAlign    = "left";
        context.textBaseline = "alphabetic";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            var entry = item.entry;
            if ( item.is_canceled ) continue;
            if ( entry.enable_background ) {
                item.drawRect( context );
            }
            if ( entry.enable_stroke ) {
                item.drawStrokeText( context );
            }
            item.drawText( context );
        }

        var glenv = this._owner.getEntity().scene.glenv;
        var  opts = {
            usage: Texture.Usage.TEXT
        };
        return new Texture( glenv, context.canvas, opts );
    }


    /**
     * @summary 頂点配列を生成
     *
     * @param width       横幅
     * @param height      高さ
     * @param gocs_array  GOCS 平坦化配列
     * @return 頂点配列 [左下0, 右下0, 左上0, 右上0, ...]
     */
    private _createVertices( width: number, height: number, gocs_array: Float64Array ): number[]
    {
        var vertices = [];

        // テキスト集合の原点 (GOCS)
        var transform = this._owner.transform;
        var xo = transform[12];
        var yo = transform[13];
        var zo = transform[14];

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            // テキストの位置 (モデル座標系)
            var ibase = 3 * i;
            var xm = gocs_array[ibase]     - xo;
            var ym = gocs_array[ibase + 1] - yo;
            var zm = gocs_array[ibase + 2] - zo;

            // ベースライン左端 (キャンバス座標系)
            var xc = item.pos_x;
            var yc = item.pos_y;

            var upper = item.upper;
            var lower = item.lower;
            var xsize = item.width;

            var xn = 1 / width;
            var yn = 1 / height;

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
        }

        return vertices;
    }


    /**
     * 単純テキスト用テクスチャを生成
     * @param  width    横幅
     * @param  height   高さ
     * @return テキストテクスチャ
     */
    private _createTextureForSimple( width: number, height: number ): Texture
    {
        var context = Dom.createCanvasContext( width, height );

        context.textAlign    = "left";
        context.textBaseline = "alphabetic";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            item.drawText( context );
        }

        var glenv = this._owner.getEntity().scene.glenv;
        var  opts = {
            usage: Texture.Usage.SIMPLETEXT
        };
        return new Texture( glenv, context.canvas, opts );
    }


    /**
     * 単純テキスト用頂点配列を生成
     *
     * @param  width       横幅
     * @param  height      高さ
     * @param  gocs_array  GOCS 平坦化配列
     * @return 頂点配列 [左下0, 右下0, 左上0, 右上0, ...]
     */
    private _createVerticesForSimple( width: number, height: number, gocs_array: Float64Array ): number[]
    {
        var vertices = [];

        // テキスト集合の原点 (GOCS)
        // @ts-ignore
        var transform = this._owner._transform;
        var xo = transform[12];
        var yo = transform[13];
        var zo = transform[14];

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;

            var entry = item.entry;

            // テキストの色
            var color = entry.color.toVector4();

            // テキストの位置 (モデル座標系)
            var ibase = 3 * i;
            var xm = gocs_array[ibase]     - xo;
            var ym = gocs_array[ibase + 1] - yo;
            var zm = gocs_array[ibase + 2] - zo;

            // ベースライン左端 (キャンバス座標系)
            var xc = item.pos_x;
            var yc = item.pos_y;

            var upper = item.upper;
            var lower = item.lower;
            var xsize = item.width;

            var xn = 1 / width;
            var yn = 1 / height;

            // 左下
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( -xsize / 2, -lower );                        // a_offset
            vertices.push( xc * xn, 1 - (yc + lower) * yn );            // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 右下
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( xsize / 2, -lower );                         // a_offset
            vertices.push( (xc + xsize) * xn, 1 - (yc + lower) * yn );  // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 左上
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( -xsize / 2, upper );                         // a_offset
            vertices.push( xc * xn, 1 - (yc - upper) * yn );            // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 右上
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( xsize / 2, upper );                          // a_offset
            vertices.push( (xc + xsize) * xn, 1 - (yc - upper) * yn );  // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color
        }

        return vertices;
    }
    

    /**
     * インデックス配列を生成
     * @return インデックス配列 []
     */
    private _createIndices(): number[]
    {
        var indices = [];

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;

            var b = 4 * i;
            indices.push( b, b + 1, b + 2, b + 2, b + 1 , b + 3 );
        }

        return indices;
    }


    /**
     * @summary アイテムの配置を設定
     * @param  {array.<mapray.TextEntity.RowLayout>} row_layouts
     * @return {object}                              キャンバスサイズ
     * @private
     */
    _setupLocation( row_layouts: RowLayout[] )
    {
        var width  = 0;
        var height = 0;

        height += TextEntity.SAFETY_PIXEL_MARGIN;

        for ( var i = 0; i < row_layouts.length; ++i ) {
            var row_layout = row_layouts[i];
            row_layout.locate( height );
            width   = Math.max( row_layout.width_assumed, width );
            height += row_layout.height_pixel + TextEntity.SAFETY_PIXEL_MARGIN;
        }

        return {
            width:  width,
            height: height
        };
    }

    /**
     * シンプルテキストモードかどうか
     * @param  item
     * @return シンプルテキストモードならtrue
     */
    private _isSimpleText( item: LItem ): boolean
    {
        if ( item.entry.enable_background || item.entry.enable_stroke ) {
            return false;
        }
        return true;
    } 

    /**
     * シンプルテキストモードかどうか
     * @param  items
     * @return シンプルテキストモードならtrue
     */
    private _isSimpleTextWithAllItems( items: LItem[] ): boolean
    {
        let enable = true;
        let i = 0;
        while( enable && items.length > i) 
        {
            let item = items[i];
            enable = this._isSimpleText( item );
            i++;
        }
        return enable;
    } 

}


/**
 * @summary レイアウト対象
 * @memberof mapray.TextEntity
 * @private
 */
class LItem {

    private _entry: TextEntry;

    /** テキストの左端 */
    private _pos_x: number;

    /** テキストのベースライン位置 */
    private _pos_y: number;

    /** テキストの横幅 */
    private _width: number;

    /** テキストの範囲（上） */
    private _upper: number;

    /** テキストの範囲（下） */
    private _lower: number;

    private _is_canceled: boolean;


    /**
     * @param {mapray.TextEntity.Layout} layout   所有者
     * @param {mapray.TextEntity.Entry}  entry    TextEntity エントリ
     * @param {CanvasRenderingContext2D} context  測定用コンテキスト
     */
    constructor( layout: Layout, entry: TextEntry, context: CanvasRenderingContext2D )
    {
        this._entry = entry;

        this._pos_x = 0;
        this._pos_y = 0;

        context.font = entry.font;
        this._width  = context.measureText( entry.text ).width;

        this._upper = entry.size * TextEntity.DEFAULT_TEXT_UPPER;
        this._lower = entry.size * TextEntity.DEFAULT_TEXT_LOWER;

        this._is_canceled = false;
    }


    get entry(): TextEntry
    {
        return this._entry;
    }


    get pos_x(): number
    {
        return this._pos_x;
    }


    get pos_y(): number
    {
        return this._pos_y;
    }


    get width(): number
    {
        return this._width;
    }


    get upper(): number
    {
        return this._upper;
    }


    get lower(): number
    {
        return this._lower;
    }


    /**
     * キャンバス上でのテキストの横画素数
     */
    get width_pixel(): number
    {
        return Math.ceil( this._width );
    }


    /**
     * キャンバス上でのテキストの縦画素数
     */
    get height_pixel(): number
    {
        return Math.ceil( this._upper ) + Math.ceil( this._lower );
    }


    /**
     * 取り消し状態か？
     */
    get is_canceled(): boolean
    {
        return this._is_canceled;
    }


    /**
     * 取り消し状態に移行
     */
    cancel()
    {
        this._is_canceled = true;
    }


    /**
     * 配置を決定
     * @param x  テキスト矩形左辺の X 座標 (キャンバス座標系)
     * @param y  テキスト矩形上辺の Y 座標 (キャンバス座標系)
     */
    locate( x: number, y: number )
    {
        this._pos_x = x;
        this._pos_y = y + Math.ceil( this._upper );
    }


    /**
     * テキストだけを描画 (stokeやfillRectとは組み合わせ不可)
     *
     * context は以下のように設定していること。
     * ```ts
     *   context.textAlign    = "left";
     *   context.textBaseline = "alphabetic";
     *   context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";
     * ```
     * @param context  描画先コンテキスト
     */
    drawTextOnly( context: CanvasRenderingContext2D )
    {
        var entry = this._entry;
        context.font = entry.font;
        context.fillText( entry.text, this._pos_x, this._pos_y );
    }


    /**
     * @summary テキストを描画
     * @desc
     * <p>context は以下のように設定していること。</p>
     * <pre>
     *   context.textAlign    = "left";
     *   context.textBaseline = "alphabetic";
     *   context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";
     * </pre>
     * @param {CanvasRenderingContext2D} context  描画先コンテキスト
     */
    drawText( context: CanvasRenderingContext2D )
    {
        var entry = this._entry;

        context.font = entry.font;
        context.fillStyle =  entry.color.toRGBString();
        context.fillText( entry.text, this._pos_x, this._pos_y );
    }

 
    /**
     * @summary テキストの淵を描画
     * @desc
     * <p>drawTextOnlyとは組み合わせ不可</p>

     * @param {CanvasRenderingContext2D} context  描画先コンテキスト
     */
    drawStrokeText( context: CanvasRenderingContext2D )
    {
        /*
         context.fillText()
             .------------.   
             |',',',',',',|   
             |',',',',',',|   
             |',',',',',',|   
             |',',',',',',|   
             |',',',',',',|   

         context.strokeText()
         .--------------------.
         |',',',',',',',',',',|
         |','.------------.,',|
         |','|',',',',',',|,',|
         |','|','.----.,',|,',|
         |','|','|    |,',|,',|
         |','|','|    |,',|,',|
         |<--|-->|
           a   b
         b will be overwrite by fillText();
        */
        var entry = this._entry;

        context.font = entry.font;
        context.strokeStyle = entry.stroke_color.toRGBString();
        context.lineWidth = entry.stroke_width * 2;
        context.lineJoin = "round";
        context.strokeText( entry.text, this._pos_x, this._pos_y );
    }


    /**
     * @summary テキストの背景を描画
     * @desc
     * <p>drawTextOnlyとは組み合わせ不可</p>

     * @param {CanvasRenderingContext2D} context  描画先コンテキスト
     */
    drawRect( context: CanvasRenderingContext2D )
    {
        var entry = this._entry;

        context.fillStyle = entry.bg_color.toRGBString();
        context.fillRect( this._pos_x - TextEntity.SAFETY_PIXEL_MARGIN, this._pos_y - this._upper - TextEntity.SAFETY_PIXEL_MARGIN, this.width_pixel + TextEntity.SAFETY_PIXEL_MARGIN, this.height_pixel + TextEntity.SAFETY_PIXEL_MARGIN );
    }
}


/**
 * 水平レイアウト
 * @internal
 */
class RowLayout {

    private _items: LItem[];

    private _width_assumed: number;

    private _height_pixel: number;

    /**
     * レイアウトされた、またはレイアウトに失敗したアイテムは src_items から削除される。
     * レイアウトに失敗したアイテムは取り消し (is_canceled) になる。
     * @param src_items  アイテムリスト
     */
    constructor( src_items: LItem[] )
    {
        var width_assumed_total = 0;
        var height_pixel_max    = 0;
        var row_items           = [];

        width_assumed_total += TextEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        while ( src_items.length > 0 ) {
            var item          = src_items.shift() as LItem;
            var width_assumed = item.width_pixel + TextEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン

            if ( width_assumed_total + width_assumed <= TextEntity.MAX_IMAGE_WIDTH ) {
                // 行にアイテムを追加
                row_items.push( item );
                width_assumed_total += width_assumed;
                height_pixel_max = Math.max( item.height_pixel, height_pixel_max );
            }
            else {
                if ( row_items.length == 0 ) {
                    // テキストが長すぎて表示できない
                    item.cancel();
                }
                else {
                    // 次の行になるため差し戻して終了
                    src_items.unshift( item );
                    break;
                }
            }
        }

        this._items         = row_items;
        this._width_assumed = width_assumed_total;
        this._height_pixel  = height_pixel_max;
    }


    /**
     * 有効なオブジェクトか？
     *
     * 無効のとき、他のメソッドは呼び出せない。
     * @return 有効のとき true, 無効のとき false
     */
    isValid(): boolean
    {
        return this._items.length > 0;
    }


    get items(): LItem[]
    {
        return this._items;
    }


    /**
     * キャンバス上での行の横占有画素数
     */
    get width_assumed(): number
    {
        return this._width_assumed;
    }


    /**
     * キャンバス上での行の縦画素数
     */
    get height_pixel(): number
    {
        return this._height_pixel;
    }


    /**
     * レイアウトの配置を決定
     * @param y  テキスト矩形上辺の Y 座標 (キャンバス座標系)
     */
    locate( y: number )
    {
        var items = this._items;
        var x = 0;

        x += TextEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.locate( x, y );
            x += item.width_pixel + TextEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン
        }
    }

}



} // namespace TextEntity



export default TextEntity;
