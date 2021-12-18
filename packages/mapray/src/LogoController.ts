import ContainerController from "./ContainerController"



/**
 * ロゴの表示制御
 */
class LogoController extends ContainerController
{

    /**
     * コンストラクタ
     * @param container ルートコンテナ（Viewerクラスのcontainer_element）
     * @param options   表示オプション
     */
    constructor( container: HTMLElement | string, options: LogoController.Option = {} )
    {
        super( container, options );
        
        this._position = options.position || ContainerController.ContainerPosition.BOTTOM_LEFT;
    }


    /**
     * リサイズイベント
     */
    protected _sizeChanged(): void
    {
        if (this._container)
        {
            var sub_container = this._container.children[0];
            var parent_container = this._container.parentElement;
            
            if ( parent_container!.parentElement!.clientWidth < ContainerController._compact_size)
            {
                sub_container.classList.add( "mapray-logo-compact" )
            }
            else
            {
                sub_container.classList.remove( "mapray-logo-compact" )
            }
        }
    }


    /**
     * 追加コンテナの作成
     */
    createContainer(): void
    {
        var name = "control-" + this._position;
        var parent_container = this._viewer_container.getElementsByClassName( name )[0];

        var main_container = document.createElement( "div" );
        main_container.className = "control";

        var sub_container = document.createElement( "a" );
        sub_container.className = "mapray-logo";
        sub_container.href = "https://mapray.com";
        sub_container.target = "_blank";

        main_container.appendChild( sub_container );
        this._container = main_container;

        parent_container.appendChild( this._container );

        this._sizeChanged();
    }

}



namespace LogoController {



export interface Option extends ContainerController.Option {
}



} // namespace LogoController




export default LogoController;
