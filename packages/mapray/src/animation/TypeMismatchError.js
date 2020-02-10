import AnimationError from "./AnimationError";


/**
 * @summary 型不一致エラー
 *
 * @memberof mapray.animation
 * @extends mapray.animation.AnimationError
 *
 * @see {@link mapray.animation.Binder}
 */
class TypeMismatchError extends AnimationError {

    /**
     * @param {string} message  エラーの説明
     */
    constructor( message )
    {
        super( message );
        this.name = "mapray.animation.TypeMismatchError";
    }

}


export default TypeMismatchError;
