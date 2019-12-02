import ContainerController from "./ContainerController"

/**
 * @summary 著作権表示の表示制御
 *
 * @class AttributionController
 * @extends {mapray.ContainerController}
 */
class AttributionController extends ContainerController
{
    /**
     * @summary コンストラクタ
     * @param {HTMLElement}                             container                       ルートコンテナ（Viewerクラスのcontainer_element）
     * @param {object}                                  options                         表示オプション
     * @param {boolean}                                 options.isVisible               表示・非表示
     * @param {ContainerController.ContainerPosition}   options.position                表示位置
     * @param {array}                                   options.attributions            著作権リスト
     * @param {string}                                  options.attributions.display    表示名
     * @param {string}                                  options.attributions.link       リンク
     * @memberof AttributionController
     */
    constructor( options )
    {
        super( options );

        this._position = ( options && options.position ) || ContainerController.ContainerPosition.BOTTOM_RIGHT;
        this._attributions = ( options && options.attributions ) || [AttributionController._default_attribution ];
    }

    /**
     * @summary 著作権表示の追加
     *
     * @param {object}  attribution            著作権表示オブジェクト
     * @param {string}  attribution.display    表示名
     * @param {string}  attribution.link       リンク
     * @memberof AttributionController
     */
    addAttribution( attribution )
    {
        this._attributions.push( attribution );

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }

    /**
     * @summary 著作権表示のリセット
     *
     * @memberof AttributionController
     */
    clearAttribution()
    {
        this._attributions = [];

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }


    /**
     * @summary リサイズイベント
     *
     * @memberof AttributionController
     */
    _sizeChanged()
    {
        if ( this._container )
        {
            var parent_container = this._container.parentElement;

            if ( parent_container.parentElement.clientWidth < ContainerController._compact_size )
            {
                this._container.classList.add( "mapray-attribution-compact" )
            }
            else
            {
                this._container.classList.remove( "mapray-attribution-compact" )
            }
        }
    }

    /**
     * @summary 追加コンテナの作成
     *
     * @memberof AttributionController
     */
    createContainer()
    {
        var name = "control-" + this._position.id;
        var parent_container = this._viewer_container.getElementsByClassName( name )[0];

        var main_container = document.createElement( "div" );
        main_container.classList.add( "control" );
        main_container.classList.add( "mapray-attribution" );

        var sub_container = document.createElement( "div" );
        sub_container.classList.add( "mapray-attribution-container" );

        for (var attribution of this._attributions )
        {
            if ( attribution.display )
            {
                var attribution_container = document.createElement( "a" );
                attribution_container.href = ( attribution.link ) || "";
                attribution_container.target = "_blank";
                var text = document.createTextNode( attribution.display )
                attribution_container.appendChild( text );

                sub_container.appendChild( attribution_container )
            }
        }

        main_container.appendChild(sub_container);
        this._container = main_container;

        parent_container.appendChild( this._container );

        this._sizeChanged();
    }

}

// クラス変数の定義
{
    AttributionController._default_attribution =
    {
        display: "国土地理院",
        link: "http://maps.gsi.go.jp/development/ichiran.html"
    };
}

export default AttributionController;
