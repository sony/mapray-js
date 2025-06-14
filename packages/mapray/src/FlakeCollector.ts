import type { Vector3, Vector4 } from "./GeoMath";
import GeoMath from "./GeoMath";
import RenderFlake from "./RenderFlake";
import type RenderStage from "./RenderStage";
import type Globe from "./Globe";
import type DebugStats from "./DebugStats";


/**
 * 描画地表断片を収集するツール
 *
 * [[RenderStage]] の一部
 */
class FlakeCollector {

    /**
     */
    private readonly _globe: Globe;


    /**
     * 位置ベクトル Q
     *
     * @see doc/ImageLevelCalculation.txt
     */
    private readonly _view_pos_Q: Vector3;


    /**
     * ベクトル w * U
     *
     * @see doc/ImageLevelCalculation.txt
     */
    private readonly _view_dir_wU: Vector3;


    /**
     * 視体積カリング平面と地表遮蔽カリング平面 (GOCS)
     */
    private readonly _clip_planes: Vector4[];


    /**
     * 地図画像タイルの最小ズームレベル
     */
    private readonly _min_image_z: number;


    /**
     * LOD からテクスチャの Z レベルを計算するバイアス値
     *
     * 地図画像タイルと DEM タイルで値が大きい方のバイアス値である。
     */
    private readonly _max_zbias: number;


    private readonly _rflake_list: RenderFlake[];
    private readonly _debug_stats: DebugStats | undefined;

    // デバッグ統計
    private _num_procA_flakes: number;
    private _num_procB_flakes: number;

    // 事前生成オブジェクト
    private readonly _view_dir_N: Vector3;
    private readonly _view_dir_V: Vector3;


    /**
     * @param stage - 所有者である [[RenderStage]] インスタンス
     */
    constructor( stage: RenderStage )
    {
        this._globe = stage.viewer.globe;

        const { view_pos_Q,
                view_dir_wU } = FlakeCollector._createViewVectors( stage );
        this._view_pos_Q  = view_pos_Q;
        this._view_dir_wU = view_dir_wU;
        this._clip_planes = FlakeCollector._createClipPlanes( stage, this._globe );

        var             viewer = stage.viewer;
        var tile_texture_cache = viewer.tile_texture_cache;

        this._min_image_z = tile_texture_cache.getZoomLevelRange().min;

        var   dem_zbias = GeoMath.LOG2PI - viewer.globe.rho + 1;  // b = log2π - ρ + 1
        this._max_zbias = Math.max( tile_texture_cache.getImageZBias(), dem_zbias );

        this._rflake_list = [];

        // デバッグ統計
        this._debug_stats = viewer.debug_stats;
        this._num_procA_flakes = 0;
        this._num_procB_flakes = 0;

        // 事前生成オブジェクト
        this._view_dir_N = GeoMath.createVector3();
        this._view_dir_V = GeoMath.createVector3();
    }


    /**
     * see [[_view_pos_Q]], [[_view_dir_wU]]
     */
    private static _createViewVectors( stage: RenderStage )
    {
        var view_to_gocs = stage.view_to_gocs;
        var   pixel_step = stage.pixel_step;

        var view_pos_Q  = GeoMath.createVector3();
        var view_dir_wU = GeoMath.createVector3();

        // 地表詳細レベル (LOD) 計算用の Q, w*U ベクトルを設定
        view_pos_Q[0] = view_to_gocs[12];
        view_pos_Q[1] = view_to_gocs[13];
        view_pos_Q[2] = view_to_gocs[14];

        view_dir_wU[0] = -view_to_gocs[ 8] * pixel_step;
        view_dir_wU[1] = -view_to_gocs[ 9] * pixel_step;
        view_dir_wU[2] = -view_to_gocs[10] * pixel_step;

        return {
            view_pos_Q,
            view_dir_wU
        };
    }


    /**
     * see [[_clip_planes]]
     */
    private static _createClipPlanes( stage: RenderStage,
                                      globe: Globe )
    {
        var  view_to_gocs = stage.view_to_gocs;
        var  gocs_to_view = stage.gocs_to_view;
        var volume_planes = stage.getVolumePlanes();
        var   clip_planes = [];

        // 地表遮蔽カリング平面
        const elev_range = globe.getElevationRange();
        const rmin = GeoMath.EARTH_RADIUS + elev_range.min;  // 最小半径
        const rmax = GeoMath.EARTH_RADIUS + elev_range.max;  // 最大半径

        // P (視点位置)
        var px = view_to_gocs[12];
        var py = view_to_gocs[13];
        var pz = view_to_gocs[14];

        // q = √[(P.P - rmin^2)(rmax^2 - rmin^2)] - rmin^2
        var    p2 = px*px + py*py + pz*pz;
        var rmin2 = rmin*rmin;
        var rmax2 = rmax*rmax;
        var     q = Math.sqrt( (p2 - rmin2) * (rmax2 - rmin2) ) - rmin2;

        // L = <P, q> / ‖P‖
        var plane = GeoMath.createVector4();
        var recip = 1 / Math.sqrt( p2 );
        plane[0] = px * recip;
        plane[1] = py * recip;
        plane[2] = pz * recip;
        plane[3] =  q * recip;
        clip_planes.push( plane );

        // L を基とした遠方距離
        var far_dist = Math.sqrt( p2 + rmax2 + 2*q );

        // 視体積平面を取得して、地心直交座標系に変換
        // (直交変換なので x, y, z は正規化されている)
        for ( var i = 0; i < 6; ++i ) {
            var src_plane = volume_planes[i];
            var dst_plane = GeoMath.createVector4();

            if ( i == 1 && src_plane[3] > far_dist ) {
                // 遠方平面が必要以上に遠いとき far_dist に置き換える
                src_plane    = GeoMath.createVector4( src_plane );
                src_plane[3] = far_dist;
            }

            GeoMath.transformPlane_A( gocs_to_view, src_plane, dst_plane );

            clip_planes.push( dst_plane );
        }

        return clip_planes;
    }


    /**
     * 描画地表断片を収集
     *
     * @returns  収集され描画地表断片の集合
     */
    traverse(): RenderFlake[]
    {
        const range = this._globe.getRootYRange();

        for ( let y = range.lower; y <= range.upper; ++y ) {
            // 領域 0/0/y を最上位とする地表断片を収集
            const root_flake = this._globe.getRootFlake( y );
            this._collectFlakes( root_flake );
        }

        // デバッグ統計
        if ( this._debug_stats ) {
            this._debug_stats.num_procA_flakes = this._num_procA_flakes;
            this._debug_stats.num_procB_flakes = this._num_procB_flakes;
        }

        return this._rflake_list;
    }


    /**
     */
    private _collectFlakes( flake: Globe.Flake ): void
    {
        if ( this._debug_stats !== null ) {
            this._num_procA_flakes += 1;
        }

        if ( flake.isInvisible( this._clip_planes ) ) {
            // 地表タイルが見えないので描画しない
            return;
        }

        if ( flake.z < this._min_image_z ) {
            // 地表タイルより小さな画像タイルしかない
            this._collectNextLevelFlakes( flake );   // 地表タイルを分割
            return;
        }

        if ( this._debug_stats !== null ) {
            this._num_procB_flakes += 1;
        }

        // 地表断片の詳細レベルの範囲
        const range = this._getLevelOfDetailRange( flake );
        const    zt = range.mid + this._max_zbias;   // 最大タイルレベル

        if ( range.max + this._max_zbias < 0 ) {
            // 領域内で LOD が最も高い部分でも、どの種別のタイルの理想
            // レベルも 0 未満となる。これ以上分割しても見える結果に影
            // 響は与えられないと考えられるので分割を止める
        }
        else if ( range.max - range.min > FlakeCollector.MAX_LOD_INTERVAL || zt > flake.z ) {
            //    地表断片の LOD 幅が閾値より大きい
            // or 最大タイルレベル > 地表断片レベル
            this._collectNextLevelFlakes( flake );   // 地表断片を分割
            return;
        }

        // リストに RenderFlake を追加
        this._addRenderFlake( flake, range );
    }


    /**
     */
    private _collectNextLevelFlakes( flake: Globe.Flake ): void
    {
        for ( var v = 0; v < 2; ++v ) {
            for ( var u = 0; u < 2; ++u ) {
                this._collectFlakes( flake.newChild( u, v ) );
            }
        }
    }


    /**
     * 地表断片の詳細レベルの範囲を取得
     */
    private _getLevelOfDetailRange( flake: Globe.Flake ): LodRange
    {
        var pi = Math.PI;
        var  z = flake.z;
        var  x = flake.x;
        var  y = flake.y;

        // 座標範囲 (単位球メルカトル座標系)
        var  msize = Math.pow( 2, 1 - z ) * pi;
        var mx_min = -pi + x * msize;
        var my_min =  pi - (y + 1) * msize;

        var max_mstep = pi / 32;
        var    mcount = Math.ceil( msize / max_mstep );
        var    mstep  = msize / mcount;

        var  r = GeoMath.EARTH_RADIUS + flake.base_height;
        var  Q = this._view_pos_Q;
        var wU = this._view_dir_wU;

        var N = this._view_dir_N;
        var V = this._view_dir_V;
        var dMin =  Number.MAX_VALUE;
        var dMax = -Number.MAX_VALUE;

        for ( var iy = 0, my = my_min; iy < mcount + 1; ++iy, my += mstep ) {
            var ey    = Math.exp( my );
            var ey2   = ey * ey;
            var sinφ = (ey2 - 1) / (ey2 + 1);
            var cosφ =   2 * ey  / (ey2 + 1);
            var denom = 1 / (r * cosφ);
            for ( var ix = 0, mx = mx_min; ix < mcount + 1; ++ix, mx += mstep ) {
                var sinλ = Math.sin( mx );
                var cosλ = Math.cos( mx );

                // N
                N[0] = cosφ * cosλ;
                N[1] = cosφ * sinλ;
                N[2] = sinφ;

                // V = r N - Q
                V[0] = r * N[0] - Q[0];
                V[1] = r * N[1] - Q[1];
                V[2] = r * N[2] - Q[2];

                // w U.V
                var wUV = GeoMath.dot3( wU, V );
                if ( wUV <= 0 ) {
                    // 頂点が視点の後ろ側
                    return { min: -1000, max: 1000, mid: 0 };
                }

                //      w U.(r N - Q)
                // d = ---------------
                //        r Cos[φ]
                var deriv = wUV * denom;

                // 最大最小を更新
                dMin = Math.min( dMin, deriv );
                dMax = Math.max( dMax, deriv );
            }
        }

        var lodMin = -GeoMath.maprayLog2( dMax );  // Log2[1/dMax]
        var lodMax = -GeoMath.maprayLog2( dMin );  // Log2[1/dMin]

        return {
            min: lodMin,
            max: lodMax,
            mid: (lodMin + lodMax) / 2
        };
    }


    /**
     * 単位球メルカトル座標 x, y の地表詳細レベルを計算
     *
     * 以下の値が設定されていなければならない。
     *
     * - this._view_pos_Q
     * - this._view_dir_wU
     *
     * @param x  X 座標
     * @param y  Y 座標
     * @param r  GOGS 原点からの距離 (Meters)
     *
     * @return 地表詳細レベル
     */
    private _calcLOD( x: number,
                      y: number,
                      r: number ): number
    {
        var sinλ = Math.sin( x );
        var cosλ = Math.cos( x );
        var ey    = Math.exp( y );
        var ey2   = ey * ey;
        var sinφ = (ey2 - 1) / (ey2 + 1);
        var cosφ =   2 * ey  / (ey2 + 1);

        // N
        var N = this._view_dir_N;
        N[0] = cosφ * cosλ;
        N[1] = cosφ * sinλ;
        N[2] = sinφ;

        // V = r N - Q
        var V = this._view_dir_V;
        var Q = this._view_pos_Q;
        V[0] = r * N[0] - Q[0];
        V[1] = r * N[1] - Q[1];
        V[2] = r * N[2] - Q[2];

        // w U.V
        var  wU = this._view_dir_wU;
        var wUV = GeoMath.dot3( wU, V );  // > 0 (表示される Flake 前提なので正数)

        //          r Cos[φ]
        // 1/d = ---------------
        //        w U.(r N - Q)
        var inv_d = r * cosφ / wUV;

        // Log2[1/d]
        return GeoMath.maprayLog2( inv_d );
    }


    /**
     * 四隅の LOD を設定
     *
     * rflake に以下のプロパティを設定する。
     *
     * - rflake.lod_00
     * - rflake.lod_10
     * - rflake.lod_01
     * - rflake.lod_11
     */
    private _setCornerLODs( rflake: RenderFlake ): void
    {
        var pi = Math.PI;
        var flake = rflake.flake;
        var     z = flake.z;
        var     x = flake.x;
        var     y = flake.y;

        // 座標範囲 (単位球メルカトル座標系)
        var  msize = Math.pow( 2, 1 - z ) * pi;
        var mx_min = -pi + x * msize;
        var mx_max = -pi + (x + 1) * msize;
        var my_min =  pi - (y + 1) * msize;
        var my_max =  pi - y * msize;

        // GOCS 原点からの距離
        var r = GeoMath.EARTH_RADIUS + flake.base_height;

        // 四隅の地表詳細レベル
        rflake.lod_00 = this._calcLOD( mx_min, my_min, r );
        rflake.lod_10 = this._calcLOD( mx_max, my_min, r );
        rflake.lod_01 = this._calcLOD( mx_min, my_max, r );
        rflake.lod_11 = this._calcLOD( mx_max, my_max, r );
    }


    /**
     * 描画地表断片を追加
     */
    private _addRenderFlake( flake: Globe.Flake,
                             range: LodRange ): void
    {
        var rflake = new RenderFlake( flake );

        rflake.lod = range.mid;
        this._setCornerLODs( rflake );

        this._rflake_list.push( rflake );
    }


    /**
     * Flake に対する LOD の許容幅
     *
     * 1つの Flake 全体に対する最小 LOD と最大 LOD の間の最大幅である。
     *
     * 有効な範囲は 0.0 < MAX_LOD_INTERVAL < 1.0 である。
     */
    private static readonly MAX_LOD_INTERVAL = 0.5;

}


/**
 * [[FlakeCollector._getLevelOfDetailRange]] の戻り値の型
 */
interface LodRange {

    min: number;
    max: number;
    mid: number;

}


export default FlakeCollector;
