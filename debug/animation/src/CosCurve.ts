import mapray from "@mapray/mapray-js";

class CosCurve extends mapray.animation.Curve
{

    private _value_type: mapray.animation.Type;

    private _ratio: number;

    private _base_value: number;

    private _value_ratio: number;
 
    constructor( type: mapray.animation.Type )
    {
        super();

        if ( type != mapray.animation.Type.find("number") ) {
            throw new mapray.animation.AnimationError( "unsupported type" );
        }

        this._value_type = type;
        this._ratio = 1.0
        this._base_value = 1.0;
        this._value_ratio = 1.0;
    }

    setRatio( ratio: number )
    {
      this._ratio = ratio;
    }

    setBaseValue( value: number )
    {
      this._base_value = value;
    }

    setValueRatio( ratio: number )
    {
      this._value_ratio = ratio;
    }

    override isTypeSupported( type: mapray.animation.Type ): boolean
    {
        let from_type = this._value_type;
        return type.isConvertible( from_type );
    }

    override getValue( time: mapray.animation.Time, type: mapray.animation.Type ): any
    {
        let from_type  = this._value_type;
        let from_value = this._getInterpolatedValue( time );
        return type.convertValue( from_type, from_value );
    }

    override getInvariance( interval: mapray.animation.Interval ): mapray.animation.Invariance
    {
      return new mapray.animation.Invariance();
    }

    _getInterpolatedValue( time: mapray.animation.Time ): number
    {
        const theta = (time.toNumber() * this._ratio + 180) * mapray.GeoMath.DEGREE;
        return (Math.cos(theta) + 1) * 0.5 * this._value_ratio + this._base_value;
    }
}

export default CosCurve;