/**
 * @summary 操作コマンドの発行
 */
class Commander {

    /**
     * @param {Inou.Viewer} viewer
     */
    constructor( viewer )
    {
        var    self = this;

        // イベント登録
        window.addEventListener(   "blur",      function( event ) { self._onBlur( event );      }, false );
     
        this._rmode_chg  = false;  // レンダリングモード切替
        this._gis_chg    = false;  // GIS情報のON/OFF
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
        this._gis_chg    = false;
    }

    /**
     * @summary GIS情報を表示するか
     */
    isGISModeChanged()
    {
        return this._gis_chg;
    }

    OnKeyDown( event )
    {
        switch ( event.key ) {
            case "m": case "M":
            this._rmode_chg = true;
            break;

            case "g": case "G":
            this._gis_chg = true;
            break;

            case "b": case "B":
            this._bing_chg = true;
            break;
        }
    }

    /**
     * @summary フォーカスを失った
     * @private
     */
    _onBlur( event )
    {
        this._rmode_chg  = false;
        this._gis_chg    = false;
    }

}

export default Commander;
