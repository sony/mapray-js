import mapray from "@mapray/mapray-js";

import DebugViewer from "../DebugViewer";
import Module from "./Module";
import Option, { DomTool } from "../Option";



const OPTION_PROPERTIES = [
    {
        key: "visibility",
        type: "boolean",
        description: "表示",
        value: true,
    },
    {
        key: "lod",
        type: "range",
        description: "表示詳細度: このパラメータの値は、小さいと表示の詳細度が高くなり、大きいと低くなる。",
        min: 0.5,
        max: 10.0,
        value: 2.0,
    },
];



export default class B3dTileModule extends Module {

    private _ui?: HTMLElement;

    private readonly _option: Option;

    private readonly _b3dscenes: mapray.B3dScene[];


    constructor() {
        super( "B3dTile" );

        this._option = new Option( OPTION_PROPERTIES );
        this._b3dscenes = [];
    }


    protected override async doLoadData(): Promise<void>
    {
        this.debugViewer.viewer.setVisibility( mapray.Viewer.Category.B3D_SCENE, this._option.get( "visibility" ) );
        const b3dscenes = this.debugViewer.addB3d([
            "https://opentiles.mapray.com/3dcity/tokyo_n/",
            "https://opentiles.mapray.com/3dcity/tokyo_s/",
        ]);
        this._b3dscenes.push( ...b3dscenes );
    }


    protected override async doUnloadData(): Promise<void>
    {
        this._b3dscenes.forEach( b3dscene => {
                this.debugViewer.viewer.b3d_collection.removeScene( b3dscene );
        });
        this._b3dscenes.length = 0;
    }


    /**
     * Default B3D Debug UI
     */
    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const ui = this._ui = super.getDebugUI();
        const scenes = this.debugViewer.b3dScene;
        const option = this._option;

        const top2 = document.createElement("div");
        top2.setAttribute("class", "top");
        top2.appendChild(DomTool.createCheckboxOption(option, "visibility"));

        const param_kv = document.createElement("table");
        param_kv.style.width = "100%";
        param_kv.appendChild(DomTool.createSliderOption(option, "lod", { mode: "key-value-table-row" }));
        top2.appendChild(param_kv);

        ui.appendChild(top2);

        // Register Handler for the properties
        option.onChange("visibility", event => {
                this.debugViewer.viewer.setVisibility( mapray.Viewer.Category.B3D_SCENE, event.value );
        });
        option.onChange("lod", event => {
                scenes?.forEach(scene => {
                        scene.setLodFactor( event.value );
                });
        });

        const log_area = document.createElement("pre");
        log_area.setAttribute("class", "log-area");
        ui.appendChild(log_area);

        return ui;
    }

}
