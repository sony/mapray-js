/**
 * 追加コンテナの表示制御
 *
 * @class ContainerController
 */
class ContainerController
{
    protected _visibility: boolean;

    protected _position: ContainerController.ContainerPosition;

    protected _container?: HTMLElement;

    protected _viewer_container: HTMLElement;

    protected _is_compact: boolean;


    /**
     * @param container ルートコンテナ（Viewerクラスのcontainer_element）
     * @param options   表示オプション
     */
    constructor( container: HTMLElement | string, options: ContainerController.Option )
    {
        this._visibility = options.visibility !== undefined ? options.visibility : true;
        this._position = options.position || ContainerController.ContainerPosition.TOP_LEFT;

        var container_element;
        if ( typeof container === "string" ) {
            // コンテナを ID 指定したとき
            container_element = document.getElementById( container ) as HTMLElement;
        }
        else {
            // コンテナを直接要素で指定のとき
            container_element = container;
        }

        this._viewer_container = container_element;
        this._is_compact = false;

        var self = this;
        window.addEventListener("resize", function() { self._sizeChanged(); }, false);
    }

    /**
     * 表示・非表示の設定
     *
     * @param visibility
     */
    setVisibility( visibility: boolean ): void
    {
        this._visibility = visibility;

        // 表示状態の更新
        this._setContainerVisibility();
    }

    /**
     * 表示位置
     *
     * @param position
     */
    setPosition( position: ContainerController.ContainerPosition ): void
    {
        this._position = position;

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }

    /**
     * コンテナの表示設定
     */
    private _setContainerVisibility(): void
    {
        if (this._container)
        {
            ( this._visibility ) ? this._container.style.visibility = "visible" : this._container.style.visibility = "collapse"
        }
    }

    /**
     * インスタンスの破棄
     */
    private _destroy(): void
    {
        var self = this;
        window.removeEventListener( "resize", function () { self._sizeChanged(); }, false );

        this._deleteContainer();
    }

    /**
     * 追加コンテナの削除
     */
    protected _deleteContainer(): void
    {
        if ( this._container ) {
            var parent_container = this._container.parentElement;
            if ( parent_container ) {
                parent_container.removeChild( this._container );
            }
            this._container = undefined;
        }
    }

    /**
     * リサイズイベント
     */
    protected _sizeChanged(): void
    {
    }

    /**
     * 追加コンテナの作成
     */
    createContainer(): void
    {
    }
}



namespace ContainerController {


/**
 * オプション
 */
export interface Option {
    /** 表示・非表示 */
    visibility?: boolean;

    /** 表示位置 */
    position?: ContainerPosition;
}



/**
 * ロゴ・著作権表示位置の列挙型
 */
export enum ContainerPosition {
    /** 左上 */
    TOP_LEFT = "top-left",

    /** 右上 */
    TOP_RIGHT = "top-right",

    /** 左下 */
    BOTTOM_LEFT = "bottom-left",

    /** 右下 */
    BOTTOM_RIGHT = "bottom-right",
};



export const _compact_size = 500;



} // namespace ContainerController



export default ContainerController;
