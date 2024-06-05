import Viewer from "./Viewer";

/**
 * レンダリングコールバック
 *
 * レンダリングループでの各箇所で呼び出されるコールバック関数を実装するための抽象クラスである。
 * サブクラスでは以下のメソッドをオーバーライドすることができる。オーバーライドしないメソッドは何もしない。
 * - {@link onStart}
 * - {@link onUpdateFrame}
 * - {@link onStop}
 *
 * @see {@link Viewer}
 */
abstract class RenderCallback {

    protected _viewer?: Viewer;

    private _is_started_: boolean = false;


    constructor()
    {
    }


    /**
     * View に取り付ける
     * @internal
     */
    attach( viewer: Viewer )
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
     * @internal
     */
    detach()
    {
        if ( this._is_started_ ) {
            this.onStop();
            this._is_started_ = false;
        }
        this._viewer = undefined;
    }


    /**
     * フレーム onUpdateFrame() の呼び出し
     * 取り付けてから最初のフレームのときは onStart() を呼び出す。
     * @internal
     */
    onUpdateFrameInner( delta_time: number )
    {
        if ( !this._is_started_ ) {
            this.onStart();
            this._is_started_ = true;
        }
        this.onUpdateFrame( delta_time );
    }


    /**
     * 保有者 Viewer
     *
     * この RenderCallback インスタンスが設定されている Viewer インスタンスを示す。
     * ただし RenderCallback インスタンスがどの Viewer インスタンスにも設定されていない状態では null となる。
     */
    get viewer(): Viewer | undefined { return this._viewer; }


    /**
     * レンダリングループ開始の処理
     */
    onStart() {}


    /**
     * フレームレンダリング前の処理
     * @param delta_time  前フレームからの経過時間 (秒)
     */
    onUpdateFrame( delta_time: number ) {}


    /**
     * レンダリングループ終了の処理
     */
    onStop() {}

}


export default RenderCallback;
