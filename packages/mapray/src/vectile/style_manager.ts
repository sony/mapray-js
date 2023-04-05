/**
 * ベクトル地図のスタイルに関する機能を提供する。
 *
 * @module
 */

import { StyleLayer, UnsupportedLayer, LayerJson } from "./style_layer";
import type { Json, OJson } from "../util/json_type";
import { isObject as json_isObject,
         isArray as json_isArray,
         clone as json_clone } from "../util/json_type";
import type { TileProvider } from "./TileProvider";
import type { SpriteProvider } from "./SpriteProvider";
import { ProviderFactory } from "./ProviderFactory";
import { FeatureState } from "./FeatureState";
import { ImageManager, loadImageManager } from "./image";
import { LayerFilter } from "./mvt_parser";
import type { FeatureState as ExprFeatureState } from "./expression";
import { TraverserManager, TraverseContext } from "./traverser";
import { Renderer } from "./renderer";
import { sdfield_readiness } from "./sdfield";
import { RequestResult, CancelHelper } from "../RequestResult";
import type RenderStage from "../RenderStage";
import Globe from "../Globe";
import type Viewer from "../Viewer";
import { cfa_assert } from "../util/assertion";


/**
 * スタイルファイルのスキーマ Error を生成
 */
function
create_schema_error(): SyntaxError
{
    return new SyntaxError( "style schema error" );
}


/**
 * [[collectStyleInfo]] により収集したソース情報の型
 */
interface SourceInfo {

    /**
     * ベクトルタイルを取得するためのプロバイダ
     */
    tile_provider: TileProvider;


    /**
     * ソースタイル内の使用されるレイヤー ID
     */
    tile_layers: Set<string>;

}


/**
 * [[collectStyleInfo]] により収集したスタイル情報の型
 */
interface CollectedStyleInfo {

    /**
     * ソース ID からソース情報の辞書
     */
    source_dict: Map<string, SourceInfo>;


    /**
     * 表示対象となるレイヤー
     *
     * @remarks レイヤー間の順序は `json_style.layers` と同じである。
     */
    json_layers: OJson[];


    /**
     * スプライト用のプロバイダ
     */
    sprite_provider: SpriteProvider | null;

}


/**
 * タイルのソース名から `TileProvider.MetaData` インスタンスを取得する辞書の型
 */
type TileMetaDict = Map<string, TileProvider.MetaData>;


/**
 * すべての source のメタデータを一括で取得
 */
async function loadMetaData( source_dict: Map<string, SourceInfo>,
                             cancel_helper: CancelHelper ): Promise<TileMetaDict>
{
    type    meta_t = TileProvider.MetaData;
    type request_t = RequestResult<meta_t>;

    const src_ids: string[]            = [];
    const promises: request_t['promise'][] = [];

    // src_ids と promises を同じサイズかつ同じ順序で設定
    for ( const [src_id, src_info] of source_dict ) {
        const request = src_info.tile_provider.requestMeta();
        src_ids.push( src_id );
        promises.push( request.promise );
        cancel_helper.addCanceller( request.canceller );
    }

    // すべての source のメタデータを取得
    const meta_list = await Promise.all( promises );

    const result_dict = new Map();

    for ( let i = 0; i < meta_list.length; ++i ) {
        const metadata = meta_list[i];

        // MetaData に存在するプロパティだけをコピー
        const copied_meta = {
            min_level: metadata.min_level,
            max_level: metadata.max_level,
        };

        result_dict.set( src_ids[i], copied_meta );
    }

    return result_dict;
}


/**
 * スタイルの情報を収集する。
 *
 * @param json_style       - JSON 形式のスタイルデータ
 * @param provider_factory - スタイル上のソースに対応するプロバイダを生成する
 *                           オブジェクト
 *
 * @returns 収集したスタイルの情報
 *
 * 例外は [[StyleManager.create]] を参照のこと。
 */
function
collectStyleInfo( json_style: Json,
                  provider_factory: ProviderFactory ): CollectedStyleInfo
{
    if ( !json_isObject( json_style ) ) {
        throw create_schema_error();
    }

    const json_style_layers = json_style['layers'];  // 必須プロパティ
    if ( !json_isArray( json_style_layers ) ) {
        throw create_schema_error();
    }

    const used_source_dict = new Map<string, SourceInfo>();
    const used_json_layers: OJson[] = [];

    for ( const json_layer of json_style_layers ) {
        if ( !json_isObject( json_layer ) ) {
            throw create_schema_error();
        }

        const src_id       = json_layer['source'];
        const src_layer_id = json_layer['source-layer'];

        if ( typeof src_id       !== 'string' ||
             typeof src_layer_id !== 'string' ) {
            // ソースのレイヤーが指定されていないレイヤーは対象外
            continue;
        }

        // スタイルのソース辞書
        const json_style_sources = json_style['sources'];  // 必須プロパティ

        if ( !json_isObject( json_style_sources ) ) {
            throw create_schema_error();
        }

        const json_source = json_style_sources[src_id];

        if ( json_source === undefined ) {
            throw new Error( `"${src_id}" cannot be found in root.sources` );
        }
        else if ( !json_isObject( json_source ) ) {
            throw create_schema_error();
        }

        if ( json_source['type'] !== 'vector' ) {
            // ソースの形式がベクトル以外のレイヤーは対象外
            continue;
        }

        // 辞書のソース情報を更新
        let src_info = used_source_dict.get( src_id );

        if ( src_info === undefined ) {
            // src_id に対応するソース情報を新規に追加

            const tile_provider = provider_factory.createTileProvider( src_id,
                                                                       json_clone( json_source ) );
            if ( tile_provider === null ) {
                throw new Error( `failed to create tile provider for "${src_id}"` );
            }

            src_info = {
                tile_provider,
                tile_layers: new Set<string>(),
            };

            used_source_dict.set( src_id, src_info )
        }

        src_info.tile_layers.add( src_layer_id );
        used_json_layers.push( json_layer );
    }

    const json_sprite = json_style['sprite'];

    if ( json_sprite !== undefined && typeof json_sprite !== 'string' ) {
        throw create_schema_error();
    }

    return {
        source_dict: used_source_dict,
        json_layers: used_json_layers,
        sprite_provider: provider_factory.createSpriteProvider( json_sprite ),
    };
}


/**
 * [[StyleLayer]] の具象クラスのインスタンスを生成する関数の型
 *
 * @param owner       生成されるレイヤーを所有する [[StyleManager]] インスタンス
 * @param json_layer  JONS 形式のレイヤーデータ
 *
 * @internal
 */
export interface LayerCreator {

    ( owner:   StyleManager,
      json_layer: LayerJson ): StyleLayer;

}


/**
 * `layer_type` 型の [[StyleLayer]] インスタンスを生成する関数
 * `creator` を登録する。
 *
 * また、そのモジュールが準備可能になったかどうかを監視するためのオブ
 * ジェクト `readiness` を登録する。
 *
 * @param layer_type - レイヤー型を表す文字列
 * @param creator    - [[StyleLayer]] インスタンスを生成する関数
 * @param readiness  - モジュールが準備可能になったかどうかを監視するためのオブジェクト
 *
 * @internal
 */
export function registerLayerModule( layer_type: string,
                                     creator: LayerCreator,
                                     readiness: Promise<void> ): void
{
    registered_layer_creators.set( layer_type, creator );
    registered_module_readiness.push( readiness );
}


/**
 * 登録済みの [[StyleLayer]] インスタンスを生成する関数
 */
const registered_layer_creators = new Map<string, LayerCreator>();


/**
 * 登録済みのモジュールの準備状態を監視するためのオブジェクト
 */
const registered_module_readiness: Promise<void>[] = [sdfield_readiness];


/**
 * ベクトル地図のスタイル全体を管理する。
 */
class StyleManager {

    /**
     * インスタンスを生成する。
     *
     * 生成された [[StyleManager]] インスタンスは `viewer` にのみ設定
     * することができる。
     *
     * 例外のスローは `Promise` の拒否を通して通知される。
     *
     * @param viewer           - 設定することが可能な [[Viewer]] インスタンス
     * @param json_style       - JSON 形式のスタイルデータ
     * @param provider_factory - プロバイダを生成するためのオブジェクト
     *
     * @returns リクエスト結果
     *
     * @throws Error
     *
     * - あるレイヤーの `source` プロパティに対するソース情報が存在し
     *   なかったとき
     *
     * - あるレイヤーの `source` プロパティに対するソース情報からプロ
     *   バイダを生成することができなかった
     *
     * - 何れかのソースに対するメタ情報を取得することができなかったとき
     *
     * - スプライトのリソースを取得することができなかったとき
     *
     * - レイヤーモジュールの初期化に失敗したとき
     *
     * @throws SyntaxError
     *
     * `json_style` の構造がスタイルのスキーマに適合しないとき。
     */
    static create( viewer: Viewer,
                   json_style: OJson,
                   provider_factory: ProviderFactory ): RequestResult<StyleManager>
    {
        const cancel_helper = new CancelHelper();

        return {

            promise: StyleManager._create( viewer,
                                           json_style,
                                           provider_factory,
                                           cancel_helper ),

            canceller: () => cancel_helper.cancel(),

        };
    }


    /** create() の実装 */
    private static async _create( viewer: Viewer,
                                  json_style: OJson,
                                  provider_factory: ProviderFactory,
                                  cancel_helper: CancelHelper ): Promise<StyleManager>
    {
        // すべてのモジュールが使えるようになるまで待つ
        await Promise.all( registered_module_readiness );

        // スタイルの情報を収集する
        const style_info = collectStyleInfo( json_style, provider_factory );

        // source のメタ情報の辞書
        const meta_dict = await loadMetaData( style_info.source_dict, cancel_helper );

        // スプライト情報を取得
        const image_manager = await loadImageManager( viewer.glenv, style_info.sprite_provider, cancel_helper );

        return new StyleManager( viewer, style_info, meta_dict, image_manager );
    }


    /**
     * インスタンスの初期化する。
     *
     * [[create]], [[__createDefualtInstance]] が使用する。
     *
     * @privateRemarks
     *
     * `__createDefualtInstance` から呼び出されるときは `viewer` が構
     * 築中である可能性がある。その場合でも動作するように実装する必要
     * がある。
     *
     * @internal
     */
    private constructor( viewer: Viewer,
                         style_info: CollectedStyleInfo,
                         tile_meta_dict: TileMetaDict,
                         image_manager: ImageManager )
    {
        this._viewer  = viewer;
        this._sources = new Map();
        this._layers  = new Map();
        this._feature_states    = new Map();
        this._traverser_manager = new TraverserManager( this );
        this.__image_manager    = image_manager;
        this._max_tiles_requested = StyleManager._DEFAULT_MAX_TILES_REQUESTED;
        this._num_tiles_requested = 0;

        this.parseSources( style_info.source_dict, tile_meta_dict );
        this.parseLayers( style_info.json_layers );
        this._traverser_manager.addTraversers( this._sources.values() );
    }


    /**
     * `this` が設定されている [[Viewer]] インスタンスを取得する。
     *
     * `this` がどの [[Viewer]] インスタンスにも設定されていないときは
     * `null` を得る。
     *
     * @see [[Viewer.setVectileManager]]
     */
    get viewer(): Viewer
    {
        return this._viewer;
    }


    /**
     * `src_info_list` の各ソース情報を解析して `Source` インスタンス
     * を生成し、 `this._sources` に追加する。
     *
     * `tile_meta_dict` はソース名からメタ情報を取得するための辞書である。
     */
    private parseSources( src_info_list: Iterable<[string, SourceInfo]>,
                          tile_meta_dict: TileMetaDict ): void
    {
        for ( const [src_id, src_info] of src_info_list ) {
            const metadata = tile_meta_dict.get( src_id );
            cfa_assert( metadata );  // src_info_list が元になっているので存在する

            const source = new Source( src_info.tile_provider, metadata, src_info.tile_layers );
            this._sources.set( src_id, source );
        }
    }


    /**
     * `json_layers` の各レイヤーデータを解析して [[StyleLayer]] イン
     * スタンスを生成し、`this._layers` に追加する。
     */
    private parseLayers( json_layers: Iterable<OJson> ): void
    {
        for ( const json_layer of json_layers ) {
            const layer_id   = json_layer['id'];
            const layer_type = json_layer['type'];

            if ( typeof layer_id !== 'string' || typeof layer_type !== 'string' ) {
                // json_layer の id プロパティまたは type プロパティの構文が不正
                // プロパティが存在しないか、値が文字列ではない
                throw new SyntaxError( "Layer's 'id' or 'type' property does not match the style schema." );
            }

            if ( this._layers.has( layer_id ) ) {
                // json_layer の id プロパティの値が重複している
                // 仕様書には Unique layer name という説明
                throw new Error( "Value of the layer's 'id' property is duplicated." );
            }

            // レイヤーのインスタンを生成
            let style_layer: StyleLayer;

            const create_layer = registered_layer_creators.get( layer_type );

            // フローから json_layer を LayerJson と判断されなかったので as を使う

            if ( create_layer ) {
                // 対応するレイヤー型
                style_layer = create_layer( this, json_layer as LayerJson );
            }
            else {
                // 非対応のレイヤー型
                style_layer = new UnsupportedLayer( this, json_layer as LayerJson );
                console.warn( `Layer type '${layer_type}' is not supported.` );
            }

            // レイヤーのインスタンを登録
            this._layers.set( layer_id, style_layer );
        }
    }


    /**
     * `id` に対応する `Source` インスタンスを取得する。
     *
     * モジュール内部でしか使用しない。
     *
     * @internal
     */
    public __getSource( id: string ): Source | undefined
    {
        return this._sources.get( id );
    }


    /**
     * インスタンスに含まれるレイヤーの数を返す。
     */
    get num_layers(): number { return this._layers.size; }


    /**
     * [[FeatureState]] インスタンスの数を返す。
     */
    get num_feature_states(): number { return this._feature_states.size; }


    /**
     * レイヤー ID の反復子を取得する。
     *
     * @category Style Layer
     */
    getLayerIds(): IterableIterator<string>
    {
        return this._layers.keys();
    }


    /**
     * レイヤーの反復子を取得する。
     *
     * @category Style Layer
     */
    getLayers(): IterableIterator<StyleLayer>
    {
        return this._layers.values();
    }


    /**
     * レイヤー ID からレイヤーを取得する。
     *
     * レイヤー ID が `id` と一致するレイヤーが存在すればインスタンス
     * を返す。
     *
     * そのようなレイヤーが存在しない場合は `undefined` を返す。
     *
     * @param id  レイヤーの ID
     *
     * @category Style Layer
    */
    getLayer( id: string ): StyleLayer | undefined
    {
        return this._layers.get( id );
    }


    /**
     * 指定 ID の [[FeatureState]] インスタンスを確保する。
     *
     * フィーチャ ID が `fid` であるフィーチャのための
     * [[FeatureState]] インスタンスを確保する。
     *
     * 具体的には、インスタンスがすでに存在すれば取得して、存在しなけ
     * れば生成して返す。
     *
     * @category Feature State
     */
    ensureFeatureState( fid: number ): FeatureState
    {
        let fstate = this._feature_states.get( fid );

        if ( fstate === undefined ) {
            // fid は存在しないので新規に生成する
            fstate = FeatureState.__create( this, fid );
            this._feature_states.set( fid, fstate );
        }

        return fstate;
    }


    /**
     * 指定 ID の [[FeatureState]] インスタンスを取得する。
     *
     * フィーチャ ID が `fid` であるフィーチャのための
     * [[FeatureState]] インスタンスを取得する。
     *
     * インスタンスが存在しなければ `undefined` を返す。
     *
     * @category Feature State
     */
    getFeatureState( fid: number ): FeatureState | undefined
    {
        return this._feature_states.get( fid );
    }


    /**
     * 保有する [[FeatureState]] インスタンスを列挙するオブジェクトを
     * 取得する。
     *
     * @category Feature State
     */
    getFeatureStates(): IterableIterator<FeatureState>
    {
        return this._feature_states.values();
    }


    /**
     * 保有する [[FeatureState]] インスタンスをすべて削除する。
     *
     * 削除された [[FeatureState]] インスタンスは無効となり、どのよう
     * な操作も行えなくなる。
     *
     * @category Feature State
     */
    clearFeatureStates(): void
    {
        const states = Array.from( this._feature_states.values() );

        for ( const fstate of states ) {
            this.deleteFeatureState( fstate );
        }

        console.assert( this._feature_states.size == 0 );
    }


    /**
     * @param fid  削除する [[FeatureState]] インスタンスの ID
     */
    deleteFeatureState( fid: number ): void;


    /**
     * @param fstate  削除する [[FeatureState]] インスタンス
     */
    deleteFeatureState( fstate?: FeatureState ): void;


    /**
     * 指定した [[FeatureState]] インスタンスを削除する。
     *
     * `fid` に対応する [[FeatureState]] インスタンスが `this` に存在
     * しない、または `fstate` を省略したときは何も行わない。
     *
     * 削除された [[FeatureState]] インスタンスは無効となり、どのよう
     * な操作も行うことができなくなる。
     *
     * @category Feature State
     */
    deleteFeatureState( fid_or_fstate: number | FeatureState | undefined ): void
    {
        let fstate: FeatureState | undefined;

        if ( typeof fid_or_fstate === 'number' ) {
            const fid = fid_or_fstate;
            fstate = this._feature_states.get( fid );
        }
        else {
            fstate = fid_or_fstate;
        }

        if ( fstate !== undefined ) {
            const fid = fstate.feature_id;
            fstate.clearProperties();
            this._feature_states.delete( fid );
        }
    }


    /**
     * インスタンスに含まれる画像の数を返す。
     */
    get num_images(): number { return this.__image_manager.num_images; }


    /**
     * 画像を追加する。
     *
     * `src_image` を元にした画像を `this` に追加する。
     *
     * 追加した画像の ID は `id` となる。
     *
     * @param id        - 画像の ID
     * @param src_image - 元画像
     * @param options   - 追加オプション
     *
     * @throws `Error`  すでに `id` の画像が `this` に存在するとき。
     *
     * @category Image
     */
    addImage( id: string,
              src_image: StyleManager.ImageSource,
              options?: StyleManager.ImageOption ): void
    {
        this.__image_manager.addImage( id, src_image, options );
    }


    /**
     * 画像を削除する。
     *
     * ID が `id` である画像を `this` から削除する。
     *
     * `id` の画像が `this` に存在しないときは何も行わない。
     *
     * @param id - 画像の ID
     *
     * @remarks
     *
     * 画像を `this` から削除した後に、[[addImage]] により ID が `id`
     * である別の画像を `this` に追加することができる。
     *
     * @category Image
     */
    removeImage( id: string ): void
    {
        this.__image_manager.removeImage( id );
    }


    /**
     * 画像の有無を確認する。
     *
     * ID が `id` である画像が `this` に存在するかどうかを確認する。
     *
     * @param id - 画像の ID
     *
     * @returns 存在するとき `true`, それ以外のとき `false`
     *
     * @category Image
     */
    hasImage( id: string ): boolean
    {
        return this.__image_manager.findImage( id ) !== undefined;
    }


    /**
     * すべての画像の ID を取得する。
     *
     * `this` が持つすべての画像の ID に対する、反復可能な反復子オブジェクトを返す。
     *
     * @returns 画像 ID の反復可能な反復子オブジェクト
     *
     * @category Image
     */
    getImageIDs(): IterableIterator<string>
    {
        return this.__image_manager.getImageNames().values();
    }


    /**
     * 指定したフィーチャ ID の [[ExprFeatureState]] インスタンスを検
     * 索する。
     *
     * @internal
     */
    public __findExprFeatureState( fid: number ): ExprFeatureState | undefined
    {
        const fstate = this._feature_states.get( fid );
        return (fstate !== undefined) ? fstate.__content : undefined;
    }


    /**
     * スタイルレイヤーの描画処理
     *
     * @param stage - 現行のレンダリングステージ
     * @param globe - 参照する [[Globe]] インスタンス
     *
     * @internal
     */
    public draw( stage: RenderStage,
                 globe: Globe ): void
    {
        const context = new TraverseContext( this, stage, globe );

        for ( const traverser of this._traverser_manager.enumerate() ) {
            traverser.run( context );
        }

        const renderer = new Renderer( stage, context.primitives );
        renderer.run( stage );
    }


    /**
     * ベクトルタイルが想定する解像度
     *
     * @internal
     */
    public getResolution(): number
    {
        return 256;
    }


    /**
     * [[StyleManager]] インスタンスのすべての処理を取り消す。
     *
     * このメソッドを呼び出した後に、再び `this` を [[Viewer]] インス
     * タンスに設定することができる。
     *
     * @param globe - [[Viewer]] インスタンスが保持する [[Globe]]
     *                インスタンス
     *
     * @internal
     * このメソッドは [[Viewer]] が呼び出す。
     */
    public __cancel( globe: Globe ): void
    {
        const cancelFlakeRecur = ( flake: Globe.Flake ) => {
            // flake 自身を取り消す
            flake.cancelStyleFlake();

            // flake の子孫を取り消す
            for ( const child of flake.children ) {
                if ( child !== null ) {
                    cancelFlakeRecur( child );
                }
            }
        };

        if ( globe.status === Globe.Status.READY ) {
            // Globe 内の StyleFlake のリクエストを取り消し、StyleFlake
            // インスタンスを消去する
            cancelFlakeRecur( globe.root_flake );
        }

        cfa_assert( this._num_tiles_requested === 0 );
    }


    /**
     * タイルデータをリクエストできるかどうかを返す。
     *
     * @internal
     * [[StyleFlake._canRequestTile]] から呼び出される。
     */
    public __canRequestTile(): boolean
    {
        return this._num_tiles_requested < this._max_tiles_requested;
    }


    /**
     * リクエスト中のタイルを数えるための操作
     *
     * @param delta - タイル数の増減
     *
     * @internal
     * [[StyleFlake._countTileRequested]] から呼び出される。
     */
    public __countTileRequested( delta: number ): void
    {
        this._num_tiles_requested += delta;
    }


    private _viewer: Viewer;

    private readonly        _sources: Map<string, Source>;
    private readonly         _layers: Map<string, StyleLayer>;
    private readonly _feature_states: Map<number, FeatureState>;

    private readonly _traverser_manager: TraverserManager;

    /**
     * 画像管理
     *
     * @internal
     */
    public readonly __image_manager: ImageManager;

    /**
     * 同時にリクエストできる最大の mvt タイル数
     */
    private readonly _max_tiles_requested;

    /**
     * 現在リクエスト中の mvt タイル数
     */
    private _num_tiles_requested;

    /**
     * [[_max_tiles_requested]] の既定値
     */
    private static readonly _DEFAULT_MAX_TILES_REQUESTED = 50;

}


namespace StyleManager {


/**
 * 追加可能な画像の型
 *
 * @see [[StyleManager.addImage]]
 */
export type ImageSource = TexImageSource & CanvasImageSource;


/**
 * 画像追加時のオプションの型
 *
 * @see [[StyleManager.addImage]]
 */
export interface ImageOption {

    /**
     * 色付けと縁取りが可能な画像とするときは `true` を指定する。
     * その場合、元画像の色は無視され、アルファ値のみが参照される。
     *
     * @defaultValue `false`
     */
    sdf?: boolean;

}


}


/**
 * タイルデータのソースデータを表現する。
 */
export class Source {

    /**
     * ソースに対応するデータプロバイダ
     */
    public readonly tile_provider: TileProvider;


    /**
     * ソースに対応するメタ情報
     */
    public readonly metadata: TileProvider.MetaData;


    /**
     * タイルデータを取り出すためのフィルタ
     */
    public readonly layer_filter?: LayerFilter;


    /**
     * 初期化
     *
     * @param provider    - ソースデータに対応するプロバイダ
     * @param metadata    - `provider` により得たメタデータの複製
     * @param tile_layers - 実際に読み込むタイルのレイヤー (省略時はすべ
     *                      てのレイヤーを読み込む)
     */
    constructor( tile_provider: TileProvider,
                 metadata: TileProvider.MetaData,
                 tile_layers?: Iterable<string> )
    {
        this.tile_provider = tile_provider;
        this.metadata      = metadata;

        // 指定されていればレイヤーのフィルターを設定
        if ( tile_layers ) {
            const dict = new Set<string>();

            for ( const id of tile_layers ) {
                dict.add( id );
            }

            this.layer_filter = (name => dict.has( name ));
        }
    }

}


export { StyleManager };
