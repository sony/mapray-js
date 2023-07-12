import ContainerController from "./ContainerController"

import Dom from "./util/Dom";

import LOGO from "./resources/svg/mapray.svg";
import LOGO_MINI from "./resources/svg/mapray_small.svg";



/**
 * ロゴの表示制御
 */
class LogoController extends ContainerController {

    /**
     * コンストラクタ
     * @param container ルートコンテナ（Viewerクラスのcontainer_element）
     * @param options   表示オプション
     */
    constructor( container: HTMLElement | string, options: LogoController.Option = {} )
    {
        super( container, options );
        
        this._position = options.position ?? ContainerController.ContainerPosition.BOTTOM_LEFT;
    }


    /**
     * リサイズイベント
     */
    protected _sizeChanged(): void
    {
        if (this._container) {
            var sub_container = this._container.children[0];
            var parent_container = this._container.parentElement;
            
            if ( parent_container!.parentElement!.clientWidth < ContainerController._compact_size) {
                sub_container.classList.add( "mapray-logo-compact" )
            }
            else {
                sub_container.classList.remove( "mapray-logo-compact" )
            }
        }
    }


    /**
     * コンテナの作成
     */
    override createContainer(): void
    {
        const name = "control-" + this._position;
        const parent_container = this._viewer_container.getElementsByClassName( name )[0];

        const main_container = document.createElement( "div" );
        main_container.className = "control";

        const sub_container = document.createElement( "a" );
        sub_container.className = "mapray-logo";
        sub_container.href = "https://mapray.com";
        sub_container.target = "_blank";
        sub_container.setAttribute( "aria-label", "mapray" );

        main_container.appendChild( sub_container );
        this._container = main_container;

        parent_container.appendChild( this._container );
        this._sizeChanged();
    }


    async getLogoImage( option: { mini: boolean } ): Promise<HTMLImageElement>
    {
        if ( option.mini ) {
            if ( !LOGO_MINI_IMAGE ) {
                LOGO_MINI_IMAGE = await Dom.loadImage( Dom.convertSVGToDataURL( LOGO_MINI ) );
            }
            return LOGO_MINI_IMAGE;
        }
        else {
            if ( !LOGO_IMAGE ) {
                LOGO_IMAGE = await Dom.loadImage( Dom.convertSVGToDataURL( LOGO ) );
            }
            return LOGO_IMAGE;
        }
    }
}



let LOGO_IMAGE: HTMLImageElement;
let LOGO_MINI_IMAGE: HTMLImageElement;



namespace LogoController {



export interface Option extends ContainerController.Option {
}



} // namespace LogoController




export default LogoController;
