import * as animation from "../dist/es/animation/animation";
import GeoMath from "../dist/es/GeoMath";

const Time             = animation.Time;
const Interval         = animation.Interval;
const Invariance       = animation.Invariance;
const Type             = animation.Type;
const Updater          = animation.Updater;
const Binder           = animation.Binder;
const Curve            = animation.Curve;
const ConstantCurve    = animation.ConstantCurve;
const KFLinearCurve    = animation.KFLinearCurve;
const KFStepCurve      = animation.KFStepCurve;
const ComboVectorCurve = animation.ComboVectorCurve;

// lessThan, lessEqual
test('compare_times', () => {
    let t1 = Time.fromNumber( 123 );
    let t2 = Time.fromNumber( 567 );
    
    expect(t1.lessThan(t2)).toBeTruthy();
    expect(t2.lessThan(t2)).toBeFalsy();
    expect(t1.lessEqual(t2)).toBeTruthy();
    expect(t2.lessEqual(t1)).toBeFalsy();
    expect(t1.lessEqual(t1)).toBeTruthy();
});


test('interval_intersection', () => {
    let t1 = Time.fromNumber( 123 );
    let t2 = Time.fromNumber( 234 );
    let t3 = Time.fromNumber( 345 );
    let t4 = Time.fromNumber( 456 );

    let i1 = new Interval( t1, t3 );
    let i2 = new Interval( t2, t4 );

    let x12 = i1.getIntersection( i2 );

    expect(x12.isEmpty()).toBeFalsy();
});


test('invariance_tests', () => {
    let invr = new Invariance();

    invr.write( Interval.UNIVERSAL );
    invr.remove( Interval.UNIVERSAL );

    for ( let i = 0; i < 100; ++i ) {
        let n1 = Math.random();
        let n2 = Math.random();

        let t1 = Time.fromNumber( n1 );
        let t2 = Time.fromNumber( n1 + n2 );

        let o1 = Math.random() >= 0.5;
        let o2 = Math.random() >= 0.5;

        let ival = new Interval( t1, t2, o1, o2 );
        invr.write( ival );
    }

    invr.remove( Interval.UNIVERSAL );
});

describe('invariance single tests', () => {

    test('test1', () => {
        let invr = new Invariance();

        let time = Time.fromNumber( 0 );
        let ival = new Interval( time, time );

        invr.write( ival );
    });


    test('test2', () => {
        let invr = new Invariance();
        invr.write( Interval.UNIVERSAL );

        let time = Time.fromNumber( 0 );
        let ival = new Interval( time, time );

        invr.remove( ival );
    });


    test('test3', () => {
        let invr = new Invariance();
        invr.write( Interval.UNIVERSAL );

        let ival = new Interval( Time.MIN_TIME, Time.MIN_TIME );

        invr.remove( ival );
    });


    test('test4', () => {
        let invr = new Invariance();
        invr.write( Interval.UNIVERSAL );

        let ival = new Interval( Time.MAX_TIME, Time.MAX_TIME );

        invr.remove( ival );
    });
});

describe('invariance single tests', () => {

    test('test1', () => {
        for ( let c = 0; c < 10; ++c ) {
            let invrs = [];

            for ( let i = 0; i < c; ++i ) {
                let invr = new Invariance();

                let n1 = Math.random();
                let n2 = Math.random();

                let ival = createClosedInterval( n1, n1 + n2 );

                invr.write( ival );

                invrs.push( invr );
            }

            let merged = Invariance.merge( invrs );
        }
    });


    test('test2', () => {
        let invr1 = new Invariance();
        let ival1 = createClosedInterval( 1, 3 );
        invr1.write( ival1 );

        let invr2 = new Invariance();
        let ival2 = createClosedInterval( 2, 4 );
        invr2.write( ival2 );

        let merged = Invariance.merge( [invr1, invr2] );
    });


    const createClosedInterval = ( nlower, nupper ) => {
        let lower = Time.fromNumber( nlower );
        let upper = Time.fromNumber( nupper );

        return new Interval( lower, upper );
    };
});

test('binder_tests', () => {
    const const_value = 123;

    let parameter;

    let updater = new Updater();

    let type = Type.find( "number" );

    let curve = new ConstantCurve( type );
    curve.setConstantValue( const_value );

    let binder = new Binder( updater, curve, type, v => { parameter = v; } );

    updater.update( Time.fromNumber( 0 ) );

    if ( parameter != const_value ) {
        console.error( "update error" );
    }

    binder.unbind();
});


describe( "EasyBindingBlock tests", () => {

    const EasyBindingBlock  = animation.EasyBindingBlock;
    const AnimationError    = animation.AnimationError;
    const TypeMismatchError = animation.TypeMismatchError;

    test( "empty binding block", () => {
        const bb = new EasyBindingBlock();

        expect( bb.enumSupportedParameters() ).toHaveLength( 0 );
        expect( bb.isBound( "a" ) ).toBe( false );
        expect( bb.getBoundUpdater( "a" ) ).toBeUndefined();
        expect( bb.getBoundCurve( "a" ) ).toBeUndefined();

        const updater = new Updater();
        const   curve = new ConstantCurve( Type.find( "number" ) );

        expect( () => bb.bind( "a", updater, curve ) ).toThrow( AnimationError );
        expect( () => bb.unbind( "a" ) ).not.toThrow();
        expect( () => bb.unbindAll() ).not.toThrow();
        expect( () => bb.unbindAllRecursively() ).not.toThrow();
    } );

    test( "one parameter", () => {
        let param;

        const number = Type.find( "number" );
        const  types = [number];

        const bb = new EasyBindingBlock();

        bb.addEntry( "param", types, null, value => { param = value; } );

        expect( bb.enumSupportedParameters() ).toHaveLength( 1 );
        expect( bb.enumSupportedParameters()[0].id ).toBe( "param" );
        expect( bb.enumSupportedParameters()[0].types ).toHaveLength( types.length );
        expect( bb.enumSupportedParameters()[0].types ).toContain( number );
        expect( bb.isBound( "param" ) ).toBe( false );
        expect( bb.getBoundUpdater( "param" ) ).toBeUndefined();
        expect( bb.getBoundCurve( "param" ) ).toBeUndefined();

        const updater = new Updater();
        const   curve = new ConstantCurve( number );

        expect( () => bb.bind( "param", updater, curve ) ).not.toThrow();
        expect( bb.isBound( "param" ) ).toBe( true );
        expect( bb.getBoundUpdater( "param" ) ).toBe( updater );
        expect( bb.getBoundCurve( "param" ) ).toBe( curve );

        expect( () => bb.unbind( "param" ) ).not.toThrow();
        expect( bb.isBound( "param" ) ).toBe( false );
        expect( bb.getBoundUpdater( "param" ) ).toBeUndefined();
        expect( bb.getBoundCurve( "param" ) ).toBeUndefined();

        expect( () => bb.unbindAll() ).not.toThrow();
        expect( () => bb.unbindAllRecursively() ).not.toThrow();
    } );

    test( "two parameters", () => {
        let p1;
        let p2;

        const number = Type.find( "number" );
        const  types = [number];

        const bb = new EasyBindingBlock();

        bb.addEntry( "p1", types, null, value => { p1 = value; } );
        bb.addEntry( "p2", types, null, value => { p2 = value; } );

        expect( bb.enumSupportedParameters() ).toHaveLength( 2 );

        const updater = new Updater();
        const   curve = new ConstantCurve( number );

        expect( () => bb.bind( "p1", updater, curve ) ).not.toThrow();
        expect( () => bb.bind( "p2", updater, curve ) ).not.toThrow();

        expect( bb.isBound( "p1" ) ).toBe( true );
        expect( bb.isBound( "p2" ) ).toBe( true );

        expect( () => bb.unbind( "p2" ) ).not.toThrow();
        expect( bb.isBound( "p2" ) ).toBe( false );

        expect( () => bb.unbindAll() ).not.toThrow();
        expect( bb.isBound( "p1" ) ).toBe( false );
    } );

    test( "type mismatch", () => {
        let p1;

        const bb = new EasyBindingBlock();

        bb.addEntry( "p1", [Type.find( "number" )], null, value => { p1 = value; } );

        const updater = new Updater();
        const   curve = new ConstantCurve( Type.find( "vector3" ) );

        expect( () => bb.bind( "p1", updater, curve ) ).toThrow( TypeMismatchError );

        expect( bb.isBound( "p1" ) ).toBe( false );
    } );

    test( "bind and update", () => {
        let p1;

        const number = Type.find( "number" );
        const const_value = 100;

        const bb = new EasyBindingBlock();

        bb.addEntry( "p1", [number], null, value => { p1 = value; } );

        const updater = new Updater();
        const   curve = new ConstantCurve( number );
        curve.setConstantValue( const_value );

        bb.bind( "p1", updater, curve );

        updater.update( Time.fromNumber( 0 ) );

        expect( p1 ).toBeCloseTo( const_value );
    } );

    test( "unbind and update", () => {
        let p1 = undefined;

        const number = Type.find( "number" );
        const const_value = 100;

        const bb = new EasyBindingBlock();

        bb.addEntry( "p1", [number], null, value => { p1 = value; } );

        const updater = new Updater();
        const   curve = new ConstantCurve( number );
        curve.setConstantValue( const_value );

        bb.bind( "p1", updater, curve );
        bb.unbind( "p1" );

        updater.update( Time.fromNumber( 0 ) );

        expect( p1 ).toBeUndefined();
    } );

    test( "unbind and addEntry", () => {
        // https://github.com/jozoprj/inou/issues/259 の問題をテスト

        let p1;

        const number = Type.find( "number" );
        const  types = [number];
        const setter = value => { p1 = value; };

        const bb = new EasyBindingBlock();

        bb.addEntry( "p1", types, null, setter );

        const updater = new Updater();
        const   curve = new ConstantCurve( number );

        bb.bind( "p1", updater, curve );

        // unbind() してから、同じ id で addEntry()
        bb.unbind( "p1" );
        expect( () => bb.addEntry( "p1", types, null, setter ) ).not.toThrow();
    } );

} );


test('kflinear_curve_tests', () => {
    let parameter;

    let updater = new Updater();

    let type = Type.find( "vector3" );

    let curve = new KFLinearCurve( type );

    let keyframes = [];
    for ( let t = 0; t <= 100; ++t ) {
        keyframes.push( Time.fromNumber( t ) );
        keyframes.push( GeoMath.createVector3( [t, 2*t, 3*t] ) );
    }
    curve.setKeyFrames( keyframes );

    let binder = new Binder( updater, curve, type, v => { parameter = v; } );

    updater.update( Time.fromNumber( 50 ) );

    expect(parameter).not.toBeNull();

    binder.unbind();
});


test('kfstep_curve_tests', () => {
    let parameter;

    let updater = new Updater();

    let type = Type.find( "vector3" );

    let keyframes = [];
    for ( let t = 0; t <= 100; ++t ) {
        keyframes.push( Time.fromNumber( t ) );
        keyframes.push( GeoMath.createVector3( [t, 2*t, 3*t] ) );
    }

    let curve = new KFStepCurve( type, keyframes );

    let binder = new Binder( updater, curve, type, v => { parameter = v; } );

    updater.update( Time.fromNumber( 200 ) );

    expect(parameter).not.toBeNull();

    binder.unbind();
});


test('compovec_curve_tests', () => {
    let parameter;

    let updater = new Updater();

    let type = Type.find( "vector3" );

    let curve = new ComboVectorCurve( type );

    for ( let i = 0; i < 3; ++i ) {
        let child = new ConstantCurve( Type.find( "number" ) );
        child.setConstantValue( i + 1 );
        curve.setChild( i, child );
    }

    let binder = new Binder( updater, curve, type, v => { parameter = v; } );

    updater.update( Time.fromNumber( 50 ) );

    expect(parameter).not.toBeNull();

    binder.unbind();
});


test('value_change_test', () => {
    let parameter;

    let type = Type.find( "number" );

    let invr  = new Invariance();
    invr.write( new Interval( Time.fromNumber( 0 ), Time.fromNumber( 1 ), true, true ).getPrecedings() );
    invr.write( new Interval( Time.fromNumber( 0 ), Time.fromNumber( 1 ), true, true ).getFollowings() );

    let updater = new Updater();
    let   curve = new ValueChangeCurve( invr );
    let  binder = new Binder( updater, curve, type, v => { parameter = v; } );

    updater.update( Time.fromNumber( -1 ) );

    curve.changeValue( new Interval( Time.fromNumber( -0.1 ), Time.fromNumber( 1.1 ), false, false ),
                       invr );

    binder.unbind();
});


test('find_keyframe_tests', () => {
    for ( let j = 1; j <= 50; ++j ) {
        let array = new Array( j );
        for ( let i = 0; i < j; ++i ) {
            array[i] = i;
        }

        for ( let i = 0; i < array.length; ++i ) {
            let it = findKeyFrameIndex( i, array, 0, array.length );
            if ( it != i + 1 ) {
                console.error( "findKeyFrameIndex error" );
            }
        }

        if ( findKeyFrameIndex( -1, array, 0, array.length ) != 0 ) {
            console.error( "findKeyFrameIndex error" );
        }

        if ( findKeyFrameIndex( array.length, array, 0, array.length ) != array.length ) {
            console.error( "findKeyFrameIndex error" );
        }
    }
});


const findKeyFrameIndex = ( time, key_times, lower, upper ) => {
    let l_idx = lower;
    let u_idx = upper;

    for (;;) {
        if ( u_idx - l_idx >= 2 ) {
            let m_idx  = Math.floor( (l_idx + u_idx) / 2 );  // 中間インデックス
            let m_time = key_times[m_idx];

            if ( m_time <  time ) {
                // m_time < time なので [m_idx, u_idx) に存在するかもしれない
                l_idx = m_idx;
            }
            else if ( time < m_time ) {
                // m_time > time なので [l_idx, m_idx) を確認
                u_idx = m_idx;
            }
            else {
                // m_time == time なので m_idx の次が結果になる
                return m_idx + 1;
            }
        }
        else {
            // u_idx - l_idx == 1
            let l_time = key_times[l_idx];
            return time < l_time ? l_idx : u_idx;
        }
    }

    return 0; // 警告回避
};


/**
 * テスト用関数
 */
class ValueChangeCurve extends Curve
{
    /**
     */
    constructor( invariance )
    {
        super();
        this._invariance = invariance.clone();
    }

    /**
     */
    changeValue( interval, invariance )
    {
        this._invariance = invariance.clone();
        this.notifyValueChange( interval );
    }

    /**
     * @override
     */
    isTypeSupported( type )
    {
        return true;
    }

    /**
     * @override
     */
    getValue( time, type )
    {
        return type.getDefaultValue();
    }

    /**
     * @override
     */
    getInvariance( interval )
    {
        return this._invariance.getNarrowed( interval );
    }

}

