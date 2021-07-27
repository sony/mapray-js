import GeoMath, { Vector3 } from "./GeoMath";


/**
 * 太陽の基本情報を保持するクラス
 */
class Sun {

    private _sun_direction: Vector3;

    /**
     */
    constructor()
    {
        this._sun_direction = GeoMath.createVector3( [ 0, 0, 1 ] );
    }


    /**
     * 太陽ベクトル。非公開とする。APIでは、メモリー破壊が起こらない Viewer#getSunDirection を公開する。
     * @internal
     */
    get sun_direction(): Vector3 { return this._sun_direction; }


    /**
     * 太陽ベクトルの情報を設定します
     * @param direction 方向（GOCS  正規化されていること）
     */
    setSunDirection( direction: Vector3 ): void
    {
        GeoMath.copyVector3( direction, this._sun_direction );
    }


    /**
     * 太陽ベクトルの情報のコピーを取得します
     * @param dst 方向（GOCS  正規化されていること）
     * @return ベクトルのコピー（GOCS）
     */
    getSunDirection( dst: Vector3 ): Vector3
    {
        return GeoMath.copyVector3( this._sun_direction, dst );
    }

}



export default Sun;
