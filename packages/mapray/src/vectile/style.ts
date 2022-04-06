/**
 * ベクトル地図のスタイルに関する機能を提供する。
 *
 * @module
 */

import { Area } from "../AreaUtil";
import { Json, OJson } from "../util/json_type";
import * as json from "../util/json_type";
import { Provider } from "./provider";
import { ProviderFactory } from "./ProviderFactory";
import { LayerFilter, parseTile } from "./mvt_parser";
import { GeomType, Context as ExprContext, FeatureState as ExprFeatureState } from "./expression";
import { Property, Specification as PropSpec } from "./property";
import { TileLayer, Feature } from "./tile_layer";
import { TraverserManager, TraverseContext } from "./traverser";
import { Renderer } from "./renderer";
import type RenderStage from "../RenderStage";
import type Globe from "../Globe";
import type Primitive from "../Primitive";
import type { Vector4 } from "../GeoMath";
import type DemSampler from "../DemSampler";
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
    provider: Provider;


    /**
     * ソースタイル内の使用されるレイヤー ID
     */
    tile_layers: Set<string>;

}


/**
 * [[collectStyleInfo]] により収集したスタイル情報の型
 */
interface StyleInfo {

    /**
     * ソース ID からソース情報の辞書
     */
    source_dict: Map<string, SourceInfo>;


    /**
     * 表示対象となるレイヤー
     *
     * @remarks レイヤー間の順序は `json_root.layers` と同じである。
     */
    json_layers: OJson[];

}


/**
 * スタイルの情報を収集する。
 *
 * @param json_root         JSON 形式のスタイルデータ
 * @param provider_factory  スタイル上のソースに対応するプロバイダを生成する
 *                          オブジェクト
 *
 * @returns 収集したスタイルの情報
 *
 * 例外は [[StyleManager.constructor]] を参照のこと。
 */
function
collectStyleInfo( json_root:        Json,
                  provider_factory: ProviderFactory ): StyleInfo
{
    if ( !json.isObject( json_root ) ) {
        throw create_schema_error();
    }

    const json_root_layers = json_root['layers'];  // 必須プロパティ
    if ( !json.isArray( json_root_layers ) ) {
        throw create_schema_error();
    }

    const used_source_dict = new Map<string, SourceInfo>();
    const used_json_layers: OJson[] = [];

    for ( const json_layer of json_root_layers ) {
        if ( !json.isObject( json_layer ) ) {
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
        const json_root_sources = json_root['sources'];  // 必須プロパティ

        if ( !json.isObject( json_root_sources ) ) {
            throw create_schema_error();
        }

        const json_source = json_root_sources[src_id];

        if ( json_source === undefined ) {
            throw new Error( `"${src_id}" cannot be found in root.sources` );
        }
        else if ( !json.isObject( json_source ) ) {
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

            const provider = provider_factory.create( src_id,
                                                      json.clone( json_source ) );
            if ( provider === null ) {
                throw new Error( `failed to create provider for "${src_id}"` );
            }

            src_info = {
                provider:    provider,
                tile_layers: new Set<string>(),
            };

            used_source_dict.set( src_id, src_info )
        }

        src_info.tile_layers.add( src_layer_id );
        used_json_layers.push( json_layer );
    }

    return {
        source_dict: used_source_dict,
        json_layers: used_json_layers,
    };
}


/**
 * JONS 形式のレイヤーデータの型
 *
 * <https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/>
 *
 * @internal
 */
export type LayerJson = {

    /** レイヤー ID */
    id: string;

    /** レイヤー型 */
    type: string;

} & OJson;


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
 * @param layer_type  レイヤー型を表す文字列
 * @param creator     [[StyleLayer]] インスタンスを生成する関数
 *
 * @internal
 */
export function registerLayerCreator( layer_type: string,
                                      creator:    LayerCreator ): void
{
    registered_layer_creators.set( layer_type, creator );
}


/**
 * 登録済みの [[StyleLayer]] インスタンスを生成する関数
 */
const registered_layer_creators = new Map<string, LayerCreator>();


/**
 * ベクトル地図のスタイル全体を管理する。
 */
export class StyleManager {

    /**
     * フレーム内で `FeatureState` インスタンスの内容が変更された可能
     * 性のあるフィーチャ ID の記録である。
     *
     * @internal
     */
    public readonly __modified_fstates: Set<number>;


    /**
     * インスタンスの初期化する。
     *
     *  @param json_root         JSON 形式のスタイルデータ
     *  @param provider_factory  各レイヤーのソースに対応するプロバイダ
     *                           を生成するためのオブジェクト
     *
     * @throws Error
     *
     * 以下の何れかのときスローする。
     *
     * - あるレイヤーの `source` プロパティに対するソース情報が存在し
     *   なかったとき
     *
     * - あるレイヤーの `source` プロパティに対するソース情報からプロ
     *   バイダを生成することができなかった
     *
     * @throws SyntaxError
     *
     * `json_root` の構造がスタイルのスキーマに適合しないとき。
     */
    constructor( json_root:        OJson,
                 provider_factory: ProviderFactory )
    {
        this._sources = new Map();
        this._layers  = new Map();
        this._feature_states    = new Map();
        this.__modified_fstates = new Set();
        this._traverser_manager = new TraverserManager( this );

        const style_info = collectStyleInfo( json_root, provider_factory );

        this.parseSources( style_info.source_dict );
        this.parseLayers( style_info.json_layers );
    }


    /**
     * 無レイヤーの StyleManager インスタンスを生成する。
     *
     * @internal
     */
    public static __createDefualtInstance(): StyleManager
    {
        // 空の style データ
        const style = {
            layers: [],
            sources: {}
        };

        // 何も作ることのできない ProviderFactory
        const factory = new class extends ProviderFactory {

            constructor() {
                super();
            }

            override create( _source_id:   string,
                             _json_source: OJson ): Provider | null
            {
                return null;
            }

        }

        return new StyleManager( style, factory );
    }


    /**
     * `src_info_list` の各ソース情報を解析して `Source` インスタンス
     * を生成し、 `this._sources` に追加する。
     */
    private parseSources( src_info_list: Iterable<[string, SourceInfo]> ): void
    {
        for ( const [src_id, src_info] of src_info_list ) {
            const source = new Source( src_info.provider, src_info.tile_layers );
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

        for ( const traverser of this._traverser_manager.enumerate( this._sources.values() ) ) {
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
     * @internal
     */
    public __cancel(): void
    {
        this._traverser_manager.cancel();
        // TODO: その他の処理も
    }


    private readonly        _sources: Map<string, Source>;
    private readonly         _layers: Map<string, StyleLayer>;
    private readonly _feature_states: Map<number, FeatureState>;

    private readonly _traverser_manager: TraverserManager;

}


/**
 * 特定のフィーチャに独自のプロパティを割り当てる。
 */
export class FeatureState {

    /**
     * 起源となる [[StyleManager]] インスタンス
     */
    public readonly style_manager: StyleManager;


    /**
     * 対応するフィーチャの ID
     */
    public readonly feature_id: number;


    /**
     * プロパティ評価用のフィーチャ状態
     *
     * @internal
     */
    public readonly __content: ExprFeatureState;


    /**
     * 保有するプロパティの数
     */
    get num_properties(): number
    {
        return this._pid_set.size;
    }


    /**
     * プロパティの値を設定する。
     *
     * `pid` に対応するプロパティの値を `value` に設定する。
     *
     * プロパティが存在しないときは、新規にプロパティを生成して値を
     * `value` に設定する。
     */
    setValue( pid:   string,
              value: unknown ): void
    {
        if ( this._pid_set.has( pid ) ) {
            // すでに存在するプロパティ
            if ( (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean')
                || this.__content[pid] !== value ) {
                // 値が変更される可能性がある
                // TODO: 判定方法を検討
                this.__content[pid] = value;
                this.modified();
            }
        }
        else {
            // 新規追加
            this._pid_set.add( pid );
            this.__content[pid] = value;
            this.modified();
        }
    }


    /**
     * プロパティの値を取得する。
     *
     * `pid` に対応するプロパティの値を取得する。
     *
     * プロパティが存在しない場合は `undefined` を返す。
     */
    getValue( pid: string ): unknown | undefined
    {
        return this.__content[pid];
    }


    /**
     * 所有するプロパティの ID を列挙するオブジェクトを取得する。
     */
    getPropertyIds(): IterableIterator<string>
    {
        return this._pid_set.values();
    }


    /**
     * 指定したプロパティの所有を確認する。
     *
     * `pid` に対応するプロパティを所有していれば `true`, 所有していな
     * ければ `false` を返す。
     */
    hasProperty( pid: string ): boolean
    {
        return this._pid_set.has( pid );
    }


    /**
     * 所有するすべてのプロパティを削除する。
     */
    clearProperties(): void
    {
        for ( const pid of this._pid_set ) {
            delete this.__content[pid];
        }

        if ( this._pid_set.size > 0 ) {
            // 何かのプロパティが削除された
            this.modified();
        }

        this._pid_set.clear();
    }


    /**
     * 指定したプロパティを削除する。
     *
     * `pid` に対応するプロパティを削除する。
     *
     * そのプロパティが存在しなければ何もしない。
     */
    deleteProperty( pid: string ): void
    {
        if ( this._pid_set.has( pid ) ) {
            delete this.__content[pid];
            this._pid_set.delete( pid );
            this.modified();
        }
    }


    /**
     * 内部用のインスタンス生成
     *
     * @internal
     */
    public static __create( owner:      StyleManager,
                            feature_id: number ): FeatureState
    {
        return new FeatureState( owner, feature_id );
    }


    private constructor( owner: StyleManager,
                         feature_id: number )
    {
        this.style_manager = owner;
        this.feature_id    = feature_id;
        this._pid_set      = new Set();
        this.__content     = {};
    }


    /**
     * プロパティが変更された可能性があるとき呼び出す。
     */
    private modified(): void
    {
        this.style_manager.__modified_fstates.add( this.feature_id );
    }


    private readonly _pid_set: Set<string>;

}


/**
 * タイルデータのソースデータを表現する。
 */
export class Source {

    /**
     * ソースに対応するデータプロバイダ
     */
    public readonly provider: Provider;


    /**
     * タイルデータを取り出すためのフィルタ
     */
    public readonly layer_filter?: LayerFilter;


    /**
     * @param provider     ソースデータに対応するプロバイダ
     * @param tile_layers  実際に読み込むタイルのレイヤー (省略時はすべ
     *                     てのレイヤーを読み込む)
     */
    constructor( provider:             Provider,
                 tile_layers?: Iterable<string> )
    {
        this.provider = provider;

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


/**
 * [[LayerFlake]] インスタンス単位で変化するプロパティに関するデータ
 */
interface FlakePropertyData {

    /**
     * すべてのプロパティ
     *
     * 非データ式 (fdata=0, fstate=0)
     */
    readonly cached_properties: Array<Property>;


    /**
     * paint カテゴリのプロパティ
     */
    readonly cached_paint_properties: Array<Property>;


    /**
     * layout カテゴリのプロパティ
     */
    readonly cached_layout_properties: Array<Property>;

}


/**
 * [[LayerFeature]] インスタンス単位で変化するプロパティに関するデータ
 */
interface FeaturePropertyData {

    /**
     * すべてのプロパティ
     *
     * データ式 (fdata=1 or fstate=1)
     */
    readonly cached_properties: Array<Property>;


    /**
     * paint カテゴリのプロパティ
     *
     * `cached_properties` に含まれ layout=0 のもの、
     * ただし fdata=1, fstate=0, zoom=0 を除外する。
     *
     * つまり (fdata=1, zoom=1) or fstate=1 のみ含まれる。
     */
    readonly cached_paint_properties: Array<Property>;


    /**
     * layout カテゴリのプロパティ
     *
     * `cached_properties` に含まれ layout=1 のもの、
     * ただし fdata=1, fstate=0, zoom=0 を除外する。
     *
     * つまり fdata=1, fstate=0, zoom=1 のみ含まれる。
     */
    readonly cached_layout_properties: Array<Property>;

}


/**
 * ベクトル地図スタイルのレイヤーを表現する。
 *
 * 各スタイルレイヤー型の実装では [[StyleLayer]], [[LayerFlake]],
 * [[LayerFeature]] の具象クラスをセットで定義する。
 *
 * これらインスタンス間の動的関係は `vectile.asta` のシーケンス図
 * "LayerFlake 初期評価" と "LayerFlake 再評価" を参照のこと。
 *
 */
export abstract class StyleLayer {

    /**
     * このレイヤーの起源である [[StyleManager]] インスタンス
     */
    public readonly style_manager: StyleManager;


    /**
     * スタイルに記述されたレイヤーの ID
     *
     * [Layers](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/) の
     * [id](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#id)
     * プロパティの値である。
     */
    public readonly id: string;


    /**
     * スタイルに記述されたレイヤーの型
     *
     * [Layers](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/) の
     * [type](https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/#id)
     * プロパティの値である。
     */
    public readonly type: string;


    /**
     * レイヤーが使用するソースのオブジェクト
     *
     * @internal
     */
    public readonly __source_inst: Source;


    /**
     * レイヤーが使用するタイル内のレイヤー名
     *
     * @internal
     */
    public readonly __source_layer: string;


    /**
     * レイヤーの `filter` プロパティ
     *
     * @internal
     */
    public readonly __filter: Property;


    /**
     * `LayerFlake` インスタンス単位で変化するプロパティに関するデータ
     *
     * @internal
     */
    public readonly __flake_property_data: FlakePropertyData;


    /**
     * フィーチャ単位で変化するプロパティに関するデータ
     *
     * @internal
     */
    public readonly __feature_property_data: FeaturePropertyData;


    /**
     * インスタンスの初期化する。
     *
     * @internal
     */
    protected constructor( owner:      StyleManager,
                           json_layer: LayerJson,
                           prop_specs: Iterable<PropSpec> )
    {
        const source_id = json_layer['source'];
        if ( typeof source_id !== 'string' ) {
            throw Error( "Vector tile layer requires a 'source' property." );
        }

        const source_inst = owner.__getSource( source_id );
        if ( !source_inst ) {
            throw Error( `No source instance with name '${source_id}' found.` );
        }

        const source_layer = json_layer['source-layer'];
        if ( typeof source_layer !== 'string' ) {
            throw Error( "Vector tile layer requires a 'source-layer' property." );
        }

        const json_layout = json_layer['layout'] || {};
        if ( !json.isObject( json_layout ) ) {
            throw Error( "Layer's 'layout' property is invalid type." );
        }

        const json_paint = json_layer['paint'] || {};
        if ( !json.isObject( json_paint ) ) {
            throw Error( "Layer's 'paint' property is invalid type." );
        }

        const visibility = json_layout['visibility'] || 'visible';

        const filter_pspec: PropSpec = {
            name:         'filter',
            category:     'layout',
            value_type:   'boolean',
            default_value: true
        };

        const filter = new Property( filter_pspec, json_layer['filter'] );

        if ( filter.hasFState() ) {
            // filter プロパティの評価値はフィーチャ状態の変化を想定しない
            throw Error( "Layer's 'filter' property cannot use the 'feature-state' operator." );
        }

        const properties            = new Map<string, Property>();
        const evaluated_value_cache = new Map<Property, unknown>();

        const flake_property_data: FlakePropertyData = {
            cached_properties:        [],
            cached_paint_properties:  [],
            cached_layout_properties: [],
        }

        const feature_property_data: FeaturePropertyData = {
            cached_properties:        [],
            cached_paint_properties:  [],
            cached_layout_properties: [],
        }

        for ( const prop_spec of prop_specs ) {
            // layout または paint からプロパティ値を取得
            const json_prop = (prop_spec.category === 'layout') ?
                json_layout[prop_spec.name] : json_paint[prop_spec.name];

            const property = new Property( prop_spec, json_prop );

            if ( property.isLayoutType() && property.hasFState() ) {
                // layout 内のプロパティの評価値はフィーチャ状態の変化を想定しない
                throw Error( "Layer's '${property.name}' property cannot use the 'feature-state' operator." );
            }

            // プロパティを登録
            properties.set( prop_spec.name, property );

            if ( property.hasFData() || property.hasFState() ) {
                // データ式 (fdata=1 or fstate=1)
                feature_property_data.cached_properties.push( property );

                // fdata=1, fstate=0, zoom=0 のプロパティは除外
                const is_excluded = property.hasFData() && !property.hasFState() && !property.hasZoom();

                if ( !is_excluded ) {
                    if ( property.isLayoutType() ) {
                        feature_property_data.cached_layout_properties.push( property );
                    }
                    else {
                        feature_property_data.cached_paint_properties.push( property );
                    }
                }
            }
            else {
                // 非データ式 (fdata=0, fstate=0)
                if ( property.hasZoom() ) {
                    // 非データ式で zoom=1
                    flake_property_data.cached_properties.push( property );

                    if ( property.isLayoutType() ) {
                        flake_property_data.cached_layout_properties.push( property );
                    }
                    else {
                        flake_property_data.cached_paint_properties.push( property );
                    }
                }
                else {
                    // 非データ式で zoom=0 (定数)
                    // 定数値のプロパティと値を登録
                    evaluated_value_cache.set( property, property.evaluate( { zoom: 0 } ) );
                }
            }
        }

        this.style_manager  = owner;
        this.id             = json_layer['id'];
        this.type           = json_layer['type'];
        this.__source_inst  = source_inst;
        this.__source_layer = source_layer;
        this.__filter       = filter;
        this.__flake_property_data   = flake_property_data;
        this.__feature_property_data = feature_property_data;
        this._evaluated_value_cache  = evaluated_value_cache;

        this._visibility = (visibility === 'visible');
        this._properties = properties;
    }


    /**
     * レイヤーの可視性
     */
    get visibility(): boolean { return this._visibility; }


    /**
     * レイヤーの可視性
     */
    set visibility( value: boolean )
    {
        this._visibility = value;
    }


    /**
     * `id` が示すプロパティを取得する。
     *
     * [[StyleLayer]] のサブクラスの実装者が呼び出す。
     *
     * @internal
     */
    public __getProperty( id: string ): Property
    {
        const item = this._properties.get( id );

        if ( item !== undefined ) {
            return item;
        }
        else {
            throw Error( `unexpected property '${id}'` );
        }
    }


    /**
     * すべてのプロパティを取得する。
     *
     * @internal
     */
    public __getProperties(): IterableIterator<Property>
    {
        return this._properties.values();
    }


    /**
     * 定数プロパティの値を取得する。
     *
     * 定数プロパティ `property` の評価済みの値を取得する。
     *
     * `property` が定数プロパティでなければ `undefined` を返す。
     *
     * @internal
     */
    public __getConstantValue( property: Property ): unknown | undefined
    {
        return this._evaluated_value_cache.get( property );
    }


    /**
     * 引数に対応する [[LayerFlake]] インスタンスを生成する。
     *
     * style フレームワークが呼び出す。
     *
     * @internal
     */
    public abstract __createLayerFlake( tlie_layer: TileLayer,
                                        flake_ctx:  FlakeContext ): LayerFlake;


    /**
     * 対応できるフィーチャのジオメトリ型を確認する。
     *
     * 現在のプロパティ定数値で `geom_type` 型のフィーチャを描画できる
     * かどうかを確認する。
     *
     * 定数プロパティによって結果を決めるので、途中で結果が変わること
     * は想定していない。
     *
     * style フレームワークが呼び出す。
     *
     * @internal
     */
    public abstract __isSupported( geom_type: GeomType ): boolean;


    /**
     * レイヤーの可視性
     *
     * 初期値は `visibility` プロパティの値になる。
     */
    private _visibility: boolean;


    /**
     * プロパティ辞書
     *
     * レイヤーの全プロパティ (`filter` プロパティは除く) をプロパティ
     * 名と対応付ける。
     */
    private readonly _properties: Map<string, Property>;


    /**
     * 定数プロパティの値
     *
     * `StyleLayer` 単位で評価値が決定する式を持つプロパティの評価値
     * キャッシュである。
     */
    private readonly _evaluated_value_cache: Map<Property, unknown>;

}


/**
 * [[SourceState]] で使用するタイルの状態
 */
const enum TileStatus {

    /**
     * タイルをリクエスト中
     */
    REQUESTED = '@@_REQUESTED',


    /**
     * リクエストを取り消し中
     */
    CANCELLED = '@@_CANCELLED',


    /**
     * タイルの取得に成功してデータが存在
     */
    EXISTENCE = '@@_EXISTENCE',


    /**
     * タイルの取得に失敗またはキャセルされた
     */
    FAILED = '@@_FAILED',

}


/**
 * `StyleFlake` インスタンス内で `Source` インスタンスの管理を行う。
 */
class SourceState {

    /**
     * インスタンスを初期化する。
     *
     * 状態は `TileStatus.requested` になる。
     */
    constructor( source:    Source,
                 canceller: Provider.RequestCanceller )
    {
        this._source      = source;
        this._tile_status = TileStatus.REQUESTED;
        this._canceller   = canceller;
        this._tile_layers = new Map();
    }


    /**
     * タイルの状態を取得
     */
    get tile_status(): TileStatus
    {
        return this._tile_status;
    }


    /**
     * タイルを読み込んだ状態にする。
     */
    loadTileLayers( data: ArrayBuffer ): void
    {
        const mvt_tile = parseTile( data, { layer_filter: this._source.layer_filter } );

        for ( const layer of mvt_tile.layers ) {
            this._tile_layers.set( layer.name, new TileLayer( layer ) );
        }

        this._tile_status = TileStatus.EXISTENCE;
    }


    /**
     * タイルの読み込みに失敗した状態にする。
     */
    makeFail(): void
    {
        this._tile_status = TileStatus.FAILED;
    }


    /**
     * 指定のタイルレイヤーを取得する。
     *
     * 指定のレイヤーが存在しない、またはタイルが読み込まれていないと
     * きは `undefined` を返す。
     */
    getTileLayer( id: string ): TileLayer | undefined
    {
        return this._tile_layers.get( id );
    }


    /**
     * タイルのリクエストを取り消す
     */
    cancelRequest(): void
    {
        if ( this._tile_status === TileStatus.REQUESTED && this._canceller !== null ) {
            // リクエスト中でそのリクエスト中に一度も取り消されていないとき
            this._canceller();
            this._canceller   = null;
            this._tile_status = TileStatus.CANCELLED;
        }
    }


    /**
     * タイルのソース
     */
    private readonly _source: Source;


    /**
     * タイルの状態
     */
    private _tile_status: TileStatus;


    /**
     * リクエスト取り消し関数
     */
    private _canceller: Provider.RequestCanceller | null;


    /**
     * 辞書: mvt レイヤー名 -> [[TileLayer]] インスタンス
     */
    private readonly _tile_layers: Map<string, TileLayer>;

}


/**
 * [[StyleFlake.getPrimitives]] に与えるコンテキスト
 */
export interface FlakeContext extends Area, ExprContext {

    // 地表断片の領域 (from Area)
    z: number;
    x: number;
    y: number;

    // 地表断片のズムレベル (from ExprContext)
    zoom: number;

    /**
     * 現行のレンダリングステージ
     */
    stage: RenderStage;

    /**
     * 地表断片の DEM サンプラー
     */
    dem_sampler: DemSampler;

}


/**
 * Flake インスタンス内のベクトル地図の部分を表現する。
 */
export class StyleFlake {

    constructor()
    {
        this._source_states = new Map();
        this._layer_flakes  = new Map();
    }


    /**
     * `style_layer` に対応するプリミティブ配列を取得する。
     */
    getPrimitives( style_layer: StyleLayer,
                   flake_ctx: FlakeContext ): Primitive[]
    {
        const tile_layer = this.tryTileLayer( style_layer, flake_ctx );
        if ( tile_layer === null ) {
            // TileLayer インスタンスを取得できなかった
            return [];
        }

        const layer_flake = this.evaluateLayer( style_layer, tile_layer, flake_ctx );

        return layer_flake.getPrimitives( flake_ctx );
    }


    /**
     * 評価済みのプロパティ値を取得
     *
     * テスト専用: タイルデータを取得するまで遅延させる。
     */
    async getEvaluatedPropertyValues( style_layer: StyleLayer,
                                      flake_ctx: FlakeContext ): Promise<EvaledValueList[]>
    {
        const tile_layer = await this.tryTileLayerAsync( style_layer, flake_ctx );
        if ( tile_layer === null ) {
            // TileLayer インスタンスを取得できなかった
            return [];
        }

        const layer_flake = this.evaluateLayer( style_layer, tile_layer, flake_ctx );

        return layer_flake.__getEvaluatedPropertyValues();
    }



    /**
     * すべてのソースのタイルのリクエストを取り消す。
     */
    cancelRequest(): void
    {
        for ( const source_state of this._source_states.values() ) {
            source_state.cancelRequest();
        }
    }


    /**
     * `style_layer` に対応する [[LayerFlake]] インスタンスを評価する。
     *
     * `LayerFlake` インスタンスが存在しない場合は、評価済みのインスタ
     * ンスを生成する。
     *
     * @returns  評価した [[LayerFlake]] インスタンス
     */
    private evaluateLayer( style_layer: StyleLayer,
                           tile_layer:  TileLayer,
                           flake_ctx:   FlakeContext ): LayerFlake
    {
        let layer_flake = this._layer_flakes.get( style_layer );

        if ( layer_flake === undefined ) {
            // LayerFlake インスタンスを生成
            layer_flake = style_layer.__createLayerFlake( tile_layer, flake_ctx );
            layer_flake.__createInitialLayerFeatures( flake_ctx );
            layer_flake.completeInitialization( flake_ctx );
            // LayerFlake インスタンスを this に追加
            this._layer_flakes.set( style_layer, layer_flake );
        }
        else {
            // layer_flake を再評価
            layer_flake.__evaluateFeatures( flake_ctx );
        }

        return layer_flake;
    }


    /**
     * `style_layer` に対する `TileLayer` インスタンスを取得する。
     *
     * 存在しない場合、必要ならリクエストする。
     */
    private tryTileLayer( style_layer: StyleLayer,
                          area:        Area ): TileLayer | null
    {
        // layer が参照するソース情報
        const source_inst = style_layer.__source_inst;

        // source_inst に対応する状態
        const source_state = this._source_states.get( source_inst );

        if ( source_state !== undefined ) {
            // TileLayer インスタンスが存在すれば返す
            return source_state.getTileLayer( style_layer.__source_layer ) || null;
        }
        else {
            // source_inst に対応する状態がないので新規に追加
            // プロバイダにタイルをリクエスト
            const { promise, canceller } = source_inst.provider.requestTile( area );

            const new_source_state = new SourceState( source_inst, canceller );
            this._source_states.set( source_inst, new_source_state );

            promise.then( data => {
                if ( data === null || new_source_state.tile_status === TileStatus.CANCELLED ) {
                    // 取得に失敗またはキャンセル中
                    new_source_state.makeFail();
                }
                else {
                    // 読み込み成功
                    new_source_state.loadTileLayers( data );
                }
            } );

            // インスタンスを獲得できない
            return null;
        }
    }


    /**
     * [[tryTileLayer]] メソッドの非同期版
     *
     * テスト専用: タイルデータを取得するまで遅延させる。
     */
    private async tryTileLayerAsync( style_layer: StyleLayer,
                                     area:        Area ): Promise<TileLayer | null>
    {
        // layer が参照するソース情報
        const source_inst = style_layer.__source_inst;

        // source_inst に対応する状態
        let source_state = this._source_states.get( source_inst );

        if ( source_state === undefined ) {
            // source_inst に対応する状態がないので新規に追加
            // プロバイダにタイルをリクエスト
            const { promise, canceller } = source_inst.provider.requestTile( area );

            source_state = new SourceState( source_inst, canceller );
            this._source_states.set( source_inst, source_state );

            const data = await promise;

            if ( data === null || source_state.tile_status === TileStatus.CANCELLED ) {
                // 取得に失敗またはキャンセル中
                source_state.makeFail();
            }
            else {
                // 読み込み成功
                source_state.loadTileLayers( data );
            }
        }

        // TileLayer インスタンスが存在すれば返す
        return source_state.getTileLayer( style_layer.__source_layer ) || null;
    }


    private readonly _source_states: Map<Source, SourceState>;
    private readonly  _layer_flakes: Map<StyleLayer, LayerFlake>;

}


/**
 * [[LayerFlake.getEvaluatedPropertyValues]] の戻り値の要素型
 *
 * テスト専用
 */
export interface EvaledValueList {

    feature: Feature;

    property_values: Map<string, unknown>;

}


/**
 * Flake インスタンス内のベクトル地図の特定レイヤー部分を表現する。
 *
 * [[StyleLayer.__createLayerFlake]] メソッドによりサブクラスのインス
 * タンスが生成される。
 *
 * このクラスは [[StyleLayer]] のサブクラスの実装者が使用する。
 *
 * @typeParam StyleLayerT - 生成元のインスタンスの [[StyleLayer]] サブクラス
 *
 * @internal
 */
export abstract class LayerFlake<StyleLayerT extends StyleLayer = StyleLayer> {

    /**
     * 親のスタイルレイヤー
     */
    public readonly style_layer: StyleLayerT;


    /**
     * フィルター済みフィーチャ
     */
    protected readonly _layer_features: Map<Feature, LayerFeature>;


    /**
     * 前回の評価時のズーム値
     *
     * style フレームワークが参照する。
     *
     * @internal
     */
    public __last_zoom: number;


    /**
     * LayerFlake サブクラスから呼び出して初期化する。
     *
     * 実際には初期化はフレームワークが [[completeInitialization]] を
     * 呼び出した後に完了する。
     */
    protected constructor( style_layer: StyleLayerT,
                           tile_layer:  TileLayer,
                           flake_ctx:   FlakeContext )
    {
        this.style_layer     = style_layer;
        this._layer_features = new Map();
        this.__last_zoom     = flake_ctx.zoom;

        this._tile_layer = tile_layer;
        this._evaluated_value_cache = new Map();

        // 初期の評価値を evaluated_value_cache にキャッシュする
        for ( const property of style_layer.__flake_property_data.cached_properties ) {
            const value = property.evaluate( flake_ctx );
            this._evaluated_value_cache.set( property, value );
        }
    }


    /**
     * 初期化時のフィーチャを生成
     *
     * `this._layer_features` に、初期評価のフィーチャを設定する。
     *
     * style フレームワークが呼び出す。
     *
     * @internal
     */
    public __createInitialLayerFeatures( flake_ctx: FlakeContext ): void
    {
        const slayer = this.style_layer;

        /**
         * `tile_features` の要素毎に `LayerFeature` インスタンスを生成
         */
        const create_features = ( tile_features: Iterable<Feature> ) =>
        {
            const filter = slayer.__filter;

            if ( filter.hasFData() ) {
                // フィーチャ毎にフィルタを評価
                for ( const feature of tile_features ) {
                    if ( filter.evaluate( flake_ctx, feature ) as boolean ) {
                        const layer_feature = this.createLayerFeature( feature, flake_ctx );
                        this._layer_features.set( feature, layer_feature );
                    }
                }
            }
            else {
                // すべてのフィーチャが合格
                if ( filter.evaluate( flake_ctx ) as boolean ) {
                    for ( const feature of tile_features ) {
                        const layer_feature = this.createLayerFeature( feature, flake_ctx );
                        this._layer_features.set( feature, layer_feature );
                    }
                }
            }
        };

        if ( slayer.__isSupported( GeomType.POINT ) ) {
            create_features( this._tile_layer.point_features );
        }

        if ( slayer.__isSupported( GeomType.LINESTRING ) ) {
            create_features( this._tile_layer.linestring_features );
        }

        if ( slayer.__isSupported( GeomType.POLYGON ) ) {
            create_features( this._tile_layer.polygon_features );
        }
    }


    /**
     * [[LayerFeature]] の具象クラスのインスタンスを生成する。
     *
     * style フレームワークから呼び出される。
     *
     * @param feature     - 基となるフィーチャ
     * @param layer_flake - 生成されるインスタンスの所有者
     * @param flake_ctx   - コンテキスト
     */
    public abstract createLayerFeature( feature:   Feature,
                                        flake_ctx: FlakeContext ): LayerFeature;


    /**
     * インスタンスの初期化を完了させる。
     *
     * style フレームワークから呼び出される。
     */
    public abstract completeInitialization( flake_ctx: FlakeContext ): void;


    /**
     * フィーチャのフィルタと評価を行う。
     *
     * style フレームワークが呼び出す。
     *
     * @internal
     */
    public __evaluateFeatures( flake_ctx: FlakeContext ): void
    {
        // 評価の開始を通知
        const finishEvaluation = this.startEvaluation( flake_ctx );

        const summary: EvaluationSummary = {
            added_features:       new Set(),
            deleted_features:     new Set(),
            evaluated_properties: new Set(),
        };

        // LayerFlake 単位の評価
        this.update_evaluated_value_cache( flake_ctx, summary );

        // フィルターの評価
        this.filterFeatures( flake_ctx, summary );

        // LayerFeature 単位の評価
        for ( const layer_feature of this._layer_features.values() ) {
            layer_feature.__updateEvaluatedValueCache( flake_ctx, summary );
        }

        if ( this._layer_features.size === 0 ) {
            // 評価値が変化したフィーチャそのものが存在しないので、評
            // 価したプロパティも存在しないようにする
            summary.evaluated_properties.clear();
        }

        // 評価の終了を通知
        finishEvaluation( summary );

        // フィルターで追加された LayerFeature インスタンスを実際
        // に this._layer_features に追加
        for ( const layer_feature of summary.added_features ) {
            this._layer_features.set( layer_feature.feature, layer_feature );
        }

        // 前回ズーム値を更新
        this.__last_zoom = flake_ctx.zoom;
    }


    /**
     * 評価の開始をするときに呼び出される。
     *
     * 評価が終了したときに、戻り値の関数が呼び出される。
     *
     * @see [[EvaluationSummary]]
     */
    public abstract startEvaluation( flake_ctx: FlakeContext ): EvaluationListener;


    /**
     * 描画するプリミティブ配列を取得する。
     *
     * style フレームワークが呼び出される。
     *
     * @see [[StyleFlake.getPrimitives]]
     */
    public abstract getPrimitives( flake_ctx: FlakeContext ): Primitive[];


   /**
     * 評価済みのプロパティ値を取得
     *
     * テスト専用
     *
     * @internal
     */
    public __getEvaluatedPropertyValues(): EvaledValueList[]
    {
        // プロパティ値を取得
        const result: EvaledValueList[] = [];


        for ( const [feature, layer_feature] of this._layer_features ) {
            const item: EvaledValueList = {
                feature,
                property_values: new Map()
            };

            for ( const property of this.style_layer.__getProperties() ) {

                const evaled_value = layer_feature.getEvaluatedValue( property );

                if ( evaled_value === undefined ) {
                    throw new Error( `'${property.name}' does not found` );
                }

                item.property_values.set( property.name, evaled_value );
            }

            result.push( item );
        }

        return result;
    }


    /**
     * 自己の評価済みのプロパティ値を取得
     *
     * 自己のキャッシュが持っている `property` の評価値を返す。
     *
     * 自己にプロパティが存在しなければ `undefined` を返す。
     */
    public getOwnEvaluatedValue( property: Property ): unknown
    {
        return this._evaluated_value_cache.get( property );
    }


    /**
     * プロパティ `_evaluated_value_cache` を更新して、結果を `summary`
     * に記録する。
     *
     * @see [[__evaluateFeatures]]
     */
    private update_evaluated_value_cache( flake_ctx: FlakeContext,
                                          summary:   EvaluationSummary ): void
    {
        if ( flake_ctx.zoom === this.__last_zoom ) {
            // プロパティの評価値は変化しない
            return;
        }

        const prop_data = this.style_layer.__flake_property_data;

        for ( const property of prop_data.cached_paint_properties ) {
            const value = property.evaluate( flake_ctx );
            this._evaluated_value_cache.set( property, value );
        }

        if ( Math.round( flake_ctx.zoom ) === Math.round( this.__last_zoom ) ) {
            // layout プロパティの評価値は変化しない
            return;
        }

        // さらにズーム丸め値が変化した
        for ( const property of prop_data.cached_layout_properties ) {
            const value = property.evaluate( flake_ctx );
            this._evaluated_value_cache.set( property, value );
            summary.evaluated_properties.add( property );
        }
    }


    /**
     * フィーチャのフィルター処理
     *
     * `this._layer_features` に表示されるフィーチャに対応したインスタ
     * ンスが設定される。
     *
     * @see [[createInitailFeatures]]
     */
    private filterFeatures( flake_ctx: FlakeContext,
                            summary:   EvaluationSummary ): void
    {
        const slayer = this.style_layer;
        const filter = slayer.__filter;

        if ( !filter.hasZoom() ) {
            // fstate=1 は想定していないので zoom=0 のとき、すべての合否は変わらない
            return;
        }

        if ( Math.round( flake_ctx.zoom ) === Math.round( this.__last_zoom ) ) {
            // filter のズームは layout のよう低頻度で評価する
            return;
        }

        /**
         * `tile_features` の要素毎に `LayerFeature` インスタンスの生
         * 成と削除を行う。
         */
        const filter_features = ( tile_features: Iterable<Feature> ) =>
        {
            const layer_feature_map = this._layer_features;

            if ( filter.hasFData() ) {
                // zoom=1, fdata=1
                for ( const tile_feature of tile_features ) {
                    const layer_feature = layer_feature_map.get( tile_feature );

                    if ( filter.evaluate( flake_ctx, tile_feature ) as boolean ) {
                        if ( layer_feature === undefined ) {
                            // feature は不合格から合格に変わった
                            const new_feature = this.createLayerFeature( tile_feature, flake_ctx );
                            summary.added_features.add( new_feature );
                        }
                    }
                    else if ( layer_feature !== undefined ) {
                        // feature は合格から不合格に変わった
                        summary.deleted_features.add( layer_feature );
                        layer_feature_map.delete( tile_feature )
                    }
                }
            }
            else {
                // zoom=1, fdata=0
                if ( filter.evaluate( flake_ctx ) as boolean ) {
                    // すべてのフィーチャが合格
                    for ( const tile_feature of tile_features ) {
                        if ( !layer_feature_map.has( tile_feature ) ) {
                            // feature は不合格から合格に変わった
                            const new_feature = this.createLayerFeature( tile_feature, flake_ctx );
                            summary.added_features.add( new_feature );
                        }
                    }
                }
                else {
                    // すべてのフィーチャが不合格
                    for ( const tile_feature of tile_features ) {
                        const layer_feature = layer_feature_map.get( tile_feature );
                        if ( layer_feature !== undefined ) {
                            // feature は合格から不合格に変わった
                            summary.deleted_features.add( layer_feature );
                            layer_feature_map.delete( tile_feature )
                        }
                    }
                }
            }
        };

        if ( slayer.__isSupported( GeomType.POINT ) ) {
            filter_features( this._tile_layer.point_features );
        }

        if ( slayer.__isSupported( GeomType.LINESTRING ) ) {
            filter_features( this._tile_layer.linestring_features );
        }

        if ( slayer.__isSupported( GeomType.POLYGON ) ) {
            filter_features( this._tile_layer.polygon_features );
        }
    }


    /**
     * this に対応するタイルのレイヤー
     */
    private readonly _tile_layer: TileLayer;


    /**
     * プロパティの評価値キャッシュ
     *
     * 登録されているプロパティは `LayerFlake` 単位で評価値が決定する
     * 式を持つ。
     */
    private readonly _evaluated_value_cache: Map<Property, unknown>;

}


/**
 * フィルター済みのフィーチャを表現する。
 *
 * このクラスは [[StyleLayer]] のサブクラスの実装者が使用する。
 *
 * @typeParam LayerFlakeT - インスタンスを生成する [[LayerFlake]] クラス
 * @typeParam FeatureT    - インスタンスに対応する [[Feature]] クラス
 *
 * @internal
 */
export abstract class LayerFeature<LayerFlakeT extends LayerFlake = LayerFlake,
                                      FeatureT extends Feature    = Feature> {

    /**
     * `this` に対応する [[TileLayer]] インスタンス内の [[Feature]]
     * インスタンス
     */
    public readonly feature: FeatureT;


    /**
     * `this` を保有する [[LayerFlake]] インスタンス
     */
    public readonly layer_flake: LayerFlakeT;


    /**
     * インスタンスを初期化する。
     *
     * `feature` と `layer_flake` パラメータは同名のプロパティの説明を
     * 参照のこと。
     *
     * `flake_ctx` は `this` 生成時のコンテキストである。
     */
    protected constructor( feature:     FeatureT,
                           layer_flake: LayerFlakeT,
                           flake_ctx:   FlakeContext )
    {
        // 注意: `layer_flake` は構築中の可能性があるため、ここでは
        //       `layer_flake.style_layer` の参照しか許されない

        this.feature                = feature;
        this.layer_flake            = layer_flake;
        this._evaluated_value_cache = new Map();

        const style_layer   = layer_flake.style_layer;
        const style_manager = style_layer.style_manager;
        const prop_data     = style_layer.__feature_property_data;

        // 最初にすべてのデータ式のプロパティを評価
        for ( const property of prop_data.cached_properties ) {
            let expr_fstate: ExprFeatureState | undefined;

            // property が feature-state 演算を含み、feature の
            // FeatureState インスタンスが存在すれば expr_fstate に設
            // 定する
            if ( property.hasFState() ) {
                expr_fstate = style_manager.__findExprFeatureState( feature.id );
            }

            const value = property.evaluate( flake_ctx, feature, expr_fstate );
            this._evaluated_value_cache.set( property, value );
        }
    }


    /**
     * 評価済みのプロパティ値を取得
     *
     * プロパティ `property` の評価値を返す。
     *
     * プロパティが存在しなければ `undefined` を返す。
     */
    public getEvaluatedValue( property: Property ): unknown
    {
        const own_value = this._evaluated_value_cache.get( property );
        if ( own_value !== undefined ) {
            return own_value;
        }

        const flake_value = this.layer_flake.getOwnEvaluatedValue( property );
        if ( flake_value !== undefined ) {
            return flake_value;
        }

        return this.layer_flake.style_layer.__getConstantValue( property );
    }


    /**
     * 評価済みの色プロパティ値を取得
     *
     * 色プロパティ `property` の評価値を `Color` に変換して返す。
     *
     * `property` は存在しなければならない。
     *
     * @typeParam Color - 取得先の色の型
     * @param  property - 色として評価されるプロパティ
     * @param       dst - 取得先のインスタンス
     *
     * @return `dst`
     */
    public getEvaluatedColor<Color extends Vector4>( property: Property,
                                                     dst:      Color ): Color
    {
        const value = this.getEvaluatedValue( property );
        cfa_assert( value !== undefined );  // 存在することが前提

        // color の r, g, b は a が乗算された値になっている。
        //
        // 現状では前乗算 RGB は想定ていてないので、a を乗算していない
        // RGB に戻す。
        //
        // ただし a が 0 のときは戻せないのでそのままにする。
        //
        // 参照: mapbox-gl/src/style-spec/util/color.js

        const color = value as { r: number, g: number, b: number, a: number }
        const alpha = color.a;

        if ( alpha === 0.0 || alpha === 1.0 ) {
            dst[0] = color.r;
            dst[1] = color.g;
            dst[2] = color.b;
            dst[3] = alpha;
        }
        else {
            dst[0] = color.r / alpha;
            dst[1] = color.g / alpha;
            dst[2] = color.b / alpha;
            dst[3] = alpha;
        }

        return dst;
    }


    /**
     * このフィーチャの [[_evaluated_value_cache]] の内容を更新
     *
     * 評価値が変化する可能性があるプロパティのみを評価して、評価値キャッ
     * シュを更新する。
     *
     * style フレームワークから呼び出される。
     *
     * @internal
     */
    public __updateEvaluatedValueCache( flake_ctx: FlakeContext,
                                        summary:   EvaluationSummary ): void
    {
        const layer_flake   = this.layer_flake;
        const style_layer   = layer_flake.style_layer;
        const style_manager = style_layer.style_manager;
        const prop_data     = style_layer.__feature_property_data;
        const mods_zoom     = (flake_ctx.zoom !== layer_flake.__last_zoom);
        const mods_fstate   = style_manager.__modified_fstates.has( this.feature.id );

        // paint プロパティ
        for ( const property of prop_data.cached_paint_properties ) {
            // fstate=1 or (fdata=1, zoom=1)

            if ( property.hasFState() ) {
                // fdata=?, fstate=1
                if ( mods_fstate || (property.hasZoom() && mods_zoom) ) {
                    const expr_fstate = style_manager.__findExprFeatureState( this.feature.id );
                    const value = property.evaluate( flake_ctx, this.feature, expr_fstate );
                    this._evaluated_value_cache.set( property, value );
                }
            }
            else {
                // fdata=1, fstate=0, zoom=1
                if ( mods_zoom ) {
                    const value = property.evaluate( flake_ctx, this.feature );
                    this._evaluated_value_cache.set( property, value );
                }
            }
        }

        // layout プロパティ
        const mods_izoom = (Math.round( flake_ctx.zoom ) !== Math.round( layer_flake.__last_zoom ));

        if ( !mods_izoom ) {
            // 整数 zoom が変化しないときは layout プロパティの評価値
            // は変化しない
            return;
        }

        for ( const property of prop_data.cached_layout_properties ) {
            // fdata=1, fstate=0, zoom=1
            const value = property.evaluate( flake_ctx, this.feature );
            this._evaluated_value_cache.set( property, value );

            // TODO: 重複設定
            summary.evaluated_properties.add( property );
        }
    }


    /**
     * プロパティの評価値キャッシュ
     *
     * フィーチャ単位で違う値に評価される可能性があるプロパティの評価
     * 値はここにキャッシュされる。
     */
    private readonly _evaluated_value_cache: Map<Property, unknown>;

}


/**
 * 非対応のレイヤー型に使用される仮のレイヤーである。
 */
class UnsupportedLayer extends StyleLayer {

    constructor( owner:      StyleManager,
                 json_layer: LayerJson )
    {
        super( owner, json_layer, [] );
    }


    // from StyleLayer
    override __createLayerFlake( tlie_layer: TileLayer,
                                 flake_ctx:  FlakeContext ): LayerFlake
    {
        return new UnsupportedFlake( this, tlie_layer, flake_ctx );
    }


    // from StyleLayer
    override __isSupported()
    {
        return false;
    }

}


/**
 * [[UnsupportedLayer]] 用の [[LayerFlake]] 実装クラスである。
 */
class UnsupportedFlake extends LayerFlake<UnsupportedLayer> {

    constructor( style_layer: UnsupportedLayer,
                 tile_layer:  TileLayer,
                 flake_ctx:   FlakeContext )
    {
        super( style_layer, tile_layer, flake_ctx );
    }


    // from LayerFlake
    override createLayerFeature( _feature:   Feature,
                                 _flake_ctx: FlakeContext ): LayerFeature
    {
        // どの GeomType にも対応していないので呼び出されることはない
        throw new Error( "Unexcepted createLayerFeature call" );
    }


    // from LayerFlake
    override completeInitialization( _flake_ctx: FlakeContext ): void
    {
    }


    // from LayerFlake
    override startEvaluation( _flake_ctx: FlakeContext ): EvaluationListener
    {
        return _summary => {}
    }


    // from LayerFlake
    override getPrimitives( _flake_ctx: FlakeContext ): Primitive[]
    {
        return [];
    }

}


/**
 * 評価の概要を知らせるためのインタフェース
 *
 * [[LayerFlake.startEvaluation]] が返した [[EvaluationListener]] 型の
 * 関数の引数に与えられるオブジェクトの形式である。
 *
 * このインタフェースは [[StyleLayer]] のサブクラスの実装者が使用する。
 *
 * @internal
 */
export interface EvaluationSummary {

    /**
     * フィルターで追加されたフィーチャの集合
     *
     * [[EvaluationListener]] 関数が呼び出された時点では、これらの追加
     * されたフィーチャは [[LayerFlake._layer_features]] に存在しない。
     */
    added_features: Set<LayerFeature>;


    /**
     * フィルターで削除されたフィーチャの集合
     *
     * [[EvaluationListener]] 関数が呼び出された時点では、これらの削除
     * されたフィーチャは [[LayerFlake._layer_features]] に存在しない。
     */
    deleted_features: Set<LayerFeature>;


    /**
     * 評価値が変化した可能性のある layout プロパティの集合
     *
     * [[EvaluationListener]] 関数が呼び出された時点の
     * [[LayerFlake._layer_features]] に存在するフィーチャは、これらの
     * プロパティの評価値が変化した可能性のある。
     */
    evaluated_properties: Set<Property>;

}


/**
 * 評価の終了時に呼び出される関数の型
 *
 * この関数型は [[StyleLayer]] のサブクラスの実装者が使用する。
 *
 * @see [[LayerFlake.startEvaluation]]
 *
 * @internal
 */
export interface EvaluationListener {

    ( summary: EvaluationSummary ): void;

}
