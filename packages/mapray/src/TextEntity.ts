import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Texture from "./Texture";
import TextMaterial from "./TextMaterial";
import SimpleTextMaterial from "./SimpleTextMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import { RenderTarget } from "./RenderStage";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Dom from "./util/Dom";
import Color from "./util/Color";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import Type from "./animation/Type";
import AbstractPointEntity from "./AbstractPointEntity";

/**
 * @summary テキストエンティティ
 *
 * @memberof mapray
 * @extends mapray.Entity
 */
class TextEntity extends AbstractPointEntity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // テキストの親プロパティ
        this._text_parent_props = {
            font_style:   "normal",
            font_weight:  "normal",
            font_size:    TextEntity.DEFAULT_FONT_SIZE,
            font_family:  TextEntity.DEFAULT_FONT_FAMILY,
            color:        Color.generateOpacityColor( TextEntity.DEFAULT_COLOR ),
            stroke_color: Color.generateOpacityColor( TextEntity.DEFAULT_STROKE_COLOR ),
            stroke_width: TextEntity.DEFAULT_STROKE_WIDTH,
            bg_color:     Color.generateOpacityColor( TextEntity.DEFAULT_BG_COLOR ),
            enable_stroke: false,
            enable_bg: false
        };

        this._animation.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        this._setupAnimationBindingBlock();

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     * @override
     */
    getPrimitiveProducer()
    {
        return this._primitive_producer;
    }


    /**
     * @override
     */
    onChangeAltitudeMode( prev_mode )
    {
        if ( this._primitive_producer ) {
          this._primitive_producer.onChangeAltitudeMode();
        }
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     *
     * @private
     */
    _unbindDescendantAnimations()
    {
        // すべてのエントリーを解除
        for ( let entry of this._entries ) {
            entry.animation.unbindAllRecursively();
        }
    }


    /**
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */
    _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const string  = Type.find( "string"  );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: font_style
        // パラメータ型: string
        //   フォントスタイル
        block.addEntry( "font_style", [string], null, value => {
            this.setFontStyle( value );
        } );
        
        // パラメータ名: font_weight
        // パラメータ型: string
        //   フォントの太さ
        block.addEntry( "font_weight", [string], null, value => {
            this.setFontWeight( value );
        } );
        
        // パラメータ名: font_size
        // パラメータ型: number
        //   フォントの大きさ
        block.addEntry( "font_size", [number], null, value => {
            this.setFontSize( value );
        } );
        
        // パラメータ名: color
        // パラメータ型: vector3
        //   テキストの色
        block.addEntry( "color", [vector3], null, value => {
            this.setColor( value );
        } );
        
        // パラメータ名: stroke_color
        // パラメータ型: vector3
        //   縁の色
        block.addEntry( "stroke_color", [vector3], null, value => {
            this.setStrokeColor( value );
        } );
        
        // パラメータ名: stroke_width
        // パラメータ型: number
        //   縁の線幅
        block.addEntry( "stroke_width", [number], null, value => {
            this.setStrokeLineWidth( value );
        } );
    }


    /**
     * @summary フォントスタイルを設定
     * @param {string} style  フォントスタイル ("normal" | "italic" | "oblique")
     */
    setFontStyle( style )
    {
        this._setValueProperty( "font_style", style );
    }


    /**
     * @summary フォントの太さを設定
     * @param {string} weight  フォントの太さ ("normal" | "bold")
     */
    setFontWeight( weight )
    {
        this._setValueProperty( "font_weight", weight );
    }


    /**
     * @summary フォントの大きさを設定
     * @param {number} size  フォントの大きさ (Pixels)
     */
    setFontSize( size )
    {
        this._setValueProperty( "font_size", size );
    }


    /**
     * @summary フォントファミリーを設定
     * @param {string} family  フォントファミリー
     * @see https://developer.mozilla.org/ja/docs/Web/CSS/font-family
     */
    setFontFamily( family )
    {
        this._setValueProperty( "font_family", family );
    }


    /**
     * @summary テキストの色を設定
     * @param {mapray.Vector3} color  テキストの色
     */
    setColor( color )
    {
        this._setColorProperty( "color", color );
    }

    /**
     * @summary テキスト縁の色を設定
     * @param {mapray.Vector3} color  縁の色
     */
    setStrokeColor( color )
    {
        this._setColorProperty( "stroke_color", color );
    }

    /**
     * @summary テキスト縁の太さを設定
     * @param {mapray.number} width  縁の線幅
     */
    setStrokeLineWidth( width )
    {
        this._setValueProperty( "stroke_width", width );
    }

    /**
     * @summary テキスト縁を有効にするかどうか
     * @param {boolean} enable  trueなら有効
     */
    setEnableStroke( enable )
    {
        this._setValueProperty( "enable_stroke", enable );
        this._primitive_producer = new PrimitiveProducer( this );
    }

    /**
     * @summary テキスト背景の色を設定
     * @param {mapray.Vector3} color  テキストの色
     */
    setBackgroundColor( color )
    {
        this._setColorProperty( "bg_color", color );
    }

    /**
     * @summary テキスト背景を有効にするかどうか
     * @param {boolean} enable  trueなら有効
     */
    setEnableBackground( enable )
    {
        this._setValueProperty( "enable_bg", enable );
        this._primitive_producer = new PrimitiveProducer( this );
    }

    /**
     * @summary テキストを追加
     * @param {string}          text      テキスト
     * @param {mapray.GeoPoint} position  位置
     * @param {object}          [props]   プロパティ
     * @param {string}         [props.font_style]   フォントスタイル ("normal" | "italic" | "oblique")
     * @param {string}         [props.font_weight]  フォントの太さ   ("normal" | "bold")
     * @param {number}         [props.font_size]    フォントの大きさ (Pixels)
     * @param {string}         [props.font_family]  フォントファミリー
     * @param {mapray.Color}   [props.color]        テキストの色
     * @param {mapray.Color}   [props.stroke_color] テキスト縁の色
     * @param {number}         [props.stroke_width] テキスト縁の幅
     * @param {mapray.Color}   [props.bg_color]     テキスト背景色
     * @param {boolean}        [props.enable_stroke] テキストの縁取りを有効にするか
     * @param {string}         [props.id]            Entryを識別するID
     * @return {mapray.TextEntity.Entry}             追加したEntry
     */
    addText( text, position, props )
    {
        var entry = new Entry( this, text, position, props );
        this._entries.push( entry );
        this._primitive_producer = new PrimitiveProducer( this );
        this._primitive_producer.onAddTextEntry();
        return entry;
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getTextMaterial( render_target )
    {
        var scene = this.scene;
        if ( render_target === RenderTarget.SCENE ) {
            if ( !scene._TextEntity_text_material ) {
                // scene にマテリアルをキャッシュ
                scene._TextEntity_text_material = new TextMaterial( scene.glenv );
            }
            return scene._TextEntity_text_material;
        }
        else if (render_target === RenderTarget.RID) {
            if ( !scene._TextEntity_text_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._TextEntity_text_material_pick = new TextMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._TextEntity_text_material_pick;
        }
    }

    /**
     * @summary テキストだけを描画する専用マテリアルを取得
     * @private
     */
    _getSimpleTextMaterial( render_target )
    {
        var scene = this.scene;
        if ( render_target === RenderTarget.SCENE ) {
            if ( !scene._SimpleTextEntity_text_material ) {
                // scene にマテリアルをキャッシュ
                scene._SimpleTextEntity_text_material = new SimpleTextMaterial( scene.glenv );
            }
            return scene._SimpleTextEntity_text_material;
        }
        else if (render_target === RenderTarget.RID) {
            if ( !scene._SimpleTextEntity_text_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._SimpleTextEntity_text_material_pick = new SimpleTextMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._SimpleTextEntity_text_material_pick;
        }
    }

    /**
     * @private
     */
    _setValueProperty( name, value )
    {
        var props = this._text_parent_props;
        if ( props[name] != value ) {
            props[name] = value;
            if ( this._primitive_producer ) {
                this._primitive_producer.onChangeParentProperty();
            }
        }
    }


    /**
     * @private
     */
    _setColorProperty( name, value )
    {
        var dst = this._text_parent_props[name];
        if ( dst.r != value[0] || dst.g != value[1] || dst.b != value[2] ) {
            Color.setOpacityColor( value, dst );
            if ( this._primitive_producer ) {
              this._primitive_producer.onChangeParentProperty();
            }
        }
    }


    /**
     * @private
     */
    _setupByJson( json )
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

    /**
     * @private
     */
    _enableStroke( )
    {
        return this._text_parent_props["enable_stroke"];
    }

    
    /**
     * @summary IDでEntryを取得
     * @param {string}  id  ID
     * @return {mapray.TextEntity.Entry}  IDが一致するEntry（無ければundefined）
     */
    getEntry( id )
    {
        return this._entries.find((entry) => entry.id === id);
    }
}


// クラス定数の定義
{
    TextEntity.DEFAULT_FONT_SIZE    = 16;
    TextEntity.DEFAULT_FONT_FAMILY  = "sans-serif";
    TextEntity.DEFAULT_COLOR        = [1, 1, 1];
    TextEntity.DEFAULT_STROKE_COLOR = [0.0, 0.0, 0.0];
    TextEntity.DEFAULT_STROKE_WIDTH = 0.48;
    TextEntity.DEFAULT_BG_COLOR     = [0.3, 0.3, 0.3];

    TextEntity.DEFAULT_TEXT_UPPER  = 1.1;
    TextEntity.DEFAULT_TEXT_LOWER  = 0.38;
    TextEntity.SAFETY_PIXEL_MARGIN = 1;
    TextEntity.MAX_IMAGE_WIDTH     = 4096;
}


/**
 * @summary TextEntity の PrimitiveProducer
 *
 * TODO: relative で標高の変化のたびにテクスチャを生成する必要はないので
 *       Layout でのテクスチャの生成とメッシュの生成を分離する
 *
 * @private
 */
class PrimitiveProducer extends Entity.PrimitiveProducer {

    /**
     * @param {mapray.TextEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._glenv = entity.scene.glenv;
        this._dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            enable_bg: false,
            image: null  // テキスト画像
        };

        // プリミティブ
        var material = null, pickMaterial = null;
        if ( this._isSimpleText() ) {
            material = entity._getSimpleTextMaterial( RenderTarget.SCENE );
            pickMaterial = entity._getSimpleTextMaterial( RenderTarget.RID );
        } else {
            material = entity._getTextMaterial( RenderTarget.SCENE );
            pickMaterial = entity._getTextMaterial( RenderTarget.RID );
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


    /**
     * @override
     */
    createRegions()
    {
        const region = new EntityRegion();

        for ( let {position} of this.entity._entries ) {
            region.addPoint( position );
        }

        return [region];
    }


    /**
     * @override
     */
    onChangeElevation( regions )
    {
        this._dirty = true;
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        this._updatePrimitive();
        return stage.getRenderTarget() === RenderTarget.SCENE ? this._primitives : this._pickPrimitives;
    }


    /**
     * @summary 親プロパティが変更されたことを通知
     */
    onChangeParentProperty()
    {
        this._dirty = true;
    }


    /**
     * @summary 子プロパティが変更されたことを通知
     */
    onChangeChildProperty()
    {
        this._dirty = true;
    }


    /**
     * @summary 高度モードが変更されたことを通知
     */
    onChangeAltitudeMode()
    {
        this._dirty = true;
    }


    /**
     * @summary テキストが追加されたことを通知
     */
    onAddTextEntry()
    {
        // 変化した可能性がある
        this.needToCreateRegions();
        this._dirty = true;
    }


    /**
     * @summary プリミティブの更新
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
     * @return {array.<mapray.Prmitive>}  this._primitives
     *
     * @private
     */
    _updatePrimitive()
    {
        if ( !this._dirty ) {
            // 更新する必要はない
            return;
        }
        this._updateProperties();

        if ( this.entity._entries.length == 0 ) {
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
        let entity = this.entity;
        let props  = this._properties;

        props.enable_bg = entity._text_parent_props.enable_bg;
    }


    /**
     * @summary プリミティブの更新
     *
     * @desc
     * 条件:
     *   this.entity._entries.length > 0
     * 入力:
     *   this.entity._entries.length
     * 出力:
     *   this._transform
     *
     * @param {number[]} gocs_array  GOCS 平坦化配列
     *
     * @private
     */
    _updateTransform( gocs_array )
    {
        var num_entries = this.entity._entries.length;
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
     * @summary GOCS 平坦化配列を取得
     *
     * 入力: this.entity._entries
     *
     * @return {number[]}  GOCS 平坦化配列
     * @private
     */
    _createFlatGocsArray()
    {
        const num_points = this.entity._entries.length;
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
        const owner      = this.entity;
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
     *
     * @return {boolean}  シンプルテキストモードならtrue.
     * @private
     */
    _isSimpleText() 
    {
        let entity = this.entity;

        let enable = true;
        // check enable bg color or stroke;
        if ( entity._text_parent_props.enable_bg || entity._text_parent_props.enable_stroke ) {
            enable = false;
        }

        // check enable stroke
        let i = 0;
        while ( enable && entity._entries.length > i ) {
            let entry = entity._entries[i];
            enable = !entry.enable_stroke;
            i++;
        }

        return enable;
    }

}


/**
 * @summary テキスト要素
 * @hideconstructor
 * @memberof mapray.TextEntity
 * @public
 */
class Entry {

    /**
     * @param {mapray.TextEntity} owner                所有者
     * @param {string}            text                 テキスト
     * @param {mapray.GeoPoint}   position             位置
     * @param {object}            [props]              プロパティ
     * @param {string}            [props.font_style]   フォントスタイル ("normal" | "italic" | "oblique")
     * @param {string}            [props.font_weight]  フォントの太さ   ("normal" | "bold")
     * @param {number}            [props.font_size]    フォントの大きさ (Pixels)
     * @param {string}            [props.font_family]  フォントファミリー
     * @param {mapray.Color}      [props.color]        テキストの色
     * @param {mapray.Color}      [props.stroke_color] テキスト縁の色
     * @param {number}            [props.stroke_width] テキスト縁の幅
     * @param {number}            [props.enable_stroke] テキストの縁取りを有効にするか
     * @param {string}            [props.id]            Entryを識別するID
     */
    constructor( owner, text, position, props )
    {
        this._owner    = owner;
        this._text     = text;
        this._position = position.clone();

        // animation.BindingBlock
        this._animation = new EasyBindingBlock();
        
        this._setupAnimationBindingBlock();

        this._props = Object.assign( {}, props );   // props の複製
        this._copyColorProperty( "color" );         // deep copy
        this._copyColorProperty( "stroke_color" );  // deep copy
        this._copyColorProperty( "bg_color" );      // deep copy
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
     * @summary 位置
     * @type {mapray.GeoPoint}
     * @readonly
     * @package
     */
    get position()
    {
        return this._position;
    }

    
    /**
     * @summary ID
     * @type {string}
     * @readonly
     */
    get id()
    {
        return this._props.hasOwnProperty( "id" ) ? this._props.id : "";
    }
    

    /**
     * @summary フォントサイズ (Pixels)
     * @type {number}
     * @readonly
     * @package
     */
    get size()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.font_size || parent.font_size;
    }


    /**
     * @summary テキストの色
     * @type {mapray.Vector3}
     * @readonly
     * @package
     */
    get color()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.color || parent.color;
    }


    /**
     * @summary フォント
     * @type {string}
     * @readonly
     * @package
     * @see https://developer.mozilla.org/ja/docs/Web/CSS/font
     */
    get font()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;

        var   style = props.font_style  || parent.font_style;
        var variant = "normal";
        var  weight = props.font_weight || parent.font_weight;
        var  family = props.font_family || parent.font_family;

        return style + " " + variant + " " + weight + " " + this.size + "px " + family;
    }

    /**
     * @summary テキスト縁の色
     * @type {mapray.Color}
     * @readonly
     * @package
     */
    get stroke_color()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.stroke_color || parent.stroke_color;
    }

    /**
     * @summary 縁の幅 (Pixels)
     * @type {number}
     * @readonly
     * @package
     */
    get stroke_width()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.stroke_width || parent.stroke_width;
    }

    /**
     * @summary 縁を描画するか
     * @type {boolean}
     * @readonly
     * @package
     */
    get enable_stroke()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.enable_stroke || parent.enable_stroke;
    }

    /**
     * @summary 背景色
     * @type {mapray.Color}
     * @readonly
     * @package
     */
    get bg_color()
    {
        var props  = this._props;
        var parent = this._owner._text_parent_props;
        return props.bg_color || parent.bg_color;
    }

    /**
     * @summary 背景描画するか
     * @type {boolean}
     * @readonly
     * @package
     */
    get enable_background()
    {
        // Enable or Disable background can be set by parent.
        var parent = this._owner._text_parent_props;
        return parent.enable_bg;
    }

    
    /**
     * @summary アニメーションパラメータ設定
     *
     * @type {mapray.animation.BindingBlock}
     * @readonly
     */
    get animation() { return this._animation; }
    
    
    /**
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */
    _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const string  = Type.find( "string"  );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [vector3], null, value => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: font_style
        // パラメータ型: string
        //   フォントスタイル
        block.addEntry( "font_style", [string], null, value => {
            this.setFontStyle( value );
        } );
        
        // パラメータ名: font_weight
        // パラメータ型: string
        //   フォントの太さ
        block.addEntry( "font_weight", [string], null, value => {
            this.setFontWeight( value );
        } );
        
        // パラメータ名: font_size
        // パラメータ型: number
        //   フォントの大きさ
        block.addEntry( "font_size", [number], null, value => {
            this.setFontSize( value );
        } );
        
        // パラメータ名: color
        // パラメータ型: vector3
        //   テキストの色
        block.addEntry( "color", [vector3], null, value => {
            this.setColor( value );
        } );
        
        // パラメータ名: stroke_color
        // パラメータ型: vector3
        //   縁の色
        block.addEntry( "stroke_color", [vector3], null, value => {
            this.setStrokeColor( value );
        } );
        
        // パラメータ名: stroke_width
        // パラメータ型: number
        //   縁の線幅
        block.addEntry( "stroke_width", [number], null, value => {
            this.setStrokeLineWidth( value );
        } );

        // パラメータ名: text
        // パラメータ型: string
        //   テキスト
        block.addEntry( "text", [string], null, value => {
            this.setText( value );
        } );        
    }


    /**
     * @summary テキスト原点位置を設定
     *
     * @param {mapray.GeoPoint} position  テキスト原点の位置
     */
    setPosition( position )
    {
        if ( this._position.longitude !== position.longitude ||
             this._position.latitude  !== position.latitude  ||
             this._position.altitude  !== position.altitude ) {
            // 位置が変更された
            this._position.assign( position );
            this._owner.getPrimitiveProducer().onChangeChildProperty();
        }
    }


    /**
     * @summary フォントスタイルを設定
     * @param {string} style  フォントスタイル ("normal" | "italic" | "oblique")
     */
    setFontStyle( style )
    {
        this._setValueProperty( "font_style", style );
    }


    /**
     * @summary フォントの太さを設定
     * @param {string} weight  フォントの太さ ("normal" | "bold")
     */
    setFontWeight( weight )
    {
        this._setValueProperty( "font_weight", weight );
    }


    /**
     * @summary フォントの大きさを設定
     * @param {number} size  フォントの大きさ (Pixels)
     */
    setFontSize( size )
    {
        this._setValueProperty( "font_size", size );
    }


    /**
     * @summary テキストの色を設定
     * @param {mapray.Vector3} color  テキストの色
     */
    setColor( color )
    {
        this._setColorProperty( "color", color );
    }


    /**
     * @summary テキスト縁の色を設定
     * @param {mapray.Vector3} color  縁の色
     */
    setStrokeColor( color )
    {
        this._setColorProperty( "stroke_color", color );
    }


    /**
     * @summary テキスト縁の太さを設定
     * @param {mapray.number} width  縁の線幅
     */
    setStrokeLineWidth( width )
    {
        this._setValueProperty( "stroke_width", width );
    }


    /**
     * @summary テキスト縁を有効にするかどうか
     * @param {boolean} enable  trueなら有効
     */
    setEnableStroke( enable )
    {
        this._setValueProperty( "enable_stroke", enable );
        this._owner._primitive_producer = new PrimitiveProducer( this._owner );
    }


    /**
     * @summary テキストを設定
     * @param {string} text  テキスト
     */
    setText( text )
    {
        if ( this._text !== text ) {
            this._text = text;
            this._owner.getPrimitiveProducer().onChangeChildProperty();
        }
    }
    

    /**
     * @private
     */
    _copyColorProperty( name )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            props[name] = Color.generateOpacityColor( props[name] );
        }
    }


    /**
     * @private
     */
    _setValueProperty( name, value )
    {
        var props = this._props;
        if ( props[name] != value ) {
            props[name] = value;
            this._owner.getPrimitiveProducer().onChangeChildProperty();
        }
    }


    /**
     * @private
     */
    _setColorProperty( name, value )
    {
        var dst = this._props[name];
        if ( dst )
        {
            if ( dst.r != value[0] || dst.g != value[1] || dst.b != value[2] ) {
                Color.setOpacityColor( value, dst );
                this._owner.getPrimitiveProducer().onChangeChildProperty();
            }
        }
        else
        {
            this._props[name] = Color.generateOpacityColor( value );
            this._owner.getPrimitiveProducer().onChangeChildProperty();
        }
    }
}

TextEntity.Entry = Entry;


/**
 * @summary テキスト画像を Canvas 上にレイアウト
 *
 * @memberof mapray.TextEntity
 * @private
 */
class Layout {

    /**
     * @desc
     * 入力:
     *   owner._glenv
     *   owner.entity._entries
     *   owner._transform
     *
     * @param {PrimitiveProducer} owner       所有者
     * @param {number[]}          gocs_array  GOCS 平坦化配列
     */
    constructor( owner, gocs_array )
    {
        this._owner = owner;
        this._items = this._createItemList();
        this._is_valid = true;

        var row_layouts = this._createRowLayouts();
        if ( row_layouts.length == 0 ) {
            // 有効なテキストが1つも無い
            this._is_valid = false;
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
     * @summary 有効なオブジェクトか？
     * @desc
     * <p>無効のとき、他のメソッドは呼び出せない。</p>
     * @return {boolean}  有効のとき true, 無効のとき false
     */
    isValid()
    {
        return this._is_valid;
    }


    /**
     * @summary テクスチャ
     * @type {mapray.Texture}
     * @readonly
     */
    get texture()
    {
        return this._texture;
    }


    /**
     * @summary 頂点配列
     * @desc
     * 条件:
     *   this._entries.length > 0
     * 入力:
     *   this._entries
     *   this._transform
     * @type {Float32Array}
     * @readonly
     */
    get vertices()
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
     * @summary レイアウトアイテムのリストを生成
     * @return {array.<mapray.TextEntity.LItem>}
     * @private
     */
    _createItemList()
    {
        var context = Dom.createCanvasContext( 1, 1 );

        var items = [];
        for ( let entry of this._owner.entity._entries ) {
            items.push( new LItem( this, entry, context ) );
        }

        return items;
    }


    /**
     * @summary RowLayout のリストを生成
     * @return {array.<mapray.TextEntity.RowLayout>}
     * @private
     */
    _createRowLayouts()
    {
        // アイテムリストの複製
        var items = [].concat( this._items );

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
     * @summary テクスチャを生成
     * @param  {number} width    横幅
     * @param  {number} height   高さ
     * @return {mapray.Texture}  テキストテクスチャ
     * @private
     */
    _createTexture( width, height )
    {
        var context = Dom.createCanvasContext( width, height );

        context.textAlign    = "left";
        context.textBaseline = "alphabetic";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            if ( item._entry.enable_background ) {
                item.drawRect( context );
            }
            if ( item._entry.enable_stroke ) {
                item.drawStrokeText( context );
            }
            item.drawText( context );
        }

        var glenv = this._owner._glenv;
        var  opts = {
            usage: Texture.Usage.TEXT
        };
        return new Texture( glenv, context.canvas, opts );
    }


    /**
     * @summary 頂点配列を生成
     *
     * @param  {number}   width       横幅
     * @param  {number}   height      高さ
     * @param  {number[]} gocs_array  GOCS 平坦化配列
     * @return {array.<number>}  頂点配列 [左下0, 右下0, 左上0, 右上0, ...]
     *
     * @private
     */
    _createVertices( width, height, gocs_array )
    {
        var vertices = [];

        // テキスト集合の原点 (GOCS)
        var transform = this._owner._transform;
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
     * @summary 単純テキスト用テクスチャを生成
     * @param  {number} width    横幅
     * @param  {number} height   高さ
     * @return {mapray.Texture}  テキストテクスチャ
     * @private
     */
    _createTextureForSimple( width, height )
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

        var glenv = this._owner._glenv;
        var  opts = {
            usage: Texture.Usage.SIMPLETEXT
        };
        return new Texture( glenv, context.canvas, opts );
    }


    /**
     * @summary 単純テキスト用頂点配列を生成
     *
     * @param  {number}   width       横幅
     * @param  {number}   height      高さ
     * @param  {number[]} gocs_array  GOCS 平坦化配列
     * @return {array.<number>}  頂点配列 [左下0, 右下0, 左上0, 右上0, ...]
     *
     * @private
     */
    _createVerticesForSimple( width, height, gocs_array )
    {
        var vertices = [];

        // テキスト集合の原点 (GOCS)
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
     * @summary インデックス配列を生成
     * @return {array.<number>}  インデックス配列 []
     * @private
     */
    _createIndices()
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
    _setupLocation( row_layouts )
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
     * @summary シンプルテキストモードかどうか
     * @param  {mapray.TextEntity.LItem} item
     * @return {boolean}                 シンプルテキストモードならtrue
     * @private
     */
    _isSimpleText( item ) 
    {
        if ( item._entry.enable_background || item._entry.enable_stroke ) {
            return false;
        }
        return true;
    } 

    /**
     * @summary シンプルテキストモードかどうか
     * @param  {array.<mapray.TextEntity.LItem>} items
     * @return {boolean}                 シンプルテキストモードならtrue
     * @private
     */
    _isSimpleTextWithAllItems( items ) 
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

    /**
     * @param {mapray.TextEntity.Layout} layout   所有者
     * @param {mapray.TextEntity.Entry}  entry    TextEntity エントリ
     * @param {CanvasRenderingContext2D} context  測定用コンテキスト
     */
    constructor( layout, entry, context )
    {
        this._entry = entry;

        // テキストの基点
        this._pos_x = 0;  // 左端
        this._pos_y = 0;  // ベースライン位置

        // テキストの横幅
        context.font = entry.font;
        this._width  = context.measureText( entry.text ).width;

        // テキストの上下範囲
        this._upper = entry.size * TextEntity.DEFAULT_TEXT_UPPER;
        this._lower = entry.size * TextEntity.DEFAULT_TEXT_LOWER;

        this._is_canceled = false;
    }


    /**
     * @type {mapray.TextEntity.Entry}
     * @readonly
     */
    get entry()
    {
        return this._entry;
    }


    /**
     * @type {number}
     * @readonly
     */
    get pos_x()
    {
        return this._pos_x;
    }


    /**
     * @type {number}
     * @readonly
     */
    get pos_y()
    {
        return this._pos_y;
    }


    /**
     * @type {number}
     * @readonly
     */
    get width()
    {
        return this._width;
    }


    /**
     * @type {number}
     * @readonly
     */
    get upper()
    {
        return this._upper;
    }


    /**
     * @type {number}
     * @readonly
     */
    get lower()
    {
        return this._lower;
    }


    /**
     * キャンバス上でのテキストの横画素数
     * @type {number}
     * @readonly
     */
    get width_pixel()
    {
        return Math.ceil( this._width );
    }


    /**
     * キャンバス上でのテキストの縦画素数
     * @type {number}
     * @readonly
     */
    get height_pixel()
    {
        return Math.ceil( this._upper ) + Math.ceil( this._lower );
    }


    /**
     * 取り消し状態か？
     * @type {boolean}
     * @readonly
     */
    get is_canceled()
    {
        return this._is_canceled;
    }


    /**
     * @summary 取り消し状態に移行
     */
    cancel()
    {
        this._is_canceled = true;
    }


    /**
     * @summary 配置を決定
     * @param {number} x  テキスト矩形左辺の X 座標 (キャンバス座標系)
     * @param {number} y  テキスト矩形上辺の Y 座標 (キャンバス座標系)
     */
    locate( x, y )
    {
        this._pos_x = x;
        this._pos_y = y + Math.ceil( this._upper );
    }


    /**
     * @summary テキストだけを描画 (stokeやfillRectとは組み合わせ不可)
     * @desc
     * <p>context は以下のように設定していること。</p>
     * <pre>
     *   context.textAlign    = "left";
     *   context.textBaseline = "alphabetic";
     *   context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";
     * </pre>
     * @param {CanvasRenderingContext2D} context  描画先コンテキスト
     */
    drawTextOnly( context )
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
    drawText( context )
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
    drawStrokeText( context )
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
    drawRect( context )
    {
        var entry = this._entry;

        context.fillStyle = entry.bg_color.toRGBString();
        context.fillRect( this._pos_x - TextEntity.SAFETY_PIXEL_MARGIN, this._pos_y - this._upper - TextEntity.SAFETY_PIXEL_MARGIN, this.width_pixel + TextEntity.SAFETY_PIXEL_MARGIN, this.height_pixel + TextEntity.SAFETY_PIXEL_MARGIN );
    }
}


/**
 * @summary 水平レイアウト
 * @memberof mapray.TextEntity
 * @private
 */
class RowLayout {

    /**
     * @desc
     * <p>レイアウトされた、またはレイアウトに失敗したアイテムは src_items から削除される。</p>
     * <p>レイアウトに失敗したアイテムは取り消し (is_canceled) になる。</p>
     * @param {array.<mapray.TextEntity.LItem>} src_items  アイテムリスト
     */
    constructor( src_items )
    {
        var width_assumed_total = 0;
        var height_pixel_max    = 0;
        var row_items           = [];

        width_assumed_total += TextEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        while ( src_items.length > 0 ) {
            var item          = src_items.shift();
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
     * @summary 有効なオブジェクトか？
     * @desc
     * <p>無効のとき、他のメソッドは呼び出せない。</p>
     * @return {boolean}  有効のとき true, 無効のとき false
     */
    isValid()
    {
        return this._items.length > 0;
    }


    /**
     * 
     * @type {array.<mapray.TextEntity.LItem>}
     * @readonly
     */
    get items()
    {
        return this._items;
    }


    /**
     * キャンバス上での行の横占有画素数
     * @type {number}
     * @readonly
     */
    get width_assumed()
    {
        return this._width_assumed;
    }


    /**
     * キャンバス上での行の縦画素数
     * @type {number}
     * @readonly
     */
    get height_pixel()
    {
        return this._height_pixel;
    }


    /**
     * @summary レイアウトの配置を決定
     * @param {number} y  テキスト矩形上辺の Y 座標 (キャンバス座標系)
     */
    locate( y )
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


export default TextEntity;
