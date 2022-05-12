import RenderCallback from "./RenderCallback";


/**
 * 無機能 RenderCallback
 *
 * Viewer に RenderCallback が設定されていないときに使用する内部クラスである。
 * @internal
 */
class NullRenderCallback extends RenderCallback {

    constructor() { super(); }

}


export default NullRenderCallback;
