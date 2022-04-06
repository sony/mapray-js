/**
 * あるタイル領域の理想のレベルを計算するためのモジュールである。
 *
 * これは [[TraverseContext]] の一部と見なせるが、ある程度規模が大きい
 * ので別のファイルで実装する。
 *
 * @module
 */

import type { StyleManager } from "./style";
import type RenderStage from "../RenderStage";
import GeoMath from "../GeoMath";
import type { Vector3, Vector4 } from "../GeoMath";
import type Globe from "../Globe";

type Flake = Globe.Flake;


/**
 * あるタイル領域の理想のレベルを計算
 */
export class IdealLevelCalculator {

    /**
     * 初期化
     *
     * @remarks
     *
     * `clip_planes` は [[TraverseContext]] のプロパティと共有する。
     */
    constructor( style_manager: StyleManager,
                 stage:         RenderStage,
                 clip_planes:   Vector4[] )
    {
        const { view_pos_Q,
                view_dir_wU } = IdealLevelCalculator._createViewVectors( stage );

        this._view_pos_Q  = view_pos_Q;
        this._view_dir_wU = view_dir_wU;
        this._clip_planes = clip_planes;
        this._tile_zbias  = Math.log2( 2 * Math.PI / style_manager.getResolution() );

        // 事前生成オブジェクト
        this._view_dir_N = GeoMath.createVector3();
        this._view_dir_V = GeoMath.createVector3();
    }


    /**
     * see [[_view_pos_Q]], [[_view_dir_wU]]
     */
    private static _createViewVectors( stage: RenderStage ) /* auto */
    {
        const view_to_gocs = stage.view_to_gocs;
        const   pixel_step = stage.pixel_step;

        const  view_pos_Q  = GeoMath.createVector3();
        const view_dir_wU  = GeoMath.createVector3();

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
     * `flake` に対する理想レベルの範囲を取得する。
     */
    calculate( flake: Flake ): IdealLevelInfo | null
    {
        const garea = GeoArea.create( flake );

        const ctx: Context = {
            lod_min:  Number.MAX_VALUE,
            lod_max: -Number.MAX_VALUE,
        };

        this._calc_recur( garea, ctx );

        if ( ctx.lod_max >= ctx.lod_min ) {
            const zbias = this._tile_zbias;

            return {
                lower:  Math.round( ctx.lod_min + zbias ),
                upper:  Math.round( ctx.lod_max + zbias ),
                center: (ctx.lod_min + ctx.lod_max) / 2 + zbias,
            };
        }
        else {
            // 計算できなかった
            return null;
        }
    }


    /**
     * `flake` に対する理想レベルの範囲を取得する。
     */
    private _calc_recur( garea: GeoArea,
                         ctx:   Context ): void
    {
        if ( garea.z < IdealLevelCalculator._ZETA ) {
            // レベルが ζ に達していないときは分割
            this._calc_children_recur( garea, ctx );
        }
        else {
            const  Q = this._view_pos_Q;
            const wU = this._view_dir_wU;

            const N = this._view_dir_N;
            const V = this._view_dir_V;

            let d_min =  Number.MAX_VALUE;
            let d_max = -Number.MAX_VALUE;

            for ( let iy = 0, my = garea.my_min; iy < 2; ++iy, my += garea.msize ) {
                const ey    = Math.exp( my );
                const ey2   = ey * ey;
                const sinφ = (ey2 - 1) / (ey2 + 1);
                const cosφ =   2 * ey  / (ey2 + 1);
                const denom = 1 / (garea.r * cosφ);

                for ( let ix = 0, mx = garea.mx_min; ix < 2; ++ix, mx += garea.msize ) {
                    const sinλ = Math.sin( mx );
                    const cosλ = Math.cos( mx );

                    // N
                    N[0] = cosφ * cosλ;
                    N[1] = cosφ * sinλ;
                    N[2] = sinφ;

                    // V = r N - Q
                    for ( let i = 0; i < 3; ++i ) {
                        V[i] = garea.r * N[i] - Q[i];
                    }

                    // w U.V
                    const wUV = GeoMath.dot3( wU, V );

                    if ( wUV > 0 ) {
                        //      w U.(r N - Q)
                        // d = ---------------
                        //        r Cos[φ]
                        const deriv = wUV * denom;

                        // 最大最小を更新
                        d_min = Math.min( d_min, deriv );
                        d_max = Math.max( d_max, deriv );
                    }
                    else {
                        // 深度距離が 0 または負の点が存在ので分割
                        this._calc_children_recur( garea, ctx );
                        return;
                    }
                }
            }

            const lod_min = -Math.log2( d_max );
            const lod_max = -Math.log2( d_min );

            if ( this._is_division_insufficient( garea, lod_min, lod_max ) ) {
                // garea の分割が不十分なので分割
                this._calc_children_recur( garea, ctx );
            }
            else {
                ctx.lod_min = Math.min( ctx.lod_min, lod_min );
                ctx.lod_max = Math.max( ctx.lod_max, lod_max );
            }
        }
    }


    /**
     * 子領域が視体積の内側のとき、または外側かどうかが不明のとき再帰
     */
    private _calc_children_recur( garea: GeoArea,
                                  ctx:   Context ): void
    {
        for ( const child of garea.children() ) {
            if ( child.isOutsideOf( this._clip_planes ) ) {
                // 領域は視体積の外側にあるので再帰しない
                continue;
            }

            // 子領域に再帰
            this._calc_recur( child, ctx );
        }
    }


    /**
     * `garea` の分割が不十分か？
     */
    private _is_division_insufficient( garea:   GeoArea,
                                       lod_min: number,
                                       lod_max: number ): boolean
    {
        if ( lod_max - lod_min >= IdealLevelCalculator._DELTA ) {
            // garea 内の LOD 差が大きいので分割が必要
            return true;
        }

        const ideal_lod = (lod_min + lod_max) / 2;
        const offset = IdealLevelCalculator._ETA - this._tile_zbias;

        if ( garea.z + offset < ideal_lod ) {
            // garea の表示が大きすぎるので分割が必要
            return true;
        }

        return false;
    }


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
     * Z レベルを計算するバイアス値
     *
     * LOD にこの値を加えると理想のタイルレベルを得ることができる。
     */
    private readonly _tile_zbias: number;


    // 事前生成オブジェクト
    private readonly _view_dir_N: Vector3;
    private readonly _view_dir_V: Vector3;


    /**
     * 理想レベルの計算で領域のレベルがこの値未満のときは分割
     */
    private static readonly _ZETA = 6;


    /**
     * 領域内の LOD 差がこの値以上のとき分割
     */
    private static readonly _DELTA = 0.5;


    /**
     * この値と領域のレベルの和が理想のレベルより低いとき分割
     *
     * @see [[_is_division_insufficient]]
     */
    private static readonly _ETA = 1.5;

}


/**
 * [[IdealLevelCalculator.calculate]] の戻り値の型
 */
export interface IdealLevelInfo {

    /**
     * 可視範囲での最小レベル (整数)
     */
    lower: number;


    /**
     * 可視範囲での最大レベル (整数)
     */
    upper: number;


    /**
     * 可視範囲の中央でのレベル (連続値)
     */
    center: number;

}


/**
 * [[IdealLevelCalculator._calc_recur]] のコンテキスト
 *
 * `lod_min` > `lod_max` のときは `lod_min` と `lod_max` は決定してい
 * ない。
 */
interface Context {

    /**
     * 総合の最小 LOD (連続値)
     */
    lod_min: number;

    /**
     * 総合の最大 LOD (連続値)
     */
    lod_max: number;

}


/**
 * 境界箱 (AABB) の型
 *
 * @see [[GeoArea._getBoundingBox]]
 */
interface BoundingBox {

    /**
     * 各軸に対する最小座標
     */
    min: Vector3;


    /**
     * 各軸に対する最大座標
     */
    max: Vector3;

}


/**
 * レベル計算用の領域
 */
class GeoArea {

    /**
     * 領域のレベル
     */
    readonly z: number;

    /**
     * 領域の寸法 (単位球メルカトル)
     */
    readonly msize: number;

    /**
     * 領域の最小 X 座標 (単位球メルカトル)
     */
    readonly mx_min: number;

    /**
     * 領域の最小 Y 座標 (単位球メルカトル)
     */
    readonly my_min: number;

    /**
     * 地球中心から代表高面までの距離 (メートル)
     */
    readonly r: number;



    /** 内部構築子 */
    private constructor( z:      number,
                         msize:  number,
                         mx_min: number,
                         my_min: number,
                         r:      number )
    {
        this.z      = z;
        this.msize  = msize;
        this.mx_min = mx_min;
        this.my_min = my_min;
        this.r      = r;
    }


    /**
     * `Flake` インスタンスから生成
     */
    static create( flake: Flake ): GeoArea
    {
        const pi = Math.PI;

        // 領域の寸法 (単位球メルカトル座標系)
        const msize = Math.pow( 2, 1 - flake.z ) * pi;

        const z      = flake.z;
        const mx_min = -pi + flake.x * msize;
        const my_min = pi - (flake.y + 1) * msize;
        const r      = GeoMath.EARTH_RADIUS + flake.base_height;

        return new GeoArea( z, msize, mx_min, my_min, r );
    }


    /**
     * すべての子領域を反復
     */
    children(): Iterable<GeoArea>
    {
        const children: GeoArea[] = [];

        const child_z     = this.z + 1;
        const child_msize = this.msize / 2;

        for ( let iy = 0, my = this.my_min; iy < 2; ++iy, my += child_msize ) {
            for ( let ix = 0, mx = this.mx_min; ix < 2; ++ix, mx += child_msize ) {
                children.push( new GeoArea( child_z, child_msize, mx, my, this.r ) );
            }
        }

        return children;
    }


    /**
     * 領域が完全に `clip_planes` の外側にあるとき `true`, それ以外ま
     * たは不明のとき `false`
     */
    isOutsideOf( clip_planes: Iterable<Vector4> ): boolean
    {
        // Globe.Flake の isInvisible と _updataBoundingBox_? を参照のこと

        if ( this.z === 0 ) {
            /* レベル 0 */

            const r = this.r;

            for ( const plane of clip_planes ) {
                const dist = plane[3];  // 平面から GOCS 原点 (地球中心) までの距離
                if ( dist < -r ) {
                    // 球全体がこの平面の裏側にあるので見えない
                    return true;
                }
            }
        }
        else {
            /* レベル 1〜 */

            const bb = this._getBoundingBox();

            const xmin = bb.min[0];
            const xmax = bb.max[0];
            const ymin = bb.min[1];
            const ymax = bb.max[1];
            const zmin = bb.min[2];
            const zmax = bb.max[2];

            for ( const plane of clip_planes ) {
                const px = plane[0];
                const py = plane[1];
                const pz = plane[2];
                const pw = plane[3];

                // 以下がすべて成り立つとボックス全体は平面の裏側にある
                //   px*xmin + py*ymin + pz*zmin + pw < 0
                //   px*xmax + py*ymin + pz*zmin + pw < 0
                //   px*xmin + py*ymax + pz*zmin + pw < 0
                //   px*xmax + py*ymax + pz*zmin + pw < 0
                //   px*xmin + py*ymin + pz*zmax + pw < 0
                //   px*xmax + py*ymin + pz*zmax + pw < 0
                //   px*xmin + py*ymax + pz*zmax + pw < 0
                //   px*xmax + py*ymax + pz*zmax + pw < 0

                const c0 =  px*xmin + py*ymin;
                const c1 =  px*xmax + py*ymin;
                const c2 =  px*xmin + py*ymax;
                const c3 =  px*xmax + py*ymax;
                const c4 = -pz*zmin - pw;
                const c5 = -pz*zmax - pw;

                if ( c0 < c4 && c1 < c4 && c2 < c4 && c3 < c4 &&
                     c0 < c5 && c1 < c5 && c2 < c5 && c3 < c5 ) {
                    // ボックス全体が平面の裏側にあるので見えない
                    return true;
                }
            }
        }

        return false;  // 見えている可能性がある
    }


    /**
     * 領域に対する境界箱 (GOCS) を取得する。
     */
    private _getBoundingBox(): BoundingBox
    {
        switch ( this.z ) {
        case 0:  return this._getBoundingBox_L0();
        case 1:  return this._getBoundingBox_L1();
        default: return this._getBoundingBox_Ln();
        }
    }


    // レベル 0 用
    private _getBoundingBox_L0(): BoundingBox
    {
        const r = this.r;

        return {
            min: [-r, -r, -r],
            max: [ r,  r,  r],
        };
    }


    // レベル 1 用
    private _getBoundingBox_L1(): BoundingBox
    {
        const r = this.r;

        const x =  this.mx_min / Math.PI + 1;
        const y = -this.my_min / Math.PI;

        return {
            min: [-r, r * (x - 1), -r * y      ],
            max: [ r, r * x,        r * (1 - y)],
        };
    }


    // レベル 2〜 用
    private _getBoundingBox_Ln(): BoundingBox
    {
        const pi = Math.PI;

        // 座標範囲 (単位球メルカトル座標系)
        const  msize = this.msize;
        const mx_min = this.mx_min;
        const my_min = this.my_min;
        const mx_max = mx_min + msize;
        const my_max = my_min + msize;

        // 事前計算変数
        const λmin = mx_min;
        const λmax = mx_max;
        const  emin = Math.exp( my_min );   // Exp[my_min]
        const  emax = Math.exp( my_max );   // Exp[my_max]
        const e2min = emin * emin;          // Exp[my_min]^2
        const e2max = emax * emax;          // Exp[my_max]^2

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

        const     rmin = this.r;
        const     rmax = this.r;
        const cosφmin = 2 * emin / (e2min + 1);
        const cosφmax = 2 * emax / (e2max + 1);

        const min_coords = GeoMath.createVector3();
        const max_coords = GeoMath.createVector3();

        // gx = r Cos[φ] Cos[λ]
        // gy = r Cos[φ] Sin[λ]
        // gz = r Sin[φ]
        if ( my_min + my_max < 0 ) {
            // φ : (-π/2, 0]

            if ( λmin + λmax < -pi ) {
                // λ : [-π, -π/2]

                min_coords[0] = rmax * cosφmax * Math.cos( λmin );
                max_coords[0] = rmin * cosφmin * Math.cos( λmax );

                min_coords[1] = rmax * cosφmax * Math.sin( λmax );
                max_coords[1] = rmin * cosφmin * Math.sin( λmin );
            }
            else if ( λmin + λmax < 0 ) {
                // λ : [-π/2, 0]

                min_coords[0] = rmin * cosφmin * Math.cos( λmin );
                max_coords[0] = rmax * cosφmax * Math.cos( λmax );

                min_coords[1] = rmax * cosφmax * Math.sin( λmin );
                max_coords[1] = rmin * cosφmin * Math.sin( λmax );
            }
            else if ( λmin + λmax < pi ) {
                // λ : [0, π/2]

                min_coords[0] = rmin * cosφmin * Math.cos( λmax );
                max_coords[0] = rmax * cosφmax * Math.cos( λmin );

                min_coords[1] = rmin * cosφmin * Math.sin( λmin );
                max_coords[1] = rmax * cosφmax * Math.sin( λmax );
            }
            else {
                // λ : [π/2, π]

                min_coords[0] = rmax * cosφmax * Math.cos( λmax );
                max_coords[0] = rmin * cosφmin * Math.cos( λmin );

                min_coords[1] = rmin * cosφmin * Math.sin( λmax );
                max_coords[1] = rmax * cosφmax * Math.sin( λmin );
            }

            min_coords[2] = rmax * (e2min - 1) / (e2min + 1);
            max_coords[2] = rmin * (e2max - 1) / (e2max + 1);
        }
        else {
            // φ : [0, π/2)

            if ( λmin + λmax < -pi ) {
                // λ : [-π, -π/2]

                min_coords[0] = rmax * cosφmin * Math.cos( λmin );
                max_coords[0] = rmin * cosφmax * Math.cos( λmax );

                min_coords[1] = rmax * cosφmin * Math.sin( λmax );
                max_coords[1] = rmin * cosφmax * Math.sin( λmin );
            }
            else if ( λmin + λmax < 0 ) {
                // λ : [-π/2, 0]

                min_coords[0] = rmin * cosφmax * Math.cos( λmin );
                max_coords[0] = rmax * cosφmin * Math.cos( λmax );

                min_coords[1] = rmax * cosφmin * Math.sin( λmin );
                max_coords[1] = rmin * cosφmax * Math.sin( λmax );
            }
            else if ( λmin + λmax < pi ) {
                // λ : [0, π/2]

                min_coords[0] = rmin * cosφmax * Math.cos( λmax );
                max_coords[0] = rmax * cosφmin * Math.cos( λmin );

                min_coords[1] = rmin * cosφmax * Math.sin( λmin );
                max_coords[1] = rmax * cosφmin * Math.sin( λmax );
            }
            else {
                // λ : [π/2, π]

                min_coords[0] = rmax * cosφmin * Math.cos( λmax );
                max_coords[0] = rmin * cosφmax * Math.cos( λmin );

                min_coords[1] = rmin * cosφmax * Math.sin( λmax );
                max_coords[1] = rmax * cosφmin * Math.sin( λmin );
            }

            min_coords[2] = rmin * (e2min - 1) / (e2min + 1);
            max_coords[2] = rmax * (e2max - 1) / (e2max + 1);
        }

        return {
            min: min_coords,
            max: max_coords,
        };
    }

}
