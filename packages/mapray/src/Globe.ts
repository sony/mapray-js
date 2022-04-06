import GeoMath, { Vector3, Vector4 } from "./GeoMath";
import GLEnv from "./GLEnv";
import Ray from "./Ray";
import DemProvider from "./DemProvider";
import DemBinary from "./DemBinary";
import FlakeMesh from "./FlakeMesh";
import FlakeRenderObject from "./FlakeRenderObject";
import UpdatedTileArea from "./UpdatedTileArea";
import Mesh from "./Mesh";
import Entity from "./Entity";
import AvgHeightMaps from "./AvgHeightMaps";


/**
 * @summary 地表形状の管理
 * @memberof mapray
 * @private
 */
class Globe {

    private _glenv: GLEnv;

    private _dem_provider: DemProvider<any>;

    private _status: Globe.Status;

    private _dem_area_updated: UpdatedTileArea;

    private _prev_producers: Set<Entity.FlakePrimitiveProducer>;

    private _rho: number;

    private _dem_zbias: number;

    private _hist_stats: Globe.HistStats;

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

    private _root_cancel_id?: any;

    /** @internal */
    private _debug_pick_info?: Globe.DebugPickInfo;


    /**
     * @param glenv         WebGL 環境
     * @param dem_provider  DEM プロバイダ
     */
    constructor( glenv: GLEnv, dem_provider: DemProvider<any> )
    {
        this._glenv        = glenv;
        this._dem_provider = dem_provider;
        this._status = Globe.Status.NOT_READY;
        this._dem_area_updated = new UpdatedTileArea();
        this._prev_producers = new Set<Entity.FlakePrimitiveProducer>();

        this._rho = dem_provider.getResolutionPower();
        this._dem_zbias = GeoMath.LOG2PI - this._rho + 1;  // b = log2(π) - ρ + 1

        this._hist_stats = new Globe.HistStats();

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

        this._requestRoot();
    }

    /**
     * すべてのリクエストを取り消す
     */
    cancel()
    {
        if ( this._status === Globe.Status.READY ) {
            // root の真子孫を破棄 (リクエストをキャンセル)
            const children = (this._root_flake as Globe.Flake).children;
            for ( const child of children ) {
                if ( child !== null ) {
                    child.dispose();
                }
            }
        }
        else if ( this._status === Globe.Status.NOT_READY ) {
            // リクエスト中の root をキャンセル
            this._dem_provider.cancelRequest( this._root_cancel_id );
            this._root_cancel_id = undefined;
        }

        // assert: this._num_dem_requesteds == 0
    }

    /**
     * WebGL 環境
     */
    get glenv(): GLEnv
    {
        return this._glenv;
    }

    /**
     * DEM データプロバイダ
     * @type {mapray.DemProvider}
     * @readonly
     */
    get dem_provider()
    {
        return this._dem_provider;
    }

    /**
     * @summary Globe 状態を取得
     * @type {mapray.Globe.Status}
     * @readonly
     */
    get status()
    {
        return this._status;
    }

    /**
     * @summary DEM が更新された領域を取得
     * @type {mapray.UpdatedTileArea}
     * @readonly
     */
    get dem_area_updated()
    {
        return this._dem_area_updated;
    }

    /**
     * @summary 基底 Flake を取得
     * @type {mapray.Globe.Flake}
     * @readonly
     */
    get root_flake(): Globe.Flake
    {
        const flake = this._root_flake;
        flake.touch();
        return flake;
    }

    /** @internal */
    get rho(): number
    {
        return this._rho;
    }

    /** @internal */
    get dem_zbias(): number
    {
        return this._dem_zbias;
    }

    /**
     * フレーム番号
     * @internal
     */
    get frame_counter(): number
    {
        return this._frame_counter;
    }

    /** @internal*/
    get num_touch_flakes(): number
    {
        return this._num_touch_flakes;
    }

    /** @internal*/
    set num_touch_flakes( value: number )
    {
        this._num_touch_flakes = value;
    }

    /** @internal*/
    get num_cache_flakes(): number
    {
        return this._num_cache_flakes;
    }

    /** @internal*/
    set num_cache_flakes( value: number )
    {
        this._num_cache_flakes = value;
    }

    /** @internal*/
    get num_cache_meshes(): number
    {
        return this._num_cache_meshes;
    }

    /** @internal*/
    set num_cache_meshes( value: number )
    {
        this._num_cache_meshes = value;
    }

    /** @internal*/
    get num_touch_meshes(): number
    {
        return this._num_touch_meshes;
    }

    /** @internal*/
    set num_touch_meshes( value: number )
    {
        this._num_touch_meshes = value;
    }

    /** @internal*/
    get max_dem_requesteds(): number
    {
        return this._max_dem_requesteds;
    }

    /** @internal */
    get num_dem_requesteds(): number
    {
        return this._num_dem_requesteds;
    }

    /** @internal */
    set num_dem_requesteds( value: number )
    {
        this._num_dem_requesteds = value;
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
    putNextEntityProducers( producers: Iterable<Entity.FlakePrimitiveProducer> )
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
     * @summary リクエスト待ちの DEM タイルの個数を取得
     *
     * @return {number}  リクエスト待ちの DEM タイルの個数
     */
    getNumDemWaitingRequests()
    {
        return this._num_dem_requesteds;
    }


    /**
     * 正確度が最も高い DEM タイルデータを検索
     *
     * 基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] の標高データを取得することができる、正確度が最も高い DEM タイルデータを検索する。
     *
     * サーバーにさらに正確度が高い DEM タイルデータが存在すれば、それをリクエストする。
     * @param  xt  X 座標 (基底タイル座標系)
     * @param  yt  Y 座標 (基底タイル座標系)
     * @return DEM タイルデータ (存在しなければ null)
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
            else if ( flake.dem_state === Globe.DemState.LOADED ) {
                // より正確度が高い DEM を持つ地表断片に更新
                dem_flake = flake;
            }

            flake = child;
            size *= 2;
            xf   *= 2;
            yf   *= 2;
        }

        dem_flake.requestHighestAccuracy( xt, yt );

        return dem_flake.dem_data;
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
        var dPI = 2 * Math.PI;
        var demSize = 1 << this._rho;  // 2^ρ

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
                var dem = this._findHighestAccuracy2( xt, yt );
                if ( dem ) {
                    var pow = Math.pow( 2, dem.z );  // 2^ze
                    var  uf = demSize * (pow * xt - dem.x);
                    var  vf = demSize * (pow * yt - dem.y);
                    var  ui = GeoMath.clamp( Math.floor( uf ), 0, demSize - 1 );
                    var  vi = GeoMath.clamp( Math.floor( vf ), 0, demSize - 1 );

                    var heights = dem.getHeights( ui, vi );
                    var h00 = heights[0];
                    var h10 = heights[1];
                    var h01 = heights[2];
                    var h11 = heights[3];

                    // 標高を補間
                    var s = uf - ui;
                    var t = vf - vi;
                    dst_array[dst_index] = (h00 * (1 - s) + h10 * s) * (1 - t) + (h01 * (1 - s) + h11 * s) * t;
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
     * @summary 正確度が最も高い DEM タイルデータを検索
     *
     * @desc
     * <p>基底タイル座標 (左上(0, 0)、右下(1, 1)) [xt, yt] の標高データを取得することができる、正確度が最も高い DEM タイルデータを検索する。</p>
     *
     * @param  xt  X 座標 (基底タイル座標系)
     * @param  yt  Y 座標 (基底タイル座標系)
     * @return DEM タイルデータ (存在しなければ null)
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
            else if ( flake.dem_state === Globe.DemState.LOADED ) {
                // より正確度が高い DEM を持つ地表断片に更新
                dem_flake = flake;
            }

            flake = child;
            size *= 2;
            xf   *= 2;
            yf   *= 2;
        }

        return dem_flake.dem_data;
    }

    /**
     * @summary フレームの最後の処理
     */
    endFrame()
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
     * @private
     */
    _requestRoot()
    {
        const z = 0;
        const x = 0;
        const y = 0;

        this._root_cancel_id = this._dem_provider.requestTile( z, x, y, data => {
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
            this._root_cancel_id = undefined;
            --this._num_dem_requesteds;
        } );
        ++this._num_dem_requesteds;
    }


    private _reduceFlakes( max_touch_flakes: number )
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


    private _reduceMeshes()
    {
        var flat_meshes = this._root_flake.flattenMeshes();
        // assert: flat_meshes.length == this._num_cache_meshes
        flat_meshes.sort( (a, b) => a.compareForReduce( b ) );

        var num_cache_meshes = Math.floor( this._mesh_reduce_factor * this._num_touch_meshes );
        flat_meshes.slice( num_cache_meshes ).forEach( mnode => mnode.dispose() );
        // assert: this._num_cache_meshes == num_cache_meshes
    }


    /** @internal */
    public setupDebugPickInfo() {
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
 * @see [[Globe.status]]
 */
export enum Status {
    /**
     * 準備中 (初期状態)
     */
    NOT_READY,

    /**
     * 準備完了
     */
    READY,

    /**
     * 失敗状態
     */
    FAILED,
}



/**
 * 地表断片
 * @internal
 */
export class Flake {

    private z: number;

    private x: number;

    private y: number;

    private _parent: Flake | null;

    private _children: [Flake | null, Flake | null, Flake | null, Flake | null];

    private _globe!: Globe;

    /* DEM バイナリ、または取り消しオブジェクト */
    private _dem_data!: DemBinary;

    private _dem_state: DemState;

    /** エンティティ辞書 */
    private _entity_map!: Map<Entity.FlakePrimitiveProducer, boolean>;

    private _meshes: MeshNode[];

    /** 
     * 標高代表値
     * 前回の Za (DemBinary) だだし、標高代表が決定しているときは this
     */
    private _prev_Za_dem!: DemBinary | Flake;

    /** 
     * 標高代表値
     * 前回の Zr (DemBinary)
     */
    private _prev_Zr_dem!: DemBinary;

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



    /**
     * @param parent
     * @param z
     * @param x
     * @param y
     */
    constructor( parent: Flake | null, z: number, x: number, y: number )
    {
        /**
         * 地表分割レベル
         */
        this.z = z;

        /**
         * @summary 地表タイル X 座標
         * @member mapray.Globe.Flake#x
         * @type {number}
         */
        this.x = x;

        /**
         * @summary 地表タイル Y 座標
         * @member mapray.Globe.Flake#y
         * @type {number}
         */
        this.y = y;

        // Flake 階層
        this._parent    = parent;
        this._children  = [null, null, null, null];
        if ( parent ) {
            this._globe = parent._globe;
        }

        // DEM データ
        this._dem_state = DemState.NONE;

        // MeshNode
        this._meshes = [];

        this._base_height = 0;     // 平均標高 (h~)
        this._height_min  = 0;     // 最大標高 (h⇓)
        this._height_max  = 0;     // 最小標高 (h⇑)
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
        if ( this._globe ) {
            this._globe.num_cache_flakes += 1;
        }
    }


    get globe(): Globe {
        return this._globe;
    }


    get children(): [Flake | null, Flake | null, Flake | null, Flake | null] {
        return this._children;
    }

    /** @inner */
    get dem_data(): DemBinary
    {
        return this._dem_data;
    }

    /** @inner */
    get dem_state(): DemState
    {
        return this._dem_state;
    }

    /**
     * 基準の標高
     * @type {number}
     * @readonly
     */
    get base_height()
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

    get meshes(): MeshNode[]
    {
        return this._meshes;
    }

    /**
     * 基底 Flake 専用の設定
     * @internal
     */
    setupRoot( globe: Globe, dem: DemBinary )
    {
        this._globe     = globe;
        this._dem_data  = dem;
        this._dem_state = DemState.LOADED;
        this._entity_map = new Map();
        this._estimate();
        globe.num_cache_flakes += 1;
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
        var child = this._children[index];

        if ( !child ) {
            // 存在しないときは Flake を生成する
            child = new Flake( this, this.z + 1, 2*this.x + u, 2*this.y + v );
            this._children[index] = child;
        }

        child._estimate();
        child.touch();
        return child;
    }

    /**
     * カリングするか？
     * @param  clip_planes  クリップ平面配列
     * @return 見えないとき true, 見えるまたは不明のとき false
     */
    isInvisible( clip_planes: Vector4[] ): boolean
    {
        switch ( this.z ) {
        case 0:  return this._isInvisible_0( clip_planes );
        default: return this._isInvisible_N( clip_planes );
        }
    }

    /**
     * レンダリングオブジェクトを検索
     *
     * @param lod  地表詳細レベル (LOD)
     */
    getRenderObject( lod: number ): FlakeRenderObject
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

        return node.getRenderObject();
    }

    /**
     * @summary this と交差する FlakePrimitiveProducer インスタンスの列挙子を取得
     *
     * @return {iterable.<mapray.Entity.FlakePrimitiveProducer>}
     */
    getEntityProducers()
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
    addEntityProducer( producer: Entity.FlakePrimitiveProducer )
    {
        // @ts-ignore
        switch ( producer.getAreaStatus( this ) ) {

        case Entity.AreaStatus.PARTIAL: {
            // エントリに producer を追加
            this._entity_map.set( producer, false );

            // this の子孫も同様の処理
            for ( let child of this._children ) {
                if ( child && child._entity_map ) {
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
    private _addEntityFullProducer( producer: Entity.FlakePrimitiveProducer )
    {
        // エントリに producer を追加
        this._entity_map.set( producer, true );

        // this の子孫も同様の処理
        for ( let child of this._children ) {
            if ( child && child._entity_map ) {
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
    removeEntityProducer( producer: Entity.FlakePrimitiveProducer )
    {
        if ( !this._entity_map.has( producer ) ) {
            // もともと producer は this と this の子孫に存在しない
            return;
        }

        // エントリから producer を削除
        this._entity_map.delete( producer );

        // this に producer に対応するメッシュが存在すれば削除
        this._removeEntityMeshes( producer );

        // this の子孫も同様の処理
        for ( let child of this._children ) {
            if ( child && child._entity_map ) {
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
    updateEntityProducer( producer: Entity.FlakePrimitiveProducer )
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
     * 事前条件: this._globe.status === Status.READY
     *
     * @param  ray    ray.position を始点として ray.direction 方向に伸びる半直線
     * @param  limit  この距離までの交点を検索
     * @return ray.position から交点までの距離、ただし交差しなかったときは limit
     */
    findRayDistance( ray: Ray, limit: number ): number
    {
        DEBUG: {
            if ( this._globe.debug_pick_info ) {
                this._globe.debug_pick_info.trace.push( this );
            }
        }

        let dem_flake: Flake;
        for ( dem_flake = this; dem_flake._dem_state !== DemState.LOADED; dem_flake = dem_flake._parent as Flake ) {}

        if ( this.z - dem_flake.z === this._globe.rho ) {
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
     * @summary 自己と子孫を破棄
     */
    dispose()
    {
        var i;

        var parent = this._parent;
        if ( !parent ) {
            // すでに破棄済み
            return;
        }

        var globe = this._globe;

        // メッシュを破棄
        var meshes = this._meshes;
        while ( meshes.length > 0 ) {
            meshes[0].dispose();
        }

        // 子孫 Flake を破棄
        var children = this._children;
        for ( i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child.dispose();
            }
        }

        // 親 Flake から this を削除
        var pchildren = parent._children;
        for ( i = 0; i < 4; ++i ) {
            if ( pchildren[i] === this ) {
                pchildren[i] = null;
                break;
            }
        }
        this._parent = null;

        // DEM リクエストの取り消し
        if ( this._dem_state === DemState.REQUESTED ) {
            globe.dem_provider.cancelRequest( this._dem_data );
            --globe.num_dem_requesteds;
        }

        // Flake 数を減らす
        globe.num_cache_flakes -= 1;
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

    private _flattenFlakes( list: Flake[] )
    {
        list.push( this );
        var children = this._children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child._flattenFlakes( list );
            }
        }
    }

    private _flattenMeshes( list: MeshNode[] )
    {
        Array.prototype.push.apply( list, this._meshes );
        var children = this._children;
        for ( var i = 0; i < 4; ++i ) {
            var child = children[i];
            if ( child ) {
                child._flattenMeshes( list );
            }
        }
    }

    /**
     * @summary アクセスフレームを更新
     * @package
     */
    touch()
    {
        var globe = this._globe;
        if ( this._aframe !== globe.frame_counter ) {
            this._aframe = globe.frame_counter;
            globe.num_touch_flakes += 1;
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
    private _getMeshNode( lod: number, cu: number, cv: number ): Globe.MeshNode
    {
        var   dem = this._getMeshDemBinary( lod );
        var dpows = dem.getDivisionPowers( this, lod, cu, cv );

        // キャッシュに存在すれば、それを返す
        var meshes = this._meshes;
        var length = meshes.length;
        for ( var i = 0; i < length; ++i ) {
            var item = meshes[i];
            if ( item.match( dem, dpows ) ) {
                return item;
            }
        }

        // キャッシュに存在しないので新規に生成
        var node = new MeshNode( this, dem, dpows );
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
        var zDesired = GeoMath.clamp( Math.round( lod + this._globe.dem_zbias ),
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
     * this の (レベルが zlimit またはそれ以下の) 祖先の中で、現在キャッシュに存在する最大レベルの DEM タイルデータを検索する。
     *
     * @param  zlimit     先祖レベルの上限
     * @return 先祖 DEM タイルデータ
     */
    _findNearestDemTile( zlimit: number ): DemBinary
    {
        let flake: Flake = this;

        // zlimit の地表断片を検索
        const count = this.z - zlimit;
        for ( let i = 0; i < count; ++i ) {
            flake = flake._parent as Flake;
        }

        // 次の DemBinary を持つ地表断片を検索
        while ( flake._dem_state !== DemState.LOADED ) {
            flake = flake._parent as Flake;
        }

        // 見つけた地表断片の DemBinary を返す
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
     * @param ze  DEM ズームレベル
     */
    private _requestAncestorDemTile( ze: number )
    {
        var globe = this._globe;

        if ( globe.num_dem_requesteds >= globe.max_dem_requesteds ) {
            // 要求が最大数に達しているので受け入れない
            return;
        }

        var flake: Flake = this;

        // zlimit の地表断片を検索
        var count = this.z - ze;
        for ( var i = 0; i < count; ++i ) {
            flake = flake._parent as Flake;
        }

        while ( true ) {
            var state = flake._dem_state;
            if ( state === DemState.LOADED || state === DemState.REQUESTED ) {
                // 要求する必要がない
                break;
            }
            else if ( state === DemState.FAILED ) {
                // 親でリトライ
                flake = flake._parent as Flake;
                continue;
            }
            else {
                // DEM タイルデータを要求
                // assert: state === DemState.NONE
                var provider = globe.dem_provider;

                flake._dem_data = provider.requestTile( flake.z, flake.x, flake.y, data => {
                    if ( !flake._parent ) {
                        // すでに破棄済みなので無視
                        return;
                    }
                    if ( data ) {
                        flake._dem_data  = new DemBinary( flake.z, flake.x, flake.y, globe.rho, data );
                        flake._dem_state = DemState.LOADED;
                        // @ts-ignore
                        globe.dem_area_updated.addTileArea( flake );
                    }
                    else { // データ取得に失敗
                        // @ts-ignore
                        flake._dem_data  = undefined;
                        flake._dem_state = DemState.FAILED;
                    }
                    --globe.num_dem_requesteds;
                } );

                flake._dem_state = DemState.REQUESTED;
                ++globe.num_dem_requesteds;
                break;
            }
        }
    }


    private _isInvisible_0( clip_planes: Vector4[] )
    {
        var r = GeoMath.EARTH_RADIUS + this._height_max;

        for ( var i = 0; i < clip_planes.length; ++i ) {
            var dist = clip_planes[i][3];  // 平面から GOCS 原点 (地球中心) までの距離
            if ( dist < -r ) {
                // 地球全体がこの平面の裏側にあるので見えない
                return true;
            }
        }

        return false;  // 見えている可能性がある
    }


    private _isInvisible_N( clip_planes: Vector4[] )
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
     * @summary 中間緯度の余弦
     * @return {number}
     * @private
     */
    _getCosφ()
    {
        var z = this.z;
        if ( z > 0 ) {
            var  y = this.y;
            var  p = Math.pow( 2, 1 - z );
            var y0 = Math.abs( 1 - p *  y      );
            var y1 = Math.abs( 1 - p * (y + 1) );
            var ey = Math.exp( Math.PI * Math.min( y0, y1 ) );
            return 2 * ey / (ey*ey + 1);  // Cos[φ] == Cos[gd[y]] == Sech[y]
        }
        else {
            // z == 0 のときは φ == 0 とする
            return 1;  // Cos[0]
        }
    }

    /**
     * 標高代表値と境界箱を更新
     */
    private _estimate()
    {
        if ( this._prev_Za_dem === this ) {
            // 代表値は決定済みなので何もしない
            return;
        }

        var zg = this.z;
        var rho = this._globe.rho;
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
        case 0:  this._updataBoundingBox_0(); break;
        case 1:  this._updataBoundingBox_1(); break;
        default: this._updataBoundingBox_N(); break;
        }
    }

    /**
     * 標高代表値を計算 (Zg < ρ)
     * @param zr_dem  レベルが Zr の DEM
     */
    private _estimate_low( zr_dem: DemBinary )
    {
        var zg = this.z;
        var xg = this.x;
        var yg = this.y;
        var α = this._calcAlpha();

        this._base_height = this._globe.avg_height.sample( zg, xg, yg );
        this._height_min  = Math.max( this._base_height + α * Flake.Fm, zr_dem.height_min );
        this._height_max  = Math.min( this._base_height + α * Flake.Fp, zr_dem.height_max );

        if ( zr_dem.z == zg || zr_dem.isLeaf( zg, xg, yg ) ) {
            // 標高代表値が確定した
            this._prev_Za_dem = this;
        }
    }

    /**
     * 標高代表値を計算 (Zg >= ρ && !L(Za))
     * @param za_dem  レベルが Za の DEM
     * @param zr_dem  レベルが Zr の DEM
     */
    private _estimate_high( za_dem: DemBinary, zr_dem: DemBinary )
    {
        var globe = this._globe;
        var zg = this.z;
        var xg = this.x;
        var yg = this.y;

        var ze = za_dem.z;  // -> za
        var xe = za_dem.x;
        var ye = za_dem.y;

        var  rho = globe.rho;
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
     * @param za_dem  レベルが Za の DEM
     */
    private _estimate_leaf( za_dem: DemBinary )
    {
        var zg = this.z;
        var xg = this.x;
        var yg = this.y;

        var ze = za_dem.z;  // -> za
        var xe = za_dem.x;
        var ye = za_dem.y;

        var  pow = Math.pow( 2, ze - zg );
        var size = 1 << this._globe.rho;

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
     * @summary α を計算
     * @desc
     * <p>中間緯度の標高 0 での緯線の長さを示す値 α を計算する。</p>
     * @return {number}  α
     * @private
     */
    _calcAlpha()
    {
        var pow = Math.pow( 2, 1 - this.z );
        return pow * Flake.πr / Math.cosh( (1 - pow * (this.y + 0.5)) * Math.PI );
    }

    /**
     * @summary 境界箱を更新 (Z == 0)
     */
    _updataBoundingBox_0()
    {
        var r = GeoMath.EARTH_RADIUS + this._height_max;

        this._gocs_x_min = -r;
        this._gocs_x_max =  r;

        this._gocs_y_min = -r;
        this._gocs_y_max =  r;

        this._gocs_z_min = -r;
        this._gocs_z_max =  r;
    }

    /**
     * @summary 境界箱を更新 (Z == 1)
     */
    _updataBoundingBox_1()
    {
        var r = GeoMath.EARTH_RADIUS + this._height_max;
        var x = this.x;
        var y = this.y;

        this._gocs_x_min = -r;
        this._gocs_x_max =  r;

        this._gocs_y_min =  r * (x - 1);
        this._gocs_y_max =  r * x;

        this._gocs_z_min = -r * y;
        this._gocs_z_max =  r * (1 - y);
    }

    /**
     * @summary 境界箱を更新 (Z >= 2)
     */
    _updataBoundingBox_N()
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
    requestHighestAccuracy( xt: number, yt: number )
    {
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
    private _findQuadRayDistance( ray: Ray, limit: number, dem_flake: Flake )
    {
        var  pts = this._getQuadPositions( dem_flake, Flake._temp_positions );
        DEBUG: {
            if ( this._globe.debug_pick_info ) {
                this._globe.debug_pick_info.quads.push([
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
     * @summary 三角形とレイの交点までの距離を検索
     * <p>三角形 p0, p1, p2 と線分 (ray.position を始点とし、そこから ray.direction 方向に limit 距離未満にある点) との交点までの距離を返す。</p>
     * <p>ただし地表断片と線分が交差しないときは limit を返す。</p>
     * @private
     */
    static _findTriRayDistance( ray: Ray, limit: number, p0: Vector3, p1: Vector3, p2: Vector3 )
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
     * @summary 四隅の位置を取得
     * @param  dem_flake  DEM の地表断片
     * @param  positions  結果の格納先
     * @return [左上, 右上, 左下, 右下]
     */
    private _getQuadPositions( dem_flake: Flake, positions: [Vector3, Vector3, Vector3, Vector3] ): [Vector3, Vector3, Vector3, Vector3]
    {
        var xg = this.x;
        var yg = this.y;
        var xe = dem_flake.x;
        var ye = dem_flake.y;

        var    size = 1 << this._globe.rho;
        var heights = dem_flake._dem_data.getHeights( xg - size * xe, yg - size * ye );

        var msize = Math.pow( 2, 1 - this.z ) * Math.PI;
        var   mx0 = xg * msize - Math.PI;
        var   my0 = Math.PI - yg * msize;

        for ( var iv = 0, my = my0; iv < 2; ++iv, my -= msize ) {
            var ey    = Math.exp( my );
            var ey2   = ey * ey;
            var sinφ = (ey2 - 1) / (ey2 + 1);
            var cosφ =   2 * ey  / (ey2 + 1);
            for ( var iu = 0, mx = mx0; iu < 2; ++iu, mx += msize ) {
                var  index = iu + 2*iv;
                var radius = GeoMath.EARTH_RADIUS + heights[index];
                var  sinλ = Math.sin( mx );
                var  cosλ = Math.cos( mx );

                var pos = positions[index];
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
    private _cullForRayDistance( ray: Ray, limit: number )
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
        if ( !this._entity_map ) {
            // 存在しないので新たに生成する

            let parent_map = (this._parent as Flake)._getEntityMap();  // 親の辞書
            let entity_map = new Map();

            for ( let [producer, isfull] of parent_map ) {
                if ( isfull ) {
                    // 親が FULL なので、子も FULL
                    entity_map.set( producer, true );
                }
                else {
                    // @ts-ignore
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
}



export namespace Flake {



/**
 * 球面分割数の係数
 */
export const ε: number = 0.0625;


/**
 * 標高下限係数
 */
export const Fm: number = -2.0;


/**
 * 標高上限係数
 */
export const Fp: number = 2.0;


/**
 * @internal
 */
export const πr: number = Math.PI * GeoMath.EARTH_RADIUS;


export const _temp_positions: [ Vector3, Vector3, Vector3, Vector3 ] = [
    GeoMath.createVector3(),
    GeoMath.createVector3(),
    GeoMath.createVector3(),
    GeoMath.createVector3(),
];

export const _temp_ray_1  = GeoMath.createVector3();
export const _temp_ray_2  = GeoMath.createVector3();
export const _temp_ray_3  = GeoMath.createVector3();
export const _temp_ray_4  = GeoMath.createVector3();
export const _temp_ray_5  = GeoMath.createVector3();
export const _temp_ray_6  = GeoMath.createVector3();
export const _temp_ray_7  = GeoMath.createVector3();
export const _temp_ray_8  = GeoMath.createVector3();
export const _temp_ray_9  = GeoMath.createVector3();
export const _temp_ray_10 = GeoMath.createVector3();
export const _temp_ray_11 = GeoMath.createVector3();



} // namespace Flake



/**
 * 履歴統計
 * @internal
 */
export class HistStats {

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
    getMaxValue( value: number )
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

    static _find_max( history: number[] ): number
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
 * @internal
 */
export class MeshNode {

    private _flake: Flake;

    private _dem: DemBinary;

    private _dpows: number[];

    private _aframe: number;

    private _base_mesh: FlakeMesh;

    private _entity_meshes: Map<Entity.FlakePrimitiveProducer, Mesh | object>;


    /**
     * 初期化
     * @param flake  所有者
     * @param dem    DEM バイナリ
     * @param dpows  分割指数
     */
    constructor( flake: Flake, dem: DemBinary, dpows: number[] )
    {
        this._flake  = flake;
        this._dem    = dem;
        this._dpows  = Array.from( dpows );
        this._aframe = -1;

        // 地表のメッシュ
        this._base_mesh = new FlakeMesh( flake.globe.glenv, flake, dpows, dem );

        // エンティティのメッシュ
        //   key:   FlakePrimitiveProducer
        //   value: Mesh | CACHED_EMPTY_MESH
        this._entity_meshes = new Map<Entity.FlakePrimitiveProducer, Mesh | object>(); 

        // メッシュ数をカウントアップ
        flake.globe.num_cache_meshes += 1;
    }

    /**
     * @summary FlakeRenderObject インスタンスを取得
     *
     * @return {mapray.FlakeRenderObject}
     */
    getRenderObject()
    {
        let flake = this._flake;
        let   fro = new FlakeRenderObject( flake, flake.globe.glenv, this._base_mesh );

        // fro にエンティティ毎のデータを追加
        for ( let producer of flake.getEntityProducers() ) {
            // producer に対応するキャッシュされた Mesh
            let mesh = this._getEntityMesh( producer );

            if ( mesh === CACHED_EMPTY_MESH ) {
                // 空メッシュとしてキャッシュされている --> fro に追加しない
                continue;
            }

            if ( !mesh ) {
                // メッシュがキャッシュに存在しないので、メッシュを生成してキャッシュする
                mesh = producer.createMesh( flake, this._dpows, this._dem );
                this._setEntityMesh( producer, mesh );

                if ( !mesh ) {
                    // 空メッシュとしてキャッシュされた --> fro に追加しない
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
    match( dem: DemBinary, dpows: number[] ): boolean
    {
        return (this._dem === dem) && (this._dpows[0] === dpows[0]) && (this._dpows[1] === dpows[1]);
    }

    /**
     * アクセスフレームを更新
     */
    touch()
    {
        const globe = this._flake.globe;
        if ( this._aframe !== globe.frame_counter ) {
            this._aframe = globe.frame_counter;
            globe.num_touch_meshes += 1;
        }
    }

    /**
     * ノードを破棄
     */
    dispose()
    {
        if ( !this._base_mesh ) {
            // すでに破棄されている
            return;
        }

        var flake = this._flake;

        // Flake から this ノードを削除
        var meshes = flake.meshes;
        var length = meshes.length;
        for ( var i = 0; i < length; ++i ) {
            if ( meshes[i] === this ) {
                meshes.splice( i, 1 );
                break;
            }
        }

        // メッシュを破棄
        this._base_mesh.dispose();
        // @ts-ignore
        this._base_mesh = null;

        for ( let mesh of this._entity_meshes.values() ) {
            if ( mesh instanceof Mesh ) {
                mesh.dispose();
            }
        }

        // メッシュ数をカウントダウン
        flake.globe.num_cache_meshes -= 1;
    }

    /**
     * 削減用の MeshNode 比較
     * @param  other  比較対象
     * @return 比較値
     * @internal
     */
    compareForReduce( other: Globe.MeshNode ): number
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
    removeEntityMesh( producer: Entity.FlakePrimitiveProducer )
    {
        this._entity_meshes.delete( producer );
    }


    /**
     * エンティティのメッシュを取得
     *
     * producer に対応するメッシュを取得する。
     *
     * ただし存在しないとき null, 空メッシュが設定されているときは CACHED_EMPTY_MESH を返す。
     *
     * @param producer
     */
    private _getEntityMesh( producer: Entity.FlakePrimitiveProducer ): Mesh | object | null
    {
        let mesh = this._entity_meshes.get( producer );

        return mesh ? mesh : null;
    }


    /**
     * エンティティのメッシュを設定
     *
     * producer に対応するメッシュを設定する。
     *
     * 空メッシュを設定するときは mesh に null を指定する。
     *
     * @param producer
     * @param mesh
     */
    private _setEntityMesh( producer: Entity.FlakePrimitiveProducer, mesh: Mesh | object | null )
    {
        const value = mesh ? mesh : CACHED_EMPTY_MESH;

        this._entity_meshes.set( producer, value );
    }

}


/**
 * DEM 状態の列挙型
 */
export enum DemState {
    /**
     * DEM タイルが存在しない
     */
    NONE,

    /**
     * DEM タイルが存在する
     */
    LOADED,

    /**
     * DEM タイルをリクエスト中
     */
    REQUESTED,

    /**
     * DEM タイルのリクエストに失敗
     */
    FAILED,
};


/**
 * @summary キャッシュされた空メッシュを表す
 *
 * @memberof mapray.Globe
 * @constant
 */
const CACHED_EMPTY_MESH = { id: "CACHED_EMPTY_MESH" };



export interface DebugPickInfo {
    ray?: Ray;
    distance?: number;
    trace: Globe.Flake[];
    quads: [Vector3, Vector3, Vector3, Vector3][];
}



} // namespace Globe


const Flake = Globe.Flake;
export { Flake };
export default Globe;
