import GeoMath, { Vector3 } from "./GeoMath";


/**
 * 月の基本情報を保持するクラス
 */
class Moon {

    private _moon_direction: Vector3;

    /**
     * constructor
     */
    constructor( )
    {
        this._moon_direction = GeoMath.createVector3( [ 0, 0, 1 ] );
    }


    /**
     * 月方向ベクトル。非公開とする。APIでは、メモリー破壊が起こらない Viewer#getMoonDirection を公開する。
     * @readonly
     */
    get moon_direction() { return this._moon_direction; }


    /**
     * 月ベクトルの情報を設定
     * @param direction 方向（GOCS  正規化されていること）
     */
     setMoonDirection( direction: Vector3 )
    {
        GeoMath.copyVector3( direction, this._moon_direction );
    }


    /**
     * 月ベクトルの情報のコピーを取得
     * @param dst 方向（GOCS  正規化されていること）
     * @return 月ベクトルのコピー（GOCS）
     */
     getMoonDirection( dst: Vector3 ): Vector3
    {
        return GeoMath.copyVector3( this._moon_direction, dst );
    }
}


export default Moon;
