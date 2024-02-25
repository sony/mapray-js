import GeoMath, { Vector2, Vector3, Vector4 } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import GLEnv from "./GLEnv";
import Ray from "./Ray";
import DemProvider from "./DemProvider";
import FlatDemProvider from "./FlatDemProvider";
import DemBinary from "./DemBinary";
import FlakeMesh from "./FlakeMesh";
import FlakeRenderObject from "./FlakeRenderObject";
import UpdatedTileArea from "./UpdatedTileArea";
import Mesh, { MeshData } from "./Mesh";
import Entity from "./Entity";
import AvgHeightMaps from "./AvgHeightMaps";
import type { Area } from "./AreaUtil";
import type { PoleInfo } from "./Viewer";
import { StyleFlake } from "./vectile/style_flake";
import type { StyleManager } from "./vectile/style_manager";
import { cfa_assert } from "./util/assertion";


/**
 * 地表形状の管理
 */
class Globe {

    public readonly glenv: GLEnv;

    /**
     * 主要領域の DEM プロバイダ
     */
    public readonly dem_provider: DemProvider;

    /**
     * 北側極地の DEM プロバイダ
     *
     * @internal
     */
    public _npole_provider: DemProvider;
    get npole_provider() { return this._npole_provider; }

    /**
     * 南側極地の DEM プロバイダ
     *
     * @internal
     */
    public _spole_provider: DemProvider;
    get spole_provider() { return this._spole_provider; }

    /**
     * Globe の状態
     */
    private _status: Globe.Status;

    /**
     * 準備が整った Belt インスタンス数
     */
    private _num_ready_belts: number;

    /**
     * Belt の Y 座標の下限
     */
    private _belt_lower_y: number;

    /**
     * Belt の Y 座標の上限
     */
    private _belt_upper_y: number;

    /**
     * すべての Belt インスタンス
     */
    private readonly _belts: Belt[];

    // Bbox
    geo_bbox_visibility: boolean = false;
    gocs_bbox_visibility: boolean = false;

    private _bbox_target_area_id_max: number = 0;
    readonly bbox_target_area_map: Map<number, Area> = new Map<number, Area>();

    private _bbox_target_point_id_max: number = 0;
    readonly bbox_target_point_map: Map<number, Vector2> = new Map<number, Vector2>();

    /**
     * @internal
     */
    private readonly cache: object = {};


    /**
     * @param glenv        - WebGL 環境
     * @param dem_provider - DEM プロバイダ
     * @param options      - 生成オプション
     */
    constructor( glenv: GLEnv,
                 dem_provider: DemProvider,
                 options?: Option )
    {
        // すべての DEM の ρ を合わせる
        const rho = dem_provider.getResolutionPower();

        // 極地オプション
        const pole_opts = options?.pole_info;

        this.glenv        = glenv;
        this.dem_provider = dem_provider;
        this._npole_provider = new FlatDemProvider( { rho, height: pole_opts?.north_height ?? 0.0 } );
        this._spole_provider = new FlatDemProvider( { rho, height: pole_opts?.south_height ?? 0.0 } );
        this._status      = Globe.Status.NOT_READY;
        this._num_ready_belts = 0;

        const pole_enabled = pole_opts?.enabled ?? false;
        this._belt_lower_y = pole_enabled ? GLOBE_BELT_LOWER_Y : 0;
        this._belt_upper_y = pole_enabled ? GLOBE_BELT_UPPER_Y : 0;

        this._belts = [];
        for ( let y = this._belt_lower_y; y <= this._belt_upper_y; ++y ) {
            this._belts.push( new Belt( this, y ) );
        }
    }


    async init() {
        await Promise.all( this._belts.map( belt => belt.init() ) );
    }


    /**
     * Pole を切り替える
     *
     * @param pole_info Pole情報
     */
    setPole( pole_info: PoleInfo ): void
    {
        // すべての DEM の ρ を合わせる
        const rho = this.dem_provider.getResolutionPower();

        // 極地オプション
        const pole_opts = pole_info;

        this._npole_provider = new FlatDemProvider( { rho, height: pole_opts?.north_height ?? 0.0 } );
        this._spole_provider = new FlatDemProvider( { rho, height: pole_opts?.south_height ?? 0.0 } );

        const pole_enabled = pole_info?.enabled ?? false;
        this._belt_lower_y = pole_enabled ? GLOBE_BELT_LOWER_Y : 0;
        this._belt_upper_y = pole_enabled ? GLOBE_BELT_UPPER_Y : 0;

        // update belts
        let dem_belt: Belt | undefined = undefined;
        for ( const belt of this._belts ) {
            if ( belt.belt_y === 0 ) {
                dem_belt = belt; // keep the main belt
            }
            else {
                belt.dispose();
            }
        }
        cfa_assert( dem_belt !== undefined );
        this._belts.splice( 0, this._belts.length );
        for ( let y = this._belt_lower_y; y <= this._belt_upper_y; ++y ) {
            if ( y === 0 ) {
                this._belts.push( dem_belt );
            }
            else {
                this._belts.push( new Belt( this, y ) );
            }
        }
    }


    /**
     * 領域 0/0/y に対応する `Belt` インスタンスを取得
     *
     * @param y - y 座標 (整数 [_belt_lower_y, _belt_upper_y])
     */
    private _belt( y: number ): Belt
    {
        cfa_assert( this._belt_lower_y <= y && y <= this._belt_upper_y );

        return this._belts[y - this._belt_lower_y];
    }


    /**
     * すべてのリクエストを取り消す
     */
    dispose()
    {
        for ( let belt of this._belts ) {
            belt.dispose();
        }

        FlakeMesh.disposeCache( this, this.glenv );
    }

    /**
     * Globe 状態を取得
     */
    get status(): Globe.Status
    {
        return this._status;
    }

    /**
     * DEM が更新された領域を取得
     */
    get dem_area_updated(): UpdatedTileArea
    {
        // エンティティが対象の機能は、まだ中心 Belt のみ対応
        return this._belt( 0 ).dem_area_updated;
    }

    /**
     * 領域 0/0/0 に対応する基底 Flake を取得
     */
    get root_flake(): Globe.Flake
    {
        return this.getRootFlake( 0 );
    }

    /**
     * 領域 0/0/y に対応する基底 Flake を取得
     *
     * @param y - 領域 0/0/y の y にあたる値 (整数)
     *
     * @remarks
     *
     * `y` に指定できる範囲は [[getRootYRange]] により取得することがで
     * きる。
     */
    getRootFlake( y: number ): Globe.Flake
    {
        return this._belt( y ).root_flake;
    }

    /**
     * [[getRootFlake]] に指定できる `y` の範囲を取得
     *
     * `this` の有効期間は一定の範囲を返す。
     */
    getRootYRange(): { lower: number, upper: number }
    {
        return { lower: this._belt_lower_y, upper: this._belt_upper_y };
    }


    /**
     * 緯度経度に対応する基底タイル座標を取得する
     * @param point: GeoPoint
     * @return 基底タイル座標
     * @internal
     */
    getTilePos( point: GeoPoint ): Vector2
    {
        const lon = point.longitude;
        const lat = point.latitude;

        // 正規化緯経度 (Degrees)
        const _lon = lon + 180 * Math.floor( (90 - lat) / 360 + Math.floor( (90 + lat) / 360 ) );
        const nlat = 90 - Math.abs( 90 - lat + 360 * Math.floor( (90 + lat) / 360 ) );  // 正規化緯度 [-90,90]
        const nlon = _lon - 360 - 360 * Math.floor( (_lon - 180) / 360 );               // 正規化緯度 [-180,180)

        // 単位球メルカトル座標
        const xm = nlon * GeoMath.DEGREE;
        const ym = GeoMath.invGudermannian( nlat * GeoMath.DEGREE );

        // 基底タイル座標 (左上(0, 0)、右下(1, 1))
        const dPI = 2 * Math.PI;
        return [
            xm / dPI + 0.5,
            0.5 - ym / dPI
        ];
    }


    /**
     * 地球全体の標高の範囲を取得
     */
    getElevationRange(): { min: number, max: number }
    {
        cfa_assert( this.status === Globe.Status.READY );

        let min =  Number.MAX_VALUE;
        let max = -Number.MAX_VALUE;

        for ( const belt of this._belts ) {
            min = Math.min( belt.root_flake.height_min, min );
            max = Math.max( belt.root_flake.height_max, max );
        }

        return { min, max };
    }

    /**
     * エンティティ情報を更新
     *
     * getRenderObject() の前にエンティティの情報を更新する。
     *
     * @param producers
     */
    putNextEntityProducers( producers: Iterable<Entity.FlakePrimitiveProducer> ): void
    {
        // エンティティが対象の機能は、まだ中心 Belt のみ対応
        return this._belt( 0 ).putNextEntityProducers( producers );
    }

    /**
     * リクエスト待ちの DEM タイルの個数を取得
     *
     * @return  リクエスト待ちの DEM タイルの個数
     */
    getNumDemWaitingRequests(): number
    {
        let count = 0;

        for ( const belt of this._belts ) {
            count += belt.getNumDemWaitingRequests();
        }

        return count;
    }


    /**
     * 正確度が最も高い DEM タイルデータを検索
     *
     * 基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] の標高データを
     * 取得することができる、正確度が最も高い DEM タイルデータを検索す
     * る。
     *
     * サーバーにさらに正確度が高い DEM タイルデータが存在すれば、それ
     * をリクエストする。
     *
     * @param  xt  X 座標 (基底タイル座標系)
     * @param  yt  Y 座標 (基底タイル座標系)
     * @return DEM タイルデータ (存在しなければ null)
     */
    findHighestAccuracy( xt: number, yt: number ): DemBinary | null
    {
        const yp = Math.floor( yt );  // 対象の Belt を選択

        if ( yp < this._belt_lower_y || yp > this._belt_upper_y ) {
            // yt は範囲外
            return null;
        }

        return this._belt( yp ).findHighestAccuracy( xt, yt );
    }

    /**
     * 現行の標高 (複数) を取得
     *
     * 現在メモリーにある最高精度の標高値を一括で取得する。
     *
     * まだ DEM データが存在しない、または経度, 緯度が範囲外の場所は標高を 0 とする。
     *
     * このメソッドは DEM のリクエストは発生しない。また DEM のキャッシュには影響を与えない。
     *
     * 一般的に画面に表示されていない場所は標高の精度が低い。
     *
     * @param  num_points  入出力データ数
     * @param  src_array   入力配列 (経度, 緯度, ...)
     * @param  src_offset  入力データの先頭インデックス
     * @param  src_stride  入力データのストライド
     * @param  dst_array   出力配列 (標高, ...)
     * @param  dst_offset  出力データの先頭インデックス
     * @param  dst_stride  出力データのストライド
     * @return dst_array
     *
     * @see [[Viewer.getExistingElevations]]
     */
    getExistingElevations( num_points: number, src_array: number[], src_offset: number, src_stride: number, dst_array: number[], dst_offset: number, dst_stride: number ): number[]
    {
        // todo: 各 Belt の処理
        return this._belt( 0 ).getExistingElevations( num_points, src_array, src_offset, src_stride, dst_array, dst_offset, dst_stride );
    }

    /**
     * 地表断片とレイの交点までの距離を検索
     *
     * 地球全体 `this` と線分 (`ray.position` を始点とし、そこから
     * `ray.direction` 方向に `limit` 距離未満にある点) との交点の中で、
     * 始点から最も近い交点までの距離を返す。
     *
     * ただし地球全体と線分が交差しないときは `limit` を返す。
     *
     * 事前条件: `this.status` === `Status.READY`
     *
     * @param ray   - `ray.position` を始点として `ray.direction` 方向に伸びる半直線
     * @param limit - この距離までの交点を検索
     *
     * @returns `ray.position` から交点までの距離、ただし交差しなかったときは `limit`
     */
    findRayDistance( ray: Ray,
                     limit: number ): number
    {
        let dmin = limit;

        for ( const belt of this._belts ) {
            dmin = belt.root_flake.findRayDistance( ray, dmin );
        }

        return dmin;
    }

    /**
     * フレームの最後の処理
     */
    endFrame(): void
    {
        for ( const belt of this._belts ) {
            belt.endFrame();
        }
    }

    /**
     * Globe の状態を更新
     *
     * @internal
     */
    public updateStatus( status: Globe.Status ): void
    {
        if ( this._status !== Globe.Status.NOT_READY ) {
            // 状態は決定済みなので無視
            // _num_ready_belts も数えない
            return;
        }

        if ( status === Globe.Status.READY ) {
            ++this._num_ready_belts;
            if ( this._num_ready_belts === this._belts.length ) {
                // 状態は READY に決定
                this._status = status;
            }
        }
        else if ( status === Globe.Status.FAILED ) {
            // 状態は FAILED に決定
            this._status = status;
        }
    }

    /** @internal */
    public setupDebugPickInfo(): void {
        for ( const belt of this._belts ) {
            belt.setupDebugPickInfo();
        }
    }

    /** @internal */
    public popDebugPickInfo(): Globe.DebugPickInfo | undefined {
        // todo: 各 Belt の処理
        return this._belt( 0 ).popDebugPickInfo();
    }


    /**
     * 境界箱表示をするflakeかをチェック
     *
     * @param flake  Flake インスタンス
     */
    isBboxVisible( flake: Globe.Flake ): boolean
    {
        for ( const area of this.bbox_target_area_map.values() ) {
            if ( area.z === flake.z && area.x === flake.x && area.y === flake.y ) {
                return true;
            }
        }

        const size = Math.pow( 2, flake.z );
        for ( const tile_pos of this.bbox_target_point_map.values() ) {
            const x = Math.floor( tile_pos[0] * size );
            const y = Math.floor( tile_pos[1] * size );
            if ( x === flake.x && y === flake.y ) {
                return true;
            }
        }

        return false;
    }


    /**
     * 指定した位置に該当するFlakeの属する全てのFlakeの境界箱を表示
     *
     * @param point 境界箱を表示させる緯度経度またはタイル座標
     * @internal
     */
    addDebugBboxForPoint( point: GeoPoint ): number
    {
        const tile_pos = this.getTilePos( point );
        const id = this._bbox_target_point_id_max++;
        this.bbox_target_point_map.set( id, tile_pos );
        return id;
    }


    /**
     * 指定した位置に該当するFlakeの境界箱を表示
     *
     * @param area 境界箱を表示させる緯度経度またはタイル座標
     * @internal
     */
    addDebugBboxForArea( area: Area ): number
    {
        const id = this._bbox_target_area_id_max++;
        this.bbox_target_area_map.set( id, area );
        return id;
    }


    /**
     * エリア境界箱を削除する
     *
     * @param id 追加時に返却された境界箱id
     * @internal
     */
    removeDebugBboxForArea( id: number )
    {
        this.bbox_target_area_map.delete( id );
    }

    /**
     * ポイント境界箱を削除する
     *
     * @param id 追加時に返却された境界箱id
     * @internal
     */
    removeDebugBboxForPoint( id: number )
    {
        this.bbox_target_point_map.delete( id );
    }



    /**
     * 全てのFlakeの境界箱を削除する
     *
     * @internal
     */
    removeAllDebugBboxes()
    {
        this.bbox_target_area_map.clear();
        this.bbox_target_point_map.clear();
    }
}


/**
 * [[Globe]] の生成オプションの型
 *
 * @see [[Globe.constructor]]
 */
export interface Option {

    /**
     * 極地情報
     *
     * @defaultValue [[Viewer.PoleOption]] の既定値
     */
    pole_info?: PoleInfo;

}


/**
 * 地球のベルト単位の管理
 *
 * このインスタンスは地球の領域 0/0/`y_coord` を管理する。
 */
class Belt {

    public readonly globe: Globe;

    public readonly glenv: GLEnv;

    public readonly dem_provider: DemProvider;

    public readonly belt_y: number;

    private _status: Globe.Status;

    private _dem_area_updated: UpdatedTileArea;

    private _prev_producers: Set<Entity.FlakePrimitiveProducer>;

    public readonly rho: number;

    public readonly dem_zbias: number;

    private _hist_stats: HistStats;

    private _flake_reduce_thresh: number;

    private _flake_reduce_factor: number;

    private _num_cache_flakes: number;

    private _num_touch_flakes: number;

    private _mesh_reduce_lower: number;

    private _mesh_reduce_thresh: number;

    private _mesh_reduce_factor: number;

    private _num_cache_meshes: number;

    private _num_touch_meshes: number;

    private _max_dem_requesteds: number;

    private _num_dem_requesteds: number;

    private _frame_counter: number;

    private _root_flake!: Globe.Flake;

    private _avg_height!: AvgHeightMaps;

    private _root_cancel_id: unknown;

    /** @internal */
    private _debug_pick_info?: Globe.DebugPickInfo;


    /**
     * @param globe  - 親 Globe インスタンス
     * @param belt_y - Belt の y 座標 (整数)
     */
    constructor( globe: Globe,
                 belt_y: number )
    {
        this.globe  = globe;
        this.glenv  = globe.glenv;
        this.belt_y = belt_y;

        if ( belt_y > 0 )
            this.dem_provider = globe.spole_provider;
        else if ( belt_y < 0 )
            this.dem_provider = globe.npole_provider;
        else
            this.dem_provider = globe.dem_provider;

        this._status = Globe.Status.NOT_READY;
        this._dem_area_updated = new UpdatedTileArea();
        this._prev_producers = new Set();

        this.rho = this.dem_provider.getResolutionPower();
        this.dem_zbias = GeoMath.LOG2PI - this.rho + 1;  // b = log2(π) - ρ + 1

        this._hist_stats = new HistStats();

        this._flake_reduce_thresh = 1.5;  // Flake 削減比率閾値
        this._flake_reduce_factor = 1.2;  // Flake 削減比率係数
        this._num_cache_flakes    = 0;    // キャッシュ内の Flake 数 (_root_flake と子孫の数)
        this._num_touch_flakes    = 0;    // 現行フレームでのアクセス Flake 数

        this._mesh_reduce_lower  = 300;   // Mesh 削減下限値
        this._mesh_reduce_thresh = 1.5;   // Mesh 削減比率閾値
        this._mesh_reduce_factor = 1.2;   // Mesh 削減比率係数
        this._num_cache_meshes   = 0;     // キャッシュ内の Mesh 数
        this._num_touch_meshes   = 0;     // 現行フレームでのアクセス Mesh 数

        this._max_dem_requesteds = 10;    // 最大 REQUESTED 数
        this._num_dem_requesteds = 0;     // 現在の REQUESTED 状態の数

        this._frame_counter = 0;  // 現行フレーム番号

        // 以下は _requestRoot() により最上位 DEM タイルを入手した
        // タイミングで初期化される
        //
        // - this._root_flake
        // - this._avg_height

        this._root_cancel_id = undefined;
    }


    async init() {
        await this._requestRoot();
    }


    /**
     * すべてのリクエストを取り消す
     */
    dispose()
    {
        if ( this._status === Globe.Status.READY ) {
            // root の真子孫を破棄 (リクエストをキャンセル)

            // Status.READY のときは root_flake が存在する
            cfa_assert( this._root_flake !== null );

            for ( const child of this._root_flake.children ) {
                if ( child !== null ) {
                    child.dispose();
                }
            }

            // root 自身の StyleFlake リクエストをキャンセル
            this._root_flake.cancelStyleFlake();
        }
        else if ( this._status === Globe.Status.NOT_READY ) {
            // リクエスト中の root をキャンセル
            this.dem_provider.cancelRequest( this._root_cancel_id );
            this._root_cancel_id = undefined;
        }

        cfa_assert( this._num_dem_requesteds == 0 );
    }

    /**
     * DEM が更新された領域を取得
     */
    get dem_area_updated(): UpdatedTileArea
    {
        return this._dem_area_updated;
    }

    /**
     * 基底 Flake を取得
     */
    get root_flake(): Globe.Flake
    {
        const flake = this._root_flake;
        flake.touch();
        return flake;
    }

    /**
     * フレーム番号
     * @internal
     */
    get frame_counter(): number
    {
        return this._frame_counter;
    }

    /** num_touch_flakes を増加 */
    increment_touch_flakes(): void
    {
        ++this._num_touch_flakes;
    }

    /** num_cache_flakes を増加 */
    increment_cache_flakes(): void
    {
        ++this._num_cache_flakes;
    }

    /** num_cache_flakes を減少 */
    decrement_cache_flakes(): void
    {
        --this._num_cache_flakes;
    }

    /** num_cache_meshes を増加 */
    increment_cache_meshes(): void
    {
        ++this._num_cache_meshes;
    }

    /** num_cache_meshes を減少 */
    decrement_cache_meshes(): void
    {
        --this._num_cache_meshes;
    }

    /** num_touch_meshes を増加 */
    increment_touch_meshes(): void
    {
        ++this._num_touch_meshes;
    }

    /** num_dem_requesteds を増加 */
    increment_dem_requesteds(): void
    {
        ++this._num_dem_requesteds;
    }

    /** num_dem_requesteds を減少 */
    decrement_dem_requesteds(): void
    {
        --this._num_dem_requesteds;
    }

    /** DEM のリクエスト数が最大に達しているか？ */
    is_reached_limit_dem_request(): boolean
    {
        return this._num_dem_requesteds >= this._max_dem_requesteds;
    }

    /** @internal */
    get avg_height(): AvgHeightMaps
    {
        return this._avg_height;
    }

    /** @internal */
    get debug_pick_info(): Globe.DebugPickInfo | undefined
    {
        return this._debug_pick_info;
    }

    /**
     * エンティティ情報を更新
     *
     * getRenderObject() の前にエンティティの情報を更新する。
     *
     * @param producers
     */
    putNextEntityProducers( producers: Iterable<Entity.FlakePrimitiveProducer> ): void
    {
        let next_producers = new Set<Entity.FlakePrimitiveProducer>();

        // 追加、削除、更新のリストを作成
        let   added_producers = [];
        let updated_producers = [];

        for ( let prod of producers ) {
            let updated = prod.checkForUpdate();  // 更新チェックとクリア

            if ( this._prev_producers.has( prod ) ) {
                if ( updated ) {
                    // 更新された
                    updated_producers.push( prod );
                }
                this._prev_producers.delete( prod );
            }
            else {
                // 新規追加
                added_producers.push( prod );
            }

            next_producers.add( prod );
        }

        let removed_producers = this._prev_producers;

        // ツリーを更新
        for ( let prod of removed_producers ) {
            this._root_flake.removeEntityProducer( prod );
        }
        for ( let prod of added_producers ) {
            this._root_flake.addEntityProducer( prod );
        }
        for ( let prod of updated_producers ) {
            this._root_flake.updateEntityProducer( prod );
        }

        // 次の prev_producers を設定
        this._prev_producers = next_producers;
    }

    /**
     * リクエスト待ちの DEM タイルの個数を取得
     *
     * @return  リクエスト待ちの DEM タイルの個数
     */
    getNumDemWaitingRequests(): number
    {
        return this._num_dem_requesteds;
    }


    /**
     * 詳細は [[Globe.findHighestAccuracy]] を参照
     */
    findHighestAccuracy( xt: number, yt: number ): DemBinary | null
    {
        var flake = this._root_flake;
        if ( !flake ) {
            // まだ基底タイルが読み込まれていない
            return null;
        }

        var      size = 2;  // 2^(flake.z + 1)
        var        xf = size * xt;
        var        yf = size * yt;
        var dem_flake = flake;  // DEM を持った地表断片

        for (;;) {
            var     u = GeoMath.clamp( Math.floor( xf ), 0, size - 1 ) % 2;
            var     v = GeoMath.clamp( Math.floor( yf ), 0, size - 1 ) % 2;
            var child = flake.children[u + 2*v];

            flake.touch();

            if ( !child ) {
                // これ以上のレベルは存在しない
                break;
            }
            else if ( flake.isDemState( DemState.LOADED ) ) {
                // より正確度が高い DEM を持つ地表断片に更新
                dem_flake = flake;
            }

            flake = child;
            size *= 2;
            xf   *= 2;
            yf   *= 2;
        }

        dem_flake.requestHighestAccuracy( xt, yt );

        return dem_flake.getDemBinary();
    }

    /**
     * 詳細は [[Globe.getExistingElevations]] を参照
     */
    getExistingElevations( num_points: number, src_array: number[], src_offset: number, src_stride: number, dst_array: number[], dst_offset: number, dst_stride: number ): number[]
    {
        var dPI = 2 * Math.PI;
        var demSize = 1 << this.rho;  // 2^ρ

        var src_index = src_offset;
        var dst_index = dst_offset;

        for ( var i = 0; i < num_points; ++i ) {
            // 経緯度 (Degrees)
            var lon = src_array[src_index];
            var lat = src_array[src_index + 1];

            // 正規化経緯度 (Degrees)
            var _lon = lon + 180 * Math.floor( (90 - lat) / 360 + Math.floor( (90 + lat) / 360 ) );
            var nlon = _lon - 360 - 360 * Math.floor( (_lon - 180) / 360 );               // 正規化経度 [-180,180)
            var nlat = 90 - Math.abs( 90 - lat + 360 * Math.floor( (90 + lat) / 360 ) );  // 正規化緯度 [-90,90]

            // 単位球メルカトル座標
            var xm = nlon * GeoMath.DEGREE;
            var ym = GeoMath.invGudermannian( nlat * GeoMath.DEGREE );

            // 基底タイル座標 (左上(0, 0)、右下(1, 1))
            var xt = xm / dPI + 0.5;
            var yt = 0.5 - ym / dPI;

            if ( yt >= 0 && yt <= 1 ) {
                // 通常範囲のとき
                const dem = this._findHighestAccuracy2( xt, yt );
                if ( dem ) {
                    const pow = Math.pow( 2, dem.z );  // 2^ze
                    const  uf = demSize * (pow * xt - dem.x);
                    const  vf = demSize * (pow * yt - dem.y);
                    const  ui = GeoMath.clamp( Math.floor( uf ), 0, demSize - 1 );
                    const  vi = GeoMath.clamp( Math.floor( vf ), 0, demSize - 1 );

                    const heights = dem.getHeights( ui, vi );
                    const h00 = heights[0];
                    const h10 = heights[1];
                    const h01 = heights[2];
                    const h11 = heights[3];

                    // 標高を補間
                    const s = uf - ui;
                    const t = vf - vi;
                    dst_array[dst_index] = ( h00 * ( 1 - s ) + h10 * s ) * ( 1 - t ) + ( h01 * ( 1 - s ) + h11 * s ) * t;
                }
                else {
                    // まだ標高を取得することができない
                    dst_array[dst_index] = 0;
                }
            }
            else {
                // 緯度が Web メルカトルの範囲外 (極に近い)
                dst_array[dst_index] = 0;
            }

            src_index += src_stride;
            dst_index += dst_stride;
        }

        return dst_array;
    }

    /**
     * 正確度が最も高い DEM タイルデータを検索
     *
     * 基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] の標高データを取得することができる、
     * 正確度が最も高い DEM タイルデータを検索する。
     *
     * @param xt - X 座標 (基底タイル座標系)
     * @param yt - Y 座標 (基底タイル座標系)
     *
     * @returns  DEM タイルデータ (存在しなければ null)
     */
    private _findHighestAccuracy2( xt: number, yt: number ): DemBinary | null
    {
        var flake = this._root_flake;
        if ( !flake  ) {
            // まだ基底タイルが読み込まれていない
            return null;
        }

        var      size = 2;  // 2^(flake.z + 1)
        var        xf = size * xt;
        var        yf = size * yt;
        var dem_flake = flake;  // DEM を持った地表断片

        for (;;) {
            var     u = GeoMath.clamp( Math.floor( xf ), 0, size - 1 ) % 2;
            var     v = GeoMath.clamp( Math.floor( yf ), 0, size - 1 ) % 2;
            var child = flake.children[u + 2*v];

            if ( !child ) {
                // これ以上のレベルは存在しない
                break;
            }
            else if ( flake.isDemState( DemState.LOADED ) ) {
                // より正確度が高い DEM を持つ地表断片に更新
                dem_flake = flake;
            }

            flake = child;
            size *= 2;
            xf   *= 2;
            yf   *= 2;
        }

        return dem_flake.getDemBinary();
    }

    /**
     * フレームの最後の処理
     */
    endFrame(): void
    {
        var max_touch_flakes = this._hist_stats.getMaxValue( this._num_touch_flakes );
        if ( this._num_cache_flakes > this._flake_reduce_thresh * max_touch_flakes ) {
            this._reduceFlakes( max_touch_flakes );
        }

        if ( this._num_cache_meshes > this._mesh_reduce_lower &&
             this._num_cache_meshes > this._mesh_reduce_thresh * this._num_touch_meshes ) {
            this._reduceMeshes();
        }

        this._dem_area_updated.clear();

        this._num_touch_flakes = 0;
        this._num_touch_meshes = 0;
        ++this._frame_counter;
    }

    /**
     * _root_flake, _avg_height, _status を設定するためのリクエスト
     */
    private _requestRoot(): void
    {
        const z = 0;
        const x = 0;
        const y = this.belt_y;

        this._root_cancel_id = this.dem_provider.requestTile( z, x, y, data => {
            if ( data ) {
                var dem = new DemBinary( z, x, y, this.rho, data );
                this._avg_height = dem.newAvgHeightMaps();
                this._root_flake = new Flake( null, z, x, y );
                this._root_flake.setupRoot( this, dem );
                this._status = Globe.Status.READY;
                this._dem_area_updated.addTileArea( dem );
            }
            else { // データ取得に失敗
                this._status = Globe.Status.FAILED;
            }
            this.globe.updateStatus( this._status );
            this._root_cancel_id = undefined;
            --this._num_dem_requesteds;
        } );
        ++this._num_dem_requesteds;
    }


    private _reduceFlakes( max_touch_flakes: number ): void
    {
        // Flake を集めて、優先度で整列
        var flat_flakes = this._root_flake.flattenFlakes();
        // assert: flat_flakes.length == this._num_cache_flakes
        flat_flakes.sort( (a, b) => a.compareForReduce( b ) );

        // 優先度の低い Flake を削除
        var num_cache_flakes = Math.floor( this._flake_reduce_factor * max_touch_flakes );
        flat_flakes.slice( num_cache_flakes ).forEach( flake => flake.dispose() );
        // assert: this._num_cache_flakes == num_cache_flakes
    }


    private _reduceMeshes(): void
    {
        var flat_meshes = this._root_flake.flattenMeshes();
        // assert: flat_meshes.length == this._num_cache_meshes
        flat_meshes.sort( (a, b) => a.compareForReduce( b ) );

        var num_cache_meshes = Math.floor( this._mesh_reduce_factor * this._num_touch_meshes );
        flat_meshes.slice( num_cache_meshes ).forEach( mnode => mnode.dispose() );
        // assert: this._num_cache_meshes == num_cache_meshes
    }


    /** @internal */
    public setupDebugPickInfo(): void {
        DEBUG: {
            this._debug_pick_info = {
                trace: [] as Globe.Flake[],
                quads: [] as [Vector3, Vector3, Vector3, Vector3][],
            };
        }
    }

    /** @internal */
    public popDebugPickInfo(): Globe.DebugPickInfo | undefined {
        if ( !this._debug_pick_info ) return undefined;
        const debug_pick_info = this._debug_pick_info;
        this._debug_pick_info = undefined;
        return debug_pick_info;
    }

}


namespace Globe {


/**
 * Globe 状態の列挙型
 *
 * @see [[Globe.status]]
 */
export const enum Status {

    /**
     * 準備中 (初期状態)
     */
    NOT_READY = '@@_NOT_READY',

    /**
     * 準備完了
     */
    READY = '@@_READY',

    /**
     * 失敗状態
     */
    FAILED = '@@_FAILED',

}


/**
 * 地表断片
 */
export class Flake implements Area {

    // from Area
    readonly z: number;
    readonly x: number;
    readonly y: number;

    private _parent: Flake | null;

    readonly children: [Flake | null, Flake | null, Flake | null, Flake | null];

    /** @internal */
    public belt!: Belt;

    /**
     * DEM バイナリ、または取り消しオブジェクト
     *
     * - `_dem_state === DemState.LOADED` のとき:     `DemBinary` インスタンス
     * - `_dem_state === DemState.REQUESTED` のとき:  取り消しオブジェクト (`unknown` 型)
     * - それ以外のとき:                              `null`
     */
    private _dem_data: DemBinary | unknown | null;

    private _dem_state: DemState;

    /** エンティティ辞書 */
    private _entity_map: Map<Entity.FlakePrimitiveProducer, boolean> | null;

    private _meshes: MeshNode[];

    private _style_flake: StyleFlake | null;

    /**
     * 標高代表値
     *
     * 前回の Za (DemBinary) だだし、標高代表が決定しているときは
     * `this` である。
     *
     * 初期状態は `null` である。
     */
    private _prev_Za_dem: DemBinary | Flake | null;

    /**
     * 標高代表値
     *
     * 前回の Zr (DemBinary) である。
     *
     * 初期状態は `null` である。
     */
    private _prev_Zr_dem: DemBinary | null;

    private _base_height: number;

    private _height_min: number;

    private _height_max: number;

    private _dem_zlimit: number;

    private _gocs_x_min: number;
    private _gocs_x_max: number;
    private _gocs_y_min: number;
    private _gocs_y_max: number;
    private _gocs_z_min: number;
    private _gocs_z_max: number;

    private _aframe: number;


    constructor( parent: Flake | null, z: number, x: number, y: number )
    {
        // 地表領域
        this.z = z;
        this.x = x;
        this.y = y;

        // Flake 階層
        this._parent  = parent;
        this.children = [null, null, null, null];

        // 起源 Globe
        if ( parent ) {
            this.belt = parent.belt;
        }
        else {
            // this.belt は setupRoot() で設定
        }

        // DEM データ
        this._dem_data  = null;
        this._dem_state = DemState.NONE;

        // エンティティ辞書
        this._entity_map = null;

        // MeshNode
        this._meshes = [];

        // ベクトルタイル
        this._style_flake = null;

        // 標高代表値
        this._prev_Za_dem = null;
        this._prev_Zr_dem = null;

        this._base_height = 0;     // 平均標高 (h~)
        this._height_min  = 0;     // 最小標高 (h⇓)
        this._height_max  = 0;     // 最大標高 (h⇑)
        this._dem_zlimit  = 0;     // メッシュ生成時の DEM Z レベル上限 (Zb)

        // 境界箱 (AABB)
        this._gocs_x_min = 0;
        this._gocs_x_max = 0;
        this._gocs_y_min = 0;
        this._gocs_y_max = 0;
        this._gocs_z_min = 0;
        this._gocs_z_max = 0;

        // キャッシュ管理
        this._aframe = -1;
        if ( this.belt ) {
            this.belt.increment_cache_flakes();
        }
    }


    get globe(): Globe
    {
        return this.belt.globe;
    }

    get bbox_min(): Vector3
    {
        return [ this._gocs_x_min, this._gocs_y_min, this._gocs_z_min ];
    }

    get bbox_max(): Vector3
    {
        return [ this._gocs_x_max, this._gocs_y_max, this._gocs_z_max ];
    }


    /**
     * DemBinary インスタンスを取得する。
     *
     * DEM 状態は DemState.LOADED であること。
     */
    getDemBinary(): DemBinary
    {
        cfa_assert( this._dem_state === DemState.LOADED );
        cfa_assert( this._dem_data instanceof DemBinary );

        return this._dem_data;
    }

    /**
     * DEM 状態が `state` であるかどうかを確認する。
     */
    isDemState( state: DemState ): boolean
    {
        return this._dem_state === state;
    }

    /**
     * 基準の標高
     */
    get base_height(): number
    {
        return this._base_height;
    }

    /**
     * 最小の標高
     */
    get height_min(): number
    {
        return this._height_min;
    }

    /**
     * 最大の標高
     */
    get height_max(): number
    {
        return this._height_max;
    }

    /**
     * 基底 Flake 専用の設定
     * @internal
     */
    setupRoot( belt: Belt, dem: DemBinary ): void
    {
        this.belt       = belt;
        this._dem_data  = dem;
        this._dem_state = DemState.LOADED;
        this._entity_map = new Map();
        this._estimate();
        belt.increment_cache_flakes();
    }

    /**
     * 子 Flake を取得または生成
     * @param  u 子 Flake U 座標 (0 または 1)
     * @param  v 子 Flake V 座標 (0 または 1)
     * @return 子 Flake インスタンス
     */
    newChild( u: number, v: number ): Globe.Flake
    {
        var index = u + 2*v;
        var child = this.children[index];

        if ( !child ) {
            // 存在しないときは Flake を生成する
            child = new Flake( this, this.z + 1, 2*this.x + u, 2*this.y + v );
            this.children[index] = child;
        }

        child._estimate();
        child.touch();
        return child;
    }

    /**
     * レンダリングオブジェクトを検索
     *
     * @param lod  地表詳細レベル (LOD)
     */
    getRenderObject( lod: number, requireBboxMesh: boolean ): FlakeRenderObject
    {
        var η = Math.pow( 2, -lod ) * Flake.ε;  // 2^-lod ε

        var cu;  // 水平球面分割レベル
        if ( η <= 2 ) {
            cu = Math.max( Math.ceil( GeoMath.LOG2PI - this.z - GeoMath.maprayLog2( Math.acos( 1 - η ) ) ), 0 );
        }
        else {
            cu = 0;
        }

        var cosφ = this._getCosφ();
        var cv;  // 垂直球面分割レベル
        if ( η * cosφ <= 2 ) {
            cv = Math.max( Math.ceil( GeoMath.LOG2PI - this.z + GeoMath.maprayLog2( cosφ / Math.acos( 1 - η * cosφ ) ) ), 0 );
        }
        else {
            cv = 0;
        }

        var node = this._getMeshNode( lod, cu, cv );
        node.touch();

        return node.getRenderObject( requireBboxMesh );
    }

    /**
     *this と交差する FlakePrimitiveProducer インスタンスの列挙子を取得
     */
    getEntityProducers(): Iterable<Entity.FlakePrimitiveProducer>
    {
        let entity_map = this._getEntityMap();
        return entity_map.keys();
    }

    /**
     * Flake ツリーに producer を追加
     *
     * 事前条件:
     *   - this._entity_map !== null
     *   - this と this の子孫に producer が存在しない
     *
     * @param producer
     */
    addEntityProducer( producer: Entity.FlakePrimitiveProducer ): void
    {
        cfa_assert( this._entity_map !== null );

        switch ( producer.getAreaStatus( this ) ) {

        case Entity.AreaStatus.PARTIAL: {
            // エントリに producer を追加
            this._entity_map.set( producer, false );

            // this の子孫も同様の処理
            for ( let child of this.children ) {
                if ( child && child._entity_map !== null ) {
                    child.addEntityProducer( producer );
                }
            }
        } break;

        case Entity.AreaStatus.FULL: {
            this._addEntityFullProducer( producer );
        } break;

        default: // Entity.AreaStatus.EMPTY
            break;
        }
    }

    /**
     * Flake ツリーに producer を追加
     *
     * 事前条件:
     *   - producer.getAreaStatus( this ) === Entity.AreaStatus.FULL
     *   - this._entity_map !== null
     *   - this と this の子孫に producer が存在しない
     *
     * @param producer
     */
    private _addEntityFullProducer( producer: Entity.FlakePrimitiveProducer ): void
    {
        cfa_assert( this._entity_map !== null );

        // エントリに producer を追加
        this._entity_map.set( producer, true );

        // this の子孫も同様の処理
        for ( let child of this.children ) {
            if ( child && child._entity_map !== null ) {
                child._addEntityFullProducer( producer );
            }
        }
    }

    /**
     * Flake ツリーから producer を削除
     *
     * 事前条件:
     *   - this._entity_map !== null
     * 事後条件:
     *   - this と this の子孫に producer が存在しない
     *
     * @param producer
     */
    removeEntityProducer( producer: Entity.FlakePrimitiveProducer ): void
    {
        cfa_assert( this._entity_map !== null );

        if ( !this._entity_map.has( producer ) ) {
            // もともと producer は this と this の子孫に存在しない
            return;
        }

        // エントリから producer を削除
        this._entity_map.delete( producer );

        // this に producer に対応するメッシュが存在すれば削除
        this._removeEntityMeshes( producer );

        // this の子孫も同様の処理
        for ( let child of this.children ) {
            if ( child && child._entity_map !== null ) {
                child.removeEntityProducer( producer );
            }
        }
    }

    /**
     * Flake ツリーの producer を更新
     *
     * 事前条件:
     *   - this._entity_map !== null
     *
     * @param producer
     */
    updateEntityProducer( producer: Entity.FlakePrimitiveProducer ): void
    {
        this.removeEntityProducer( producer );
        this.addEntityProducer( producer );
    }


    /**
     * 地表断片とレイの交点までの距離を検索
     *
     * 地表断片 this と線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離未満にある点) との交点の中で、始点から最も近い交点までの距離を返す。
     *
     * ただし地表断片と線分が交差しないときは limit を返す。
     *
     * 事前条件: this.belt.status === Status.READY
     *
     * @param  ray    ray.position を始点として ray.direction 方向に伸びる半直線
     * @param  limit  この距離までの交点を検索
     * @return ray.position から交点までの距離、ただし交差しなかったときは limit
     */
    findRayDistance( ray: Ray, limit: number ): number
    {
        DEBUG: {
            if ( this.belt.debug_pick_info ) {
                this.belt.debug_pick_info.trace.push( this );
            }
        }

        let dem_flake: Flake;
        for ( dem_flake = this; dem_flake._dem_state !== DemState.LOADED; ) {
            // root_flake は DemState.LOADED なので dem_flake は
            // root_flake ではない -> 親が存在
            cfa_assert( dem_flake._parent !== null );

            dem_flake = dem_flake._parent;
        }

        if ( this.z - dem_flake.z === this.belt.rho ) {
            return this._findQuadRayDistance( ray, limit, dem_flake );
        }
        else if ( this._cullForRayDistance( ray, limit ) ) {
            return limit;
        }
        else {
            let dmin = limit;
            for ( let v = 0; v < 2; ++ v ) {
                for ( let u = 0; u < 2; ++ u ) {
                    dmin = this.newChild( u, v ).findRayDistance( ray, dmin );
                }
            }
            return dmin;
        }
    }

    /**
     * [[StyleFlake]] インスタンスを用意する。
     *
     * 対応する DEM データが存在しないときは `null` を返し、必要なら
     * DEM データをリクエストする。
     */
    ensureStyleFlake( style_manager: StyleManager ): StyleFlake | null
    {
        if ( this._style_flake !== null ) {
            // すでに持っている StyleFlake インスタンスを返す
            return this._style_flake;
        }

        // 直近の非 DemState.NONE の Flake インスタンスを検索
        let near_flake: Flake = this;

        while ( near_flake._dem_state === DemState.NONE ) {
            // root_flake は常に DemState.LOADED なので、ここで
            // near_flake は root_flake ではない -> 親が存在する
            cfa_assert( near_flake._parent !== null );
            near_flake = near_flake._parent;
        }

        if ( near_flake._dem_state === DemState.FAILED ||
             near_flake._dem_state === DemState.REQUESTED ) {
            // - DemState.FAILED のときは諦めて null を返す
            // - DemState.REQUESTED のときは一旦 null を返し、そのタイ
            //   ルを取得してから改めて判断する
            return null;
        }

        cfa_assert( near_flake._dem_state === DemState.LOADED );
        const near_dem = near_flake.getDemBinary();

        if ( near_dem.z === this.z ) {
            // near_dem は自身に完全に一致するので
            cfa_assert( near_flake === this );
            this._style_flake = new StyleFlake( style_manager, near_dem );
        }
        else {
            cfa_assert( near_flake !== this );
            cfa_assert( near_dem.z < this.z );

            const qlevel = near_dem.getQuadLevel( this.z, this.x, this.y );
            if ( qlevel > 0 ) {
                // near_dem より相応しい DEM データがプロバイダに存在
                // するのでリクエスト
                this._requestAncestorDemTile( Math.min( near_dem.z + qlevel, this.z ) );

                // 一旦 null を返し、リクエストしたタイルを取得してか
                // ら改めて判断する
                return null;
            }
            else {
                // near_dem は自身に一致しないが、葉タイルなので使用する
                this._style_flake = new StyleFlake( style_manager, near_dem );
            }
        }

        return this._style_flake;
    }

    /**
     * [[StyleFlake]] のリクエストを取り消してから、`StyleFlake` イン
     * スタンスを消去する。
     *
     * [[StyleManager.__cancel]] または [[Globe.cancel]] から呼び出される。
     */
    cancelStyleFlake(): void
    {
        if ( this._style_flake === null ) {
            // StyleFlake インスタンスが存在しないので何もしない
            return;
        }

        this._style_flake.cancelRequest();
        this._style_flake.dispose();
        this._style_flake = null;
    }

    /**
     * 自己と子孫を破棄
     */
    dispose(): void
    {
        var i;

        var parent = this._parent;
        if ( !parent ) {
            // すでに破棄済み
            return;
        }

        const belt = this.belt;

        // StyleFlake インスタンスを破棄
        if ( this._style_flake !== null ) {
            this._style_flake.dispose();
            this._style_flake = null;
        }

        // メッシュを破棄
        var meshes = this._meshes;
        while ( meshes.length > 0 ) {
            meshes[0].dispose();
        }

        // 子孫 Flake を破棄
        var children = this.children;
        for ( i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child.dispose();
            }
        }

        // 親 Flake から this を削除
        var pchildren = parent.children;
        for ( i = 0; i < 4; ++i ) {
            if ( pchildren[i] === this ) {
                pchildren[i] = null;
                break;
            }
        }
        this._parent = null;

        // DEM リクエストの取り消し
        if ( this._dem_state === DemState.REQUESTED ) {
            belt.dem_provider.cancelRequest( this._dem_data );
            belt.decrement_dem_requesteds();
        }

        // StyleFlake インスタンスの消去
        this.cancelStyleFlake();

        // Flake 数を減らす
        belt.decrement_cache_flakes();
    }

    /**
     * 指定した MeshNode インスタンスを削除
     */
    removeMeshNode( node: MeshNode ): void
    {
        // Flake から node ノードを削除
        const length = this._meshes.length;

        for ( let i = 0; i < length; ++i ) {
            if ( this._meshes[i] === node ) {
                this._meshes.splice( i, 1 );
                break;
            }
        }
    }

    /**
     * 自己と子孫の Flake リストを取得
     * @internal
     */
    flattenFlakes(): Flake[]
    {
        const list: Flake[] = [];
        this._flattenFlakes( list );
        return list;
    }

    /**
     * 自己と子孫の MeshNode リストを取得
     * @internal
     */
    flattenMeshes(): MeshNode[]
    {
        const list: MeshNode[] = [];
        this._flattenMeshes( list );
        return list;
    }

    /**
     * 削減用の Flake 比較
     * @param  other  比較対象
     * @return 比較値
     * @package
     */
    compareForReduce( other: Globe.Flake ): number
    {
        // 最近アクセスしたものを優先
        // 同じなら Z レベルが小さい方を優先
        var a = this;
        var b = other;
        var aframe = b._aframe - a._aframe;
        return (aframe !== 0) ? aframe : a.z - b.z;
    }

    private _flattenFlakes( list: Flake[] ): void
    {
        list.push( this );
        var children = this.children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child._flattenFlakes( list );
            }
        }
    }

    private _flattenMeshes( list: MeshNode[] ): void
    {
        Array.prototype.push.apply( list, this._meshes );
        var children = this.children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child._flattenMeshes( list );
            }
        }
    }

    /**
     * アクセスフレームを更新
     * @package
     */
    touch(): void
    {
        const belt = this.belt;
        if ( this._aframe !== belt.frame_counter ) {
            this._aframe = belt.frame_counter;
            belt.increment_touch_flakes();
        }
    }

    /**
     * メッシュノードを取得
     *
     * @param lod  地表詳細レベル (LOD)
     * @param cu   水平球面分割レベル
     * @param cv   垂直球面分割レベル
     *
     * @return メッシュノード
     */
    private _getMeshNode( lod: number, cu: number, cv: number ): MeshNode
    {
        var   dem = this._getMeshDemBinary( lod );
        var dpows = dem.getDivisionPowers( this, lod, cu, cv );

        // キャッシュに存在すれば、それを返す
        const meshes = this._meshes;
        for ( const mesh of meshes ) {
            if ( mesh.match( dem, dpows ) ) {
                return mesh;
            }
        }

        // キャッシュに存在しないので新規に生成
        const node = new MeshNode( this, dem, dpows );
        meshes.unshift( node );  // 検索効率のため先頭に追加
        return node;
    }

    /**
     * メッシュ用の DEM バイナリを取得
     * @param  lod        地表詳細レベル (LOD)
     * @return DEM タイルデータ
     */
    private _getMeshDemBinary( lod: number ): DemBinary
    {
        var zDesired = GeoMath.clamp( Math.round( lod + this.belt.dem_zbias ),
                                      0, this._dem_zlimit );

        var dem = this._findNearestDemTile( zDesired );

        // 上のレベルの DEM をリクエスト
        if ( dem.z < zDesired ) {
            var qlevel = dem.getQuadLevel( this.z, this.x, this.y );
            if ( qlevel > 0 ) {
                this._requestAncestorDemTile( Math.min( dem.z + qlevel, zDesired ) );
            }
        }

        return dem;
    }

    /**
     * 先祖 DEM タイルデータを検索
     *
     * this の (レベルが zlimit またはそれ以下の) 祖先の中で、現在キャッ
     * シュに存在する最大レベルの DEM タイルデータを検索する。
     *
     * @param zlimit - 先祖レベルの上限 (>= 0, int)
     *
     * @returns 先祖 DEM タイルデータ
     */
    private _findNearestDemTile( zlimit: number ): DemBinary
    {
        let flake: Flake = this;

        // zlimit の地表断片を検索
        const count = this.z - zlimit;
        for ( let i = 0; i < count; ++i ) {
            // count <= this.z なので、ここで flake は root_flake には
            // ならない -> 親が存在する
            cfa_assert( flake._parent !== null );

            flake = flake._parent;
        }

        // 次の DemBinary を持つ地表断片を検索
        while ( flake._dem_state !== DemState.LOADED ) {
            // root_flake は常に DemState.LOADED なので、ここで flake
            // root_flake ではない -> 親が存在する
            cfa_assert( flake._parent !== null );

            flake = flake._parent;
        }

        // 見つけた地表断片の DemBinary を返す

        // DemState.LOADED のとき dem_data は DemBinary
        cfa_assert( flake._dem_state === DemState.LOADED );
        cfa_assert( flake._dem_data instanceof DemBinary );

        return flake._dem_data;
    }

    /**
     * 地表断片を包含する DEM タイルデータを要求
     *
     * this を包含または this と一致する、ズームレベル ze の DEM タイルをサーバーに要求する。
     *
     * ただしすでにキャッシュにその DEM タイルが存在、または REQUESTED 状態のときは要求しない。
     *
     * FAILED 状態かつ ze > 0 のときは、再帰的に ze - 1 を要求する。
     *
     * 要求が最大数に達しているときは無視する。
     *
     * @param ze - DEM ズームレベル (>= 0, int)
     */
    private _requestAncestorDemTile( ze: number ): void
    {
        const belt = this.belt;

        if ( belt.is_reached_limit_dem_request() ) {
            // 要求が最大数に達しているので受け入れない
            return;
        }

        var flake: Flake = this;

        // zlimit の地表断片を検索
        var count = this.z - ze;
        for ( var i = 0; i < count; ++i ) {
            // count <= this.z なので、ここで flake は root_flake には
            // ならない -> flake には親が存在
            cfa_assert( flake._parent !== null );

            flake = flake._parent;
        }

        while ( true ) {
            var state = flake._dem_state;
            if ( state === DemState.LOADED || state === DemState.REQUESTED ) {
                // 要求する必要がない
                break;
            }
            else if ( state === DemState.FAILED ) {
                // 親でリトライ

                // root_flake は常に DemState.LOADED なので、flake は
                // root_flake ではない -> flake には親が存在
                cfa_assert( flake._parent !== null );

                flake = flake._parent;
                continue;
            }
            else {
                // DEM タイルデータを要求
                // assert: state === DemState.NONE
                var provider = belt.dem_provider;

                flake._dem_data = provider.requestTile( flake.z, flake.x, flake.y, data => {
                    if ( !flake._parent ) {
                        // すでに破棄済みなので無視
                        return;
                    }
                    if ( data ) {
                        flake._dem_data  = new DemBinary( flake.z, flake.x, flake.y, belt.rho, data );
                        flake._dem_state = DemState.LOADED;
                        belt.dem_area_updated.addTileArea( flake );
                    }
                    else { // データ取得に失敗
                        flake._dem_data  = null;
                        flake._dem_state = DemState.FAILED;
                    }
                    belt.decrement_dem_requesteds();
                } );

                flake._dem_state = DemState.REQUESTED;
                belt.increment_dem_requesteds();
                break;
            }
        }
    }


    /**
     * カリングするか？
     *
     * @param clip_planes - クリップ平面配列
     *
     * @returns 見えないとき `true`, 見えるまたは不明のとき `false`
     */
    public isInvisible( clip_planes: Vector4[] ): boolean
    {
        var xmin = this._gocs_x_min;
        var xmax = this._gocs_x_max;
        var ymin = this._gocs_y_min;
        var ymax = this._gocs_y_max;
        var zmin = this._gocs_z_min;
        var zmax = this._gocs_z_max;

        for ( var i = 0; i < clip_planes.length; ++i ) {
            var  p = clip_planes[i];
            var px = p[0];
            var py = p[1];
            var pz = p[2];
            var pw = p[3];

            // 以下がすべて成り立つとボックス全体は平面の裏側にある
            //   px*xmin + py*ymin + pz*zmin + pw < 0
            //   px*xmax + py*ymin + pz*zmin + pw < 0
            //   px*xmin + py*ymax + pz*zmin + pw < 0
            //   px*xmax + py*ymax + pz*zmin + pw < 0
            //   px*xmin + py*ymin + pz*zmax + pw < 0
            //   px*xmax + py*ymin + pz*zmax + pw < 0
            //   px*xmin + py*ymax + pz*zmax + pw < 0
            //   px*xmax + py*ymax + pz*zmax + pw < 0

            var c0 =  px*xmin + py*ymin;
            var c1 =  px*xmax + py*ymin;
            var c2 =  px*xmin + py*ymax;
            var c3 =  px*xmax + py*ymax;
            var c4 = -pz*zmin - pw;
            var c5 = -pz*zmax - pw;

            if ( c0 < c4 && c1 < c4 && c2 < c4 && c3 < c4 &&
                 c0 < c5 && c1 < c5 && c2 < c5 && c3 < c5 ) {
                // ボックス全体が平面の裏側にあるので見えない
                return true;
            }
        }

        return false;  // 見えている可能性がある
    }

    /**
     * 領域内で絶対値が最小の緯度に対する余弦
     */
    private _getCosφ(): number
    {
        const z = this.z;
        const y = this.y;
        if ( z === 0 && y === 0 ) {
            // 0/x/0 は唯一赤道を跨ぐ領域なので
            // 絶対値が最小の緯度を 0 とする
            return 1;  // Cos[0]
        }
        else {
            const  p = Math.pow( 2, 1 - z );
            const y0 = Math.abs( 1 - p *  y      );
            const y1 = Math.abs( 1 - p * (y + 1) );
            const ey = Math.exp( Math.PI * Math.min( y0, y1 ) );
            return 2 * ey / (ey*ey + 1);  // Cos[φ] == Cos[gd[y]] == Sech[y]
        }
    }

    /**
     * 標高代表値と境界箱を更新
     */
    private _estimate(): void
    {
        if ( this._prev_Za_dem === this ) {
            // 代表値は決定済みなので何もしない
            return;
        }

        var zg = this.z;
        var rho = this.belt.rho;
        var zr_dem: DemBinary;

        if ( zg < rho ) {
            zr_dem = this._findNearestDemTile( zg );
            if ( zr_dem === this._prev_Zr_dem ) {
                // 前回と代表値が変わらないので何もしない
                return;
            }
            this._prev_Zr_dem = zr_dem;
            this._estimate_low( zr_dem );
            this._dem_zlimit  = zg;
        }
        else {
            var za_dem = this._findNearestDemTile( zg - rho );

            if ( za_dem.isLeaf( zg, this.x, this.y ) ) {
                this._estimate_leaf( za_dem );
            }
            else {
                zr_dem = this._findNearestDemTile( za_dem.z + rho );
                if ( za_dem === this._prev_Za_dem && zr_dem === this._prev_Zr_dem ) {
                    // 前回と代表値が変わらないので何もしない
                    return;
                }
                this._prev_Za_dem = za_dem;
                this._prev_Zr_dem = zr_dem;
                this._estimate_high( za_dem, zr_dem );
            }
            this._dem_zlimit = za_dem.z + rho;
        }

        // 境界箱の更新
        switch ( zg ) {
        case 0:  this._updateBoundingBox_0(); break;
        case 1:  this._updateBoundingBox_1(); break;
        default: this._updateBoundingBox_N(); break;
        }
    }

    /**
     * 標高代表値を計算 (Zg < ρ)
     *
     * @param zr_dem  レベルが Zr の DEM
     */
    private _estimate_low( zr_dem: DemBinary ): void
    {
        cfa_assert( this.z < this.belt.rho );

        const zg = this.z;
        const xg = this.x;
        const yg = this.y;
        const α = this._calcAlpha();

        // avg_height 用の領域 y 座標に変換
        // ya = yg - 2^zg Floor[yg / 2^zg]
        // zg は ρ 未満なのでシフト演算で十分
        const ya = yg - (1 << zg) * Math.floor( yg / (1 << zg) );

        this._base_height = this.belt.avg_height.sample( zg, xg, ya );
        this._height_min  = Math.max( this._base_height + α * Flake.Fm, zr_dem.height_min );
        this._height_max  = Math.min( this._base_height + α * Flake.Fp, zr_dem.height_max );

        if ( zr_dem.z == zg || zr_dem.isLeaf( zg, xg, yg ) ) {
            // 標高代表値が確定した
            this._prev_Za_dem = this;
        }
    }

    /**
     * 標高代表値を計算 (Zg >= ρ && !L(Za))
     *
     * @param za_dem  レベルが Za の DEM
     * @param zr_dem  レベルが Zr の DEM
     */
    private _estimate_high( za_dem: DemBinary, zr_dem: DemBinary ): void
    {
        const belt = this.belt;
        var zg = this.z;
        var xg = this.x;
        var yg = this.y;

        var ze = za_dem.z;  // -> za
        var xe = za_dem.x;
        var ye = za_dem.y;

        var  rho = belt.rho;
        var  pow = Math.pow( 2, ze - zg );
        var size = 1 << rho;

        var    u = Math.floor( size * ((xg + 0.5) * pow - xe) );
        var    v = Math.floor( size * ((yg + 0.5) * pow - ye) );

        var smin = size * ( xg      * pow - xe) - u;
        var smax = size * ((xg + 1) * pow - xe) - u;
        var tmin = size * ( yg      * pow - ye) - v;
        var tmax = size * ((yg + 1) * pow - ye) - v;

        var heights = za_dem.getHeights( u, v );
        var h00 = heights[0];
        var h10 = heights[1];
        var h01 = heights[2];
        var h11 = heights[3];

        var h0 = (h00 * (1 - smin) + h10 * smin) * (1 - tmin) + (h01 * (1 - smin) + h11 * smin) * tmin;
        var h1 = (h00 * (1 - smax) + h10 * smax) * (1 - tmin) + (h01 * (1 - smax) + h11 * smax) * tmin;
        var h2 = (h00 * (1 - smin) + h10 * smin) * (1 - tmax) + (h01 * (1 - smin) + h11 * smin) * tmax;
        var h3 = (h00 * (1 - smax) + h10 * smax) * (1 - tmax) + (h01 * (1 - smax) + h11 * smax) * tmax;

        var α = this._calcAlpha();

        this._base_height = 0.25 * (h0 + h1 + h2 + h3);
        this._height_min  = Math.max( this._base_height + α * Flake.Fm, zr_dem.height_min );
        this._height_max  = Math.min( this._base_height + α * Flake.Fp, zr_dem.height_max );

        if ( ze < zg - rho ) {
            // 上のレベルの DEM をリクエスト
            var qlevel = za_dem.getQuadLevel( zg, xg, yg );
            // assert: qlevel > 0
            this._requestAncestorDemTile( Math.min( ze + qlevel, zg - rho ) );
        }
        else if ( zr_dem.z == zg || zr_dem.isLeaf( zg, xg, yg ) ) {
            // 標高代表値が確定した
            // assert: ze == zg - ρ
            this._prev_Za_dem = this;
        }
    }

    /**
     * 標高代表値を計算 (Zg >= ρ && L(Za))
     *
     * @param za_dem  レベルが Za の DEM
     */
    private _estimate_leaf( za_dem: DemBinary ): void
    {
        var zg = this.z;
        var xg = this.x;
        var yg = this.y;

        var ze = za_dem.z;  // -> za
        var xe = za_dem.x;
        var ye = za_dem.y;

        var  pow = Math.pow( 2, ze - zg );
        var size = 1 << this.belt.rho;

        var    u = Math.floor( size * ((xg + 0.5) * pow - xe) );
        var    v = Math.floor( size * ((yg + 0.5) * pow - ye) );

        var smin = size * ( xg      * pow - xe) - u;
        var smax = size * ((xg + 1) * pow - xe) - u;
        var tmin = size * ( yg      * pow - ye) - v;
        var tmax = size * ((yg + 1) * pow - ye) - v;

        var heights = za_dem.getHeights( u, v );
        var h00 = heights[0];
        var h10 = heights[1];
        var h01 = heights[2];
        var h11 = heights[3];

        // Hi = Di( Za )
        var h0 = (h00 * (1 - smin) + h10 * smin) * (1 - tmin) + (h01 * (1 - smin) + h11 * smin) * tmin;
        var h1 = (h00 * (1 - smax) + h10 * smax) * (1 - tmin) + (h01 * (1 - smax) + h11 * smax) * tmin;
        var h2 = (h00 * (1 - smin) + h10 * smin) * (1 - tmax) + (h01 * (1 - smin) + h11 * smin) * tmax;
        var h3 = (h00 * (1 - smax) + h10 * smax) * (1 - tmax) + (h01 * (1 - smax) + h11 * smax) * tmax;

        this._base_height = 0.25 * (h0 + h1 + h2 + h3);
        this._height_min  = Math.min( h0, h1, h2, h3 );
        this._height_max  = Math.max( h0, h1, h2, h3 );

        // 標高代表値が確定した
        this._prev_Za_dem = this;
    }

    /**
     * α を計算
     *
     * 中間緯度の標高 0 での緯線の長さを示す値 α を計算する。
     *
     * @return  α
     */
    private _calcAlpha(): number
    {
        var pow = Math.pow( 2, 1 - this.z );
        return pow * Flake.πr / Math.cosh( (1 - pow * (this.y + 0.5)) * Math.PI );
    }

    /**
     * 境界箱を更新 (Z == 0)
     */
    private _updateBoundingBox_0(): void
    {
        // 条件: r_max >= r_min > 0
        //       -π/2 < φ_min < φ_max < π/2
        //
        // 範囲: r: [r_min, r_max]
        //      λ: [-π, π]
        //      φ: [φ_min, φ_max]
        //
        // 緯度 φ, 経度 λ, 地心距離 r に対する GOCS 座標の計算
        //
        //   gx = r Cos[φ] Cos[λ]
        //   gy = r Cos[φ] Sin[λ]
        //   gz = r Sin[φ]
        //
        // φ_min >= 0 のとき
        //
        //   gz_min = r_min Sin[φ_min]
        //   gz_max = r_max Sin[φ_max]
        //
        // φ_max <= 0 のとき
        //
        //   gz_min = r_max Sin[φ_min]
        //   gz_max = r_min Sin[φ_max]
        //
        // φ_min < 0 < φ_max のとき
        //
        //   gz_min = r_max Sin[φ_min]
        //   gz_max = r_max Sin[φ_max]
        //
        // Cos[λ] と Sin[λ] の範囲は [-1, 1] で、Cos[φ] > 0、さらに
        // r_max >= r_min > 0 より
        //
        //   gx_min = gy_min = -r_max Cos[φ]
        //   gx_max = gy_max =  r_max Cos[φ]
        //
        // φ の絶対値が小さいほど Cos[φ] は大きくなるので
        //
        // φ_min < 0 < φ_max のとき
        //
        //   gx_min = gy_min = -r_max
        //   gx_max = gy_max =  r_max
        //
        // φ_min >= 0 のとき
        //
        //   gx_min = gy_min = -r_max Cos[φ_min]
        //   gx_max = gy_max =  r_max Cos[φ_min]
        //
        // φ_max <= 0 のとき
        //
        //   gx_min = gy_min = -r_max Cos[φ_max]
        //   gx_max = gy_max =  r_max Cos[φ_max]

        cfa_assert( this.z === 0 && this.x === 0 );

        const pi = Math.PI;

        // 座標範囲 (単位球メルカトル座標系)
        const  msize = 2 * pi;
        const my_min = pi - (this.y + 1) * msize;
        const my_max = pi - this.y * msize;

        // 事前計算変数
        const  emin = Math.exp( my_min );   // Exp[my_min]
        const  emax = Math.exp( my_max );   // Exp[my_max]
        const e2min = emin * emin;          // Exp[my_min]^2
        const e2max = emax * emax;          // Exp[my_max]^2

        const cosφmin = 2 * emin / (e2min + 1);
        const cosφmax = 2 * emax / (e2max + 1);
        const sinφmin = (e2min - 1) / (e2min + 1);
        const sinφmax = (e2max - 1) / (e2max + 1);

        // 地心からの距離範囲
        const r_min = GeoMath.EARTH_RADIUS + this._height_min;
        const r_max = GeoMath.EARTH_RADIUS + this._height_max;

        if ( this.y < 0 ) {
            // φ_min >= 0

            this._gocs_x_min = -r_max * cosφmin;
            this._gocs_x_max =  r_max * cosφmin;

            this._gocs_y_min = -r_max * cosφmin;
            this._gocs_y_max =  r_max * cosφmin;

            this._gocs_z_min = r_min * sinφmin;
            this._gocs_z_max = r_max * sinφmax;
        }
        else if ( this.y > 0 ) {
            // φ_max <= 0

            this._gocs_x_min = -r_max * cosφmax;
            this._gocs_x_max =  r_max * cosφmax;

            this._gocs_y_min = -r_max * cosφmax;
            this._gocs_y_max =  r_max * cosφmax;

            this._gocs_z_min = r_max * sinφmin;
            this._gocs_z_max = r_min * sinφmax;
        }
        else {
            // φ_min < 0 < φ_max
            cfa_assert( this.y === 0 );

            this._gocs_x_min = -r_max;
            this._gocs_x_max =  r_max;

            this._gocs_y_min = -r_max;
            this._gocs_y_max =  r_max;

            this._gocs_z_min = r_max * sinφmin;
            this._gocs_z_max = r_max * sinφmax;
        }
    }

    /**
     * 境界箱を更新 (Z == 1)
     */
    private _updateBoundingBox_1(): void
    {
        // 条件: r_max >= r_min > 0
        //       -π/2 < φ_min < φ_max < π/2
        //       φ_min >= 0 || φ_max <= 0
        //
        // 範囲: r: [r_min, r_max]
        //      λ: [-π, 0] または [0, π]
        //      φ: [φ_min, φ_max]
        //
        // 緯度 φ, 経度 λ, 地心距離 r に対する GOCS 座標の計算
        //
        //   gx = r Cos[φ] Cos[λ]
        //   gy = r Cos[φ] Sin[λ]
        //   gz = r Sin[φ]
        //
        // --------------------------------------------------
        //
        // φ_max > 0 のとき
        //
        //   gz_min = r_min Sin[φ_min]
        //   gz_max = r_max Sin[φ_max]
        //
        // φ_min < 0 のとき
        //
        //   gz_min = r_max Sin[φ_min]
        //   gz_max = r_min Sin[φ_max]
        //
        // --------------------------------------------------
        //
        // this.x == 0 のとき λ の範囲は [-π, 0] なので、Cos[λ] の
        // 範囲は [-1, 1]で、Sin[λ] の範囲は [-1, 0] となる。
        //
        // Cos[φ] > 0、さらに r_max >= r_min > 0 より
        //
        //   gx_min = -r_max Cos[φ]
        //   gx_max =  r_max Cos[φ]
        //   gy_min = -r_max Cos[φ]
        //   gy_max =  0
        //
        // φ の絶対値が小さいほど Cos[φ] は大きくなるので
        //
        // φ_max > 0 のとき
        //
        //   gx_min = -r_max Cos[φ_min]
        //   gx_max =  r_max Cos[φ_min]
        //   gy_min = -r_max Cos[φ_min]
        //   gy_max =  0
        //
        // φ_min < 0 のとき
        //
        //   gx_min = -r_max Cos[φ_max]
        //   gx_max =  r_max Cos[φ_max]
        //   gy_min = -r_max Cos[φ_max]
        //   gy_max =  0
        //
        // --------------------------------------------------
        //
        // this.x == 1 のとき λ の範囲は [0, π] なので、Cos[λ] の
        // 範囲は [-1, 1]で、Sin[λ] の範囲は [0, 1] となる。
        //
        // Cos[φ] > 0、さらに r_max >= r_min > 0 より
        //
        //   gx_min = -r Cos[φ]
        //   gx_max =  r Cos[φ]
        //   gy_min =  0
        //   gy_max =  r Cos[φ]
        //
        // φ の絶対値が小さいほど Cos[φ] は大きくなるので
        //
        // φ_max > 0 のとき
        //
        //   gx_min = -r_max Cos[φ_min]
        //   gx_max =  r_max Cos[φ_min]
        //   gy_min =  0
        //   gy_max =  r_max Cos[φ_min]
        //
        // φ_min < 0 のとき
        //
        //   gx_min = -r_max Cos[φ_max]
        //   gx_max =  r_max Cos[φ_max]
        //   gy_min =  0
        //   gy_max =  r_max Cos[φ_max]

        cfa_assert( this.z === 1 );

        const pi = Math.PI;

        // 座標範囲 (単位球メルカトル座標系)
        const  msize = pi;
        const my_min = pi - (this.y + 1) * msize;
        const my_max = pi - this.y * msize;

        // 事前計算変数
        const  emin = Math.exp( my_min );   // Exp[my_min]
        const  emax = Math.exp( my_max );   // Exp[my_max]
        const e2min = emin * emin;          // Exp[my_min]^2
        const e2max = emax * emax;          // Exp[my_max]^2

        const cosφmin = 2 * emin / (e2min + 1);
        const cosφmax = 2 * emax / (e2max + 1);
        const sinφmin = (e2min - 1) / (e2min + 1);
        const sinφmax = (e2max - 1) / (e2max + 1);

        // 地心からの距離範囲
        const r_min = GeoMath.EARTH_RADIUS + this._height_min;
        const r_max = GeoMath.EARTH_RADIUS + this._height_max;

        if ( my_min + my_max < 0 ) {
            // φ_min < 0  (南半球側)

            if ( this.x === 0 ) {
                // 西半球
                this._gocs_x_min = -r_max * cosφmax;
                this._gocs_x_max =  r_max * cosφmax;
                this._gocs_y_min = -r_max * cosφmax;
                this._gocs_y_max =  0
            }
            else {
                // 東半球
                cfa_assert( this.x === 1 );
                this._gocs_x_min = -r_max * cosφmax;
                this._gocs_x_max =  r_max * cosφmax;
                this._gocs_y_min =  0;
                this._gocs_y_max =  r_max * cosφmax;
            }

            this._gocs_z_min = r_max * sinφmin;
            this._gocs_z_max = r_min * sinφmax;
        }
        else {
            // φ_max > 0  (北半球側)

            if ( this.x === 0 ) {
                // 西半球
                this._gocs_x_min = -r_max * cosφmin;
                this._gocs_x_max =  r_max * cosφmin;
                this._gocs_y_min = -r_max * cosφmin;
                this._gocs_y_max =  0;
            }
            else {
                // 東半球
                cfa_assert( this.x === 1 );
                this._gocs_x_min = -r_max * cosφmin;
                this._gocs_x_max =  r_max * cosφmin;
                this._gocs_y_min =  0;
                this._gocs_y_max =  r_max * cosφmin;
            }

            this._gocs_z_min = r_min * sinφmin;
            this._gocs_z_max = r_max * sinφmax;
        }
    }

    /**
     * 境界箱を更新 (Z >= 2)
     */
    private _updateBoundingBox_N(): void
    {
        var pi = Math.PI;
        var z = this.z;
        var x = this.x;
        var y = this.y;

        // 座標範囲 (単位球メルカトル座標系)
        var  msize = Math.pow( 2, 1 - z ) * pi;
        var mx_min = -pi + x * msize;
        var mx_max = -pi + (x + 1) * msize;
        var my_min =  pi - (y + 1) * msize;
        var my_max =  pi - y * msize;

        // 事前計算変数
        var λmin = mx_min;
        var λmax = mx_max;
        var  emin = Math.exp( my_min );   // Exp[my_min]
        var  emax = Math.exp( my_max );   // Exp[my_max]
        var e2min = emin * emin;          // Exp[my_min]^2
        var e2max = emax * emax;          // Exp[my_max]^2

        // 座標範囲 (地心直交座標系)
        //
        // z >= 2 のとき、λとφの範囲は以下の区間のどれかに入る
        //   φ:                (-π/2, 0] [0, π/2)
        //   λ:   [-π, -π/2] [-π/2, 0] [0, π/2] [π/2, π]
        //
        // 区間ごとの関数の変化 (各区間で単調増加または単調減少)
        //   Sin[φ]:            (-1 → 0] [0 → 1)
        //   Cos[φ]:            ( 0 → 1] [1 → 0)
        //   Sin[λ]: [ 0 → -1] [-1 → 0] [0 → 1] [1 →  0]
        //   Cos[λ]: [-1 →  0] [ 0 → 1] [1 → 0] [0 → -1]

        var     rmin = GeoMath.EARTH_RADIUS + this._height_min;
        var     rmax = GeoMath.EARTH_RADIUS + this._height_max;
        var cosφmin = 2 * emin / (e2min + 1);
        var cosφmax = 2 * emax / (e2max + 1);

        // gx = r Cos[φ] Cos[λ]
        // gy = r Cos[φ] Sin[λ]
        // gz = r Sin[φ]
        if ( my_min + my_max < 0 ) {
            // φ : (-π/2, 0]

            if ( λmin + λmax < -pi ) {
                // λ : [-π, -π/2]

                this._gocs_x_min = rmax * cosφmax * Math.cos( λmin );
                this._gocs_x_max = rmin * cosφmin * Math.cos( λmax );

                this._gocs_y_min = rmax * cosφmax * Math.sin( λmax );
                this._gocs_y_max = rmin * cosφmin * Math.sin( λmin );
            }
            else if ( λmin + λmax < 0 ) {
                // λ : [-π/2, 0]

                this._gocs_x_min = rmin * cosφmin * Math.cos( λmin );
                this._gocs_x_max = rmax * cosφmax * Math.cos( λmax );

                this._gocs_y_min = rmax * cosφmax * Math.sin( λmin );
                this._gocs_y_max = rmin * cosφmin * Math.sin( λmax );
            }
            else if ( λmin + λmax < pi ) {
                // λ : [0, π/2]

                this._gocs_x_min = rmin * cosφmin * Math.cos( λmax );
                this._gocs_x_max = rmax * cosφmax * Math.cos( λmin );

                this._gocs_y_min = rmin * cosφmin * Math.sin( λmin );
                this._gocs_y_max = rmax * cosφmax * Math.sin( λmax );
            }
            else {
                // λ : [π/2, π]

                this._gocs_x_min = rmax * cosφmax * Math.cos( λmax );
                this._gocs_x_max = rmin * cosφmin * Math.cos( λmin );

                this._gocs_y_min = rmin * cosφmin * Math.sin( λmax );
                this._gocs_y_max = rmax * cosφmax * Math.sin( λmin );
            }

            this._gocs_z_min = rmax * (e2min - 1) / (e2min + 1);
            this._gocs_z_max = rmin * (e2max - 1) / (e2max + 1);
        }
        else {
            // φ : [0, π/2)

            if ( λmin + λmax < -pi ) {
                // λ : [-π, -π/2]

                this._gocs_x_min = rmax * cosφmin * Math.cos( λmin );
                this._gocs_x_max = rmin * cosφmax * Math.cos( λmax );

                this._gocs_y_min = rmax * cosφmin * Math.sin( λmax );
                this._gocs_y_max = rmin * cosφmax * Math.sin( λmin );
            }
            else if ( λmin + λmax < 0 ) {
                // λ : [-π/2, 0]

                this._gocs_x_min = rmin * cosφmax * Math.cos( λmin );
                this._gocs_x_max = rmax * cosφmin * Math.cos( λmax );

                this._gocs_y_min = rmax * cosφmin * Math.sin( λmin );
                this._gocs_y_max = rmin * cosφmax * Math.sin( λmax );
            }
            else if ( λmin + λmax < pi ) {
                // λ : [0, π/2]

                this._gocs_x_min = rmin * cosφmax * Math.cos( λmax );
                this._gocs_x_max = rmax * cosφmin * Math.cos( λmin );

                this._gocs_y_min = rmin * cosφmax * Math.sin( λmin );
                this._gocs_y_max = rmax * cosφmin * Math.sin( λmax );
            }
            else {
                // λ : [π/2, π]

                this._gocs_x_min = rmax * cosφmin * Math.cos( λmax );
                this._gocs_x_max = rmin * cosφmax * Math.cos( λmin );

                this._gocs_y_min = rmin * cosφmax * Math.sin( λmax );
                this._gocs_y_max = rmax * cosφmin * Math.sin( λmin );
            }

            this._gocs_z_min = rmin * (e2min - 1) / (e2min + 1);
            this._gocs_z_max = rmax * (e2max - 1) / (e2max + 1);
        }
    }

    /**
     * サーバーにさらに正確度が高い DEM タイルデータが存在すれば、それをリクエストする。
     * @param xt X 座標 (基底タイル座標系)
     * @param yt Y 座標 (基底タイル座標系)
     * @internal
     */
    requestHighestAccuracy( xt: number, yt: number ): void
    {
        cfa_assert( this._dem_state === DemState.LOADED );
        cfa_assert( this._dem_data instanceof DemBinary );

        var qlevel = this._dem_data.getQuadLevelDirect( xt, yt );
        if ( qlevel == 0 ) {
            // さらに正確度が高い DEM タイルデータは存在しない
            return;
        }

        var flake: Flake = this;
        var  size = Math.round( Math.pow( 2, this.z + 1 ) );
        var    xf = size * xt;
        var    yf = size * yt;

        for ( var i = 0; i < qlevel; ++i ) {
            var u = GeoMath.clamp( Math.floor( xf ), 0, size - 1 ) % 2;
            var v = GeoMath.clamp( Math.floor( yf ), 0, size - 1 ) % 2;
            flake = flake.newChild( u, v );
            size *= 2;
            xf   *= 2;
            yf   *= 2;
        }

        flake._requestAncestorDemTile( flake.z );
    }

    /**
     * 地表断片とレイの交点までの距離を検索
     *
     * 地表断片 this と線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離未満にある点) との交点までの距離を返す。
     *
     * ただし地表断片と線分が交差しないときは limit を返す。
     */
    private _findQuadRayDistance( ray: Ray, limit: number, dem_flake: Flake ): number
    {
        const  pts = this.getQuadPositions( dem_flake, VECTOR3_BUF );

        DEBUG: {
            if ( this.belt.debug_pick_info ) {
                this.belt.debug_pick_info.quads.push([
                        GeoMath.copyVector3( pts[0], GeoMath.createVector3() ),
                        GeoMath.copyVector3( pts[1], GeoMath.createVector3() ),
                        GeoMath.copyVector3( pts[2], GeoMath.createVector3() ),
                        GeoMath.copyVector3( pts[3], GeoMath.createVector3() ),
                ]);
            }
        }
        var dist = Flake._findTriRayDistance( ray, limit, pts[0], pts[2], pts[1] );
        return (dist === limit) ? Flake._findTriRayDistance( ray, limit, pts[1], pts[2], pts[3] ) : dist;
    }

    /**
     * 三角形とレイの交点までの距離を検索
     *
     * 三角形 p0, p1, p2 と線分 (ray.position を始点とし、そこから
     * ray.direction 方向に limit 距離未満にある点) との交点までの距離
     * を返す。
     *
     * ただし地表断片と線分が交差しないときは limit を返す。
     */
    private static _findTriRayDistance( ray: Ray, limit: number, p0: Vector3, p1: Vector3, p2: Vector3 ): number
    {
        var v = ray.direction;

        // P1 - P0
        var p1_p0 = Flake._temp_ray_1;
        p1_p0[0] = p1[0] - p0[0];
        p1_p0[1] = p1[1] - p0[1];
        p1_p0[2] = p1[2] - p0[2];

        // P2 - P0
        var p2_p0 = Flake._temp_ray_2;
        p2_p0[0] = p2[0] - p0[0];
        p2_p0[1] = p2[1] - p0[1];
        p2_p0[2] = p2[2] - p0[2];

        // N = (P1 − P0) × (P2 − P0)
        var n = GeoMath.cross3( p1_p0, p2_p0, Flake._temp_ray_3 );
        // N . V
        var nv = GeoMath.dot3( n, v );

        if ( nv < 0 ) {
            var q = ray.position;

            // P0 - Q
            var p0_q = Flake._temp_ray_4;
            p0_q[0] = p0[0] - q[0];
            p0_q[1] = p0[1] - q[1];
            p0_q[2] = p0[2] - q[2];

            //      N . (P0 - Q)
            // t = --------------
            //         N . V
            var t = GeoMath.dot3( n, p0_q ) / nv;
            if ( t >= 0 && t < limit ) {
                // P = Q + t V
                var p = Flake._temp_ray_5;
                p[0] = q[0] + t * v[0];
                p[1] = q[1] + t * v[1];
                p[2] = q[2] + t * v[2];

                // P0 - P
                var p0_p = Flake._temp_ray_6;
                p0_p[0] = p0[0] - p[0];
                p0_p[1] = p0[1] - p[1];
                p0_p[2] = p0[2] - p[2];

                // P1 - P
                var p1_p = Flake._temp_ray_7;
                p1_p[0] = p1[0] - p[0];
                p1_p[1] = p1[1] - p[1];
                p1_p[2] = p1[2] - p[2];

                // P2 - P
                var p2_p = Flake._temp_ray_8;
                p2_p[0] = p2[0] - p[0];
                p2_p[1] = p2[1] - p[1];
                p2_p[2] = p2[2] - p[2];

                // ((P0 - P) × (P1 - P)) . N >= 0
                // ((P1 - P) × (P2 - P)) . N >= 0
                // ((P2 - P) × (P0 - P)) . N >= 0
                if ( GeoMath.dot3( GeoMath.cross3( p0_p, p1_p, Flake._temp_ray_9  ), n ) >= 0 &&
                     GeoMath.dot3( GeoMath.cross3( p1_p, p2_p, Flake._temp_ray_10 ), n ) >= 0 &&
                     GeoMath.dot3( GeoMath.cross3( p2_p, p0_p, Flake._temp_ray_11 ), n ) >= 0 ) {
                    return t;
                }
            }
        }

        return limit;
    }

    /**
     * 四隅の位置を取得
     *
     * @param height_src  高さ情報
     * @param positions  結果の格納先
     *
     * @returns  [左上, 右上, 左下, 右下]
     */
    getQuadPositions( height_src: Flake | number[], positions: [Vector3, Vector3, Vector3, Vector3] ): [Vector3, Vector3, Vector3, Vector3]
    {
        const xg = this.x;
        const yg = this.y;

        let heights;
        if ( height_src instanceof Flake ) {
            cfa_assert( height_src._dem_state === DemState.LOADED );
            cfa_assert( height_src._dem_data instanceof DemBinary );
            const xe = height_src.x;
            const ye = height_src.y;
            const size = 1 << this.belt.rho;
            heights = height_src._dem_data.getHeights( xg - size * xe, yg - size * ye );
        }
        else {
            heights = height_src;
        }

        const msize = Math.pow( 2, 1 - this.z ) * Math.PI;
        const   mx0 = xg * msize - Math.PI;
        const   my0 = Math.PI - yg * msize;

        for ( let iv = 0, my = my0; iv < 2; ++iv, my -= msize ) {
            const ey    = Math.exp( my );
            const ey2   = ey * ey;
            const sinφ = (ey2 - 1) / (ey2 + 1);
            const cosφ =   2 * ey  / (ey2 + 1);
            for ( let iu = 0, mx = mx0; iu < 2; ++iu, mx += msize ) {
                const  index = iu + 2*iv;
                const radius = GeoMath.EARTH_RADIUS + heights[index];
                const  sinλ = Math.sin( mx );
                const  cosλ = Math.cos( mx );

                const pos = positions[index];
                pos[0] = radius * cosφ * cosλ;
                pos[1] = radius * cosφ * sinλ;
                pos[2] = radius * sinφ;
            }
        }

        return positions;
    }

    /**
     * 地表断片とレイの交点までの距離を検索
     *
     * 地表断片 this と線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離未満にある点) が交差しないときは true, 交差するまたは不明のとき false を返す。
     */
    private _cullForRayDistance( ray: Ray, limit: number ): boolean
    {
        var q  = ray.position;
        var qx = q[0];
        var qy = q[1];
        var qz = q[2];

        var xmin = this._gocs_x_min;
        var xmax = this._gocs_x_max;
        var ymin = this._gocs_y_min;
        var ymax = this._gocs_y_max;
        var zmin = this._gocs_z_min;
        var zmax = this._gocs_z_max;

        if ( xmin <= qx && qx <= xmax &&
             ymin <= qy && qy <= ymax &&
             zmin <= qz && qz <= zmax ) {
            // ray の始点が AABB の表面または内部 -> 交差する可能性がある
            return false;
        }

        var v  = ray.direction;
        var vx = v[0];
        var vy = v[1];
        var vz = v[2];

        var t;
        var px;
        var py;
        var pz;

        // yz
        if ( qx < xmin && vx > 0 ) {
            t = (xmin - qx) / vx;
            if ( t < limit ) {
                py = qy + t * vy;
                pz = qz + t * vz;
                if ( ymin <= py && py <= ymax &&
                     zmin <= pz && pz <= zmax ) {
                    // ray 線分は AABB の xmin 面内で交差
                    return false;
                }
            }
        }
        else if ( qx > xmax && vx < 0 ) {
            t = (xmax - qx) / vx;
            if ( t < limit ) {
                py = qy + t * vy;
                pz = qz + t * vz;
                if ( ymin <= py && py <= ymax &&
                     zmin <= pz && pz <= zmax ) {
                    // ray 線分は AABB の xmax 面内で交差
                    return false;
                }
            }
        }

        // xz
        if ( qy < ymin && vy > 0 ) {
            t = (ymin - qy) / vy;
            if ( t < limit ) {
                px = qx + t * vx;
                pz = qz + t * vz;
                if ( xmin <= px && px <= xmax &&
                     zmin <= pz && pz <= zmax ) {
                    // ray 線分は AABB の ymin 面内で交差
                    return false;
                }
            }
        }
        else if ( qy > ymax && vy < 0 ) {
            t = (ymax - qy) / vy;
            if ( t < limit ) {
                px = qx + t * vx;
                pz = qz + t * vz;
                if ( xmin <= px && px <= xmax &&
                     zmin <= pz && pz <= zmax ) {
                    // ray 線分は AABB の ymax 面内で交差
                    return false;
                }
            }
        }

        // xy
        if ( qz < zmin && vz > 0 ) {
            t = (zmin - qz) / vz;
            if ( t < limit ) {
                px = qx + t * vx;
                py = qy + t * vy;
                if ( xmin <= px && px <= xmax &&
                     ymin <= py && py <= ymax ) {
                    // ray 線分は AABB の zmin 面内で交差
                    return false;
                }
            }
        }
        else if ( qz > zmax && vz < 0 ) {
            t = (zmax - qz) / vz;
            if ( t < limit ) {
                px = qx + t * vx;
                py = qy + t * vy;
                if ( xmin <= px && px <= xmax &&
                     ymin <= py && py <= ymax ) {
                    // ray 線分は AABB の zmax 面内で交差
                    return false;
                }
            }
        }

        // ray 線分と AABB は交差しない
        return true;
    }


    /**
     * エンティティのメッシュを削除
     *
     * @param producer
     */
    private _removeEntityMeshes( producer: Entity.FlakePrimitiveProducer ): void
    {
        for ( let node of this._meshes ) {
            node.removeEntityMesh( producer );
        }
    }


    /**
     * エンティティ辞書を取得
     */
    private _getEntityMap(): Map<Entity.FlakePrimitiveProducer, boolean>
    {
        if ( this._entity_map === null ) {
            // 存在しないので新たに生成する

            // root_flake には常に this._entity_map が存在する ->
            // this は root_flake ではない -> this には親が存在
            cfa_assert( this._parent !== null );

            let parent_map = this._parent._getEntityMap();  // 親の辞書
            let entity_map = new Map();

            for ( let [producer, isfull] of parent_map ) {
                if ( isfull ) {
                    // 親が FULL なので、子も FULL
                    entity_map.set( producer, true );
                }
                else {
                    switch ( producer.getAreaStatus( this ) ) {
                    case Entity.AreaStatus.PARTIAL:
                        entity_map.set( producer, false );
                        break;
                    case Entity.AreaStatus.FULL:
                        entity_map.set( producer, true );
                        break;
                    default: // Entity.AreaStatus.EMPTY
                        break;
                    }
                }
            }

            this._entity_map = entity_map;
        }

        return this._entity_map;
    }


    /**
     * 球面分割数の係数
     */
    private static readonly ε = 0.0625;


    /**
     * 標高下限係数
     */
    static readonly Fm = -2.0;


    /**
     * 標高上限係数
     */
    static readonly Fp = 2.0;


    private static readonly πr = Math.PI * GeoMath.EARTH_RADIUS;


    private static readonly _temp_ray_1  = GeoMath.createVector3();
    private static readonly _temp_ray_2  = GeoMath.createVector3();
    private static readonly _temp_ray_3  = GeoMath.createVector3();
    private static readonly _temp_ray_4  = GeoMath.createVector3();
    private static readonly _temp_ray_5  = GeoMath.createVector3();
    private static readonly _temp_ray_6  = GeoMath.createVector3();
    private static readonly _temp_ray_7  = GeoMath.createVector3();
    private static readonly _temp_ray_8  = GeoMath.createVector3();
    private static readonly _temp_ray_9  = GeoMath.createVector3();
    private static readonly _temp_ray_10 = GeoMath.createVector3();
    private static readonly _temp_ray_11 = GeoMath.createVector3();

}


} // namespace Globe


/**
 * 履歴統計
 */
class HistStats {

    private _history: number[];
    private _max_value: number;
    private _hsize: number;

    constructor()
    {
        this._history   = [];
        this._max_value = 0;
        this._hsize     = 200;  // >= 3
    }

    /**
     * 最大値を取得
     */
    getMaxValue( value: number ): number
    {
        var history = this._history;
        var old_max = this._max_value;

        if ( history.length < this._hsize ) {
            // 追加のみ
            if ( value > old_max ) {
                this._max_value = value;
            }
        }
        else {
            // 追加と削除
            if ( value >= old_max ) {
                // 最大値は value に変わる
                this._max_value = value;
                history.shift();
            }
            else if ( history[0] < old_max ) {
                // 最大値は変わらず
                history.shift();
            }
            else {
                // 最大値は変わる可能性がある
                history.shift();
                this._max_value = HistStats._find_max( history );
            }
        }

        history.push( value );

        return this._max_value;
    }


    private static _find_max( history: number[] ): number
    {
        let max_value = history[0];

        const length = history.length;
        for ( let i = 1; i < length; ++i ) {
            const value = history[i];
            if ( value > max_value ) {
                max_value = value;
            }
        }

        return max_value;
    }

}


/**
 * メッシュ管理ノード
 */
class MeshNode {

    private _flake: Globe.Flake;

    private _dem: DemBinary;

    private _dpows: [number, number];

    private _aframe: number;

    private _base_mesh: FlakeMesh;

    private _flake_bbox_info: Globe.FlakeBboxMeshInfo | null;

    private _entity_meshes: Map<Entity.FlakePrimitiveProducer, Mesh | 'CACHED_EMPTY_MESH'>;


    /**
     * 初期化
     * @param flake  所有者
     * @param dem    DEM バイナリ
     * @param dpows  分割指数
     */
    constructor( flake: Globe.Flake, dem: DemBinary, dpows: [number, number] )
    {
        this._flake  = flake;
        this._dem    = dem;
        this._dpows  = [...dpows];
        this._aframe = -1;

        // 地表のメッシュ
        this._base_mesh = new FlakeMesh( flake.globe.glenv, flake, dpows, dem );

        this._flake_bbox_info = null;

        // エンティティのメッシュ
        this._entity_meshes = new Map();

        // メッシュ数をカウントアップ
        flake.belt.increment_cache_meshes();
    }


    _getBboxMesh(): Globe.FlakeBboxMeshInfo
    {
        return this._flake_bbox_info ?? ( this._flake_bbox_info = this.createBboxInfo() );
    }


    /**
     * FlakeRenderObject インスタンスを取得
     */
    getRenderObject( requireBboxMesh: boolean ): FlakeRenderObject
    {
        let flake = this._flake;
        let   fro = new FlakeRenderObject( flake, flake.globe.glenv, this._base_mesh );

        if ( requireBboxMesh ) {
            const { gocs_bbox, geo_bbox} = this._getBboxMesh();
            fro.setDebugMesh( gocs_bbox, geo_bbox );
        }

        // fro にエンティティ毎のデータを追加
        for ( let producer of flake.getEntityProducers() ) {
            // producer に対応するキャッシュされた Mesh
            let mesh = this._getEntityMesh( producer );

            if ( mesh === 'CACHED_EMPTY_MESH' ) {
                // mesh は空メッシュとしてキャッシュされている --> fro に追加しない
                continue;
            }

            if ( mesh === undefined ) {
                // メッシュがキャッシュに存在しないので、メッシュを生成してキャッシュする
                mesh = producer.createMesh( flake, this._dpows, this._dem ) ?? 'CACHED_EMPTY_MESH';
                this._setEntityMesh( producer, mesh );

                if ( mesh === 'CACHED_EMPTY_MESH' ) {
                    // mesh は空メッシュとしてキャッシュされた --> fro に追加しない
                    continue;
                }
            }

            // fro にエンティティを追加
            fro.addEntityData( mesh, producer );
        }

        return fro;
    }

    /**
     * 一致するか？
     * @param  dem    DEM バイナリ
     * @param  dpows  分割指数
     * @return 一致するとき true, 一致しないとき false
     */
    match( dem: DemBinary, dpows: [number, number] ): boolean
    {
        return (this._dem === dem) && (this._dpows[0] === dpows[0]) && (this._dpows[1] === dpows[1]);
    }

    /**
     * アクセスフレームを更新
     */
    touch(): void
    {
        const belt = this._flake.belt;
        if ( this._aframe !== belt.frame_counter ) {
            this._aframe = belt.frame_counter;
            belt.increment_touch_meshes();
        }
    }

    /**
     * ノードを破棄
     */
    dispose(): void
    {
        if ( !this._base_mesh ) {
            // すでに破棄されている
            return;
        }

        const flake = this._flake;

        // 起源の Flake から自己を削除
        flake.removeMeshNode( this );

        // メッシュを破棄
        this._base_mesh.dispose();
        // @ts-ignore
        this._base_mesh = null;

        for ( let mesh of this._entity_meshes.values() ) {
            if ( mesh instanceof Mesh ) {
                mesh.dispose();
            }
        }

        // Bboxメッシュを破棄
        if ( this._flake_bbox_info ) {
            this._flake_bbox_info.geo_bbox.dispose();
            this._flake_bbox_info.gocs_bbox.dispose();
            this._flake_bbox_info = null;
        }

        // メッシュ数をカウントダウン
        flake.belt.decrement_cache_meshes();
    }

    /**
     * 削減用の MeshNode 比較
     * @param  other  比較対象
     * @return 比較値
     * @internal
     */
    compareForReduce( other: MeshNode ): number
    {
        // 最近アクセスしたものを優先
        var a = this;
        var b = other;
        return b._aframe - a._aframe;
    }


    /**
     * エンティティのメッシュを削除
     *
     * producer に対応するメッシュが存在すれば削除する。
     *
     * @param  producer
     */
    removeEntityMesh( producer: Entity.FlakePrimitiveProducer ): void
    {
        this._entity_meshes.delete( producer );
    }


    /**
     * エンティティのメッシュを取得
     *
     * `producer` に対応するメッシュを取得する。
     *
     * ただし存在しないとき `undefined`, 空メッシュが設定されているとき
     * は `"CACHED_EMPTY_MESH"` を返す。
     */
    private _getEntityMesh( producer: Entity.FlakePrimitiveProducer ): Mesh | 'CACHED_EMPTY_MESH' | undefined
    {
        return this._entity_meshes.get( producer );
    }


    /**
     * エンティティのメッシュを設定
     *
     * `producer` に対応するメッシュを設定する。
     *
     * 空メッシュを設定するときは `mesh` に `"CACHED_EMPTY_MESH"` を指定する。
     */
    private _setEntityMesh( producer: Entity.FlakePrimitiveProducer,
                            mesh: Mesh | 'CACHED_EMPTY_MESH' ): void
    {
        this._entity_meshes.set( producer, mesh );
    }


    /**
     * 境界箱メッシュ情報を作成
     */
    private createBboxInfo(): Globe.FlakeBboxMeshInfo
    {
        return {
            gocs_bbox: this._createGocsBbox(),
            geo_bbox: this._createGeoBbox(),
        }
    }


    /**
     * GOCS座標系における境界箱メッシュを作成
     */
    private _createGocsBbox(): Mesh
    {
        const offset = this._base_mesh.center;
        const min = this._flake.bbox_min;
        const max = this._flake.bbox_max;

        const vertices = [];
        for ( const z of [min[2], max[2]] ) {
            for ( const x of [min[0], max[0]] ) {
                for ( const y of [min[1], max[1]] ) {
                    vertices.push( x - offset[0], y - offset[1], z - offset[2] );
                }
            }
        }

        const indices = [
            0, 1, 1, 3, 3, 2, 2, 0,
            4, 5, 5, 7, 7, 6, 6, 4,
            0, 4, 1, 5, 3, 7, 2, 6,
        ];

        const mesh_data: MeshData = {
            vtype: [
                { name: "a_position", size: 3 }
            ],
            ptype: "lines",
            vertices: vertices,
            indices: indices
        };
        return new Mesh( this._flake.globe.glenv, mesh_data );
    }


    /**
     * 緯度,経度,高度における境界箱メッシュを作成
     */
    private _createGeoBbox(): Mesh
    {
        const offset = this._base_mesh.center;
        const flake = this._flake;
        const positions = flake.getQuadPositions( [0, 0, 0, 0], VECTOR3_BUF );

        const vertices = [];
        const geo = new GeoPoint();
        const gp = GeoMath.createVector3();
        for ( const height of [flake.height_min, flake.base_height, flake.height_max] ) {
            for ( const pos of positions ) {
                geo.setFromGocs( pos );
                geo.altitude = height;
                geo.getAsGocs( gp );
                vertices.push( gp[0] - offset[0], gp[1] - offset[1], gp[2] - offset[2]);
            }
        }

        const indices  = [
            0, 1, 1, 3, 3, 2, 2, 0,
            4, 5, 5, 7, 7, 6, 6, 4,
            8, 9, 9, 11, 11, 10, 10, 8,
            0, 8, 1, 9, 3, 11, 2, 10,
        ];

        const mesh_data: MeshData = {
            vtype: [
                { name: "a_position", size: 3 }
            ],
            ptype: "lines",
            vertices: vertices,
            indices: indices
        };
        return new Mesh( flake.globe.glenv, mesh_data );
    }

}


/**
 * DEM 状態の列挙型
 */
export const enum DemState {
    /**
     * DEM タイルが存在しない
     */
    NONE = '@@_NONE',

    /**
     * DEM タイルが存在する
     */
    LOADED = '@@_LOADED',

    /**
     * DEM タイルをリクエスト中
     */
    REQUESTED = '@@_REQUESTED',

    /**
     * DEM タイルのリクエストに失敗
     */
    FAILED = '@@_FAILED',
};


namespace Globe {


export interface DebugPickInfo {
    ray?: Ray;
    distance?: number;
    trace: Globe.Flake[];
    quads: [Vector3, Vector3, Vector3, Vector3][];
}


/**
 * @internal
 * 境界箱メッシュ情報
 */
export interface FlakeBboxMeshInfo {
    gocs_bbox: Mesh;
    geo_bbox: Mesh;
}



} // namespace Globe


/**
 * 可能な Belt の Y 座標の下限
 *
 * 0 または 0 以下の整数
 */
export const GLOBE_BELT_LOWER_Y = -3;


/**
 * 可能な Belt の Y 座標の上限
 *
 * 0 または 0 以上の整数
 */
export const GLOBE_BELT_UPPER_Y = +3;


const VECTOR3_BUF: [ Vector3, Vector3, Vector3, Vector3 ] = [
    GeoMath.createVector3(),
    GeoMath.createVector3(),
    GeoMath.createVector3(),
    GeoMath.createVector3(),
];


const Flake = Globe.Flake;
export { Flake };
export default Globe;
