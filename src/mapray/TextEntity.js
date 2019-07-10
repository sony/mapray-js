import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Texture from "./Texture";
import TextMaterial from "./TextMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";


/**
 * @summary テキストエンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class TextEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // テキスト管理
        this._entries = [];
        this._dirty   = true;

        // テキストの親プロパティ
        this._text_parent_props = {
            font_style:  "normal",
            font_weight: "normal",
            font_size:   TextEntity.DEFAULT_FONT_SIZE,
            font_family: TextEntity.DEFAULT_FONT_FAMILY,
            color: GeoMath.createVector3f( TextEntity.DEFAULT_COLOR )
        };

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            image: null  // テキスト画像
        };

        // プリミティブ
        var primitive = new Primitive( scene.glenv, null, this._getTextMaterial(), this._transform );
        primitive.properties = this._properties;
        this._primitive = primitive;

        // プリミティブ配列
        this._primitives = [];

        // 境界値
        this._text_upper = TextEntity.DEFAULT_TEXT_UPPER;
        this._text_lower = TextEntity.DEFAULT_TEXT_LOWER;

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
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
     * @override
     */
    onChangeAltitudeMode( prev_mode )
    {
        this._dirty = true;
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
        this._setVector3Property( "color", color );
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
     * @param {mapray.Vector3} [props.color]        テキストの色
     */
    addText( text, position, props )
    {
        this._entries.push( new Entry( this, text, position, props ) );

        // 変化した可能性がある
        this.needToCreateRegions();
        this._dirty = true;
    }


    /**
     * @override
     */
    createRegions()
    {
        const region = new EntityRegion();

        const entries = this._entries;
        const length  = entries.length;

        for ( let i = 0; i < length; ++i ) {
            region.addPoint( entries[i].position );
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
     * @summary 専用マテリアルを取得
     * @private
     */
    _getTextMaterial()
    {
        var scene = this.scene;
        if ( !scene._TextEntity_text_material ) {
            // scene にマテリアルをキャッシュ
            scene._TextEntity_text_material = new TextMaterial( scene.glenv );
        }
        return scene._TextEntity_text_material;
    }


    /**
     * @private
     */
    _setValueProperty( name, value )
    {
        var props = this._text_parent_props;
        if ( props[name] != value ) {
            props[name] = value;
            this._dirty = true;
        }
    }


    /**
     * @private
     */
    _setVector3Property( name, value )
    {
        var dst = this._text_parent_props[name];
        if ( dst[0] != value[0] || dst[1] != value[1] || dst[2] != value[2] ) {
            GeoMath.copyVector3( value, dst );
            this._dirty = true;
        }
    }


    /**
     * @summary プリミティブの更新
     * @desc
     * 入力:
     *   this._entries
     *   this._dirty
     * 出力:
     *   this._transform
     *   this._properties.image
     *   this._primitive.mesh
     *   this._primitives
     *   this._dirty
     * @return {array.<mapray.Prmitive>}  this._primitives
     * @private
     */
    _updatePrimitive()
    {
        if ( !this._dirty ) {
            // 更新する必要はない
            return this._primitives;
        }

        if ( this._entries.length == 0 ) {
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

        // メッシュ生成
        var mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
                { name: "a_color",    size: 4 }
            ],
            vertices: layout.vertices,
            indices:  layout.indices
        };
        var mesh = new Mesh( this.scene.glenv, mesh_data );

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
     * @summary GOCS 平坦化配列を取得
     *
     * 入力: this._entries
     *
     * @return {number[]}  GOCS 平坦化配列
     * @private
     */
    _createFlatGocsArray()
    {
        const num_points = this._entries.length;
        return GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                     new Float64Array( 3 * num_points ) );
    }


    /**
     * @summary GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * 入力: this._entries
     *
     * @return {number[]}  GeoPoint 平坦化配列
     * @private
     */
    _getFlatGeoPoints_with_Absolute()
    {
        const entries    = this._entries;
        const num_points = entries.length;
        const flat_array = new Float64Array( 3 * num_points );

        // flat_array[] に経度要素と緯度要素を設定
        for ( let i = 0; i < num_points; ++i ) {
            let pos = entries[i].position;
            flat_array[3*i]     = pos.longitude;
            flat_array[3*i + 1] = pos.latitude;
        }

        switch ( this.altitude_mode ) {
        case AltitudeMode.RELATIVE:
            // flat_array[] の高度要素に現在の標高を設定
            this.scene.viewer.getExistingElevations( num_points, flat_array, 0, 3, flat_array, 2, 3 );
            // flat_array[] の高度要素に絶対高度を設定
            for ( let i = 0; i < num_points; ++i ) {
                flat_array[3*i + 2] += entries[i].position.altitude;
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
     * @summary プリミティブの更新
     * @desc
     * 条件:
     *   this._entries.length > 0
     * 入力:
     *   this._entries.length
     * 出力:
     *   this._transform
     *
     * @param {number[]} gocs_array  GOCS 平坦化配列
     *
     * @private
     */
    _updateTransform( gocs_array )
    {
        var num_entries = this._entries.length;
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
     * @private
     */
    _setupByJson( json )
    {
        var  entries = json.entries;
        var position = new GeoPoint();

        for ( var i = 0; i < entries.length; ++i ) {
            var entry = entries[i];
            position.setFromArray( entry.position );
            this.addText( entry.text, position, entry );
        }

        var props = this._text_parent_props;
        if ( json.font_style )  props.font_style  = json.font_style;
        if ( json.font_weight ) props.font_weight = json.font_weight;
        if ( json.font_size )   props.font_size   = json.font_size;
        if ( json.font_family ) props.font_family = json.font_family;
        if ( json.color )       GeoMath.copyVector3( json.color, props.color );
    }

}


// クラス定数の定義
{
    TextEntity.DEFAULT_FONT_SIZE   = 16;
    TextEntity.DEFAULT_FONT_FAMILY = "sans-serif";
    TextEntity.DEFAULT_COLOR       = GeoMath.createVector3f( [1, 1, 1] );

    TextEntity.DEFAULT_TEXT_UPPER  = 1.1;
    TextEntity.DEFAULT_TEXT_LOWER  = 0.38;
    TextEntity.SAFETY_PIXEL_MARGIN = 1;
    TextEntity.MAX_IMAGE_WIDTH     = 4096;
}


/**
 * @summary テキスト要素
 * @memberof mapray.TextEntity
 * @private
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
     * @param {mapray.Vector3}    [props.color]        テキストの色
     */
    constructor( owner, text, position, props )
    {
        this._owner    = owner;
        this._text     = text;
        this._position = position.clone();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector3f( "color" );     // deep copy
    }


    /**
     * @summary テキスト
     * @type {string}
     * @readonly
     */
    get text()
    {
        return this._text;
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
     * @summary フォントサイズ (Pixels)
     * @type {number}
     * @readonly
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
     * @private
     */
    _copyPropertyVector3f( name )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            props[name] = GeoMath.createVector3f( props[name] );
        }
    }

}


/**
 * @summary テキスト画像を Canvas 上にレイアウト
 * @memberof mapray.TextEntity
 * @private
 */
class Layout {

    /**
     * @desc
     * 入力:
     *   owner.scene.glenv
     *   owner._entries
     *   owner._transform
     *
     * @param {mapray.TextEntity} owner       所有者
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
        var entries = this._owner._entries;
        var context = Layout._createCanvasContext( 1, 1 );

        var items = [];
        for ( var i = 0; i < entries.length; ++i ) {
            items.push( new LItem( this, entries[i], context ) );
        }

        return items;
    }


    /**
     * @summary 測定用コンテキストを生成
     * @param  {number} width
     * @param  {number} height
     * @return {CanvasRenderingContext2D}
     * @private
     */
    static _createCanvasContext( width, height )
    {
        var canvas = document.createElement( "canvas" );
        canvas.width  = width;
        canvas.height = height;
        return canvas.getContext( "2d" );
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
        var context = Layout._createCanvasContext( width, height );

        context.textAlign    = "left";
        context.textBaseline = "alphabetic";
        context.fillStyle    = "rgba( 255, 255, 255, 1.0 )";

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            item.drawText( context );
        }

        var glenv = this._owner.scene.glenv;
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

            var entry = item.entry;

            // テキストの色
            var color = entry.color;

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
        var entity = layout._owner;
        this._upper = entry.size * entity._text_upper;
        this._lower = entry.size * entity._text_lower;

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
        context.fillText( entry.text, this._pos_x, this._pos_y );
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
