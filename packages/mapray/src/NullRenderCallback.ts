import RenderCallback from "./RenderCallback";


/**
 * @summary 無機能 RenderCallback
 * @desc
 * <p>Viewer に RenderCallback が設定されていないときに使用する内部クラスである。</p>
 * @memberof mapray
 * @extends mapray.RenderCallback
 * @private
 */
class NullRenderCallback extends RenderCallback {

    constructor() { super(); }

}


export default NullRenderCallback;
