// JavaScript source code
class CosCurveWithTime extends mapray.animation.Curve
{
  constructor( type, keyframes )
  {
      super();

      if ( type != mapray.animation.Type.find("number") ) {
          throw mapray.animation.AnimationError( "unsupported type" );
      }

      this._value_type = type;
      this._ratio = 1.0
      this._base_value = 1.0;
      this._value_ratio = 1.0
      this._start_time = 0;
      this._end_time = 10;
    }

    setRatio( ratio )
    {
      this._ratio = ratio;
    }

    setBaseValue( value )
    {
      this._base_value = value;
    }

    setValueRatio( ratio )
    {
      this._value_ratio = ratio;
    }

    setStartTime( time )
    {
      this._start_time = time;
    }

    setEndTime( time )
    {
      this._end_time = time;
    }

    /**
     * @override
     */
    isTypeSupported( type )
    {
        let from_type = this._value_type;
        return type.isConvertible( from_type );
    }


    /**
     * @override
     */
    getValue( time, type )
    {
        let from_type  = this._value_type;
        let from_value = this._getInterpolatedValue( time );
        return type.convertValue( from_type, from_value );
    }


    /**
     * @override
     */
    getInvariance( interval )
    {
        const first = mapray.animation.Time.fromNumber(this._start_time);
        const last = mapray.animation.Time.fromNumber(this._end_time);
        const ival_inner = new mapray.animation.Interval( first, last, true, true );

        const invariance = new mapray.animation.Invariance();
        invariance.write(ival_inner.getPrecedings());
        invariance.write(ival_inner.getFollowings());

        return invariance.getNarrowed( interval );
    }

    _getInterpolatedValue( time )
    {
        const theta = (time.toNumber() * this._ratio + 180) * mapray.GeoMath.DEGREE;
        return (Math.cos(theta) + 1) * 0.5 * this._value_ratio + this._base_value;
    }
}
