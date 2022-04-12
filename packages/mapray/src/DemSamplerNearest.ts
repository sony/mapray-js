import DemSampler from "./DemSampler";
import { Area } from "./AreaUtil";


/**
 * 最近傍 DEM サンプラー
 */
class DemSamplerNearest extends DemSampler {

    constructor( area: Area,
                 ρ:   number,
                 body: DataView )
    {
        super( area, ρ, body );
    }


    // from DemSampler
    override sample( x: number,
                     y: number ): number
    {
        var FLT_BYTES = 4;

        var u  = Math.round( this._sx * x + this._ox );
        var v  = Math.round( this._sy * y + this._oy );

        var offset = this._pitch * v + FLT_BYTES * u;
        return this._body.getFloat32( offset, true );
    }

}


export default DemSamplerNearest;
