import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Texture from "./Texture";
import ImageIconMaterial from "./ImageIconMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import { RenderTarget } from "./RenderStage";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import { ImageIconLoader } from "./IconLoader";
import Dom from "./util/Dom";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import Type from "./animation/Type";
import AnimUtil from "./animation/AnimUtil";
import Resource, { URLResource } from "./Resource";


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
     * @param {mapray.Loader.TransformCallback} [opts.transform] 
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // 要素管理
        this._entries = [];

        // 親プロパティ
        this._parent_props = {
            size: null,
            origin: null,
        };

        // Entity.PrimitiveProducer インスタンス
        this._primitive_producer = new PrimitiveProducer( this );

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

        const number = Type.find( "number" );
        const vector2 = Type.find( "vector2" );

        // パラメータ名: size
        // パラメータ型: vector2 | number
        //   型が vector2 のとき アイコンのピクセルサイズX, Y 順であると解釈
        //   型が number のとき アイコンのピクセルサイズX, Y の値
        const size_temp = GeoMath.createVector2();
        let   size_type;

        let size_tsolver = curve => {
            size_type = AnimUtil.findFirstTypeSupported( curve, [vector2, number] );
            return size_type;
        };

        block.addEntry( "size", [vector2, number], size_tsolver, value => {
            if ( size_type === vector2 ) {
                this.setSize( value );
            }
            else { // size_type === number
                size_temp[0] = value;
                size_temp[1] = value;
                this.setSize( size_temp );
            }
        } );
    }


    /**
     * @summary アイコンのサイズを指定
     * @param {mapray.Vector2} size  アイコンのピクセルサイズ
     */
    setSize( size ) {
        this._setVector2Property( "size", size );
    }


    /**
     * @summary アイコンの原点位置を指定
     * @param {mapray.Vector2} origin  アイコンの原点位置
     */
    setOrigin( origin ) {
        this._setVector2Property( "origin", origin );
    }


    /**
     * @summary Add Image Icon
     * @param {URL|HTMLImageElement|HTMLCanvasElement} image_src    画像
     * @param {mapray.GeoPoint} position            位置
     * @param {object}          [props]             プロパティ
     * @param {mapray.Vector2}  [props.size]        アイコンサイズ
     * @param {string}          [props.id]          Entryを識別するID
     * @param {mapray.Loader.Transform} [props.transform] URL変換関数
     * @return {mapray.ImageIconEntity.ImageEntry}  追加したEntry
     */
    addImageIcon( image_src, position, props ) 
    {
        var entry = new ImageEntry( this, image_src, position, props );
        this._entries.push( entry );
        this._primitive_producer.onAddEntry();
        return entry;
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getMaterial( render_target )
    {
        var scene = this.scene;
        if ( render_target === RenderTarget.SCENE ) {
            if ( !scene._ImageEntity_image_material ) {
                // scene にマテリアルをキャッシュ
                scene._ImageEntity_image_material = new ImageIconMaterial( scene.glenv );
            }
            return scene._ImageEntity_image_material;
        }
        else if (render_target === RenderTarget.RID) {
            if ( !scene._ImageEntity_image_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._ImageEntity_image_material_pick = new ImageIconMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._ImageEntity_image_material_pick;
        }
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
    _setVector2Property( name, value )
    {
        var dst = this._parent_props[name];
        if ( !dst ) {
            this._parent_props[name] = GeoMath.createVector2f( value );
            this._primitive_producer.onChangeParentProperty();
        }
        else if ( dst[0] !== value[0] || dst[1] !== value[1] ) {
            GeoMath.copyVector2( value, dst );
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
            this.addImageIcon( position, entry );
        }

        if ( json.size )     this.setSize( json.size );
        if ( json.origin )   this.setOrigin( json.origin );
    }

    
    /**
     * @summary IDでEntryを取得
     * @param {string}  id  ID
     * @return {mapray.ImageIconEntity.ImageEntry}  IDが一致するEntry（無ければundefined）
     */
    getEntry( id )
    {
        return this._entries.find((entry) => entry.id === id);
    }
}


// クラス定数の定義
{
    ImageIconEntity.DEFAULT_COLOR       = GeoMath.createVector3f( [1, 1, 1] );
    ImageIconEntity.SAFETY_PIXEL_MARGIN = 1;
    ImageIconEntity.MAX_IMAGE_WIDTH     = 4096;
    ImageIconEntity.CIRCLE_SEP_LENGTH   = 32;
    ImageIconEntity.DEFAULT_ICON_SIZE   = GeoMath.createVector2f( [30, 30] );
    ImageIconEntity.DEFAULT_ORIGIN      = GeoMath.createVector2f( [ 0.5, 0.5 ] );

    ImageIconEntity.SAFETY_PIXEL_MARGIN = 1;
    ImageIconEntity.MAX_IMAGE_WIDTH     = 4096;
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
     * @param {mapray.ImageIconEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._glenv = entity.scene.glenv;
        this._dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            image: null,       // アイコン画像
        };

        // プリミティブ
        var primitive = new Primitive( this._glenv, null, entity._getMaterial( RenderTarget.SCENE ), this._transform );
        primitive.properties = this._properties;
        this._primitive = primitive;

        var pickPrimitive = new Primitive( this._glenv, null, entity._getMaterial( RenderTarget.RID ), this._transform );
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
            return;
        }

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
            this._pickPrimitives = [];
            this._dirty = false;
            return;
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
 * @summary 要素
 * @hideconstructor
 * @memberof mapray.ImageIconEntity
 * @public
 */
class ImageEntry {

    /**
     * @param {mapray.ImageIconEntity} owner        所有者
     * @param {string}                 image_src    アイコン画像
     * @param {mapray.GeoPoint}        position     位置
     * @param {object}                 [props]      プロパティ
     * @param {mapray.Vector2}         [props.size] アイコンサイズ
     * @param {string}                 [props.id]   Entryを識別するID
     * @param {mapray.Loader.Transform} [props.transform] URL変換関数
     */
    constructor( owner, image_src, position, props )
    {
        this._owner = owner;
        this._position = position.clone();

        // animation.BindingBlock
        this._animation = new EasyBindingBlock();
        
        this._setupAnimationBindingBlock();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector2f( "size" );      // deep copy
        this._copyPropertyVector2f( "origin" );    // deep copy

        this.setImage( image_src );
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
     * @summary アイコンサイズ (Pixels)
     * @type {mapray.Vector2}
     * @readonly
     * @package
     */
    get size()
    {
        const props = this._props;
        const parent = this._owner._parent_props;
        return (
            props.size || parent.size ||
            GeoMath.createVector2f( [ this._icon.width, this._icon.height ] )
        );
    }

    /**
     * @summary アイコンオリジン位置 (左上を(0, 0)、右下を(1, 1)としする数字を指定する。)
     * @type {mapray.Vector2}
     * @readonly
     * @package
     */
    get origin()
    {
        const props = this._props;
        const parent = this._owner._parent_props;
        return props.origin || parent.origin || ImageIconEntity.DEFAULT_ORIGIN;
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
        const vector2 = Type.find( "vector2" );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: image_src
        // パラメータ型: string
        //   画像のパス
        block.addEntry( "image_src", [string], null, value => {
            this.setImage( value );
        } );

        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [vector3], null, value => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: size
        // パラメータ型: vector2 | number
        //   型が vector2 のとき アイコンのピクセルサイズX, Y 順であると解釈
        //   型が number のとき アイコンのピクセルサイズX, Y は同値
        const size_temp = GeoMath.createVector2();
        let   size_type;

        let size_tsolver = curve => {
            size_type = AnimUtil.findFirstTypeSupported( curve, [vector2, number] );
            return size_type;
        };

        block.addEntry( "size", [vector2, number], size_tsolver, value => {
            if ( size_type === vector2 ) {
                this.setSize( value );
            }
            else { // size_type === number
                size_temp[0] = value;
                size_temp[1] = value;
                this.setSize( size_temp );
            }
        } );
    }

    
    /**
     * @summary 画像のパスを設定
     * @param {string} image_src  画像のパス
     */
    setImage( image_src )
    {
        if ( this._image_src !== image_src ) {
            // 画像のパスが変更された
            this._image_src = image_src;
            const resource = (
                image_src instanceof Resource ? image_src:
                new URLResource( image_src, { transform: this._props.transform })
            );
            this._icon = ImageEntry.iconLoader.load( resource );
            this._icon.onEnd(item => {
                    this._owner.getPrimitiveProducer()._dirty = true;
            });
        }
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
     * @summary アイコンのサイズを指定
     * @param {mapray.Vector2} size  アイコンのピクセルサイズ
     */
    setSize( size ) {
        this._setVector2Property( "size", size );
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

    /**
     * @private
     */
    _setVector2Property( name, value )
    {
        var dst = this._props[name];
        if ( !dst ) {
            this._props[name] = GeoMath.createVector2f( value );
            this._owner.getPrimitiveProducer().onChangeChildProperty();
        }
        else if ( dst[0] !== value[0] || dst[1] !== value[1] ) {
            GeoMath.copyVector2( value, dst );
            this._owner.getPrimitiveProducer().onChangeChildProperty();
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

ImageIconEntity.ImageEntry = ImageEntry;


{
    ImageEntry.iconLoader = new ImageIconLoader();
}



/**
 * @summary Pin画像を Canvas 上にレイアウト
 * @memberof mapray.ImageIconEntity
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
     * @return {array.<mapray.ImageIconEntity.LItem>}
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

                // Image dimensions (Image Coordinate)
                var xc = item.pos_x;
                var yc = item.pos_y;
                var xsize = item.width;
                var ysize = item.height;

                // p0
                vertices.push( xm, ym, zm );                                     // a_position
                vertices.push( -origin[0]*size[0], (origin[1])*size[1] );        // a_offset
                vertices.push( xc * xn, 1.0 - yc * yn );                         // a_texcoord

                // p1
                vertices.push( xm, ym, zm );                                    // a_position
                vertices.push( -origin[0]*size[0], -(1-origin[1])*size[1] );    // a_offset
                vertices.push( xc * xn, 1 - (yc + ysize) * yn );                // a_texcoord

                // p2
                vertices.push( xm, ym, zm );                                    // a_position
                vertices.push( (1-origin[0])*size[0], -(1-origin[1])*size[1] ); // a_offset
                vertices.push( (xc + xsize) * xn, 1 - (yc + ysize) * yn );      // a_texcoord

                // p3
                vertices.push( xm, ym, zm );                                    // a_position
                vertices.push( (1-origin[0])*size[0], origin[1]*size[1] );      // a_offset
                vertices.push( (xc + xsize) * xn, 1 - yc * yn );                // a_texcoord
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


    /**
     * @summary アイテムの配置を設定
     * @param  {array.<mapray.ImageIconEntity.RowLayout>} row_layouts
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
     * @param {array.<mapray.ImageIconEntity.LItem>} src_items  アイテムリスト
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
     * @type {array.<mapray.ImageIconEntity.LItem>}
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




export default ImageIconEntity;
