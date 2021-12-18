import ContainerController from "./ContainerController"



/**
 * 著作権表示の表示制御
 */
class AttributionController extends ContainerController
{
    private _attributions: AttributionController.Attribution[];


    /**
     * コンストラクタ
     * @param container    ルートコンテナ（Viewerクラスのcontainer_element）
     * @param options      表示オプション
     */
    constructor( container: HTMLElement | string, options: AttributionController.Option = {} )
    {
        super( container, options );
        this._position = options.position || ContainerController.ContainerPosition.BOTTOM_RIGHT;
        this._attributions = [];
        if ( options && options.attributions ) {
            this._copyAttributions(options.attributions);
        } else {
            this._copyAttributions(AttributionController._default_attribution);
        }
    }


    /**
     * 著作権表示の追加
     *
     * @param attribution 著作権表示オブジェクト
     */
    addAttribution( attribution: AttributionController.Attribution ): void
    {
        this._attributions.push( attribution );

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }


    /**
     * 著作権表示のリセット
     */
    clearAttribution(): void
    {
        this._attributions = [];

        // コンテナの再作成
        this._deleteContainer();
        this.createContainer();
    }


    /**
     * リサイズイベント
     */
    protected _sizeChanged(): void
    {
        if ( this._container )
        {
            var parent_container = this._container.parentElement;

            if ( parent_container!.parentElement!.clientWidth < ContainerController._compact_size )
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
     * 追加コンテナの作成
     */
    createContainer(): void
    {
        var name = "control-" + this._position;
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
                if (attribution.link) {
                    attribution_container.href = ( attribution.link );
                    attribution_container.target = "_blank";
                }
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


    private _copyAttributions( src: AttributionController.Attribution[] ): void
    {
        this._attributions = src.map(d => d);
    }
}



namespace AttributionController {



export interface Option extends ContainerController.Option {
    /**
     * 著作権リスト
     */
    attributions?: Attribution[];
}



/**
 * 著作権情報
 */
export interface Attribution {
    /** 表示名 */
    display: string;

    /** リンク */
    link: string;
}



/**
 * デフォルト著作権情報
 */
export const _default_attribution: Attribution[] = [
    {
        display: "©Mapray",
        link: "https://mapray.com"
    },
    {
        display: "©JAXA",
        link: "http://www.jaxa.jp/"
    },
    {
        display: "測量法に基づく国土地理院長承認（複製）H30JHf626",
        link: "https://www.gsi.go.jp/kiban/index.html"
    }
];



} // namespace AttributionController



export default AttributionController;
