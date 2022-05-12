import mapray from "@mapray/mapray-js";

/**
 * 操作コマンドの発行
 */
class Commander {

    private _rmode_chg: boolean;
    private _layer_up: boolean;
    private _layer_dn: boolean;
    private _gis_chg: boolean;
    private _capture: boolean;
    private _start_point: boolean;
    private _end_point: boolean;
    private _rec_start: boolean;

    private _num_key: number;

    /**
     * @param viewer
     */
    constructor( viewer: mapray.Viewer )
    {
        const element = viewer.canvas_element;
        const    self = this;

        // イベント登録
        window.addEventListener(   "blur",      function( event ) { self._onBlur( event );      }, false );

        this._rmode_chg   = false;  // レンダリングモード切替
        this._layer_up    = false;  // Layer透明度アップ
        this._layer_dn    = false;  // Layer透明度ダウン
        this._gis_chg     = false;  // GIS情報のON/OFF
        this._capture     = false;  // 画面キャプチャ
        this._start_point = false;   // Record開始点
        this._end_point   = false;   // Record終了点
        this._rec_start   = false;   // Record
        this._num_key     = -1;  // 番号キー
    }

    /**
     * レンダリングモードは変更されたか？
     */
    isRenderModeChanged()
    {
        return this._rmode_chg;
    }

    protected clearValues() {
        this._rmode_chg  = false;
        this._layer_up   = false;
        this._layer_dn   = false;
        this._gis_chg    = false;
        this._capture    = false;
        this._start_point = false;
        this._end_point   = false;
        this._rec_start   = false;
        this._num_key     = -1;
    }

    /**
     * フレーム終了処理
     */
    endFrame()
    {
        this.clearValues();
    }

    /**
     * フォーカスを失った
     */
    private _onBlur( event: FocusEvent )
    {
        this.clearValues();
    }

    /**
     * Layer変化量を取得
     *  0: Layerなし
     *  1: layerイン
     */
    getLayer()
    {
        return (this._layer_up ? 1 : 0) + (this._layer_dn  ? -1 : 0);
    }

    /**
     * GIS情報を表示するか
     */
    isGISModeChanged()
    {
        return this._gis_chg;
    }

    isCapture()
    {
        return this._capture;
    }

    isStartPoint()
    {
        return this._start_point;
    }

    isEndPoint()
    {
        return this._end_point;
    }

    isRecStart()
    {
        return this._rec_start;
    }

    getNumKey()
    {
        return this._num_key;
    }

    OnKeyDown( event: KeyboardEvent )
    {
        switch ( event.key ) {
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

            case "p": case "P":
                this._capture = true;
                break;

            case "0": case "1": case "2": case "3": case "4": case "5": case "6": case "7": case "8": case "9":
                this._num_key = parseInt( event.key );
                break;

            case "s": case "S":
                this._start_point = true;
                break;

            case "e": case "E":
                this._end_point   = true;
                break;

            case "r": case "R":
                this._rec_start   = true;
                break;
        }
    }

}

export default Commander;
