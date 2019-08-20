import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Texture from "./Texture";
import ImageIconMaterial from "./ImageIconMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Dom from "./util/Dom";



/**
 * @summary 画像アイコンエンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class ImageIconEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        this._entries = [];
        this._dirty   = true;


        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            image: null,       // アイコン画像
            // image_mask: null,  // アイコンマスク画像
        };

        // プリミティブ
        var primitive = new Primitive( scene.glenv, null, this._getMaterial(), this._transform );
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
     * @summary Add Image Icon
     * @param {URL|HTMLImageElement|HTMLCanvasElement}          image_src      画像
     * @param {mapray.GeoPoint} position  位置
     * @param {object}          [props]   プロパティ
     * @param {float} [props.size]        アイコンサイズ
     * @param {mapray.Vector3} [props.fg_color]        アイコン色
     * @param {mapray.Vector3} [props.bg_color]        背景色
     */
    addImageIcon( image_src, position, props ) 
    {
        this._entries.push( new ImageEntry( this, image_src, position, props ) );

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
    _getMaterial()
    {
        var scene = this.scene;
        if ( !scene._ImageEntity_image_material ) {
            // scene にマテリアルをキャッシュ
            scene._ImageEntity_image_material = new ImageIconMaterial( scene.glenv );
        }
        return scene._ImageEntity_image_material;
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

        // if ( properties.image_mask ) {
        //    properties.image_mask.dispose();
        // }
        // properties.image_mask = layout.texture_mask;

        // メッシュ生成
        var mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_offset",   size: 2 },
                { name: "a_texcoord", size: 2 },
                // { name: "a_texmaskcoord", size: 2 },
                { name: "a_fg_color", size: 3 },
                { name: "a_bg_color", size: 3 },
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
    ImageIconEntity.DEFAULT_COLOR       = GeoMath.createVector3f( [1, 1, 1] );
    ImageIconEntity.SAFETY_PIXEL_MARGIN = 1;
    ImageIconEntity.MAX_IMAGE_WIDTH     = 4096;
    ImageIconEntity.CIRCLE_SEP_LENGTH   = 32;
    ImageIconEntity.DEFAULT_ICON_SIZE   = GeoMath.createVector2f( [30, 30] );
    ImageIconEntity.DEFAULT_FG_COLOR    = [1.0, 1.0, 1.0];
    ImageIconEntity.DEFAULT_BG_COLOR    = [0.35, 0.61, 0.81];

    ImageIconEntity.SAFETY_PIXEL_MARGIN = 1;
    ImageIconEntity.MAX_IMAGE_WIDTH     = 4096;
}


/**
 * @summary MakiIcon要素
 * @memberof mapray.ImageIconEntity
 * @private
 */
class ImageEntry {

    /**
     * @param {mapray.ImageIconEntity}  owner                所有者
     * @param {string}            id                   MakiアイコンのID
     * @param {mapray.GeoPoint}   position             位置
     * @param {object}            [props]              プロパティ
     * @param {float} [props.size]        アイコンサイズ
     * @param {mapray.Vector3} [props.fg_color]        アイコン色
     * @param {mapray.Vector3} [props.bg_color]        背景色
     */
    constructor( owner, image_src, position, props )
    {
        this._owner = owner;
        this._image_src = image_src;
        this._position = position.clone();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector3f( "fg_color" );     // deep copy
        this._copyPropertyVector3f( "bg_color" );     // deep copy
        this._copyPropertyVector2f( "size" );     // deep copy
        this._copyPropertyVector2f( "origin" );     // deep copy

        this._icon = ImageIconLoader.instance.load(image_src);
        this._icon.onEnd(item => {
                this._owner._dirty = true;
        });
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
        var props = this._props;
        if ( props.size ) {
            return props.size;
       }
        else {
            return GeoMath.createVector2f( [ this._icon.width, this._icon.height ] );
        }
    }

    /**
     * @summary アイコンオリジン位置 (左上を(0, 0)、右下を(1, 1)としする数字を指定する。)
     * @type {mapray.Vector2}
     * @readonly
     */
    get origin()
    {
        var props = this._props;
        if ( props.origin ) {
            return props.origin;
       }
        else {
            return GeoMath.createVector2f( [ 0.5, 0.5 ] );
        }
    }

    /**
     * @summary アイコン色
     * @type {mapray.Vector3}
     * @readonly
     */
    get fg_color()
    {
        var props  = this._props;
        return props.fg_color || ImageIconEntity.DEFAULT_FG_COLOR;
    }

    /**
     * @summary 背景色
     * @type {mapray.Vector3}
     * @readonly
     */
    get bg_color()
    {
        var props  = this._props;
        return props.bg_color || ImageIconEntity.DEFAULT_BG_COLOR;
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

    draw( context, x, y, w, h ) {
        var image = this._icon.icon;
        var size = this.size;
        context.drawImage(
            image,
            x, y,
            w, h
        );
    }
}



class ImageIconLoader {
    constructor() {
        this.cache = {};
    }
    create( image_src ) {
        return this.cache[image_src] || (this.cache[image_src] = new ImageIconLoaderItem( image_src ))
    }
    load( image_src ) {
        var item = this.create(image_src);
        item.load();
        return item;
    }
}

{
    ImageIconLoader.instance = new ImageIconLoader();
}




class ImageIconLoaderItem {
    constructor( image_src ) {
        this._image_src = image_src;
        this._status = ImageIconLoaderItem.Status.NOT_LOADED;
        this.funcs = [];
    }
    get status() {
        return this._status;
    }
    onEnd(func) {
        if (this._status === ImageIconLoaderItem.Status.LOADED  || this._status === ImageIconLoaderItem.Status.ABORTED ) {
            func(this);
        } else {
            this.funcs.push(func);
        }
    }
    load() {
        if (this._status !== ImageIconLoaderItem.Status.NOT_LOADED ) {
            return;
        }
        this._status = ImageIconLoaderItem.Status.LOADING;
        this.doLoad(
            ( icon, width, height ) => {
                this.icon = icon;
                this.width = width;
                this.height = height;
                this._status = ImageIconLoaderItem.Status.LOADED;
                for (var i = 0; i < this.funcs.length; i++) {
                    this.funcs[i]( this );
                }
                this.funcs.length = 0;
            },
            ( icon, width, height ) => {
                this._status = ImageIconLoaderItem.Status.ABORTED;
                this.icon = null;
                for (var i = 0; i < this.funcs.length; i++) {
                    this.funcs[i]( this );
                }
                this.funcs.length = 0;
            }
        );
    }
    isLoaded() {
        return this._status === ImageIconLoaderItem.Status.LOADED;
    }
    doLoad( onload, onerror ) {
        var image_src = this._image_src;
        if ( typeof( image_src ) === "string" ) {
            var url = image_src;
            var image = new Image();
            image.onload = event => onload(event.target, event.target.width, event.target.height);
            image.onerror = event => onerror();
            image.src = url;
        }
        else if ( image_src instanceof HTMLImageElement ) {
            var image = image_src;
            if ( image.complete ) {
                onload(image, image.width, image.height);
            } else {
                if ( image.onload !== null ) throw new Error();
                if ( image.onerror !== null ) throw new Error();
                image.onload = event => onload(event.target, event.target.width, event.target.height);
                image.onerror = event => onerror();
            }
        }
        else if ( image_src instanceof HTMLCanvasElement ) {
            var canvas = image_src;
            return onload(canvas, canvas.width, canvas.height);
        }
        else {
            onerror( new Error( "not supported: " + image_src ) );
        }
    }
}

ImageIconLoaderItem.Status = {
    NOT_LOADED: "not loaded",
    LOADING: "loading",
    LOADED: "loaded",
    ABORTED: "aborted"
};


/**
 * @summary Pin画像を Canvas 上にレイアウト
 * @memberof mapray.ImageIconEntity
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
     * @param {mapray.ImageIconEntity} owner       所有者
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

        // アイテムの配置の設定とキャンバスサイズの決定
        this._texture  = this._createTexture( size.width, size.height );
        // this._texture_mask = this._createTextureMask();
        this._vertices = this._createVertices( size.width, size.height, gocs_array );
        this._indices  = this._createIndices();
        this._position = [];
    }

    /**
     * @summary RowLayout のリストを生成
     * @return {array.<mapray.ImageIconEntity.RowLayout>}
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
     * @summary アイテムの配置を設定
     * @param  {array.<mapray.TextEntity.RowLayout>} row_layouts
     * @return {object}                              キャンバスサイズ
     * @private
     */
    _setupLocation( row_layouts )
    {
        var width  = 0;
        var height = 0;

        height += ImageIconEntity.SAFETY_PIXEL_MARGIN;

        for ( var i = 0; i < row_layouts.length; ++i ) {
            var row_layout = row_layouts[i];
            row_layout.locate( height );
            width   = Math.max( row_layout.width_assumed, width );
            height += row_layout.height_pixel + ImageIconEntity.SAFETY_PIXEL_MARGIN;
        }

        return {
            width:  width,
            height: height
        };
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
    // get texture_mask()
    // {
    //    return this._texture_mask;
    // }


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
     * @return {array.<mapray.ImageIconEntity.LItem>}
     * @private
     */
    _createItemList()
    {
        var entries = this._owner._entries;
        var map = new Map();

        var items = [];
        var counter = 0;
        for ( var i = 0; i < entries.length; ++i ) {
            var entry = entries[i];
            if ( entry.isLoaded() ) {
                var item = map.get( entry.icon );
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

        var glenv = this._owner.scene.glenv;
        var gl = glenv.context;
        var opts = {
            usage: Texture.Usage.ICON
        };
        return new Texture( glenv, context.canvas, opts );
    }

    /*
    _createTextureMask()
    {
        var context = Dom.createCanvasContext( 3, 3 );
        context.fillRect( 1, 1, 1, 1 );
        var glenv = this._owner.scene.glenv;
        var gl = glenv.context;
        var opts = {
            usage: Texture.Usage.TEXT, // @ToDo
            mag_filter: gl.NEAREST
        };
        return new Texture( glenv, context.canvas, opts );
    }
    */

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

        |<----size[0]px---->|

        0-------------------3 ------------------
        |                   |  ^              ^ 
        |                   |  | origin[1]    | 
        |                   |  |              | 
        |                   |  v              | size[1]px
        |           o       | ---             | 
        |                   |  ^              | 
        |                   |  | 1-origin[1]  | 
        |                   |  v              v 
        1-------------------2 ------------------
        
        |           |<----->|    1 - origin[0]
        |<--------->|            origin[0]
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
                var origin = entry.origin;

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

                // p0
                vertices.push( xm, ym, zm );                                     // a_position
                vertices.push( -origin[0]*size[0], (origin[1])*size[1] );        // a_offset
                vertices.push( xc * xn, 1.0 - yc * yn );                         // a_texcoord
                // vertices.push( 1.0 / 3.0, 2.0 / 3.0 );                           // a_texcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p1
                vertices.push( xm, ym, zm );                                    // a_position
                vertices.push( -origin[0]*size[0], -(1-origin[1])*size[1] );    // a_offset
                vertices.push( xc * xn, 1 - (yc + ysize) * yn );                // a_texcoord
                // vertices.push( 1.0 / 3.0, 2.0 / 3.0 );                          // a_texcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p2
                vertices.push( xm, ym, zm );            // a_position
                vertices.push( (1-origin[0])*size[0], -(1-origin[1])*size[1] );               // a_offset
                vertices.push( (xc + xsize) * xn, 1 - (yc + ysize) * yn );    // a_texcoord
                // vertices.push( 2.0 / 3.0, 1.0 / 3.0 );              // a_texcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );

                // p3
                vertices.push( xm, ym, zm );            // a_position
                vertices.push( (1-origin[0])*size[0], origin[1]*size[1] );         // a_offset
                vertices.push( (xc + xsize) * xn, 1 - yc * yn );              // a_texcoord
                // vertices.push( 2.0 / 3.0, 2.0 / 3.0 );              // a_texcoord
                vertices.push( ...fg_color );
                vertices.push( ...bg_color );
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
                var base = 4 * eitem.index;

                var p = base;
                indices.push( p, p+1, p+2 );
                indices.push( p, p+2, p+3 );
            }
        }

        return indices;
    }
}


/**
 * @summary 水平レイアウト
 * @memberof mapray.ImageIconEntity
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

        width_assumed_total += ImageIconEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        while ( src_items.length > 0 ) {
            var item          = src_items.shift();
            var width_assumed = item.width_pixel + ImageIconEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン

            if ( width_assumed_total + width_assumed <= ImageIconEntity.MAX_IMAGE_WIDTH ) {
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

        x += ImageIconEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.locate( x, y );
            x += item.width_pixel + ImageIconEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン
        }
    }

}


/**
 * @summary レイアウト対象
 * @memberof mapray.ImageIconEntity
 * @private
 */
class LItem {
    /**
     * @param {mapray.ImageIconEntity.Layout} layout   所有者
     * @param {mapray.ImageIconEntity.Entry}  entry    ImageIconEntityのエントリ
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
        // if (entry.status !== "loaded") throw new Error();
        var size = entry.size;
        if (this._width === null || this._width < size[0]) this._width = size[0];
        if (this._height === null || this._height < size[1]) this._height = size[1];
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
        context.save();

        this.entries[0].entry.draw( context, this._pos_x, this.pos_y, this.width, this.height ); // @Todo: fix this

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
        
        context.restore();
    }
}

export default ImageIconEntity;
