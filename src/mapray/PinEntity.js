import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Texture from "./Texture";
import PinMaterial from "./PinMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import IconLoader, { URLTemplateIconLoader, TextIconLoader } from "./IconLoader";
import Dom from "./util/Dom";

/**
 * @summary ピンエンティティ
 * @memberof mapray
 * @extends mapray.Entity
 *
 * @example
 * var pin = new mapray.PinEntity(viewer.scene);
 * pin.addTextPin( "32", new mapray.GeoPoint(139.768, 35.635) );
 * pin.addTextPin( "A", new mapray.GeoPoint(139.768, 35.636), { fg_color: [0.0, 0.0, 1.0], bg_color: [1.0, 0.0, 0.0] } );
 * pin.addTextPin( "始", new mapray.GeoPoint(139.768, 35.637), { size: 50 } );
 * pin.addTextPin( "終", new mapray.GeoPoint(139.768, 35.639), { size: 50, font_family: "Georgia" } );
 * pin.addPin( new mapray.GeoPoint(139.766, 35.6361) );
 * pin.addMakiIconPin( "ferry-15", new mapray.GeoPoint(139.764, 35.6361), { size: 150, fg_color: [0.2, 0.2, 0.2], bg_color: [1.0, 1.0, 1.0] } );
 * pin.addMakiIconPin( "car-15",   new mapray.GeoPoint(139.762, 35.6361), { size: 60, fg_color: [1.0, 1.0, 1.0], bg_color: [0.2, 0.2, 0.2] } );
 * pin.addMakiIconPin( "bus-15",   new mapray.GeoPoint(139.760, 35.6361), { size: 40, fg_color: [1.0, 0.3, 0.1], bg_color: [0.1, 0.3, 1.0] } );
 * pin.addMakiIconPin( "bus-15",   new mapray.GeoPoint(139.759, 35.6361) );
 * pin.addMakiIconPin( "car-15",   new mapray.GeoPoint(139.758, 35.6361) );
 * viewer.scene.addEntity(pin);
 *
 */
class PinEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // 要素管理
        this._entries = [];

        // 親プロパティ
        this._parent_props = {
            fg_color: null,
            bg_color: null,
            size: null,
            font_family: null,
        };

        // Entity.PrimitiveProducer インスタンス
        this._primitive_producer = new PrimitiveProducer( this );

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
        this._primitive_producer.onChangeAltitudeMode();
    }


    /**
     * @summary アイコンのピクセルサイズを指定
     * @param {mapray.Vector3} color  アイコンのピクセルサイズ
     */
    setSize( size )
    {
        this._setVector2Property( "size", size );
    }


    /**
     * @summary アイコンの色を設定
     * @param {mapray.Vector3} color  アイコンの色
     */
    setFGColor( color )
    {
        this._setVector3Property( "fg_color", color );
    }


    /**
     * @summary アイコン背景の色を設定
     * @param {mapray.Vector3} color  アイコン背景の色
     */
    setBGColor( color )
    {
        this._setVector3Property( "bg_color", color );
    }


    /**
     * @summary テキストアイコンのフォントを設定
     * @param {string} font_family  フォントファミリー
     */
    setBGColor( font_family )
    {
        this._setValueProperty( "font_family", font_family );
    }


    /**
     * Add Pin
     * @param {mapray.GeoPoint} position         位置
     * @param {object}          [props]          プロパティ
     * @param {float}           [props.size]     アイコンサイズ
     * @param {mapray.Vector3}  [props.fg_color] アイコン色
     * @param {mapray.Vector3}  [props.bg_color] 背景色
     */
    addPin( position, props )
    {
        this.addTextPin( "", position, props );
    }

    /**
     * Add Maki Icon Pin
     * @param {string}          id      　       ID of Maki Icon
     * @param {mapray.GeoPoint} position         位置
     * @param {object}          [props]          プロパティ
     * @param {float}           [props.size]     アイコンサイズ
     * @param {mapray.Vector3}  [props.fg_color] アイコン色
     * @param {mapray.Vector3}  [props.bg_color] 背景色
     */
    addMakiIconPin( id, position, props )
    {
        this._entries.push( new MakiIconPinEntry( this, id, position, props ) );
        this._primitive_producer.onAddEntry();
    }

    /**
     * Add Text Pin
     * @param {string}          text    　         ピンに表示されるテキスト
     * @param {mapray.GeoPoint} position           位置
     * @param {object}          [props]            プロパティ
     * @param {float}           [props.size]       アイコンサイズ
     * @param {mapray.Vector3}  [props.fg_color]   アイコン色
     * @param {mapray.Vector3}  [props.bg_color]   背景色
     * @param {string}          [props.font_family] フォントファミリー
     */
    addTextPin( text, position, props )
    {
        this._entries.push( new TextPinEntry( this, text, position, props ) );
        this._primitive_producer.onAddEntry();
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getMaterial()
    {
        var scene = this.scene;
        if ( !scene._PinEntity_pin_material ) {
            // scene にマテリアルをキャッシュ
            scene._PinEntity_pin_material = new PinMaterial( scene.glenv );
        }
        return scene._PinEntity_pin_material;
    }


    /**
     * @private
     */
    _setValueProperty( name, value )
    {
        var props = this._parent_props;
        if ( props[name] != value ) {
            props[name] = value;
            this._primitive_producer.onChangeParentProperty();
        }
    }


    /**
     * @private
     */
    _setVector3Property( name, value )
    {
        var dst = this._parent_props[name];
        if ( !dst ) {
            dst = this._parent_props[name] = GeoMath.createVector2f( value );
        }
        else if ( dst[0] !== value[0] || dst[1] !== value[1] || dst[2] !== value[2] ) {
            GeoMath.copyVector3( value, dst );
            this._primitive_producer.onChangeParentProperty();
        }
    }


    /**
     * @private
     */
    _setVector2Property( name, value )
    {
        var dst = this._parent_props[name];
        if ( !dst ) {
            dst = this._parent_props[name] = GeoMath.createVector2f( value );
        }
        else if ( dst[0] !== value[0] || dst[1] !== value[1] ) {
            GeoMath.copyVector3( value, dst );
            this._primitive_producer.onChangeParentProperty();
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
            this.addPin( position, entry );
        }
        
        if ( json.size )     this.setSize( json.size );
        if ( json.fg_color ) this.setFGColor( json.fg_color );
        if ( json.bg_color ) this.setBGColor( json.bg_color );
        if ( json.font_family ) this.setBGColor( json.font_family );
    }

}


// クラス定数の定義
{
    PinEntity.SAFETY_PIXEL_MARGIN = 1;
    PinEntity.MAX_IMAGE_WIDTH     = 4096;
    PinEntity.CIRCLE_SEP_LENGTH   = 32;
    PinEntity.DEFAULT_SIZE        = GeoMath.createVector2f( [30, 30] );
    PinEntity.DEFAULT_FONT_FAMILY = "sans-serif";
    PinEntity.DEFAULT_FG_COLOR    = GeoMath.createVector3f( [1.0, 1.0, 1.0] );
    PinEntity.DEFAULT_BG_COLOR    = GeoMath.createVector3f( [0.35, 0.61, 0.81] );

    PinEntity.SAFETY_PIXEL_MARGIN = 1;
    PinEntity.MAX_IMAGE_WIDTH     = 4096;
}



/**
 * @summary PrimitiveProducer
 *
 * TODO: relative で標高の変化のたびにテクスチャを生成する必要はないので
 *       Layout でのテクスチャの生成とメッシュの生成を分離する
 *
 * @private
 */
class PrimitiveProducer extends Entity.PrimitiveProducer {

    /**
     * @param {mapray.PinEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._glenv = entity.scene.glenv;
        this._dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            image: null,       // 画像
            image_mask: null,  // マスク画像
        };

        // プリミティブ
        var primitive = new Primitive( this._glenv, null, entity._getMaterial(), this._transform );
        primitive.properties = this._properties;
        this._primitive = primitive;

        // プリミティブ配列
        this._primitives = [];
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
        const owner = this.entity;
        if (owner.altitude_mode === AltitudeMode.RELATIVE || owner.altitude_mode === AltitudeMode.CLAMP) {
            this._dirty = true;
        }
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        return this._updatePrimitive();
    }


    /**
     * @summary 親プロパティが変更されたことを通知
     */
    onChangeParentProperty()
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
     * @summary エントリが追加されたことを通知
     */
    onAddEntry()
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
            return this._primitives;
        }

        if ( this.entity._entries.length == 0 ) {
            this._primitives = [];
            this._dirty = false;
            return this._primitives;
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

        if ( properties.image_mask ) {
            properties.image_mask.dispose();
        }
        properties.image_mask = layout.texture_mask;

        // メッシュ生成
        var mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
                { name: "a_texmaskcoord", size: 2 },
                { name: "a_fg_color", size: 3 },
                { name: "a_bg_color", size: 3 },
            ],
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

        // 更新に成功
        this._primitives = [primitive];
        this._dirty = false;
        return this._primitives;
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
                // flat_array[] の高度要素に絶対高度を設定
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

}



/**
 * @summary ピン要素
 * @memberof mapray.PinEntity
 * @private
 */
class AbstractPinEntry {

    constructor( owner, position, props ) {
        this._owner = owner;
        this._position = position.clone();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector3f( "fg_color" );  // deep copy
        this._copyPropertyVector3f( "bg_color" );  // deep copy
        this._copyPropertyVector2f( "size" );      // deep copy
    }

    _loadIcon() {
        throw new Error("loadIcon() is not implemented: " + this.constructor.name);
    }

    /**
     * @summary 位置
     * @type {mapray.GeoPoint}
     * @readonly
     */
    get position()
    {
        return this._position;
    }

    /**
     * @summary アイコンサイズ (Pixels)
     * @type {mapray.Vector2}
     * @readonly
     */
    get size()
    {
        const props = this._props;
        const parent = this._owner._parent_props;
        return (
            props.size || parent.size ||
            (
                this.icon ? GeoMath.createVector2f( [ this.icon.width, this.icon.height ] ):
                PinEntity.DEFAULT_SIZE
            )
        );
    }

    /**
     * @summary アイコン色
     * @type {mapray.Vector3}
     * @readonly
     */
    get fg_color()
    {
        const props  = this._props;
        const parent = this._owner._parent_props;
        return props.fg_color || parent.fg_color || PinEntity.DEFAULT_FG_COLOR;
    }

    /**
     * @summary アイコン背景色
     * @type {mapray.Vector3}
     * @readonly
     */
    get bg_color()
    {
        const props  = this._props;
        const parent = this._owner._parent_props;
        return props.bg_color || parent.bg_color || PinEntity.DEFAULT_BG_COLOR;
    }


    /**
     * @private
     */
    _copyPropertyVector3f( name )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            props[name] = GeoMath.createVector3f( props[name] );
        }
    }


    /**
     * @private
     */
    _copyPropertyVector2f( name )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            if ( typeof( props[name] ) === 'number' ) {
                props[name] = GeoMath.createVector2f( [ props[name], props[name] ] );
            }
            else {
                props[name] = GeoMath.createVector2f( props[name] );
            }
        }
    }

    isLoaded() {
        return this._icon.isLoaded();
    }

    get icon() {
        return this._icon;
    }

    draw( context, x, y, width, height ) {
        this._icon.draw( context, x, y, width, height );
    }
}



/**
 * @summary MakiIcon要素
 * @memberof mapray.PinEntity
 * @private
 */
class MakiIconPinEntry extends AbstractPinEntry {

    /**
     * @param {mapray.PinEntity}  owner                所有者
     * @param {string}            id                   MakiアイコンのID
     * @param {mapray.GeoPoint}   position             位置
     * @param {object}            [props]              プロパティ
     * @param {float} [props.size]                     アイコンサイズ
     * @param {mapray.Vector3} [props.fg_color]        アイコン色
     * @param {mapray.Vector3} [props.bg_color]        背景色
     */
    constructor( owner, id, position, props )
    {
        super( owner, position, props );
        this._id = id;
        this._icon = MakiIconPinEntry.makiIconLoader.load( id );
        this._icon.onEnd(item => {
                this._owner.getPrimitiveProducer()._dirty = true;
        });
    }
}


{
    MakiIconPinEntry.makiIconLoader = new URLTemplateIconLoader( "https://resource.mapray.com/styles/v1/icons/maki/", ".svg" );
}




/**
 * @summary MakiIcon要素
 * @memberof mapray.PinEntity
 * @private
 */
class TextPinEntry extends AbstractPinEntry {

    /**
     * @param {mapray.PinEntity}  owner                所有者
     * @param {string}            text                 テキスト
     * @param {mapray.GeoPoint}   position             位置
     * @param {object}            [props]              プロパティ
     * @param {float}             [props.size]         アイコンピクセルサイズ
     * @param {mapray.Vector3}    [props.fg_color]     アイコン色
     * @param {mapray.Vector3}    [props.bg_color]     背景色
     * @param {string}            [props.font_family]  フォントファミリー
     */
    constructor( owner, text, position, props )
    {
        super( owner, position, props );
        this._text = text;

        this._icon = TextPinEntry.textIconLoader.load( {
                text:  this._text,
                props: {
                    size: this.size,
                    font_family: this.font_family,
                }
        } );
        this._icon.onEnd(item => {
                this._owner.getPrimitiveProducer()._dirty = true;
        });
    }


    /**
     * @summary フォントファミリー
     * @type {string}
     * @readonly
     */
    get font_family()
    {
        const props  = this._props;
        const parent = this._owner._parent_props;
        return props.font_family || parent.font_family || PinEntity.DEFAULT_FONT_FAMILY;
    }
}


{
    TextPinEntry.textIconLoader = new TextIconLoader();
}




/**
 * @summary 要素を Canvas 上にレイアウト
 *
 * @memberof mapray.PinEntity
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

        this._texture  = this._createTexture( size.width, size.height );
        this._texture_mask = this._createTextureMask();
        this._vertices = this._createVertices( size.width, size.height, gocs_array );
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
     * @summary テクスチャマスク
     * @type {mapray.Texture}
     * @readonly
     */
    get texture_mask()
    {
        return this._texture_mask;
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
     * @return {array.<mapray.PinEntity.LItem>}
     * @private
     */
    _createItemList()
    {
        const map = new Map();

        const items = [];
        let counter = 0;
        for ( let entry of this._owner.entity._entries ) {
            if ( entry.isLoaded() ) {
                let item = map.get( entry.icon );
                if ( !item ) {
                    map.set( entry.icon, item = new LItem( this ) );
                    items.push( item );
                }
                item.add( counter++, entry );
            }
        }

        return items;
    }

    /**
     * @summary RowLayout のリストを生成
     * @return {array.<mapray.PinEntity.RowLayout>}
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

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            item.draw( context );
        }

        var glenv = this._owner._glenv;
        var opts = {
            usage: Texture.Usage.ICON
        };
        return new Texture( glenv, context.canvas, opts );
    }

    _createTextureMask()
    {
        var context = Dom.createCanvasContext( 3, 3 );
        context.fillRect( 1, 1, 1, 1 );
        var glenv = this._owner._glenv;
        var opts = {
            usage: Texture.Usage.ICON,
            mag_filter: glenv.context.NEAREST
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

        /*
             |<size.x->|               
             |         |               
             |    |<--rx--->|          
            ___-------___     ----     
           /             \      ^      
         /                 \    ry     
        |                   |   |  ----
        |                   |   v    ^ 
        |         c         | ----  size.y
        |                   |   ^    V 
        |                   |   |  ----
         \                 /    |      
          '----_0___3_----'     |      
                |   |           |      
                |   |           h      
                |   |           |      
                |   |           |      
                |   |           |      
                |   |           v      
                1---2 ------------     
                                       
               >| w |<                 
        */

        var xn = 1 / width;
        var yn = 1 / height;

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;

            for ( var ie = 0; ie < item.entries.length; ie++ ) {
                var eitem = item.entries[ie];
                var entry = eitem.entry;
                var size = entry.size;
                var rx = size[0] * 1.5 / 2;
                var ry = size[1] * 1.5 / 2;
                var h = ry * 2;
                var w = Math.max(2, rx / 10);

                // Relativize based on (xo, yo, zo)
                var ibase = eitem.index * 3;
                var xm = gocs_array[ibase]     - xo;
                var ym = gocs_array[ibase + 1] - yo;
                var zm = gocs_array[ibase + 2] - zo;

                var fg_color = entry.fg_color;
                var bg_color = entry.bg_color;

                // Image dimensions (Image Coordinate)
                var xc = item.pos_x;
                var yc = item.pos_y;
                var xsize = item.width;
                var ysize = item.height;

                var vertices_push_texture = ( px, py ) => {
                    vertices.push( (xc + xsize * px) * xn, 1 - (yc + ysize * py) * yn );
                };

                // p0
                vertices.push( xm, ym, zm );                            // a_position
                vertices.push( -w / 2, h - ry );                        // a_offset
                vertices_push_texture( 0.5 - (w/2/rx), 1.5/2 + 0.5 );   // a_texcoord
                vertices.push( -0.25 + 0.5, -0.25 + 0.5 );              // a_texmaskcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p1
                vertices.push( xm, ym, zm );                            // a_position
                vertices.push( -w / 2, 0 );                             // a_offset
                vertices_push_texture( 0.5 - (w/2/rx), 1.5/2 + 0.5 );   // a_texcoord
                vertices.push( -0.25 + 0.5, -0.25 + 0.5 );              // a_texmaskcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p2
                vertices.push( xm, ym, zm );                            // a_position
                vertices.push( w / 2, 0 );                              // a_offset
                vertices_push_texture( 0.5 + (w/2/rx), 1.5/2 + 0.5 );   // a_texcoord
                vertices.push( -0.25 + 0.5, -0.25 + 0.5 );              // a_texmaskcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p3
                vertices.push( xm, ym, zm );                            // a_position
                vertices.push( w / 2, h - ry );                         // a_offset
                vertices_push_texture( 0.5 + (w/2/rx), 1.5/2 + 0.5 );   // a_texcoord
                vertices.push( -0.25 + 0.5, -0.25 + 0.5 );              // a_texmaskcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // c
                vertices.push( xm, ym, zm );                            // a_position
                vertices.push( 0, h );                                  // a_offset
                vertices_push_texture( 0.5, 0.5 );                      // a_texcoord
                vertices.push( 0.5, 0.5 );                              // a_texmaskcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                for ( var k = 1; k < PinEntity.CIRCLE_SEP_LENGTH; k++ ) {
                    var th = (k / PinEntity.CIRCLE_SEP_LENGTH * 2 - 0.5) * Math.PI;
                    var cos_th = Math.cos(th);
                    var sin_th = Math.sin(th);
                    vertices.push( xm, ym, zm );                                              // a_position
                    vertices.push( rx * cos_th, ry * sin_th + h );                            // a_offset
                    vertices_push_texture( 1.5 * cos_th / 2 + 0.5, -1.5 * sin_th / 2 + 0.5 ); // a_texcoord
                    vertices.push( cos_th * 0.25 + 0.5 , sin_th * 0.25 + 0.5 );               // a_texmaskcoord
                    vertices.push( ...fg_color );
                    vertices.push( ...bg_color );
                }
            }
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

            for ( var ie = 0; ie < item.entries.length; ie++ ) {
                var eitem = item.entries[ie];
                var base = ( 4 + 1 + PinEntity.CIRCLE_SEP_LENGTH - 1 ) * eitem.index;

                var p = base;
                var p0 = p;
                var p3 = p + 3;
                indices.push( p, p+1, p+2 );
                indices.push( p, p+2, p+3 );
                p += 4;

                var centerPos = p++;
                indices.push( centerPos, p0, p3 );
                indices.push( centerPos, p3, p );
                for ( var j = 1; j < PinEntity.CIRCLE_SEP_LENGTH - 1; j++ ) {
                    indices.push( centerPos, p++, p );
                }
                indices.push( centerPos, p++, p0 );
            }
        }

        return indices;
    }


    /**
     * @summary アイテムの配置を設定
     * @param  {array.<mapray.PinEntity.RowLayout>} row_layouts
     * @return {object}                              キャンバスサイズ
     * @private
     */
    _setupLocation( row_layouts )
    {
        var width  = 0;
        var height = 0;

        height += PinEntity.SAFETY_PIXEL_MARGIN;

        for ( var i = 0; i < row_layouts.length; ++i ) {
            var row_layout = row_layouts[i];
            row_layout.locate( height );
            width   = Math.max( row_layout.width_assumed, width );
            height += row_layout.height_pixel + PinEntity.SAFETY_PIXEL_MARGIN;
        }

        return {
            width:  width,
            height: height
        };
    }

}



/**
 * @summary レイアウト対象
 * @memberof mapray.PinEntity
 * @private
 */
class LItem {

    /**
     * @param {mapray.PinEntity.Layout} layout   所有者
     * @param {mapray.PinEntity.Entry}  entry    PinEntityのエントリ
     */
    constructor( layout )
    {
        this.entries = [];

        // テキストの基点
        this._pos_x = 0;  // 左端
        this._pos_y = 0;  // ベースライン位置

        this._height = this._width = null;

        this._is_canceled = false;
    }

    add( index, entry ) {
        var size = entry.size;
        if ( this._width === null || this._width < size[0] ) this._width = size[0];
        if ( this._height === null || this._height < size[1] ) this._height = size[1];
        this.entries.push( { index, entry } );
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

    get height()
    {
        return this._height;
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
        return Math.ceil( this._height );
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
        this._pos_y = y;
    }

    draw( context ) {

        this.entries[0].entry.draw( context, this._pos_x, this.pos_y, this.width, this.height );

        var RENDER_BOUNDS = false;
        if ( RENDER_BOUNDS ) {
            context.beginPath();
            context.moveTo( this._pos_x             , this._pos_y );
            context.lineTo( this._pos_x + this.width, this._pos_y );
            context.lineTo( this._pos_x + this.width, this._pos_y + this.height );
            context.lineTo( this._pos_x             , this._pos_y + this.height );
            context.closePath();
            context.stroke();
        }
    }
}



/**
 * @summary 水平レイアウト
 * @memberof mapray.PinEntity
 * @private
 */
class RowLayout {

    /**
     * @desc
     * <p>レイアウトされた、またはレイアウトに失敗したアイテムは src_items から削除される。</p>
     * <p>レイアウトに失敗したアイテムは取り消し (is_canceled) になる。</p>
     * @param {array.<mapray.PinEntity.LItem>} src_items  アイテムリスト
     */
    constructor( src_items )
    {
        var width_assumed_total = 0;
        var height_pixel_max    = 0;
        var row_items           = [];

        width_assumed_total += PinEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        while ( src_items.length > 0 ) {
            var item          = src_items.shift();
            var width_assumed = item.width_pixel + PinEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン

            if ( width_assumed_total + width_assumed <= PinEntity.MAX_IMAGE_WIDTH ) {
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
     * @type {array.<mapray.PinEntity.LItem>}
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

        x += PinEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.locate( x, y );
            x += item.width_pixel + PinEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン
        }
    }

}



export default PinEntity;
