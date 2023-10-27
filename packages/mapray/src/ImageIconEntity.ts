import Entity from "./Entity";
import Primitive from "./Primitive";
import Scene from "./Scene";
import Mesh from "./Mesh";
import GLEnv from "./GLEnv";
import Texture, { Option as TextureOption } from "./Texture";
import ImageIconMaterial from "./ImageIconMaterial";
import GeoMath, { Vector2, Vector3, Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import RenderStage from "./RenderStage";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import { ImageIconLoader, IconLoaderItem } from "./IconLoader";
import Dom from "./util/Dom";
import Color from "./util/Color";
import BindingBlock from "./animation/BindingBlock";
import EasyBindingBlock from "./animation/EasyBindingBlock";
import Curve from "./animation/Curve";
import Type from "./animation/Type";
import AnimUtil from "./animation/AnimUtil";
import Resource, { URLResource } from "./Resource";
import AbstractPointEntity from "./AbstractPointEntity";


/**
 * 画像アイコンエンティティ
 */
class ImageIconEntity extends AbstractPointEntity<ImageIconEntity.ImageEntry> {

    private _primitive_producer: ImageIconEntity.PrimitiveProducer;

    private _parent_props: ImageIconEntity.Props;

    private _alpha_clipping: boolean;

    private _alpha_clip_threshold: number;

    private _mask_color?: Vector3;


    /**
     * @param scene 所属可能シーン
     * @param opts  オプション集合
     */
    constructor( scene: Scene, opts: ImageIconEntity.Option = {} )
    {
        super( scene, opts );

        // 親プロパティ
        this._parent_props = {
            size: undefined,
            origin: undefined,
        };

        this._alpha_clipping = opts.alpha_clipping ?? true;
        this._alpha_clip_threshold = opts.alpha_clip_threshold ?? ImageIconEntity.DEFAULT_ALPHA_CLIP_THRESHOLD;

        if ( opts.mask_color ) {
            this._mask_color = Color.createOpaqueColorFromBytes( opts.mask_color );
        }
        else if ( opts.mask_color_normalized ) {
            this._mask_color = opts.mask_color_normalized;
        }
        else {
            this._mask_color = undefined;
        }

        // Entity.PrimitiveProducer インスタンス
        this._primitive_producer = new ImageIconEntity.PrimitiveProducer( this );

        // @ts-ignore
        const block = this._animation as EasyBindingBlock;
        block.addDescendantUnbinder( () => { this._unbindDescendantAnimations(); } );
        this._setupAnimationBindingBlock();

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     */
    getPrimitiveProducer(): ImageIconEntity.PrimitiveProducer
    {
        return this._primitive_producer;
    }


    /**
     * EasyBindingBlock.DescendantUnbinder 処理
     */
    private _unbindDescendantAnimations()
    {
        // すべてのエントリーを解除
        for ( let entry of this._entries ) {
            entry.animation.unbindAllRecursively();
        }
    }


    /**
     * アニメーションの BindingBlock を初期化
     */
    private _setupAnimationBindingBlock()
    {
        // @ts-ignore
        const block = this._animation as EasyBindingBlock;  // 実体は EasyBindingBlock

        const number = Type.find( "number" );
        const vector2 = Type.find( "vector2" );

        // パラメータ名: size
        // パラメータ型: vector2 | number
        //   型が vector2 のとき アイコンのピクセルサイズX, Y 順であると解釈
        //   型が number のとき アイコンのピクセルサイズX, Y の値
        const size_temp = GeoMath.createVector2();
        let   size_type: Type | null;

        let size_tsolver = (curve: Curve) => {
            size_type = AnimUtil.findFirstTypeSupported( curve, [vector2, number] );
            return size_type;
        };

        block.addEntry( "size", [vector2, number], size_tsolver, (value: Vector2 | number) => {
            if ( size_type === vector2 ) {
                this.setSize( value as Vector2 );
            }
            else { // size_type === number
                size_temp[0] = value as number;
                size_temp[1] = value as number;
                this.setSize( size_temp );
            }
        } );
    }


    /**
     * アイコンのサイズを指定
     * @param size  アイコンのピクセルサイズ
     */
    setSize( size: Vector2 ) {
        this._setVector2Property( "size", size );
    }


    /**
     * アイコンの原点位置を指定
     * @param origin  アイコンの原点位置
     */
    setOrigin( origin: Vector2 ) {
        this._setVector2Property( "origin", origin );
    }


    /**
     * @internal
     */
    get parent_props(): ImageIconEntity.Props {
        return this._parent_props;
    }


    /**
     * Add Image Icon
     * @param image_src    画像
     * @param position     位置
     * @param props        プロパティ
     * @return 追加したEntry
     */
    addImageIcon( image_src: string | HTMLImageElement | HTMLCanvasElement, position: GeoPoint, props: ImageIconEntity.ImageEntryOption = {} ): ImageIconEntity.ImageEntry
    {
        var entry = new ImageIconEntity.ImageEntry( this, image_src, position, props );
        this._entries.push( entry );
        this._primitive_producer.onAddEntry();
        return entry;
    }


    /**
     * 専用マテリアルを取得
     */
    private _getMaterial( render_target: RenderStage.RenderTarget )
    {
        var scene = this.scene;
        if ( render_target === RenderStage.RenderTarget.SCENE ) {
            if ( !scene._ImageEntity_image_material ) {
                // scene にマテリアルをキャッシュ
                scene._ImageEntity_image_material = new ImageIconMaterial( scene.glenv );
            }
            return scene._ImageEntity_image_material;
        }
        else if (render_target === RenderStage.RenderTarget.RID) {
            if ( !scene._ImageEntity_image_material_pick ) {
                // scene にマテリアルをキャッシュ
                scene._ImageEntity_image_material_pick = new ImageIconMaterial( scene.glenv, { ridMaterial: true } );
            }
            return scene._ImageEntity_image_material_pick;
        }
        else {
            throw new Error("unknown render target: " + render_target);
        }
    }


    private _setValueProperty( name: string, value: any )
    {
        var props = this._parent_props;
        if ( props[name] != value ) {
            props[name] = value;
            this._primitive_producer.onChangeParentProperty();
        }
    }

    private _setVector2Property( name: string, value: Vector2 )
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

    private _setupByJson( json: ImageIconEntity.Json )
    {
        var position = new GeoPoint();

        for ( let entry of json.entries ) {
            position.setFromArray( entry.position );
            this.addImageIcon( entry.image_src, position, entry );
        }

        if ( json.size )     this.setSize( json.size );
        if ( json.origin )   this.setOrigin( json.origin );
    }

    
    /**
     * IDでEntryを取得
     * @param id  ID
     * @return IDが一致するEntry（無ければundefined）
     */
    getEntry( id: string ): ImageIconEntity.ImageEntry | undefined
    {
        return this._entries.find((entry) => entry.id === id);
    }


    /**
     * @internal
     */
    getAlphaClipping(): boolean
    {
        return this._alpha_clipping;
    }


    /**
     * @internal
     */
    getAlphaClipThreshold(): number
    {
        return this._alpha_clip_threshold;
    }


    /**
     * @internal
     */
    getMaskColor(): Vector3 | undefined
    {
        return this._mask_color;
    }

}




namespace ImageIconEntity {

// クラス定数の定義
export const DEFAULT_COLOR       = GeoMath.createVector3f( [1, 1, 1] );
export const SAFETY_PIXEL_MARGIN = 1;
export const MAX_IMAGE_WIDTH     = 4096;
export const CIRCLE_SEP_LENGTH   = 32;
export const DEFAULT_ICON_SIZE   = GeoMath.createVector2f( [30, 30] );
export const DEFAULT_ORIGIN      = GeoMath.createVector2f( [ 0.5, 0.5 ] );
export const DEFAULT_ALPHA_CLIP_THRESHOLD = 0.5;



export interface Option extends Entity.Option {
    json?: ImageIconEntity.Json;
   
    /**
     * アルファクリップ有効フラグ
     * 追加した画像全てに適応されます
     * 省略時はtrue
     */
    alpha_clipping?: boolean;

    /**
     * アルファクリッピングの閾値
     * 省略時は0.5
     */
    alpha_clip_threshold?: number;

    /**
     * マスク色(0 ~ 255)
     * 追加した画像全てに適応されます
     */
    mask_color?: Vector3;

    /**
     * マスク色(0.0 ~ 1.0)
     * 追加した画像全てに適応されます
     */
    mask_color_normalized?: Vector3;
}



export class Props {
    json?: ImageIconEntity.Json;

    transform?: Resource.TransformCallback;

    [key: string]: any;
}



export interface Json extends Entity.Json {
    entries: ImageIconJson[];

    size?: Vector2;

    origin?: Vector2;
}


export interface ImageIconJson {
    image_src: string;

    position: [ x: number, y: number ];

    /** アイコンサイズ */
    size?: Vector2;

    /** Entryを識別するID */
    id?: string;

    /** URL変換関数 */
    transform?: Resource.TransformCallback;
}



export interface ImageEntryProps {
    /** アイコンサイズ */
    size?: Vector2;

    /** Entryを識別するID */
    id?: string;

    /** URL変換関数 */
    transform?: Resource.TransformCallback;

    origin?: Vector2;

    [ key: string ]: any;
}



export interface ImageEntryOption {
    /** アイコンサイズ */
    size?: Vector2;

    /** Entryを識別するID */
    id?: string;

    /** URL変換関数 */
    transform?: Resource.TransformCallback;

    origin?: Vector2;
}



/**
 * PrimitiveProducer
 *
 * TODO: relative で標高の変化のたびにテクスチャを生成する必要はないので
 *       Layout でのテクスチャの生成とメッシュの生成を分離する
 *
 * @internal
 */
export class PrimitiveProducer extends Entity.PrimitiveProducer {

    private _glenv: GLEnv;

    private _dirty: boolean;

    private _properties: {
        image: null | Texture,
        alpha_clipping: boolean,
        alpha_clip_threshold: number,
        mask_color: Vector3 | undefined,
    };

    private _primitive: Primitive;

    private _pickPrimitive: Primitive;

    private _primitives: Primitive[];

    private _pickPrimitives: Primitive[];

    private _transform: Matrix;


    /**
     * @param entity
     */
    constructor( entity: ImageIconEntity )
    {
        super( entity );

        this._glenv = entity.scene.glenv;
        this._dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._properties = {
            image: null,       // アイコン画像
            alpha_clipping: entity.getAlphaClipping(),
            alpha_clip_threshold: entity.getAlphaClipThreshold(),
            mask_color: entity.getMaskColor(),
        };

        // プリミティブ
        // @ts-ignore
        var primitive = new Primitive( this._glenv, null, entity._getMaterial( RenderStage.RenderTarget.SCENE ), this._transform );
        primitive.properties = this._properties;
        this._primitive = primitive;

        // @ts-ignore
        var pickPrimitive = new Primitive( this._glenv, null, entity._getMaterial( RenderStage.RenderTarget.RID ), this._transform );
        pickPrimitive.properties = this._properties;
        this._pickPrimitive = pickPrimitive;

        // プリミティブ配列
        this._primitives = [];

        this._pickPrimitives = [];
    }


    getEntity(): ImageIconEntity {
        return super.getEntity() as ImageIconEntity;
    }


    override createRegions()
    {
        const region = new EntityRegion();

        for ( let {position} of this.getEntity().entries ) {
            region.addPoint( position );
        }

        return [region];
    }


    /**
     */
    override onChangeElevation( regions: EntityRegion[] )
    {
        this._dirty = true;
    }


    /**
     */
    override getPrimitives( stage: RenderStage ): Primitive[]
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
     * エントリが追加されたことを通知
     */
    onAddEntry()
    {
        // 変化した可能性がある
        this.needToCreateRegions();
        this._dirty = true;
    }


    /**
     * 
     */
    onImageLoaded( image: IconLoaderItem ) {
        this._dirty = true;
    }


    get transform(): Matrix {
        return this._transform;
    }


    /**
     * プリミティブの更新
     *
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
     */
    private _updatePrimitive()
    {
        if ( !this._dirty ) {
            // 更新する必要はない
            return;
        }

        if ( this.getEntity().entries.length == 0 ) {
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
        var num_entries = this.getEntity().entries.length;
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
     * @return GOCS 平坦化配列
     */
    private _createFlatGocsArray(): Float64Array
    {
        const num_points = this.getEntity().entries.length;
        return GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                     new Float64Array( 3 * num_points ) );
    }


    /**
     * GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * 入力: this.entity._entries
     *
     * @return GeoPoint 平坦化配列
     */
    private _getFlatGeoPoints_with_Absolute(): Float64Array
    {
        const owner      = this.getEntity();
        const entries    = owner.entries;
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
 * 要素
 */
export class ImageEntry extends AbstractPointEntity.Entry {

    private _owner: ImageIconEntity;

    private _position: GeoPoint;

    private _props: ImageIconEntity.ImageEntryProps;

    private _icon!: IconLoaderItem;

    private _image_src!: string | HTMLImageElement | HTMLCanvasElement;

    private _animation: BindingBlock;


    /**
     * @param owner        所有者
     * @param image_src    アイコン画像
     * @param position     位置
     * @param props        プロパティ
     */
    constructor( owner: ImageIconEntity, image_src: string | HTMLImageElement | HTMLCanvasElement, position: GeoPoint, props: ImageEntryOption )
    {
        super();
        this._owner = owner;
        this._position = position.clone();

        // animation.BindingBlock
        // @ts-ignore
        this._animation = new EasyBindingBlock();

        this._setupAnimationBindingBlock();

        this._props = Object.assign( {}, props );  // props の複製
        this._copyPropertyVector2f( "size" );      // deep copy
        this._copyPropertyVector2f( "origin" );    // deep copy

        this.setImage( image_src );
    }

    // @ts-ignore
    override get animation(): BindingBlock {
        return this._animation;
    }

    /**
     * 位置
     * @internal
     */
    get position(): GeoPoint
    {
        return this._position;
    }

    /**
     * ID
     */
    get id(): string
    {
        return this._props.id || "";
    }

    /**
     * アイコンサイズ (Pixels)
     * @internal
     */
    get size(): Vector2
    {
        const props = this._props;
        const parent = this._owner.parent_props;
        const icon = this._icon;
        return (
            props.size || parent.size ||
            (icon ?
                GeoMath.createVector2f( [ icon.width, icon.height ] ):
                GeoMath.createVector2f( [ 0, 0 ] )
            )
        );
    }

    /**
     * アイコンオリジン位置 (左上を(0, 0)、右下を(1, 1)としする数字を指定する。)
     * @internal
     */
    get origin(): Vector2
    {
        const props = this._props;
        const parent = this._owner.parent_props;
        return props.origin || parent.origin || ImageIconEntity.DEFAULT_ORIGIN;
    }

    /**
     * アニメーションの BindingBlock を初期化
     */
    private _setupAnimationBindingBlock()
    {
        // @ts-ignore
        const block = this.animation as EasyBindingBlock;

        const number  = Type.find( "number"  );
        const string  = Type.find( "string"  );
        const vector2 = Type.find( "vector2" );
        const vector3 = Type.find( "vector3" );
        
        // パラメータ名: image_src
        // パラメータ型: string
        //   画像のパス
        block.addEntry( "image_src", [string], null, (value: string) => {
            this.setImage( value );
        } );

        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [vector3], null, (value: Vector3) => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: size
        // パラメータ型: vector2 | number
        //   型が vector2 のとき アイコンのピクセルサイズX, Y 順であると解釈
        //   型が number のとき アイコンのピクセルサイズX, Y は同値
        const size_temp = GeoMath.createVector2();
        let   size_type: Type | null;

        let size_tsolver = (curve: Curve) => {
            size_type = AnimUtil.findFirstTypeSupported( curve, [vector2, number] );
            return size_type;
        };

        block.addEntry( "size", [vector2, number], size_tsolver, (value: Vector2 | number) => {
            if ( size_type === vector2 ) {
                this.setSize( value as Vector2 );
            }
            else { // size_type === number
                size_temp[0] = value as number;
                size_temp[1] = value as number;
                this.setSize( size_temp );
            }
        } );
    }


    /**
     * 画像のパスを設定
     * @param image_src  画像のパス
     */
    setImage( image_src: HTMLCanvasElement | HTMLImageElement | string )
    {
        if ( this._image_src !== image_src ) {
            // 画像のパスが変更された
            this._image_src = image_src;
            const resource = (
                // image_src instanceof Resource ? image_src :
                typeof (image_src) === "string" ? new URLResource( image_src, { transform: this._props.transform }) :
                new URLResource( Dom.toBase64String( image_src ), { transform: this._props.transform })
            );
            this._icon = ImageIconEntity.iconLoader.load( resource );
            this._icon.onEnd((item: IconLoaderItem) => {
                    const primitiveProducer = this._owner.getPrimitiveProducer();
                    if ( primitiveProducer ) {
                        primitiveProducer.onImageLoaded( this._icon );
                    }
            });
        }
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
     * アイコンのサイズを指定
     * @param size  アイコンのピクセルサイズ
     */
    setSize( size: Vector2 ) {
        this._setVector2Property( "size", size );
    }


    /**
     */
    private _copyPropertyVector3f( name: string )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            // @ts-ignore
            props[name] = GeoMath.createVector3f( props[name] );
        }
    }

    /**
     */
    private _copyPropertyVector2f( name: string )
    {
        var props = this._props;
        if ( props.hasOwnProperty( name ) ) {
            const value = props[name] as Vector2;
            const arrValue = typeof( value ) === 'number' ? [ value, value ] : value;
            // @ts-ignore
            props[name] = GeoMath.createVector2f( value );
        }
    }

    /**
     */
    private _setVector2Property( name: string, value: Vector2 )
    {
        // @ts-ignore
        var dst = this._props[name];
        if ( !dst ) {
            // @ts-ignore
            this._props[name] = GeoMath.createVector2f( value );
            const primitiveProducer = this._owner.getPrimitiveProducer();
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
        else if ( dst[0] !== value[0] || dst[1] !== value[1] ) {
            // @ts-ignore
            GeoMath.copyVector2( value, dst );
            const primitiveProducer = this._owner.getPrimitiveProducer();
            if ( primitiveProducer ) {
                primitiveProducer.onChangeChildProperty();
            }
        }
    }

    isLoaded() {
        return this._icon.isLoaded();
    }

    get icon() {
        return this._icon;
    }

    draw( context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number ) {
        this._icon.draw( context, x, y, width, height );
    }
}



export const iconLoader = new ImageIconLoader();




/**
 * Pin画像を Canvas 上にレイアウト
 * @internal
 */
class Layout {

    private _owner: PrimitiveProducer;

    private _items: LItem[];

    private _is_valid: boolean;

    private _texture!: Texture;

    private _vertices: number[];

    private _indices: number[];


    /**
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
            this._indices = [];
            return;
        }

        // アイテムの配置の設定とキャンバスサイズの決定
        var size = this._setupLocation( row_layouts );

        this._texture  = this._createTexture( size.width, size.height );
        this._vertices = this._createVertices( size.width, size.height, gocs_array );
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
        return this._texture;
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
     * インデックス配列
     */
    get indices(): number[]
    {
        return this._indices;
    }


    /**
     * レイアウトアイテムのリストを生成
     */
    private _createItemList(): LItem[]
    {
        const map = new Map();

        const items = [];
        let counter = 0;
        for ( let entry of this._owner.getEntity().entries ) {
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
     * @param  width    横幅
     * @param  height   高さ
     * @return テキストテクスチャ
     */
    private _createTexture( width: number, height: number ): Texture
    {
        var context = Dom.createCanvasContext( width, height );

        var items = this._items;
        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            if ( item.is_canceled ) continue;
            item.draw( context );
        }

        const entity = this._owner.getEntity();
        const maskColor = entity.getMaskColor();

        const glenv = entity.scene.glenv;
        const gl = glenv.context;
        const opts: TextureOption = {
            usage: Texture.Usage.ICON,
            mag_filter: maskColor ? gl.NEAREST : gl.LINEAR,
            min_filter: maskColor ? gl.NEAREST : gl.LINEAR,
        };
        return new Texture( glenv, context.canvas, opts );
    }


    /**
     * 頂点配列を生成
     *
     * @param  width       横幅
     * @param  height      高さ
     * @param  gocs_array  GOCS 平坦化配列
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
     * アイテムの配置を設定
     * @param  row_layouts
     * @return キャンバスサイズ
     */
    private _setupLocation( row_layouts: RowLayout[] ): { width: number, height: number }
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
 * レイアウト対象
 * @internal
 */
class LItem {

    entries: { index: number, entry: ImageEntry }[];

    /** テキストの基点（左端） */
    private _pos_x: number;

    /** テキストの基点（ベースライン） */
    private _pos_y: number;

    private _height?: number;

    private _width?: number;

    private _is_canceled: boolean;

    /**
     * @param {mapray.ImageIconEntity.Layout} layout   所有者
     * @param {mapray.ImageIconEntity.Entry}  entry    ImageIconEntityのエントリ
     */
    constructor( layout: Layout )
    {
        this.entries = [];

        this._pos_x = 0;
        this._pos_y = 0;

        this._is_canceled = false;
    }

    add( index: number, entry: ImageIconEntity.ImageEntry ) {
        var size = entry.size;
        if ( this._width === undefined || this._width < size[0] ) this._width = size[0];
        if ( this._height === undefined || this._height < size[1] ) this._height = size[1];
        this.entries.push( { index, entry } );
    }

    /**
     */
    get pos_x(): number
    {
        return this._pos_x;
    }


    /**
     */
    get pos_y(): number
    {
        return this._pos_y;
    }


    /**
     */
    get width(): number
    {
        return this._width === undefined ? 0 : this._width;
    }


    /**
     */
    get height(): number
    {
        return this._height === undefined ? 0 : this._height;
    }


    /**
     * キャンバス上でのテキストの横画素数
     */
    get width_pixel(): number
    {
        return this._width === undefined ? 0 : Math.ceil( this._width );
    }


    /**
     * キャンバス上でのテキストの縦画素数
     */
    get height_pixel(): number
    {
        return this._height === undefined ? 0 : Math.ceil( this._height );
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
        this._pos_y = y;
    }

    draw( context: CanvasRenderingContext2D ) {

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

        width_assumed_total += ImageIconEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        while ( src_items.length > 0 ) {
            var item          = src_items.shift() as LItem;
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
     * 有効なオブジェクトか？
     *
     * 無効のとき、他のメソッドは呼び出せない。
     * @return 有効のとき true, 無効のとき false
     */
    isValid(): boolean
    {
        return this._items.length > 0;
    }


    /**
     */
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

        x += ImageIconEntity.SAFETY_PIXEL_MARGIN;  // 左マージン

        for ( var i = 0; i < items.length; ++i ) {
            var item = items[i];
            item.locate( x, y );
            x += item.width_pixel + ImageIconEntity.SAFETY_PIXEL_MARGIN;  // テキスト幅 + 右マージン
        }
    }

}



} // namespace ImageIconEntity



export default ImageIconEntity;
