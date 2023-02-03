import type { StyleManager, Source } from "./style_manager";
import type { FlakeContext } from "./style_flake";
import type { FeatureState as ExprFeatureState } from "./expression";
import { GeomType } from "./expression";
import type { Specification as PropSpec } from "./property";
import { Property } from "./property";
import type { TileLayer, Feature } from "./tile_layer";
import type { Vector4 } from "../GeoMath";
import type Primitive from "../Primitive";
import type { OJson } from "../util/json_type";
import { isObject as json_isObject } from "../util/json_type";
import type Viewer from "../Viewer";
import { cfa_assert } from "../util/assertion";


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
            throw new SyntaxError( "Vector tile layer requires a 'source' property." );
        }

        const source_inst = owner.__getSource( source_id );
        if ( !source_inst ) {
            throw new Error( `No source instance with name '${source_id}' found.` );
        }

        const source_layer = json_layer['source-layer'];
        if ( typeof source_layer !== 'string' ) {
            throw new SyntaxError( "Vector tile layer requires a 'source-layer' property." );
        }

        const json_layout = json_layer['layout'] || {};
        if ( !json_isObject( json_layout ) ) {
            throw new SyntaxError( "Layer's 'layout' property is invalid type." );
        }

        const json_paint = json_layer['paint'] || {};
        if ( !json_isObject( json_paint ) ) {
            throw new SyntaxError( "Layer's 'paint' property is invalid type." );
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
            throw new Error( "Layer's 'filter' property cannot use the 'feature-state' operator." );
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
                throw new Error( "Layer's '${property.name}' property cannot use the 'feature-state' operator." );
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
     * `this.style_manager` 所属する [[Viewer]] インスタンスを設定
     *
     * デフォルトの実装は何もしない。
     *
     * @see [[StyleManager.__install_viewer]]
     *
     * @virtual
     * @internal
     */
    public __install_viewer( viewer: Viewer | null ): void {}


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
            throw new Error( `unexpected property '${id}'` );
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
     * インスタンスを破棄
     *
     * このメソッドを呼び出した後は `this` にアクセスすることができない。
     *
     * @virtual
     */
    public dispose(): void
    {
        for ( const layer_feature of this._layer_features.values() ) {
            layer_feature.dispose();
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

        // 削除された LayerFeature インスタンスの破棄
        for ( const layer_feature of summary.deleted_features ) {
            layer_feature.dispose();
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
     * インスタンスを破棄
     *
     * デフォルト実装は何もしない。
     *
     * このメソッドを呼び出した後は `this` にアクセスすることができない。
     *
     * @virtual
     */
    public dispose(): void {}


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

        // paint プロパティ
        for ( const property of prop_data.cached_paint_properties ) {
            // fstate=1 or (fdata=1, zoom=1)

            if ( property.hasFState() ) {
                // fdata=?, fstate=1
                const expr_fstate = style_manager.__findExprFeatureState( this.feature.id );
                const value = property.evaluate( flake_ctx, this.feature, expr_fstate );
                this._evaluated_value_cache.set( property, value );
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
export class UnsupportedLayer extends StyleLayer {

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
