import mapray, { ImageProvider } from "@mapray/mapray-js";
import Module from "./Module";
import BingMapsImageProvider from "../BingMapsImageProvider";

import TOption, { TDomTool } from "../TOption";


const DEFAULT_IMAGE_PROVIDERS = TOption.keyValues<ImageProvider>([
    [ 'Standard',      new mapray.StandardImageProvider( "http://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 0, 18 )],
    [ 'Seamlessphoto', new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/", ".jpg", 256, 2, 18 )],
    [ 'Night',         new mapray.StandardImageProvider( "https://opentiles.mapray.com/xyz/night-satellite/", ".png", 256, 0, 8)],
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


export default class ImageProviderModule extends Module {

    private _toption;

    private _ui?: HTMLElement;


    constructor( option: ImageProviderModule.Option = {} ) {
        super( "Image Provider" );

        this._toption = TOption.create({
            "provider": option.providers ? {
                type: "select",
                keyValues: option.providers,
                value: option.providers[0].value,
            } : {
                type: "select",
                keyValues: DEFAULT_IMAGE_PROVIDERS,
                value: DEFAULT_IMAGE_PROVIDERS[0].value,
            },
            "clear cache": {
                type: "boolean",
                description: "Clear the cache when switching image",
                value: true,
            },
            "pole": {
                type: "boolean",
                description: "",
                value: true,
            },
            "north height": {
                type: "range",
                min: -100000,
                max: 100000,
                value: 0.0,
            },
            "south height": {
                type: "range",
                min: -100000,
                max: 100000,
                value: 0.0,
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
    }


    protected override async doLoadData(): Promise<void>
    {
        const toption = this._toption;
        toption.onChange( "provider", event => { this.updateProvider(); });

        toption.onChange("pole", event => { this.updatePole() });
        toption.onChange("north height", event => { this.updatePole() });
        toption.onChange("south height", event => { this.updatePole() });
        toption.onChange("north color", event => { this.updatePole() });
        toption.onChange("south color", event => { this.updatePole() });

        this.updateProvider();
        this.updatePole();
    }


    protected override async doUnloadData(): Promise<void>
    {
        // No effect
    }


    updateProvider(): void
    {
        const provider    = this._toption.get("provider");
        const clear_cache = this._toption.get("clear cache");
        this.debugViewer.viewer.setImageProvider( provider, clear_cache );
    }


    updatePole(): void
    {
        this.debugViewer.viewer.setPole(this._toption.get("pole") ? {
            north_height: this._toption.get("north height"),
            south_height: this._toption.get("south height"),
            north_color: this._toption.get("north color"),
            south_color: this._toption.get("south color"),
        } : undefined);
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const toption = this._toption;
        const ui = this._ui = super.getDebugUI();
        const paramPane = document.createElement("div");
        // paramPane.style.border = "solid 1px gray";
        // paramPane.style.borderRadius = "5px";
        paramPane.style.padding = "10px";
        paramPane.style.margin = "5px 0";

        const top = document.createElement("div");
        top.style.display = "flex";
        top.style.gap = "10px";
        top.appendChild(TDomTool.createSelectOption(toption.getProperty( "provider" )));
        top.appendChild(TDomTool.createCheckboxOption(toption.getProperty( "clear cache" )));
        paramPane.appendChild( top );

        paramPane.appendChild(TDomTool.createCheckboxOption(toption.getProperty( "pole" )));

        const pole_table = document.createElement("table");
        pole_table.style.width = "100%";
        pole_table.style.marginLeft = "10px";
        pole_table.appendChild(TDomTool.createSliderOption(toption.getProperty( "north height" ), { mode: "key-value-table-row" }));
        pole_table.appendChild(TDomTool.createSliderOption(toption.getProperty( "south height" ), { mode: "key-value-table-row" }));
        pole_table.appendChild(TDomTool.createColorOption(toption.getProperty( "north color" ), { mode: "key-value-table-row" }));
        pole_table.appendChild(TDomTool.createColorOption(toption.getProperty( "south color" ), { mode: "key-value-table-row" }));
        paramPane.appendChild( pole_table );
        toption.onChange( "pole", event => pole_table.style.opacity = event.value ? "1.0" : "0.2" )

        ui.appendChild( paramPane );

        return ui;
    }
}



namespace ImageProviderModule {

export interface Option {
    providers?: TOption.KeyValue<ImageProvider>[];
}

}
