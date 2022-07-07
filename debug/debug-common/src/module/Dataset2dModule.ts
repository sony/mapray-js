import mapray from "@mapray/mapray-js";
import Module from "./Module";

import Option, { DomTool } from "../Option";



export default class Dataset2dModule extends Module {

    private _init_option: Dataset2dModule.Option;

    private _ui?: HTMLElement;
    private _ui_status?: HTMLElement;

    private readonly _entities: mapray.Entity[];


    constructor( option: Dataset2dModule.Option = {} ) {
        super( "2D Dataset" );
        this._init_option = option;
        this._entities = [];
    }


    protected override async doLoadData(): Promise<void>
    {
        if ( this._init_option.datasets ) {
            if ( this._ui_status ) {
                this._ui_status.innerText = "Loading...";
            }
            for ( const dataset of this._init_option.datasets ) {
                const entities = await this.debugViewer.addGeoJson( dataset );
                this._entities.push( ...entities )
            }
            if ( this._ui_status ) {
                this._ui_status.innerText = "Loaded";
            }
        }
    }


    protected async doUnloadData(): Promise<void>
    {
        if ( this._ui_status ) {
            this._ui_status.innerText = "Removing...";
        }
        for ( const entity of this._entities ) {
            this.debugViewer.removeEntity( entity );
        }
        this._entities.length = 0;
        if ( this._ui_status ) {
            this._ui_status.innerText = "Removed";
        }
    }


    protected onStatusChange( status: Module.Status ): void
    {
        super.onStatusChange( status );
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const ui = this._ui = super.getDebugUI();

        const option = new Option([
                {
                    key: "clamp",
                    type: "boolean",
                    description: "クランプ",
                    value: false,
                },
        ]);

        // Register Handler for the properties
        option.onChange("clamp", event => {
            if ( this._entities ) {
                this._entities.forEach( entity => {
                    if (event.value) {
                        entity.altitude_mode = mapray.AltitudeMode.CLAMP;
                    }
                    else {
                        entity.altitude_mode = mapray.AltitudeMode.ABSOLUTE;
                    }
                });
            }
        });

        const top2 = document.createElement("div");
        top2.setAttribute("class", "top");
        top2.appendChild( DomTool.createCheckboxOption(option, "clamp") );
        ui.appendChild( top2 );

        return ui;
    }

}



namespace Dataset2dModule {



export interface Option {
    datasets?: string[];
}



}
