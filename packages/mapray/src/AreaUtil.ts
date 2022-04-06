import GeoMath, { Vector3 } from "./GeoMath";


/**
 * 地表領域ユーティリティー
 * @internal
 */
class AreaUtil
{
    /**
     * @ignore
     */
    constructor() {}

    /**
     * 地表領域の中心位置を GOCS で取得
     *
     * 領域 area の中心位置 (GOCS) を dst に格納する。
     *
     * @param area  地表領域
     * @param dst   結果を格納するオブジェクト (GOCS)
     *
     * @return dst
     */
    static getCenter( area: AreaUtil.Area, dst: Vector3 ): Vector3
    {
        switch ( area.z ) {
        case 0:  return getCenter_0( dst );
        case 1:  return getCenter_1( area.x, area.y, dst );
        default: return getCenter_N( area.z, area.x, area.y, dst );
        }
    }

}



// AreaUtil.getCenter() の一部
function
getCenter_0( dst: Vector3 ): Vector3
{
    dst[0] = 0;
    dst[1] = 0;
    dst[2] = 0;

    return dst;
}


// AreaUtil.getCenter() の一部
function
getCenter_1( x: number, y: number, dst: Vector3 ): Vector3
{
    var r = GeoMath.EARTH_RADIUS;

    dst[0] = 0;
    dst[1] = r * (x - 0.5);
    dst[2] = r * (0.5 - y);

    return dst;
}


// AreaUtil.getCenter() の一部
function
getCenter_N( z: number, x: number, y: number, dst: Vector3 ): Vector3
{
    var pi = Math.PI;

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

    var       rh = GeoMath.EARTH_RADIUS / 2;
    var cosφmin = 2 * emin / (e2min + 1);
    var cosφmax = 2 * emax / (e2max + 1);

    // gx = r Cos[φ] Cos[λ]
    // gy = r Cos[φ] Sin[λ]
    if ( my_min + my_max < 0 ) {
        //     φ : (-π/2, 0]
        // Cos[φ]: ( 0 →  1]
        if ( λmin + λmax < -pi ) {
            //     λ : [-π, -π/2]
            // Cos[λ]: [-1  →   0]
            // Sin[λ]: [ 0  →  -1]
            dst[0] = rh * (cosφmax * Math.cos( λmin ) + cosφmin * Math.cos( λmax ));
            dst[1] = rh * (cosφmax * Math.sin( λmax ) + cosφmin * Math.sin( λmin ));
        }
        else if ( λmin + λmax < 0 ) {
            //     λ : [-π/2, 0]
            // Cos[λ]: [ 0  → 1]
            // Sin[λ]: [-1  → 0]
            dst[0] = rh * (cosφmin * Math.cos( λmin ) + cosφmax * Math.cos( λmax ));
            dst[1] = rh * (cosφmax * Math.sin( λmin ) + cosφmin * Math.sin( λmax ));
        }
        else if ( λmin + λmax < pi ) {
            //     λ : [0, π/2]
            // Cos[λ]: [1  → 0]
            // Sin[λ]: [0  → 1]
            dst[0] = rh * (cosφmin * Math.cos( λmax ) + cosφmax * Math.cos( λmin ));
            dst[1] = rh * (cosφmin * Math.sin( λmin ) + cosφmax * Math.sin( λmax ));
        }
        else {
            //     λ : [π/2, π]
            // Cos[λ]: [0  → -1]
            // Sin[λ]: [1  →  0]
            dst[0] = rh * (cosφmax * Math.cos( λmax ) + cosφmin * Math.cos( λmin ));
            dst[1] = rh * (cosφmin * Math.sin( λmax ) + cosφmax * Math.sin( λmin ));
        }
    }
    else {
        //     φ : [0, π/2)
        // Cos[φ]: [1  → 0)
        if ( λmin + λmax < -pi ) {
            //     λ : [-π, -π/2]
            // Cos[λ]: [-1  →   0]
            // Sin[λ]: [ 0  →  -1]
            dst[0] = rh * (cosφmin * Math.cos( λmin ) + cosφmax * Math.cos( λmax ));
            dst[1] = rh * (cosφmin * Math.sin( λmax ) + cosφmax * Math.sin( λmin ));
        }
        else if ( λmin + λmax < 0 ) {
            //     λ : [-π/2, 0]
            // Cos[λ]: [ 0  → 1]
            // Sin[λ]: [-1  → 0]
            dst[0] = rh * (cosφmax * Math.cos( λmin ) + cosφmin * Math.cos( λmax ));
            dst[1] = rh * (cosφmin * Math.sin( λmin ) + cosφmax * Math.sin( λmax ));
        }
        else if ( λmin + λmax < pi ) {
            //     λ : [0, π/2]
            // Cos[λ]: [1  → 0]
            // Sin[λ]: [0  → 1]
            dst[0] = rh * (cosφmax * Math.cos( λmax ) + cosφmin * Math.cos( λmin ));
            dst[1] = rh * (cosφmax * Math.sin( λmin ) + cosφmin * Math.sin( λmax ));
        }
        else {
            //     λ : [π/2, π]
            // Cos[λ]: [0  → -1]
            // Sin[λ]: [1  →  0]
            dst[0] = rh * (cosφmin * Math.cos( λmax ) + cosφmax * Math.cos( λmin ));
            dst[1] = rh * (cosφmax * Math.sin( λmax ) + cosφmin * Math.sin( λmin ));
        }
    }

    // rh * (Sin[φmin] + Sin[φmax])
    dst[2] = rh * 2 * (e2max / (e2max + 1) - 1 / (e2min + 1));

    return dst;
}



/**
 * @internal
 */
namespace AreaUtil {



/**
 * 地表の ZXY 領域を表現
 *
 * z, x, y プロパティから地表の領域を表す。
 *
 * @internal
 */
export interface Area {
    x: number;
    y: number;
    z: number;
}



} // namespace Area



export default AreaUtil;
