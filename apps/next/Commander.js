/**
 * @summary 操作コマンドの発行
 */
class Commander {

    /**
     * @param {Inou.Viewer} viewer
     */
    constructor( viewer )
    {
        var element = viewer.canvas_element;
        var    self = this;

        // イベント登録
        document.addEventListener( "keydown",   function( event ) { self._onKeyDown( event );   }, false );
        document.addEventListener( "keyup",     function( event ) { self._onKeyUp( event );     }, false );
        window.addEventListener(   "blur",      function( event ) { self._onBlur( event );      }, false );
        element.addEventListener(  "mousedown", function( event ) { self._onMouseDown( event ); }, false );
        document.addEventListener( "mousemove", function( event ) { self._onMouseMove( event ); }, false );
        document.addEventListener( "mouseup",   function( event ) { self._onMouseUp( event );   }, false );

        // 状態初期化
        this._move_fwd   = false;  // 前進
        this._move_bwd   = false;  // 後退
        this._move_rwd   = false;  // 右移動
        this._move_lwd   = false;  // 左移動
        this._move_up    = false;  // 上昇
        this._move_dn    = false;  // 下降
        this._turn_x     = 0;      // 横回転
        this._turn_y     = 0;      // 縦回転
        this._zoom_in    = false;  // ズームイン
        this._zoom_out   = false;  // ズームアウト
        this._zoom_reset = false;  // ズームリセット
        this._rmode_chg  = false;  // レンダリングモード切替
        this._accel      = false;  // 加速
        this._layer_up   = false;  // Layer透明度アップ
        this._layer_dn   = false;  // Layer透明度ダウン
        this._gis_chg    = false;  // GIS情報のON/OFF
        this._bing_chg   = false;  // BingMap

        this._drag_mode = DragMode.NONE;
        this._drag_x    = undefined;
        this._drag_y    = undefined;
    }


    /**
     * @summary 移動量を取得
     * moves[0]: 左右方向の移動量 (+右, -左)
     * moves[1]: 前後方向の移動量 (+前, -後)
     * moves[2]: 上下方向の移動量 (+上, -下)
     */
    getMoves( moves )
    {
        moves[0] = (this._move_rwd ? 1 : 0) + (this._move_lwd ? -1 : 0);
        moves[1] = (this._move_fwd ? 1 : 0) + (this._move_bwd ? -1 : 0);
        moves[2] = (this._move_up  ? 1 : 0) + (this._move_dn  ? -1 : 0);
        return moves;
    }


    /**
     * @summary ドラッグ移動の情報を取得
     * coords[0]: キャンバス x 座標
     * coords[1]: キャンバス y 座標
     * ドラッグ移動のときは coords を書き換えて coords を返す。それ以外のときは null を返す。
     */
    getDragMove( coords )
    {
        if ( this._drag_mode === DragMode.MOVE ) {
            coords[0] = this._drag_x;
            coords[1] = this._drag_y;
            return coords;
        }
        else {
            return null;
        }
    }


    /**
     * @summary 回転量を取得
     * turns[0]: 水平方向の回転量 (+右, -左)
     * turns[1]: 垂直方向の回転量 (+上, -下)
     */
    getTurns( turns )
    {
        turns[0] =  this._turn_x;
        turns[1] = -this._turn_y;
        return turns;
    }


    /**
     * @summary ズーム量を取得
     *  0: ズームなし
     *  1: ズームイン
     * -1: ズームアウト
     */
    getZoom()
    {
        return (this._zoom_in  ? 1 : 0) + (this._zoom_out  ? -1 : 0);
    }


    /**
     * @summary ズームはリセットされたか？
     */
    isZoomReset()
    {
        return this._zoom_reset;
    }


    /**
     * @summary レンダリングモードは変更されたか？
     */
    isRenderModeChanged()
    {
        return this._rmode_chg;
    }


    /**
     * @summary 加速の有無を取得
     */
    getAccel()
    {
        return this._accel;
    }


    /**
     * @summary フレーム終了処理
     */
    endFrame()
    {
        this._turn_x     = 0;
        this._turn_y     = 0;
        this._zoom_in    = false;
        this._zoom_out   = false;
        this._zoom_reset = false;
        this._rmode_chg  = false;
        this._layer_up   = false;
        this._layer_dn   = false;
        this._gis_chg    = false;
        this._bing_chg   = false;
    }

    /**
     * @summary Layer変化量を取得
     *  0: Layerなし
     *  1: layerイン
     */
    getLayer()
    {
        return (this._layer_up ? 1 : 0) + (this._layer_dn  ? -1 : 0);
    }

    /**
     * @summary GIS情報を表示するか
     */
    isGISModeChanged()
    {
        return this._gis_chg;
    }

    isBingModeChanged()
    {
        return this._bing_chg;
    }

    _onKeyDown( event )
    {
        switch ( event.key ) {
            case "Shift":
                this._accel = true;;
                break;

            case "ArrowUp":
            case "Up": // for Edge
            case "w": case "W":
            this._move_fwd = true;
            this._move_bwd = false;
            break;

            case "ArrowDown":
            case "Down": // for Edge
            case "s": case "S":
            this._move_bwd = true;
            this._move_fwd = false;
            break;

            case "ArrowRight":
            case "Right": // for Edge
            case "d": case "D":
            this._move_rwd = true;
            this._move_lwd = false;
            break;

            case "ArrowLeft":
            case "Left": // for Edge
            case "a": case "A":
            this._move_lwd = true;
            this._move_rwd = false;
            break;

            case "PageUp":
            case "e": case "E":
            this._move_up = true;
            this._move_dn = false;
            break;

            case "PageDown":
            case "q": case "Q":
            this._move_dn = true;
            this._move_up = false;
            break;

            case "c": case "C":
            this._zoom_in = true;
            break;

            case "z": case "Z":
            this._zoom_out = true;
            break;

            case "x": case "X":
            this._zoom_reset = true;
            break;

            case "m": case "M":
            this._rmode_chg = true;
            break;

            case ">":
                this._layer_up = true;
                break;

            case "<":
                this._layer_dn = true;
                break;

            case "g": case "G":
            this._gis_chg = true;
            break;

            case "b": case "B":
            this._bing_chg = true;
            break;
        }
    }


    _onKeyUp( event )
    {
        switch ( event.key ) {
            case "Shift":
                this._accel = false;;
                break;

            case "ArrowUp":
            case "Up": // for Edge
            case "w": case "W":
            this._move_fwd = false;
            break;

            case "ArrowDown":
            case "Down": // for Edge
            case "s": case "S":
            this._move_bwd = false;
            break;

            case "ArrowRight":
            case "Right": // for Edge
            case "d": case "D":
            this._move_rwd = false;
            break;

            case "ArrowLeft":
            case "Left": // for Edge
            case "a": case "A":
            this._move_lwd = false;
            break;

            case "PageUp":
            case "e": case "E":
            this._move_up = false;
            break;

            case "PageDown":
            case "q": case "Q":
            this._move_dn = false;
            break;
        }
    }


    _onMouseDown( event )
    {
        if ( event.button == 0 /* 左ボタン */ ) {
            if ( event.shiftKey ) {
                // カメラ回転ドラッグ開始
                this._drag_mode = DragMode.TURN;
            }
            else {
                // カメラ移動ドラッグ開始
                this._drag_mode = DragMode.MOVE;
            }

            this._turn_x = 0;
            this._turn_y = 0;

            this._drag_x = event.clientX;
            this._drag_y = event.clientY;
        }
    }


    _onMouseMove( event )
    {
        if ( this._drag_mode === DragMode.MOVE ) {
            // カメラ移動ドラッグ中
            this._drag_x = event.clientX;
            this._drag_y = event.clientY;
        }
        else if ( this._drag_mode === DragMode.TURN ) {
            // カメラ回転ドラッグ中
            this._turn_x += (event.clientX - this._drag_x);
            this._turn_y += (event.clientY - this._drag_y);

            this._drag_x = event.clientX;
            this._drag_y = event.clientY;
        }
    }


    _onMouseUp( event )
    {
        if ( event.button == 0 /* 左ボタン */ ) {
            // すべてのドラッグを終了
            this._drag_mode = DragMode.NONE;
            this._turn_x    = 0;
            this._turn_y    = 0;
        }
    }


    /**
     * @summary フォーカスを失った
     * @private
     */
    _onBlur( event )
    {
        this._move_fwd   = false;
        this._move_bwd   = false;
        this._move_rwd   = false;
        this._move_lwd   = false;
        this._move_up    = false;
        this._move_dn    = false;
        this._turn_x     = 0;
        this._turn_y     = 0;
        this._zoom_in    = false;
        this._zoom_out   = false;
        this._zoom_reset = false;
        this._rmode_chg  = false;
        this._accel      = false;
        this._drag_mode  = DragMode.NONE;
        this._layer_up   = false;
        this._layer_dn   = false;
        this._gis_chg    = false;
        this._bing_chg   = false;
    }

}


/**
 * ドラッグモードの列挙型
 */
var DragMode = {
    NONE: "NONE",
    MOVE: "MOVE",
    TURN: "TURN"
};


export default Commander;
