import type { StyleManager, Source } from "./style_manager";
import type { StyleLayer, LayerFlake } from "./style_layer";
import type { RequestCanceller } from "../RequestResult";
import { TileLayer } from "./tile_layer";
import { parseTile } from "./mvt_parser";
import type { Context as ExprContext } from "./expression";
import type RenderStage from "../RenderStage";
import type Primitive from "../Primitive";
import type DemBinary from "../DemBinary";
import type DemSampler from "../DemSampler";
import type { Area } from "../AreaUtil";


/**
 * Flake インスタンス内のベクトル地図の部分を表現する。
 */
export class StyleFlake {

    /**
     * Flake に対する直近の DEM サンプラー
     */
    readonly dem_sampler: DemSampler;


    /**
     * @param style_manager - 起源となる `StyleManager` インスタンス
     * @param nearest_dem   - 直近の DEM データ
     */
    constructor( style_manager: StyleManager,
                 nearest_dem:   DemBinary )
    {
        this._style_manager = style_manager;
        this._source_states = new Map();
        this._layer_flakes  = new Map();
        this.dem_sampler    = nearest_dem.newLinearSampler();
    }


    /**
     * インスタンスを破棄
     *
     * このメソッドを呼び出した後は `this` にアクセスすることができない。
     */
    dispose(): void
    {
        // 所有するすべての LayerFlake インスタンスを破棄
        for ( const layer_flake of this._layer_flakes.values() ) {
            layer_flake.dispose();
        }
        this._layer_flakes.clear();
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
     * 存在しない場合は `null` を返し、必要かつ可能ならリクエストする。
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
        /* source_inst に対応する SourceState インスタンスが存在しない */
        else if ( this._canRequestTile() ) {
            // SourceState インスタンスを生成して追加する。それと同時にプロバイダに
            // タイルデータをリクエストする。
            const { promise, canceller } = source_inst.tile_provider.requestTile( area );
            this._countTileRequested( 1 );

            const new_source_state = new SourceState( source_inst, canceller );
            this._source_states.set( source_inst, new_source_state );

            promise.then( data => {
                if ( new_source_state.tile_status === TileStatus.CANCELLED ) {
                    // すでにキャンセル中
                    new_source_state.makeFail();
                }
                else {
                    // 読み込み成功
                    new_source_state.loadTileLayers( data );
                }
                this._countTileRequested( -1 );
            } ).catch( () => {
                // 取得に失敗またはキャンセル中
                new_source_state.makeFail();
                this._countTileRequested( -1 );
            } );
        }

        // インスタンスを獲得できない
        return null;
    }


    /**
     * タイルデータをリクエストできるかどうかを返す。
     */
    private _canRequestTile(): boolean
    {
        return this._style_manager.__canRequestTile();
    }


    /**
     * リクエスト中のタイルを数えるための操作
     */
    private _countTileRequested( delta: number ): void
    {
        return this._style_manager.__countTileRequested( delta );
    }


    private readonly _style_manager: StyleManager;
    private readonly _source_states: Map<Source, SourceState>;
    private readonly  _layer_flakes: Map<StyleLayer, LayerFlake>;

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
                 canceller: RequestCanceller )
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
     *
     * @param data - mvt 形式のバイト列
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
    private _canceller: RequestCanceller | null;


    /**
     * 辞書: mvt レイヤー名 -> [[TileLayer]] インスタンス
     */
    private readonly _tile_layers: Map<string, TileLayer>;

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
 * [[StyleFlake.getPrimitives]] に与えるコンテキスト
 */
export interface FlakeContext extends Area, ExprContext {

    // 地表断片の領域 (from Area)
    z: number;
    x: number;
    y: number;

    // 地表断片のズムレベル (from ExprContext)
    zoom: number;

    // 画像名のリスト (from ExprContext)
    image_names: string[];

    /**
     * 現行のレンダリングステージ
     */
    stage: RenderStage;

    /**
     * 地表断片の DEM サンプラー
     */
    dem_sampler: DemSampler;

}
