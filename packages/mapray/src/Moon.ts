import GeoMath, { Vector3 } from "./GeoMath";


/**
 * @summary 太陽の基本情報を保持するクラス
 * @memberof mapray
 */
class Moon {

    private _moon_direction: Vector3;

    /**
     * @summary constructor
     */
    constructor( )
    {
        this._moon_direction = GeoMath.createVector3( [ 0, 0, 1 ] );
    }


    /**
     * 月方向ベクトル。非公開とする。APIでは、メモリー破壊が起こらない Viewer#getMoonDirection を公開する。
     */
    get moon_direction() { return this._moon_direction; }


    setMoonDirection( direction: Vector3 )
    {
        GeoMath.copyVector3( direction, this._moon_direction );
    }

    getMoonDirection( dst: Vector3 ): Vector3
    {
        return GeoMath.copyVector3( this._moon_direction, dst );
    }
}


export default Moon;
