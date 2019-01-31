/**
 * @summary DEM サンプラー
 * @desc
 * <p>DEM バイナリーのデータをサンプルするために使用する。<p>
 * <p>インスタンスは [DemBinary#newSampler()]{@link mapray.DemBinary#newSampler} により作成する。<p>
 * @memberof mapray
 * @private
 * @see mapray.DemBinary
 * @see mapray.DemSamplerLinear
 * @see mapray.DemSamplerNearest
 */
class DemSampler {

    /**
     * @param {number}   z     ズームレベル
     * @param {number}   x     X タイル座標
     * @param {number}   y     Y タイル座標
     * @param {number}   ρ    解像度の指数
     * @param {DataView} body  DEM 配列データの標高データ部分
     */
    constructor( z, x, y, ρ, body )
    {
        var FLT_BYTES = 4;

        var p = Math.pow( 2, z - 1 );  // 2^(ze-1)
        var c = 1 << ρ;               // 画素数

        this._sx    =  p / Math.PI * c;
        this._sy    = -this._sx;
        this._ox    = (p - x) * c;
        this._oy    = (p - y) * c;
        this._body  = body;
        this._pitch = FLT_BYTES * (c + 1);
        this._max   = c;
    }


    /**
     * @summary 標高値をサンプル
     * @param  {number}  x  X 座標 (単位球メルカトル座標系)
     * @param  {number}  y  Y 座標 (単位球メルカトル座標系)
     * @return {number}     標高値 (メートル)
     * @abstract
     */
    sample( x, y )
    {
        return 0;
    }

}


export default DemSampler;
