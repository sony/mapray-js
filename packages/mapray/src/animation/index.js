import AnimationError from "./AnimationError";
import Time from "./Time";
import Interval from "./Interval";
import Invariance from "./Invariance";
import Type from "./Type";
import Curve from "./Curve";
import Updater from "./Updater";
import Binder from "./Binder";
import TypeMismatchError from "./TypeMismatchError";
import BindingBlock from  "./BindingBlock";
import EasyBindingBlock from  "./EasyBindingBlock";
import ConstantCurve from "./ConstantCurve";
import KFLinearCurve from "./KFLinearCurve";
import KFStepCurve from "./KFStepCurve";
import ComboVectorCurve from "./ComboVectorCurve";


/**
 * アニメーション関連の機能全体が含まれる名前空間
 *
 * @namespace animation
 * @memberof mapray
 */
let animation = {
    AnimationError,
    Time,
    Interval,
    Invariance,
    Type,
    Curve,
    Updater,
    Binder,
    TypeMismatchError,
    BindingBlock,
    EasyBindingBlock,
    ConstantCurve,
    KFLinearCurve,
    KFStepCurve,
    ComboVectorCurve
};


export default animation;
