import { SpriteProvider } from "./SpriteProvider";
import { IconImageCache } from "./sdfield_cache";
import type { RequestResult, CancelHelper } from "../RequestResult";
import type GLEnv from "../GLEnv";
import { Vector2 } from "../GeoMath";
import { cfa_assert } from "../util/assertion";


type LayoutItem = SpriteProvider.LayoutItem;


/**
 * 追加可能な画像の型
 */
type ImageSource = TexImageSource & CanvasImageSource;


/**
 * スタイルで使用する画像を管理
 */
export class ImageManager {

    private readonly _glenv: GLEnv;
    private readonly _image_map: Map<string, ImageBase>;

    private _image_names: string[] | null;


    /**
     * `SdfImage` 用の画像キャッシュ
     */
    readonly sdf_image_cache: IconImageCache;


    /**
     * レンダリング済みフラグ
     *
     * 現在の仕様では、`ImageManager` インタンス `this` を使ってレンダ
     * リングした後に、`this` に画像を追加・削除することができない。
     *
     * その状況を判定するためのフラグである。
     */
    private _already_rendered: boolean;


    /**
     * 初期化
     */
    constructor( glenv: GLEnv,
                 layout: SpriteProvider.Layout,
                 sheet: SpriteProvider.Sheet )
    {
        this._glenv       = glenv;
        this._image_map   = new Map();
        this._image_names = null;
        this.sdf_image_cache = new IconImageCache( glenv, this );
        this._already_rendered = false;

        // スプライトのアイコンを追加
        const sheet_texture = create_sheet_from_image( glenv, sheet );

        for ( const [id, item] of create_layout_dictionary( layout ) ) {
            const icon_image = new IconImage( id, item, sheet_texture, [sheet.width, sheet.height] );
            this._image_map.set( id, icon_image );
        }
    }


    /**
     * インスタンスに含まれる画像の数を返す。
     */
    get num_images(): number { return this._image_map.size; }


    /**
     * 画像 ID の配列を取得
     */
    getImageNames(): string[]
    {
        if ( this._image_names === null ) {
            // キャッシュがフラッシュされているので再構築
            this._image_names = Array.from( this._image_map.keys() );
        }

        return this._image_names;
    }


    /**
     * レンダリング済みという印を付ける。
     */
    markAsAlreadyRendered(): void
    {
        this._already_rendered = true;
    }


    /**
     * @see [[_already_rendered]]
     */
    private _checkAlreadyRendered(): void
    {
        if ( this._already_rendered ) {
            throw new Error( "Images cannot be added or removed from a style after it has been rendered" );
        }
    }


    /**
     * 画像 `id` を追加
     */
    addImage( id: string,
              src_image: ImageSource,
              options?: Option ): void
    {
        this._checkAlreadyRendered();

        if ( this._image_map.has( id ) ) {
            // すでに id が存在している場合は追加できないという仕様にしている
            throw new Error( `There is already an image with id '${id}'` );
        }

        // SDF 画像として扱うか?
        const is_sdf = options?.sdf ?? false;

        // 画像を生成
        const image = is_sdf ? new SdfImage( id, src_image ) :
                               new IsolatedImage( this._glenv, id, src_image );

        // 画像を追加
        this._image_map.set( id, image );

        // 名前リストのキャッシュをフラッシュ
        this._image_names = null;
    }


    /**
     * 画像 `id` を削除
     */
    removeImage( id: string ): void
    {
        this._checkAlreadyRendered();

        if ( !this._image_map.has( id ) ) {
            // id を持っていないときは何もしない
            return;
        }

        // 辞書から削除
        this._image_map.delete( id );

        // 名前リストのキャッシュをフラッシュ
        this._image_names = null;
    }


    /**
     * 画像 `id` を取得
     */
    findImage( id: string ): ImageBase | undefined
    {
        return this._image_map.get( id );
    }


    /**
     * `SdfImage` インスタンスを取得
     *
     * `id` が `SdfImage` インスタンスであることが事前に分かっていると
     * きに使用できる。
     */
    getSdfImage( id: string ): SdfImage
    {
        const image = this._image_map.get( id );
        cfa_assert( image instanceof SdfImage );

        return image;
    }

}


/**
 * 画像追加のオプション
 */
interface Option {

    /**
     * 色付けと縁取りが可能な画像とするときは `true` を指定する。
     *
     * @defaultValue `false`
     */
    sdf?: boolean;

}


/**
 * スタイルで扱う画像
 */
abstract class ImageBase {

    /**
     * 画像の ID
     */
    readonly id: string;

    protected constructor( id: string )
    {
        this.id = id;
    }

}


/**
 * RGBA 画素データにより描画する画像
 *
 * `image_lower` と `image_upper` の座標系は `texture` 画像の左下を原
 * 点 (0, 0) とし、x 座標は右方向、y 座標は上方向に画素単位で増加する。
 */
export abstract class ColorImage extends ImageBase {

    /**
     * RGBA 画像データを持っているテクスチャ
     */
    readonly texture: WebGLTexture;


    /**
     * `texture` の水平方向と垂直方向の画素数
     */
    readonly texture_size: [number, number];


    /**
     * テクスチャ内での画像領域の下限 (左下)
     */
    readonly image_lower: Vector2;


    /**
     * テクスチャ内での画像領域の上限 (右上)
     */
    readonly image_upper: Vector2;


    /**
     * 初期化
     */
    protected constructor( id: string,
                           texture: WebGLTexture,
                           texture_size: [number, number],
                           image_lower: Vector2,
                           image_upper: Vector2 )
    {
        super( id );

        this.texture      = texture;
        this.texture_size = texture_size;
        this.image_lower  = image_lower;
        this.image_upper  = image_upper;
    }

}


/**
 * スプライトシート上のアイコン画像
 */
class IconImage extends ColorImage {

    constructor( id: string,
                 item: LayoutItem,
                 sheet_texture: WebGLTexture,
                 sheet_size: [number, number] )
    {
        const texture_height = sheet_size[1];

        const image_lower: Vector2 = [item.x, texture_height - item.y - item.height];
        const image_upper: Vector2 = [item.x + item.width, texture_height - item.y];

        super( id, sheet_texture, sheet_size, image_lower, image_upper );
    }

}



/**
 * 個別の画像
 */
class IsolatedImage extends ColorImage {

    constructor( glenv: GLEnv,
                 id: string,
                 image: TexImageSource )
    {
        const image_lower: Vector2 = [0, 0];
        const image_upper: Vector2 = [image.width, image.height];

        const texture = create_sheet_from_image( glenv, image );

        super( id, texture, [image.width, image.height], image_lower, image_upper );
    }

}


/**
 * 色付けと縁取りが可能な画像
 */
export class SdfImage extends ImageBase {

    readonly image: HTMLCanvasElement;

    constructor( id: string,
                 image: ImageSource )
    {
        super( id );

        const canvas = document.createElement( "canvas" );
        canvas.width  = image.width;
        canvas.height = image.height;

        this.image = canvas;

        const context = canvas.getContext( "2d" );

        if ( !context ) {
            throw new Error( "Cannot get context of canvas" );
        }

        context.drawImage( image,
                           0, 0, image.width, image.height );
    }

}


/**
 * ID が重複しないレイアウトアイテムの辞書を作成する。
 *
 * 同じ ID があった場合は後を優先する。
 */
function create_layout_dictionary( layout: SpriteProvider.Layout ): Map<string, LayoutItem>
{
    const dict = new Map<string, LayoutItem>();

    for ( const item of layout ) {
        dict.set( item.id, item );
    }

    return dict;
}


/**
 * RGBA 画像からテクスチャを生成する。
 *
 * スプライトシートまたは `IsolatedImage` 用のテクスチャを生成する。
 *
 * スプライトシートのテクスチャは `IconImage` インスタンスから共有される。
 */
function create_sheet_from_image( glenv: GLEnv,
                                  image: TexImageSource ): WebGLTexture
{
    const      gl = glenv.context;
    const  target = gl.TEXTURE_2D;
    const texture = gl.createTexture();

    if ( texture === null ) {
        throw new Error( "Failed to create texture" );
    }

    gl.bindTexture( target, texture );

    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
    gl.texImage2D( target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );

    gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, gl.LINEAR );

    gl.texParameteri( target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

    gl.bindTexture( target, null );

    return texture;
}


/**
 * 空のスプライトを取得するプロバイダ
 */
class EmptyProvider extends SpriteProvider {

    constructor() {
        super();
    }

    // from SpriteProvider
    override requestLayout(): RequestResult<SpriteProvider.Layout>
    {
        return {
            promise:   Promise.resolve( [] ),
            canceller: () => {},
        };
    }

    // from SpriteProvider
    override requestSheet(): RequestResult<SpriteProvider.Sheet>
    {
        const canvas = document.createElement( "canvas" );
        canvas.width  = 1;
        canvas.height = 1;

        return {
            promise:   Promise.resolve( canvas ),
            canceller: () => {},
        };
    }

}


/**
 * スプライトデータを読み込み `ImageManager` インスタンスを返す。
 *
 * `null` を与えたときは空のスプライトを返す。
 */
export async function
loadImageManager( glenv: GLEnv,
                  provider_or_null: SpriteProvider | null,
                  cancel_helper: CancelHelper ): Promise<ImageManager>
{
    const provider = provider_or_null ?? new EmptyProvider();

    const layout_result = provider.requestLayout();
    const  sheet_result = provider.requestSheet();

    cancel_helper.addCanceller( layout_result.canceller );
    cancel_helper.addCanceller( sheet_result.canceller );

    const [layout, sheet] = await Promise.all( [layout_result.promise,
                                                sheet_result.promise] );

    return new ImageManager( glenv, layout, sheet );
}
