import DemSampler from "./DemSampler";


/**
 * @summary 最近傍 DEM サンプラー
 * @memberof mapray
 * @private
 * @extends mapray.DemSampler
 */
class DemSamplerNearest extends DemSampler {

    constructor( z, x, y, ρ, body )
    {
        super( z, x, y, ρ, body );
    }


    /**
     * @override
     */
    sample( x, y )
    {
        var FLT_BYTES = 4;

        var u  = Math.round( this._sx * x + this._ox );
        var v  = Math.round( this._sy * y + this._oy );

        var offset = this._pitch * v + FLT_BYTES * u;
        return this._body.getFloat32( offset, true );
    }

}


export default DemSamplerNearest;
