/**
 * @summary 追加コンテナの表示制御
 *
 * @class ContainerController
 */
class ContainerController
{
    /**
     * @summary コンストラクタ
     * @param {HTMLElement}                         container           ルートコンテナ（Viewerクラスのcontainer_element）
     * @param {object}                              options             表示オプション
     * @param {boolean}                             options.visibility  表示・非表示
     * @param {ContainerPosition}                   options.position    表示位置
     * @memberof ContainerController
     */
    constructor( container, options )
    {
        this._visibility = ( options && options.visibility ) || true;
        this._position = ( options && options.position ) || ContainerPosition.TOP_LEFT;
        this._viewer_container = container;
        this._container = null;
        this._is_compact = false;

        var self = this;
        window.addEventListener("resize", function() { self._sizeChanged(); }, false);
    }

    /**
     * @summary 表示・非表示の設定
     *
     * @param {boolean} visibility
     * @memberof ContainerController
     */
    setVisibility( visibility )
    {
        this._visibility = visibility;

        // 表示状態の更新
        this._setContainerVisibility();
    }

    /**
     * @summary 表示位置
     *
     * @param {ContainerPosition}   position
     * @memberof ContainerController
     */
    setPosition( position )
    {
        this._position = position;

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }

    /**
     * @summary コンテナの表示設定
     *
     * @memberof ContainerController
     */
    _setContainerVisibility()
    {
        if(this._container)
        {
            ( this._visibility ) ? this._container.style.visibility = "visible" : this._container.style.visibility = "collapse"
        }
    }

    /**
     * @summary インスタンスの破棄
     *
     * @memberof ContainerController
     */
    _destroy()
    {
        var self = this;
        window.removeEventListener( "resize", function () { self._sizeChanged(); }, false );

        this._deleteContainer();
    }

    /**
     * @summary 追加コンテナの削除
     *
     * @memberof ContainerController
     */
    _deleteContainer()
    {
        var parent_container = this._container.parentElement;
        parent_container.removeChild( this._container );
        this._container = null;
    }

    /**
     * @summary リサイズイベント
     *
     * @memberof ContainerController
     * @abstract
     */
    _sizeChanged()
    {

    }

    /**
     * @summary 追加コンテナの作成
     *
     * @memberof ContainerController
     * @abstract
     */
    createContainer()
    {
    }
}

/**
 * @summary ロゴ・著作権表示位置の列挙型
 * @enum {object}
 * @memberof ContainerController
 * @constant
 */
var ContainerPosition = {
    /** 
     * 左上
     */
    TOP_LEFT: { id: "top-left" },

    /** 
     * 右上 
     */
    TOP_RIGHT: { id: "top-right" },

    /**
     * 左下
     */
    BOTTOM_LEFT: { id: "bottom-left" },

    /**
     * 右下
     */
    BOTTOM_RIGHT: { id: "bottom-right" }
};

{
    ContainerController._compact_size = 500;

    ContainerController.ContainerPosition = ContainerPosition;
}

export default ContainerController;
