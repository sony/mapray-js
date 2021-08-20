import mapray from "@mapray/mapray-js";
import { MaprayApi } from "../../../packages/mapray/dist/es/@type";

/**
 * @summary 操作コマンドの発行
 */
class Commander {

    private _rmode_chg: boolean;
    private _layer_up: boolean;
    private _layer_dn: boolean;
    private _gis_chg: boolean;
    private _bing_chg: boolean;
    private _capture: boolean;

    /**
     * @param viewer
     */
    constructor( viewer: mapray.Viewer )
    {
        var element = viewer.canvas_element;
        var    self = this;

        // イベント登録
        window.addEventListener(   "blur",      function( event ) { self._onBlur( event );      }, false );

        this._rmode_chg  = false;  // レンダリングモード切替
        this._layer_up   = false;  // Layer透明度アップ
        this._layer_dn   = false;  // Layer透明度ダウン
        this._gis_chg    = false;  // GIS情報のON/OFF
        this._bing_chg   = false;  // BingMap
        this._capture    = false;  // 画面キャプチャ
    }

    /**
     * @summary レンダリングモードは変更されたか？
     */
    isRenderModeChanged()
    {
        return this._rmode_chg;
    }

    /**
     * @summary フレーム終了処理
     */
    endFrame()
    {
        this._rmode_chg  = false;
        this._layer_up   = false;
        this._layer_dn   = false;
        this._gis_chg    = false;
        this._bing_chg   = false;
        this._capture    = false;
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

    isCapture()
    {
        return this._capture;
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

            case "b": case "B":
            this._bing_chg = true;
            break;

            case "p": case "P":
              this._capture = true;
            break;
        }
    }

    /**
     * @summary フォーカスを失った
     * @private
     */
    _onBlur( event: FocusEvent )
    {
        this._rmode_chg  = false;
        this._layer_up   = false;
        this._layer_dn   = false;
        this._gis_chg    = false;
        this._bing_chg   = false;
        this._capture    = false;
    }

}

export default Commander;
