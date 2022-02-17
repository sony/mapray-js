import mapray from "@mapray/mapray-js";
import Module from "./Module";

import Option, { DomTool } from "../Option";



export default class Dataset2dModule extends Module {

    private _init_option: Dataset2dModule.Option;

    private _ui?: HTMLElement;


    constructor( option: Dataset2dModule.Option = {} ) {
        super( "2D Dataset" );
        this._init_option = option;
    }


    protected override async doLoadData(): Promise<void>
    {
        if ( this._init_option.datasets ) {
            for ( const dataset of this._init_option.datasets ) {
                await this.debugViewer.addGeoJson( dataset );
            }
        }
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const ui = this._ui = super.getDebugUI();

        const Entity2D_RENDER_OPTION_PROPERTIES = [
            {
                key: "clamp",
                type: "boolean",
                description: "クランプ",
                value: false,
            },
        ];

        const option = new Option( Entity2D_RENDER_OPTION_PROPERTIES );

        const top2 = document.createElement("div");
        top2.setAttribute("class", "top");
        top2.appendChild( DomTool.createCheckboxOption(option, "clamp") );

        ui.appendChild( top2 );

        // Register Handler for the properties
        option.onChange("clamp", event => {
            if ( this.debugViewer.geoJsonList ) {
                this.debugViewer.geoJsonList.forEach( entity => {
                    if (event.value) {
                        entity.altitude_mode = mapray.AltitudeMode.CLAMP;
                    }
                    else {
                        entity.altitude_mode = mapray.AltitudeMode.ABSOLUTE;
                    }
                });
            }
        });

        return ui;
    }

}



namespace Dataset2dModule {



export interface Option {
    datasets?: string[];
}



}
