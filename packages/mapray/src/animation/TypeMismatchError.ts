import AnimationError from "./AnimationError";
import Binder from "./Binder";


/**
 * 型不一致エラー
 *
 * @see [[Binder]]
 */
class TypeMismatchError extends AnimationError {

    /**
     * @param message  エラーの説明
     */
    constructor( message: string )
    {
        super( message );
        this.name = "mapray.animation.TypeMismatchError";
    }

}


export default TypeMismatchError;
