import GeoMath, { Vector3 } from "./GeoMath";


/**
 * 地表領域ユーティリティー
 */
class AreaUtil
{
    private constructor() {}

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
    static getCenter( area: Area, dst: Vector3 ): Vector3
    {
        switch ( area.z ) {
        case 0:  return getCenter_0( area.y, dst );
        case 1:  return getCenter_1( area.x, area.y, dst );
        default: return getCenter_N( area.z, area.x, area.y, dst );
        }
    }

}



// AreaUtil.getCenter() の一部
function
getCenter_0( y: number, dst: Vector3 ): Vector3
{
    const pi = Math.PI;

    // 座標範囲 (単位球メルカトル座標系)
    const  msize = 2 * pi;
    const my_min = pi - (y + 1) * msize;
    const my_max = pi - y * msize;

    // 事前計算変数
    const  emin = Math.exp( my_min );   // Exp[my_min]
    const  emax = Math.exp( my_max );   // Exp[my_max]
    const e2min = emin * emin;          // Exp[my_min]^2
    const e2max = emax * emax;          // Exp[my_max]^2

    // 座標範囲 (地心直交座標系)
    //
    // z == 0 のとき、φの範囲は以下の区間に入る
    //   φ: (-π/2, π/2)
    //
    // 区間ごとの関数の変化 (各区間で単調増加または単調減少)
    //   Sin[φ]: (-1 → 1)

    const rh = GeoMath.EARTH_RADIUS / 2;

    // 領域 0/0/y は GOCS の z 軸中心の回転体なので (0, 0)
    dst[0] = 0;
    dst[1] = 0;
    // gz = rh * (Sin[φmin] + Sin[φmax])
    dst[2] = rh * 2 * (e2max / (e2max + 1) - 1 / (e2min + 1));

    return dst;
}


// AreaUtil.getCenter() の一部
function
getCenter_1( x: number, y: number, dst: Vector3 ): Vector3
{
    const pi = Math.PI;

    // 座標範囲 (単位球メルカトル座標系)
    const  msize = pi;
    const mx_min = -pi + x * msize;
    const mx_max = -pi + (x + 1) * msize;
    const my_min =  pi - (y + 1) * msize;
    const my_max =  pi - y * msize;

    // 事前計算変数
    const λmin = mx_min;
    const λmax = mx_max;
    const  emin = Math.exp( my_min );   // Exp[my_min]
    const  emax = Math.exp( my_max );   // Exp[my_max]
    const e2min = emin * emin;          // Exp[my_min]^2
    const e2max = emax * emax;          // Exp[my_max]^2

    // 座標範囲 (地心直交座標系)
    //
    // z == 1 のとき、λとφの範囲は以下の区間のどれかに入る
    //   φ:     (-π/2, 0] [0, π/2)
    //   λ:       [-π, 0] [0, π]
    //
    // 区間ごとの関数の変化 (各区間で単調増加または単調減少)
    //   Sin[φ]: (-1 → 0] [0 → 1)
    //   Cos[φ]: ( 0 → 1] [1 → 0)
    //
    // 区間ごとの (領域に対する) 関数の像
    //   Sin[λ]:   [-1, 0] [0,  1]
    //   Cos[λ]:   [-1, 1] [-1, 1]

    const       rh = GeoMath.EARTH_RADIUS / 2;
    const cosφmin = 2 * emin / (e2min + 1);
    const cosφmax = 2 * emax / (e2max + 1);

    // gx = r Cos[φ] Cos[λ]
    // gy = r Cos[φ] Sin[λ]
    dst[0] = 0;

    // Cos[λ]: [-1, 1]
    if ( my_min + my_max < 0 ) {
        //     φ : (-π/2, 0]
        // Cos[φ]: ( 0  → 1]
        // Sin[φ]: (-1  → 0]
        if ( λmin + λmax < 0 ) {
            //     λ : [-π, 0]
            // Sin[λ]: [-1,  0]
            dst[1] = rh * -cosφmax;
        }
        else {
            //     λ : [0, π]
            // Sin[λ]: [0,  1]
            dst[1] = rh * cosφmax;
        }
    }
    else {
        //     φ : [0,π/2)
        // Sin[φ]: [0 → 1)
        // Cos[φ]: [1 → 0)
        if ( λmin + λmax < 0 ) {
            //     λ : [-π, 0]
            // Sin[λ]: [-1,  0]
            dst[1] = rh * -cosφmin;
        }
        else {
            //     λ : [0, π]
            // Sin[λ]: [0,  1]
            dst[1] = rh * cosφmin;
        }
    }

    // gz = rh * (Sin[φmin] + Sin[φmax])
    dst[2] = rh * 2 * (e2max / (e2max + 1) - 1 / (e2min + 1));

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
 * 地表の ZXY 領域を表現
 *
 * プロパティ `z`, `y`, `x` により地表断片の領域を表現する。
 *
 * 座標の定義は
 * [ズームレベル・タイル座標](https://maps.gsi.go.jp/development/siyou.html#siyou-zm)
 * を参照のこと。
 */
interface Area {

    /**
     * レベル (Z)
     */
    x: number;


    /**
     * x 座標
     */
    y: number;


    /**
     * y 座標
     */
    z: number;

}


export default AreaUtil;
export { Area };
