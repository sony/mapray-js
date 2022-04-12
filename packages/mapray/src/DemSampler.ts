import { Area } from "./AreaUtil";


/**
 * DEM サンプラー
 *
 * DEM バイナリーのデータをサンプルするために使用する。
 *
 * インスタンスは [[DemBinary.newSampler]] により作成する。
 *
 * @see [[DemBinary]], [[DemSamplerLinear]], [[DemSamplerNearest]]
 */
abstract class DemSampler {

    protected _sx: number;
    protected _sy: number;

    protected _ox: number;
    protected _oy: number;

    protected _body:  DataView;
    protected _pitch: number;
    protected _max:   number;


    /**
     * @param area  DEM 領域
     * @param ρ    DEM バイナリの解像度の指数
     * @param body  DEM 配列データの標高データ部分
     */
    protected constructor( area: Area,
                           ρ:   number,
                           body: DataView )
    {
        var FLT_BYTES = 4;

        var p = Math.pow( 2, area.z - 1 );  // 2^(ze-1)
        var c = 1 << ρ;               // 画素数

        this._sx    =  p / Math.PI * c;
        this._sy    = -this._sx;
        this._ox    = (p - area.x) * c;
        this._oy    = (p - area.y) * c;
        this._body  = body;
        this._pitch = FLT_BYTES * (c + 1);
        this._max   = c;
    }


    /**
     * 標高値をサンプル
     *
     * @param x - X 座標 (単位球メルカトル座標系)
     * @param y - Y 座標 (単位球メルカトル座標系)
     *
     * @returns  標高値 (メートル)
     */
    abstract sample( x: number,
                     y: number ): number;

}


export default DemSampler;
