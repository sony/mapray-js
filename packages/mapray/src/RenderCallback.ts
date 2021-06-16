/**
 * @summary レンダリングコールバック
 * @classdesc
 * <p>レンダリングループでの各箇所で呼び出されるコールバック関数を実装するための抽象クラスである。</p>
 * <p>サブクラスでは以下のメソッドをオーバーライドすることができる。オーバーライドしないメソッドは何もしない。</p>
 * <ul>
 *   <li>[onStart()]{@link mapray.RenderCallback#onStart}</li>
 *   <li>[onUpdateFrame()]{@link mapray.RenderCallback#onUpdateFrame}</li>
 *   <li>[onStop()]{@link mapray.RenderCallback#onStop}</li>
 * </ul>
 * @memberof mapray
 * @protected
 * @abstract
 * @see mapray.Viewer
 */
class RenderCallback {

    constructor()
    {
        this._viewer      = null;
        this._is_started_ = false;
    }


    /**
     * View に取り付ける
     * @package
     */
    attach( viewer )
    {
        if ( this._viewer ) {
            throw new Error( "RenderCallback instance is already attached" );
        }

        this._viewer      = viewer;
        this._is_started_ = false;
    }


    /**
     * View から切り離す
     * すでに onStart() を呼び出してい場合、onStop() を呼び出す。
     * @package
     */
    detach()
    {
        if ( this._is_started_ ) {
            this.onStop();
            this._is_started_ = false;
        }
        this._viewer = null;
    }


    /**
     * フレーム onUpdateFrame() の呼び出し
     * 取り付けてから最初のフレームのときは onStart() を呼び出す。
     * @package
     */
    onUpdateFrameInner( delta_time )
    {
        if ( !this._is_started_ ) {
            this.onStart();
            this._is_started_ = true;
        }
        this.onUpdateFrame( delta_time );
    }


    /**
     * @summary 保有者 Viewer
     * @desc
     * <p>この RenderCallback インスタンスが設定されている Viewer インスタンスを示す。</p>
     * <p>ただし RenderCallback インスタンスがどの Viewer インスタンスにも設定されていない状態では null となる。</p>
     * @type {?mapray.Viewer}
     * @readonly
     */
    get viewer() { return this._viewer; }


    /**
     * @summary レンダリングループ開始の処理
     * @abstract
     */
    onStart() {}


    /**
     * @summary フレームレンダリング前の処理
     * @param {number} delta_time  前フレームからの経過時間 (秒)
     * @abstract
     */
    onUpdateFrame( delta_time ) {}


    /**
     * @summary レンダリングループ終了の処理
     * @abstract
     */
    onStop() {}

}


export default RenderCallback;
