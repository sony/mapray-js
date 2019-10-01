// JavaScript source code
class CheckInput {

    constructor(viewer) {
        // マウス、キーのイベントを設定
        var element = viewer.canvas_element;
        var self = this;

        this.is_Mouse_Click = false;                // マウスがクリックされたか
        this.mouse_Click_Pos = [0, 0];              // クリックされたマウスの位置
        this.is_Forward = false;                    // 前進するか
        this.is_Backward = false;                   // 後退するか
        this.is_Camera_Turn = false;                // カメラが回るか
        this.is_Camera_Height_Move = false;         // 高度を更新するか
        this.mouse_Move_Pos = [0, 0];               // 左マウスボタンドラッグ時のマウス位置
        this.mouse_Move_Pos_Old = [0, 0];           // 左マウスボタンドラッグ時の1フレーム前の位置
        this.mouse_Right_Move_Pos = [0, 0];         // 右マウスボタンドラッグ時のマウス位置
        this.mouse_Right_Move_Pos_Old = [0, 0];     // 右マウスボタンドラッグ時の1フレーム前の位置

        // イベントをセット
        window.addEventListener("blur", function (event) { self._onBlur(event); }, false);
        element.addEventListener("mousedown", function (event) { self._onMouseDown(event); }, false);
        document.addEventListener("mousemove", function (event) { self._onMouseMove(event); }, false);
        document.addEventListener("mouseup", function (event) { self._onMouseUp(event); }, false);

        if (window.addEventListener) {
            // FireFoxのマウスホイールイベント
            window.addEventListener("DOMMouseScroll", function (event) { self._onMouseScroll_FireFox(event); }, false);
        }
        
        // chromeのマウスホイールイベント
        window.onmousewheel = function (event) {
            self._onMouseScroll_Chrome(event);
        }
    }

    IsMouseClick(mousePos) {
        if(this.is_Mouse_Click){
            mousePos[0] = this.mouse_Click_Pos[0];
            mousePos[1] = this.mouse_Click_Pos[1];
            return true;
        } else {
            return false;
        }
    }

    IsForward() {
        return this.is_Forward;
    }

    IsBackward() {
        return this.is_Backward;
    }

    IsCameraTurn(dragVec) {
        if (this.is_Camera_Turn == true) {
            // 前フレームからの移動量を計算
            dragVec[0] = this.mouse_Move_Pos[0] - this.mouse_Move_Pos_Old[0];
            dragVec[1] = this.mouse_Move_Pos[1] - this.mouse_Move_Pos_Old[1];
            return true;
        } else {
            return false;
        }
    }

    IsCameraHeightMove(dragVec) {
        if (this.is_Camera_Height_Move == true) {
            // 前フレームからの移動量を計算
            dragVec[0] = this.mouse_Right_Move_Pos[0] - this.mouse_Right_Move_Pos_Old[0];
            dragVec[1] = this.mouse_Right_Move_Pos[1] - this.mouse_Right_Move_Pos_Old[1];
            return true;
        } else {
            return false;
        }
    }

    _onMouseDown(event) {
        if (event.button == 0 /* 左ボタン */) {
            if (event.shiftKey) {
                // カメラ回転ドラッグ開始
                this.is_Camera_Turn = true;
                this.mouse_Move_Pos[0] = event.clientX;
                this.mouse_Move_Pos[1] = event.clientY;
                this.mouse_Move_Pos_Old[0] = event.clientX;
                this.mouse_Move_Pos_Old[1] = event.clientY;
            }

            if(event.altKey){
                // カメラ移動ドラッグ開始
                this.is_Camera_Height_Move = true;
                this.mouse_Right_Move_Pos[0] = event.clientX;
                this.mouse_Right_Move_Pos[1] = event.clientY;
                this.mouse_Right_Move_Pos_Old[0] = event.clientX;
                this.mouse_Right_Move_Pos_Old[1] = event.clientY;
            }

            if (event.shiftKey == false & event.altKey == false) {
                // クリックされた
                this.is_Mouse_Click = true;
                this.mouse_Click_Pos[0] = event.clientX;
                this.mouse_Click_Pos[1] = event.clientY;
            }            
        }
    }

    _onMouseMove(event) {
        if (this.is_Camera_Turn == true) {
            // カメラ回転ドラッグ中
            this.mouse_Move_Pos_Old[0] = this.mouse_Move_Pos[0];
            this.mouse_Move_Pos_Old[1] = this.mouse_Move_Pos[1];
            this.mouse_Move_Pos[0] = event.clientX;
            this.mouse_Move_Pos[1] = event.clientY;
        }

        if (this.is_Camera_Height_Move == true) {
            // カメラ移動ドラッグ中
            this.mouse_Right_Move_Pos_Old[0] = this.mouse_Right_Move_Pos[0];
            this.mouse_Right_Move_Pos_Old[1] = this.mouse_Right_Move_Pos[1];
            this.mouse_Right_Move_Pos[0] = event.clientX;
            this.mouse_Right_Move_Pos[1] = event.clientY;
        }
    }

    _onMouseUp(event) {
        if (event.button == 0 /* 左ボタン */) {
            // クリック、カメラ回転終了
            this.is_Mouse_Click = false;
            this.is_Camera_Turn = false;
            this.mouse_Click_Pos[0] = 0;
            this.mouse_Click_Pos[1] = 0;
            this.mouse_Move_Pos[0] = 0;
            this.mouse_Move_Pos[1] = 0;

            // カメラ移動終了
            this.is_Camera_Height_Move = false;
            this.mouse_Right_Move_Pos[0] = 0;
            this.mouse_Right_Move_Pos[1] = 0;
        }
    }

    _onBlur(event) {
        // フォーカスを失った
        this.is_Mouse_Click = false;
        this.is_Forward = false;
        this.is_Backward = false;
        this.is_Camera_Turn = false;
        this.is_Camera_Height_Move = false;
    }

    _onMouseScroll_Chrome(event) {
        // chromeのホイール移動量検出
        if (event.wheelDelta > 0) {
            this.is_Forward = true;
        }else{
            this.is_Backward = true;
        }
    }

    _onMouseScroll_FireFox(event) {
        // FireFoxのホイール移動量検出
        if (event.detail < 0) {
            this.is_Forward = true;
        }else{
            this.is_Backward = true;
        }
    }

    endFrame() {
        // フレーム終了時
        this.is_Forward = false;
        this.is_Backward = false;
    }

}