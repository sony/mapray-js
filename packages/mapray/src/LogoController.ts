import Viewer from "./Viewer";
import ContainerController from "./ContainerController"

import Dom from "./util/Dom";

import LOGO from "./resources/svg/mapray.svg";
import LOGO_MINI from "./resources/svg/mapray_small.svg";



/**
 * ロゴの表示制御
 */
class LogoController extends ContainerController {

    protected _sub_container: HTMLAnchorElement;


    /**
     * コンストラクタ
     * @param options   表示オプション
     */
    constructor( options: LogoController.Option = {} )
    {
        super( options );

        this._position = options.position ?? ContainerController.ContainerPosition.BOTTOM_LEFT;

        this._sub_container = document.createElement( "a" );
        this._sub_container.classList.add( "mapray-logo" );
        this._sub_container.setAttribute( "href", "https://mapray.com" );
        this._sub_container.setAttribute( "target", "_blank" );
        this._sub_container.setAttribute( "aria-label", "mapray" );

        this._container.appendChild( this._sub_container );
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
