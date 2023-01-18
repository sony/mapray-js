import Viewer from "./Viewer";



/**
 * 追加コンテナの表示制御
 *
 * @class ContainerController
 */
abstract class ContainerController {

    protected _visibility: boolean;

    protected _position: ContainerController.ContainerPosition;

    protected _container: HTMLElement;

    protected _is_compact: boolean;

    protected _viewer?: Viewer;


    /**
     * @param options   表示オプション
     */
    constructor( options: ContainerController.Option )
    {
        this._visibility = options.visibility ?? true;
        this._position = options.position ?? ContainerController.ContainerPosition.TOP_LEFT;

        this._is_compact = options.is_compact ?? false;

        this._container = document.createElement( "div" );
        this._container.classList.add( "control" );

        this._sizeChanged = this._sizeChanged.bind( this );
        window.addEventListener( "resize", this._sizeChanged, { passive: false } );
    }


    /**
     * 初期化処理
     *
     * この関数を実行することで画面に著作権コンテナが表示される。
     * @param viewer
     * @internal
     */
    init( viewer: Viewer ): void
    {
        this._viewer = viewer;

        this._updatePosition();
        this._updateVisibility();
        this._updateCompact();
    }


    /**
     * コンテナの表示・非表示の切り替え
     * @param visibility 真偽値 ( true で表示、false で非表示 )
     */
    setVisibility( visibility: boolean ): void
    {
        if ( this._visibility === visibility ) return;

        this._visibility = visibility;
        // 表示状態の更新
        this._updateVisibility();
    }


    /**
     * コンテナの表示状態を取得
     * @returns コンテナの表示状態 ( 真偽値 )
     */
    getVisibility(): boolean
    {
        return this._visibility;
    }


    /**
     * 表示位置の変更
     * @param position ContainerController.ContainerPosition で定義される値
     */
    setPosition( position: ContainerController.ContainerPosition ): void
    {
        if ( this._position === position ) return;

        this._position = position;
        // 表示状態の更新
        this._updatePosition();
    }


    private _updatePosition(): void
    {
        if ( !this._viewer ) return;

        const name = "control-" + this._position;
        const parent_container = this._viewer.container_element.getElementsByClassName( name )[0];
        parent_container.appendChild( this._container );
    }


    /**
     * コンテナの表示位置を取得
     * @returns ContainerController.ContainerPosition で定義されるコンテナの表示位置
     */
    getPositon(): ContainerController.ContainerPosition
    {
        return this._position;
    }


    /**
     * コンテナの表示設定を変更
     *
     * 画面横サイズが一定値より小さい場合はこれに関係なく、コンパクト表示となる。
     * @param compact コンテナをコンパクトにするかを決定する真偽値
     */
    setCompact( compact: boolean ): void
    {
        if ( this._is_compact === compact ) return;

        this._is_compact = compact;
        this._updateCompact();
    }


    /**
     * コンテナの表示設定を取得
     * @returns コンテナのコンパクト状態
     */
    getCompact(): boolean
    {
        return this._is_compact;
    }


    /**
     * コンパクト表示の変更処理
     *
     * ロゴコンテナが持つクラスを変更することでコンパクト表示を切り替え
     */
    private _updateCompact(): void
    {
        if ( !this._viewer ) return;

        const is_parent_container_small = this._viewer.container_element.clientWidth < ContainerController.COMPACT_SIZE;
        const compact_view = is_parent_container_small || this._is_compact;

        if ( compact_view ) {
            this._container.classList.add( "compact" );
        }
        else {
            this._container.classList.remove( "compact" );
        }
    }


    /** コンテナの表示設定を切り替え */
    private _updateVisibility(): void
    {
        this._container.style.display = this._visibility ?  "block" : "none";
    }


    /**
     * インスタンスの破棄
     * @internal
     */
    destroy(): void
    {
        window.removeEventListener( "resize", this._sizeChanged, { passive: false } as EventListenerOptions );

        const parent_container = this._container.parentElement;
        if ( parent_container ) {
            parent_container.removeChild( this._container );
        }
    }


    /**
     * リサイズイベント
     */
    protected _sizeChanged(): void
    {
        this._updateCompact();
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

    /** コンパクト状態 */
    is_compact?: boolean;
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



export const COMPACT_SIZE = 500;



} // namespace ContainerController



export default ContainerController;
