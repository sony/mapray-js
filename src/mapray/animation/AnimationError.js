/**
 * @summary アニメーション共通のエラー
 *
 * @memberof mapray.animation
 * @extends Error
 *
 * @see {@link mapray.animation.Binder}
 */
class AnimationError extends Error {

    /**
     * @param {string} message  エラーの説明
     */
    constructor( message )
    {
        super( message );
        this.name = "mapray.animation.AnimationError";
    }

}


export default AnimationError;
