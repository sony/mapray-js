import mapray from "@mapray/mapray-js";
import Module from "./Module";
import BingMapsImageProvider from "../BingMapsImageProvider";

import TOption, { TDomTool } from "../TOption";


const DEFAULT_IMAGE_PROVIDERS = TOption.keyValues<mapray.ImageProvider>([
    [ 'Standard',      new mapray.StandardImageProvider( { url: "http://cyberjapandata.gsi.go.jp/xyz/std/", min_level: 0, max_level: 18 } )],
    [ 'Seamlessphoto', new mapray.StandardImageProvider( { url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", format: "jpg", min_level: 2, max_level: 18 } )],
    [ 'Night',         new mapray.StandardImageProvider( { url: "https://opentiles.mapray.com/xyz/night-satellite/", min_level: 0, max_level: 8 } )],
]);

if ( process.env.BINGMAP_ACCESS_TOKEN ) {
    DEFAULT_IMAGE_PROVIDERS.push(TOption.keyValue(
        'Bingmaps',
        new BingMapsImageProvider({
                uriScheme: "https",
                maxLevel: 19,
                key: process.env.BINGMAP_ACCESS_TOKEN as string,
        })
    ));
}


const DEFAULT_LAYER_TYPE = TOption.keyValues<mapray.Layer.Type>([
    [ 'Image Layer',     mapray.Layer.Type.IMAGE   ],
    [ 'Contour Layer', mapray.Layer.Type.CONTOUR ],
]);



export default class LayerModule extends Module {

    private _option;

    private _ui?: HTMLElement;
    private _layer_table: HTMLElement;

    private _counter: number;


    constructor( option: LayerModule.Option = {} ) {
        super( "Layer" );

        this._layer_table = document.createElement("div");
        this._option = option;

        this._counter = 0;
    }


    protected override async doLoadData(): Promise<void>
    {
    }


    protected async doUnloadData(): Promise<void>
    {
    }


    async addLayer( type: mapray.Layer.Type ) {

        const toption = TOption.create({
            "visibility": {
                type: "boolean",
                description: "表示切り替え",
                value: true,
            },
            "opacity": {
                type: "range",
                description: "不透明度",
                min: 0.0,
                max: 1.0,
                value: 0.5,
            },
            "layer type": {
                type: "select",
                keyValues: DEFAULT_LAYER_TYPE,
                value: DEFAULT_LAYER_TYPE[0].value,
            },

            "interval": {
                type: "range",
                description: "間隔",
                min: 10.0,
                max: 1000.0,
                value: 100.0,
            },
            "width": {
                type: "range",
                description: "太さ",
                min: 1.0,
                max: 5.0,
                value: 1.0,
            },
            "color": {
                type: "color",
                value: [1.0, 1.0, 1.0, 1.0],
            },

            "provider": this._option.providers ? {
                type: "select",
                keyValues: this._option.providers,
                value: this._option.providers[0].value,
            } : {
                type: "select",
                keyValues: DEFAULT_IMAGE_PROVIDERS,
                value: DEFAULT_IMAGE_PROVIDERS[0].value,
            },
            "night": {
                type: "boolean",
                description: "",
                value: false,
            },
            "pole": {
                type: "boolean",
                description: "",
                value: true,
            },
            "north color": {
                type: "color",
                value: [1.0, 1.0, 1.0],
            },
            "south color": {
                type: "color",
                value: [1.0, 1.0, 1.0],
            },
        });

        const isMap = type === mapray.Layer.Type.IMAGE;
        // レイヤーを末尾に追加
        const layer = await this.debugViewer.addLayer( isMap ? {
            type: type,
            visibility: toption.get("visibility"),
            opacity: toption.get("opacity"),
            image_provider: toption.get("provider"),
            draw_type: toption.get("night") ? mapray.ImageLayer.DrawType.NIGHT:
                                              mapray.ImageLayer.DrawType.NORMAL,
            pole: {
                north_color: toption.get("north color"),
                south_color: toption.get("south color"),
            },
        } : {
            type: type,
            visibility: toption.get("visibility"),
            opacity: toption.get("opacity"),
            interval: toption.get("interval"),
            line_width: toption.get("width"),
            color: toption.get("color"),
        });

        const heading = document.createElement("div");
        heading.appendChild(TDomTool.createCheckboxOption(toption.getProperty( "visibility" ), { name: `Layer ${++this._counter}` }));

        const paramPane = document.createElement("div");
        paramPane.setAttribute("class", "top");
        paramPane.style.margin = "0 0 10px 20px";
        if ( layer instanceof mapray.ImageLayer ) {
            paramPane.appendChild(TDomTool.createSelectOption(toption.getProperty( "provider" )));
            toption.onChange("provider", event => { layer.setProvider( event.value ) });
        }
        else if ( layer instanceof mapray.ContourLayer ) {
            paramPane.appendChild(TDomTool.createSliderOption(toption.getProperty( "interval" ), { mode: "key-value-table-row" }));
            paramPane.appendChild(TDomTool.createSliderOption(toption.getProperty( "width" ), { mode: "key-value-table-row" }));
            paramPane.appendChild(TDomTool.createColorOption(toption.getProperty( "color" ), { mode: "key-value-table-row" }));
            toption.onChange("interval",   event => { layer.setInterval( event.value ) });
            toption.onChange("width", event => { layer.setLineWidth( event.value ) });
            toption.onChange("color", event => { layer.setColor( event.value ) });
        }
        paramPane.appendChild(TDomTool.createSliderOption(toption.getProperty( "opacity" ), { mode: "key-value-table-row" }));
        paramPane.appendChild(TDomTool.createButton("Delete", {
            onclick: async () => {
                for ( let i = 0; i < this.debugViewer.getLayerNum(); i++ ) {
                    if ( this.debugViewer.getLayer( i ) === layer ) this.debugViewer.removeLayer(i);
                }
                if ( heading.parentNode ) heading.parentNode.removeChild(heading);
            }
        }));
        toption.onChange("visibility", event => {
            layer.setVisibility( event.value );
            paramPane.style.opacity = event.value ? "1.0" : "0.2";
        });
        toption.onChange("opacity", event => { layer.setOpacity( event.value ) });

        heading.appendChild( paramPane );

        return heading;
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }


        const ui = this._ui = super.getDebugUI();

        const toption = TOption.create({
            "layer type": {
                type: "select",
                keyValues: DEFAULT_LAYER_TYPE,
                value: DEFAULT_LAYER_TYPE[0].value,
            },
        });

        // Register Handler for the properties
        const top = document.createElement("div");

        const layer_table = this._layer_table;
        top.appendChild( layer_table );
        const bottom_table = document.createElement("div");
        bottom_table.style.margin = layer_table.style.margin = "5px 0";
        bottom_table.appendChild(TDomTool.createSelectOption( toption.getProperty( "layer type" ) ));
        bottom_table.appendChild(TDomTool.createButton( "Add", {
            onclick: async () => {
                if ( this.debugViewer.getLayerNum() < 6 ) {
                    layer_table.appendChild( await this.addLayer( toption.get( "layer type" ) ) );
                }
            }
        }));
        bottom_table.appendChild(TDomTool.createButton( "Delete All", {
            onclick: async () => {
                this._counter = 0;
                while ( layer_table.firstChild ) {
                    this.debugViewer.removeLayer( this.debugViewer.getLayerNum()-1 );
                    layer_table.removeChild( layer_table.firstChild );
                }
            }
        }));
        top.appendChild( bottom_table );

        ui.appendChild( top );

        return ui;
    }

}



namespace LayerModule {



export interface Option {
    providers?: TOption.KeyValue<mapray.ImageProvider>[];
}



}
