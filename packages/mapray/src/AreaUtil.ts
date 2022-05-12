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
        return AreaUtil.transformVector3( area.type, getCenter( area, dst ) );
    }



    /**
     * タイル位置を地表タイプに応じて変更する際に用いる。
     * @param x 変換前の x
     * @param y 変換前の y
     * @param z 変換前の z
     * @param type 地表タイプ
     * @return 変換後の値
     */
    static transformVector3Values( type: AreaUtil.Type | undefined, x: number, y: number, z: number, dst: Vector3 ): Vector3 {
        if ( type === AreaUtil.Type.NORTH_POLE ) {
            dst[0] = -z;
            dst[2] =  x;
        }
        else if ( type === AreaUtil.Type.SOUTH_POLE ) {
            dst[0] =  z;
            dst[2] = -x;
        }
        else {
            dst[0] = x;
            dst[2] = z;
        }
        dst[1] =  y;
        return dst;
    }


    /**
     * タイル位置を地表タイプに応じて変更する際に用いる。
     * メモリー効率を優先するため、変換結果を元のインスタンスに代入する。
     * @param type 地表タイプ
     * @param vec  変換前の値値（変換後の値が直接代入される）
     * @return 変換後の値
     */
    static transformVector3( type: AreaUtil.Type | undefined, vec: Vector3 ): Vector3 {
        if ( type === AreaUtil.Type.NORMAL ) {
            return vec;
        }
        const tmp = vec[0];
        if ( type === AreaUtil.Type.NORTH_POLE ) {
            vec[0] = -vec[2];
            vec[2] =  tmp;
        }
        else if ( type === AreaUtil.Type.SOUTH_POLE ) {
            vec[0] =  vec[2];
            vec[2] = -tmp;
        }
        return vec;
    }


    /**
     * タイルが完全に必要領域外であるかを判定する。
     * 北極・南極の場合は周辺以外は不必要な領域となる。
     * @param type 地表タイプ
     * @param x 変換前の x
     * @param y 変換前の y
     * @param z 変換前の z
     * @return 必要領域外である場合に true
     */
    static isOutOfRange( type: AreaUtil.Type | undefined, x: number, y: number, z: number ): boolean {
        if ( type !== AreaUtil.Type.NORMAL ) {
            if ( 1 < z && z < 7 ) {
                const n = 1 << ( z - 1 );
                return (x < n-1 || n < x) || (y < n-1 || n < y);
            }
        }
        return false;
    }

}


function
getCenter( area: AreaUtil.Area, dst: Vector3 ): Vector3
{
    switch ( area.z ) {
        case 0:  return getCenter_0( dst );
        case 1:  return getCenter_1( area.x, area.y, dst );
        default: return getCenter_N( area.z, area.x, area.y, dst );
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
    type?: Type;
}



/**
 * 地表タイプ
 * @internal
 */
export enum Type {

    /**
     * 通常の地表形状
     */
    NORMAL,

    /**
     * 北極周辺を表す地表形状
     */
    NORTH_POLE,

    /**
     * 南極周辺を表す地表形状
     */
    SOUTH_POLE,
}



} // namespace Area



export default AreaUtil;
