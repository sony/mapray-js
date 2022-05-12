import Binder from "./Binder";

/**
 * アニメーション共通のエラー
 *
 * @see [[Binder]]
 */
class AnimationError extends Error {

    /**
     * @param message  エラーの説明
     */
    constructor( message: string )
    {
        super( message );
        this.name = "mapray.animation.AnimationError";
    }

}


export default AnimationError;
