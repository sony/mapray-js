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
 * @summary ピン立てエンティティ
 * @memberof mapray
 * @extends mapray.Entity
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

        // テキスト管理
        this._entries = [];
        this._dirty   = true;


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
     * @param {float} [props.size]        テキストの色
     * @param {mapray.Vector3} [props.color]        テキストの色
     */
    addPinFromIcon( id, position, props )
    {
        this._entries.push( new MakiEntry( this, id, position, props ) );

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
        if ( !scene._PinEntity_text_material ) {
            // scene にマテリアルをキャッシュ
            scene._PinEntity_text_material = new TextMaterial( scene.glenv );
        }
        return scene._PinEntity_text_material;
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
}

// クラス定数の定義
{
    PinEntity.DEFAULT_COLOR       = GeoMath.createVector3f( [1, 1, 1] );
    PinEntity.SAFETY_PIXEL_MARGIN = 1;
    PinEntity.MAX_IMAGE_WIDTH     = 4096;
}


/**
 * @summary MakiIcon要素
 * @memberof mapray.PinEntity
 * @private
 */
class MakiEntry {

    /**
     * @param {mapray.PinEntity}  owner                所有者
     * @param {string}            id                   MakiアイコンのID
     * @param {mapray.GeoPoint}   position             位置
     * @param {object}            [props]              プロパティ
     * @param {float} [props.size]        アイコンサイズ
     * @param {mapray.Vector3} [props.color]        アイコンの色
     */
    constructor( owner, id, position, props )
    {
        this._owner = owner;
        this._id = id;
        this._position = position.clone();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector3f( "color" );     // deep copy
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
     * @type {number}
     * @readonly
     */
    get size()
    {
        var props  = this._props;
        return props.size;
    }


    /**
     * @summary テキストの色
     * @type {mapray.Vector3}
     * @readonly
     */
    get color()
    {
        var props  = this._props;
        return props.color;
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
 * @summary Pin画像を Canvas 上にレイアウト
 * @memberof mapray.PinEntity
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
     * @param {mapray.PinEntity} owner       所有者
     * @param {number[]}          gocs_array  GOCS 平坦化配列
     */
    constructor( owner, gocs_array )
    {
        this._owner = owner;
        this._items = this._createItemList();
        this._is_valid = true;

        // アイテムの配置の設定とキャンバスサイズの決定
        this._texture  = this._createTexture( 85, 40 );
        this._vertices = this._createVertices( 85, 40, gocs_array );
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
     * @return {array.<mapray.PinEntity.LItem>}
     * @private
     */
    _createItemList()
    {
        var entries = this._owner._entries;

        var items = [];
        for ( var i = 0; i < entries.length; ++i ) {
            items.push( new LItem( this, entries[i] ) );
        }

        return items;
    }


    /**
     * @summary 測定用コンテキストを生成
     * @param  {number} width
     * @param  {number} height
     * @return {CanvasRenderingcontext}
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
     * @summary テクスチャを生成
     * @param  {number} width    横幅
     * @param  {number} height   高さ
     * @return {mapray.Texture}  テキストテクスチャ
     * @private
     */
    _createTexture( width, height )
    {
        var context = Layout._createCanvasContext( width, height );

        this._drawPin( context );

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

            var xsize = item.width;
            var ysize = item.height;

            var xn = 1 / width;
            var yn = 1 / height;

            // 左下
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( -xsize / 2, -ysize / 2 );                        // a_offset
            vertices.push( 0.0, 1.0 );            // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 右下
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( xsize / 2, -ysize / 2 );                         // a_offset
            vertices.push( 1.0, 1.0 );  // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 左上
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( -xsize / 2, ysize / 2 );                         // a_offset
            vertices.push( 0.0, 0.0 );            // a_texcoord
            vertices.push( color[0], color[1], color[2], 1 );           // a_color

            // 右上
            vertices.push( xm, ym, zm );                                // a_position
            vertices.push( xsize / 2, ysize / 2 );                          // a_offset
            vertices.push( 1.0, 0.0 );  // a_texcoord
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

    _drawPin( context ) {
        context.save();
        context.beginPath();
        context.moveTo(0,0);
        context.lineTo(80, 40);
        context.lineTo(80, 10);
        context.closePath();
        context.stroke();
        context.restore();
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
        constructor( layout, entry )
        {
            this._entry = entry;

            // テキストの基点
            this._pos_x = 0;  // 左端
            this._pos_y = 0;  // ベースライン位置


            this._width = 100;
            this._height = 100;
            // テキストの上下範囲
            var entity = layout._owner;
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

    get height()
    {
        return this._height;
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
        this._pos_y = y;
    }
}

export default PinEntity;
