import ContainerController from "./ContainerController"

/**
 * @summary ロゴの表示制御
 *
 * @class LogoController
 * @extends {mapray.ContainerController}
 */
class LogoController extends ContainerController
{
    /**
     * @summary コンストラクタ
     * @param {HTMLElement}                                 container           ルートコンテナ（Viewerクラスのcontainer_element）
     * @param {object}                                      options             表示オプション
     * @param {boolean}                                     options.visibility  表示・非表示
     * @param {ContainerController.ContainerPosition}       options.position    表示位置
     * @memberof LogoController
     */
    constructor( container, options = {} )
    {
        super( container, options );
        
        this._position = ( options.position ) || ContainerController.ContainerPosition.BOTTOM_LEFT;
    }

    /**
     * @summary リサイズイベント
     *
     * @memberof LogoController
     */
    _sizeChanged()
    {
        if (this._container)
        {
            var sub_container = this._container.children[0];
            var parent_container = this._container.parentElement;
            
            if ( parent_container.parentElement.clientWidth < ContainerController._compact_size)
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
     * @summary 追加コンテナの作成
     *
     * @memberof LogoController
     */
    createContainer()
    {
        var name = "control-" + this._position.id;
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

export default LogoController;
