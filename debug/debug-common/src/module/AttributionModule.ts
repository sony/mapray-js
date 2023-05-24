import mapray from "@mapray/mapray-js";

import DebugViewer from "../DebugViewer";
import Module from "./Module";
import TOption, { TDomTool } from "../TOption";



export default class AttributionModule extends Module {

    private _ui?: HTMLElement;

    private _toption;


    constructor() {
        super( "Attribution" );

        this._toption = TOption.create({
            "attribution-visibility": {
                type: "boolean",
                description: "Attributionの表示・非表示",
                value: true,
            },
            "attribution-position": {
                type: "select",
                description: "Attributionを表示する位置",
                values: [
                    mapray.LogoController.ContainerPosition.TOP_LEFT,
                    mapray.LogoController.ContainerPosition.TOP_RIGHT,
                    mapray.LogoController.ContainerPosition.BOTTOM_LEFT,
                    mapray.LogoController.ContainerPosition.BOTTOM_RIGHT,
                ],
                value: mapray.LogoController.ContainerPosition.BOTTOM_RIGHT,
            },
            "attribution-compact": {
                type: "boolean",
                value: false,
            },
            "attribution-text-color": {
                type: "color",
                value: [0, 0, 0],
            },
            "attribution-background-color": {
                type: "color",
                value: [1, 1, 1, 0.5],
            },
            "attribution-text": {
                type: "text",
                value: "<a href=\"https://mapray.com\">©︎2023 Mapray</a>",
            },

            "logo-visibility": {
                type: "boolean",
                description: "Logoの表示・非表示",
                value: true,
            },
            "logo-position": {
                type: "select",
                description: "Logoを表示する位置",
                values: [
                    mapray.LogoController.ContainerPosition.TOP_LEFT,
                    mapray.LogoController.ContainerPosition.TOP_RIGHT,
                    mapray.LogoController.ContainerPosition.BOTTOM_LEFT,
                    mapray.LogoController.ContainerPosition.BOTTOM_RIGHT,
                ],
                value: mapray.LogoController.ContainerPosition.BOTTOM_LEFT,
            },
            "logo-compact": {
                type: "boolean",
                value: false,
            },
        });

        this._toption.onChange("attribution-visibility", event => {
            this.debugViewer.viewer.attribution_controller.setVisibility( event.value );
        });
        this._toption.onChange("attribution-position", event => {
            this.debugViewer.viewer.attribution_controller.setPosition( event.value );
        });
        this._toption.onChange("attribution-compact", event => {
            this.debugViewer.viewer.attribution_controller.setCompact( event.value );
        });
        this._toption.onChange("attribution-text-color", event => {
            this.debugViewer.viewer.attribution_controller.setTextColor( event.value );
        });
        this._toption.onChange("attribution-background-color", event => {
            this.debugViewer.viewer.attribution_controller.setBackgroundColor( event.value );
        });

        this._toption.onChange("logo-visibility", event => {
            this.debugViewer.viewer.logo_controller.setVisibility( event.value );
        });
        this._toption.onChange("logo-position", event => {
            this.debugViewer.viewer.logo_controller.setPosition( event.value );
        });
        this._toption.onChange("logo-compact", event => {
            this.debugViewer.viewer.logo_controller.setCompact( event.value );
        });
    }


    clearAttribution(): void
    {
        this.debugViewer.viewer.attribution_controller.clearAttribution();
    }


    addTextAttribution(): void
    {
        const text = this._toption.get( "attribution-text" );
        this.debugViewer.viewer.attribution_controller.addAttribution([text]);
    }

    addImageAttribution(): void
    {
        this.debugViewer.viewer.attribution_controller.addAttribution([
            `<a href="https://mapray.com"><img style="vertical-align:middle" src="./data/mapray.svg" height="16"/></a>`
        ]);
    }


    async capture(): Promise<void>
    {
        const image = await this.debugViewer.viewer.capture({
            type: "png",
            attribution: {
                content: [
                    '<img src="./data/logo.png" width="160"/><img src="./data/logo.png" height="32"/>attribution sample<img src="./data/logo.png" width="80" height="32">',
                    '1234567890',
                    '<img src="./data/mapray.svg" width="160" height="32" />'
                ],
            },
        });
        const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image);
        });
        const link = document.createElement("a");
        link.download = "capture.png";
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const toption = this._toption;
        const ui = this._ui = super.getDebugUI();
        {
            const heading = document.createElement("div");
            heading.appendChild( TDomTool.createCheckboxOption( toption.getProperty( "attribution-visibility" ), { name: "Attribution" } ));
            ui.appendChild(heading);

            const top = document.createElement( "div" );
            top.setAttribute( "class", "top" );
            top.style.margin = "0 0 10px 20px";
            {
                const pane = document.createElement( "div" );
                pane.style.display = "flex";
                pane.appendChild( TDomTool.createSelectOption( toption.getProperty( "attribution-position" ) ));
                pane.appendChild( TDomTool.createCheckboxOption( toption.getProperty( "attribution-compact" ), { name: "Compact" }  ));
                top.appendChild(pane);
            }
            {
                const pane = document.createElement( "table" );
                pane.appendChild( TDomTool.createColorOption( toption.getProperty( "attribution-text-color" ), { mode: "key-value-table-row", name: "Text Color" } ));
                pane.appendChild( TDomTool.createColorOption( toption.getProperty( "attribution-background-color" ), { mode: "key-value-table-row", name: "Background Color" } ));
                top.appendChild( pane );
            }
            {
                const pane = document.createElement( "div" );
                const textPane = document.createElement( "div" );
                textPane.style.display = "flex";
                textPane.style.flexDirection = "row";
                const textArea = TDomTool.createTextOption( toption.getProperty( "attribution-text" ) );
                textArea.style.flexGrow = "3";
                textPane.appendChild( textArea );
                textPane.appendChild( TDomTool.createButton("Add Text", {
                    onclick: async (event) => {
                        this.addTextAttribution();
                    },
                }));
                pane.appendChild(textPane);

                pane.appendChild( TDomTool.createButton( "Add Image", {
                    onclick: async (event) => {
                        this.addImageAttribution();
                    },
                }));
                pane.appendChild( TDomTool.createButton( "Clear", {
                            onclick: async (event) => {
                                this.clearAttribution();
                            },
                }));
                top.appendChild(pane);
            }
            ui.appendChild(top);
        }
        {
            const heading = document.createElement("div");
            heading.appendChild( TDomTool.createCheckboxOption( toption.getProperty( "logo-visibility" ), { name: "Logo" }  ));
            ui.appendChild(heading);
            const top = document.createElement("div");
            top.setAttribute("class", "top");
            top.style.margin = "0 0 10px 20px";
            {
                const pane = document.createElement( "div" );
                pane.style.display = "flex";
                pane.appendChild( TDomTool.createSelectOption( toption.getProperty( "logo-position" ) ));
                pane.appendChild( TDomTool.createCheckboxOption( toption.getProperty( "logo-compact" ), { name: "Compact" }  ));
                top.appendChild(pane);
            }
            ui.appendChild(top);
        }
        {
            const top = document.createElement("div");
            top.appendChild(TDomTool.createButton("Capture", {
                onclick: async (event) => {
                    this.capture();
                },
            }));
            ui.appendChild(top);
        }
        return ui;
    }
}
