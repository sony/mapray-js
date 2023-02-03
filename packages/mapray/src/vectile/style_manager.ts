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
import type { Provider } from "./provider";
import { ProviderFactory } from "./ProviderFactory";
import { FeatureState } from "./FeatureState";
import { LayerFilter } from "./mvt_parser";
import type { FeatureState as ExprFeatureState } from "./expression";
import { TraverserManager, TraverseContext } from "./traverser";
import { Renderer } from "./renderer";
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
    if ( !json_isObject( json_root ) ) {
        throw create_schema_error();
    }

    const json_root_layers = json_root['layers'];  // 必須プロパティ
    if ( !json_isArray( json_root_layers ) ) {
        throw create_schema_error();
    }

    const used_source_dict = new Map<string, SourceInfo>();
    const used_json_layers: OJson[] = [];

    for ( const json_layer of json_root_layers ) {
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
        const json_root_sources = json_root['sources'];  // 必須プロパティ

        if ( !json_isObject( json_root_sources ) ) {
            throw create_schema_error();
        }

        const json_source = json_root_sources[src_id];

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

            const provider = provider_factory.create( src_id,
                                                      json_clone( json_source ) );
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
     * ビットマップを鮮明に表示するかどうか。
     *
     * このプロパティが `true` のとき、通常より一部のビットマップ画像が鮮明
     * に表示されるようになる。
     *
     * このとき、水平方向と垂直方向に最大 1/2 画素だけ表示位置が移動する可能
     * 性ががあり、視点が動いているときは、そのオブジェクトが振動しているよう
     * に見えることがある。
     *
     * このプロパティに対応しているかどうかはレイヤー型により異なる。
     *
     * @default false
     *
     * @deprecated これはテスト用のプロパティで、将来的に削除する可能性がある。
     */
    bitmap_sharpening: boolean;


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
        this._viewer  = null;
        this._sources = new Map();
        this._layers  = new Map();
        this._feature_states    = new Map();
        this._traverser_manager = new TraverserManager( this );
        this._max_tiles_requested = StyleManager._DEFAULT_MAX_TILES_REQUESTED;
        this._num_tiles_requested = 0;
        this.bitmap_sharpening = false;

        const style_info = collectStyleInfo( json_root, provider_factory );

        this.parseSources( style_info.source_dict );
        this.parseLayers( style_info.json_layers );
    }


    /**
     * `this` が所属する [[Viewer]] インスタンスを設定
     *
     * `viewer` に取り付けられたときに呼び出される。
     *
     * ただし、外されたときは `null` が指定される。
     *
     * @internal
     * [[Viewer.setVectileManager]] から呼び出される。
     */
    public __install_viewer( viewer: Viewer | null ): void
    {
        this._viewer = viewer;

        // 保有するレイヤーにも伝える
        for ( const layer of this._layers.values() ) {
            layer.__install_viewer( viewer );
        }
    }


    /**
     * `this` が設定されている [[Viewer]] インスタンスを取得する。
     *
     * `this` がどの [[Viewer]] インスタンスにも設定されていないときは
     * `null` を得る。
     *
     * @see [[Viewer.setVectileManager]]
     */
    get viewer(): Viewer | null
    {
        return this._viewer;
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
            // 自身を取り消し
            flake.cancelStyleFlake();

            // 子孫を取り消し
            for ( const child of flake.children ) {
                if ( child !== null ) {
                    cancelFlakeRecur( child );
                }
            }
        };

        this._traverser_manager.cancel();

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


    private _viewer: Viewer | null;

    private readonly        _sources: Map<string, Source>;
    private readonly         _layers: Map<string, StyleLayer>;
    private readonly _feature_states: Map<number, FeatureState>;

    private readonly _traverser_manager: TraverserManager;

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
