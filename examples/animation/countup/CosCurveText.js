// JavaScript source code
class CosCurveText extends mapray.animation.Curve
{
  constructor( type, keyframes )
  {
      super();

      if ( type != mapray.animation.Type.find("string") ) {
          throw mapray.animation.AnimationError( "unsupported type" );
      }

      this._value_type = type;
      this._ratio = 1.0
      this._base_value = 1.0;
      this._value_ratio = 1.0;
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
        return new mapray.animation.Invariance();
    }

    _getInterpolatedValue( time )
    {
        const val = Math.floor(time.toNumber());
        return val.toString(10);
    }
}
