import DemSampler from "./DemSampler";
import GeoMath from "./GeoMath";


/**
 * @summary 線形 DEM サンプラー
 * @memberof mapray
 * @private
 * @extends mapray.DemSampler
 */
class DemSamplerLinear extends DemSampler {

    constructor( area, ρ, body )
    {
        super( area, ρ, body );
    }


    /**
     * @override
     */
    sample( x, y )
    {
        var u  = this._sx * x + this._ox;
        var u0 = Math.floor( u );  // 右位置
        var u1 = u0 + 1;           // 左位置

        var v  = this._sy * y + this._oy;
        var v0 = Math.floor( v );  // 上位置
        var v1 = v0 + 1;           // 下位置

        var h00 = this._sampleInt( u0, v0 );  // 左上標高
        var h10 = this._sampleInt( u1, v0 );  // 右上標高
        var h01 = this._sampleInt( u0, v1 );  // 左下標高
        var h11 = this._sampleInt( u1, v1 );  // 右下標高

        // 標高値を補間
        var fu = u - u0;  // 水平小数部
        var fv = v - v0;  // 垂直小数部
        return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv;
    }


    _sampleInt( u, v )
    {
        var FLT_BYTES = 4;

        var     cu = GeoMath.clamp( u, 0, this._max );
        var     cv = GeoMath.clamp( v, 0, this._max );
        var offset = this._pitch * cv + FLT_BYTES * cu;

        return this._body.getFloat32( offset, true );
    }

}


export default DemSamplerLinear;
