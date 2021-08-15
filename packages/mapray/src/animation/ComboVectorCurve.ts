import Time from "./Time";
import Curve from "./Curve";
import Interval from "./Interval";
import Invariance from "./Invariance";
import Type from "./Type";
import ConstantCurve from "./ConstantCurve";
import TypeMismatchError from "./TypeMismatchError";
import AnimUtil from "./AnimUtil";


/**
 * 複合ベクトル関数
 *
 * 複数の数値関数から構成されるベクトル関数である。
 *
 * 関数値の型は構築子のパラメータにより vector2, vector3 または vector4 を指定する。
 *
 * 子関数は number または number へ変換可能な型でなければならない。
 */
class ComboVectorCurve extends Curve
{

    private _vector_type: Type;

    /** 2〜4 */
    private _dimension: number;

    /** 子関数の配列 */
    private _children: Curve[];

    /** 子関数に対応した */
    private _listeners: Curve.ValueChangeListener[];




    /**
     * type 型のベクトル関数を生成する。ベクトルの各要素の値は子関数の値になる。
     *
     * children を省略したときは、ベクトルの全要素が 0 となる定数関数と同等になる。children の形式に関しては
     *    [[ComboVectorCurve.setChildren setChildren()]] を参照のこと。
     *
     * @param type     関数値の型 (ベクトル型)
     * @param children  初期の全子関数
     *
     * @throws [[TypeMismatchError]]  type または children に非対応の型が存在するとき
     */
    constructor( type: Type, children?: Curve[] )
    {
        super();

        const dimension = AnimUtil.getDimension( type );
        if ( dimension < 2 && dimension > 4 ) {
            // type はベクトル型ではない
            throw new TypeMismatchError( "unexpected type" );
        }

        this._vector_type = type;
        this._dimension   = dimension;
        this._children    = new Array( dimension );
        this._listeners   = new Array( dimension );

        this._setupInitialChildren();

        // 初期値が指定されているときは設定
        if ( children !== undefined ) {
            this.setChildren( children );
        }
    }


    /**
     * 子関数を設定 (個別)
     *
     * index の要素のみの子関数を設定する。その他の要素は変更されない。
     *
     * @param index  要素インデックス
     * @param curve  子関数
     *
     * @throws [[TypeMismatchError]]  curve が非対応の型のとき
     */
    setChild( index: number, curve: Curve )
    {
        this._setChildCommon( index, curve );

        // curve が未知なので全時刻の値が変化したことにする
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    /**
     * 子関数を設定 (一括)
     *
     * curves にすべての子関数を指定する。curves の要素数はベクトルの次数と同数である。
     *
     * @param curves  全子関数
     *
     * @throws [[TypeMismatchError]]  curves に非対応の型が存在するとき
     */
    setChildren( curves: Curve[] )
    {
        for ( let i = 0; i < this._dimension; ++i ) {
            this._setChildCommon( i, curves[i] );
        }

        // curves が未知なので全時刻の値が変化したことにする
        this.notifyValueChange( Interval.UNIVERSAL );
    }


    override isTypeSupported( type: Type )
    {
        let from_type = this._vector_type;
        return type.isConvertible( from_type );
    }


    override getValue( time: Time, type: Type )
    {
        let from_type  = this._vector_type;
        let from_value = this._getCompoundValue( time );
        return type.convertValue( from_type, from_value );
    }


    override getInvariance( interval: Interval ): Invariance
    {
        // すべての子関数の不変性情報の交差
        const invariances = this._children.map( child => child.getInvariance( interval ) );
        // @ts-ignore
        return Invariance.merge( invariances );
    }


    /**
     * 初期の子関数とリスナーを設定
     */
    private _setupInitialChildren()
    {
        const init_child = new ConstantCurve( vec_compo_type );

        for ( let i = 0; i < this._dimension; ++i ) {
            const listener = (interval: Interval) => { this.notifyValueChange( interval ); };
            init_child.addValueChangeListener( listener );

            this._children[i]  = init_child;
            this._listeners[i] = listener;
        }
    }


    /**
     * 子要素を設定 (共通ルーチン)
     *
     * @param index
     * @param curve
     *
     * @throws [[TypeMismatchError]]
     */
    private _setChildCommon( index: number, curve: Curve )
    {
        if ( !curve.isTypeSupported( vec_compo_type ) ) {
            // curve の型をベクトルの要素の型に変換できない
            throw new TypeMismatchError( "type mismatch error" );
        }

        // 以前の子のリスナーを解除
        let old_child    = this._children[index];
        let old_listener = this._listeners[index];
        old_child.removeValueChangeListener( old_listener );

        // 新しい子のリスナーを設定
        let listener = (interval: Interval) => { this.notifyValueChange( interval ); };
        curve.addValueChangeListener( listener );

        // 新しい子を設定
        this._children[index]  = curve;
        this._listeners[index] = listener;
    }


    /**
     * time での複合値を取得
     *
     * @param Time time
     *
     * @return 複合値 (this._vector_type に適応した型)
     */
    private _getCompoundValue( time: Time ): Float64Array
    {
        const dimension = this._dimension;

        let vec = new Float64Array( dimension );

        for ( let i = 0; i < dimension; ++i ) {
            vec[i] = this._children[i].getValue( time, vec_compo_type );
        }

        return vec;
    }

}


/**
 * ベクトルの要素型
 * @private
 */
const vec_compo_type = Type.find( "number" );


export default ComboVectorCurve;
