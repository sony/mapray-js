import mapray, { Viewer } from "@mapray/mapray-js";

import DebugViewer from "../DebugViewer";
import Module from "./Module";
import Option, { DomTool } from "../Option";



const OPTION_PROPERTIES = [

    // Sun
    {
        key: "sun",
        type: "boolean",
        description: "太陽表示",
        value: true,
    },
    {
        key: "move sun",
        type: "boolean",
        description: "太陽移動",
        value: true,
    },
    {
        key: "sun speed",
        type: "range",
        description: "太陽の速度",
        min: 0,
        max: 100,
        value: 1.0,
    },
    {
        key: "sun radius",
        type: "range",
        description: "太陽の径",
        min: 0.1,
        max: 5.0,
        value: 1.0,
    },
    {
        key: "sun intensity",
        type: "range",
        description: "太陽の強度",
        min: 0.5,
        max: 2.0,
        value: 1.0,
    },

    // Moon
    {
        key: "moon",
        type: "boolean",
        description: "月表示",
        value: true,
    },
    {
        key: "move moon",
        type: "boolean",
        description: "月移動",
        value: true,
    },
    {
        key: "moon speed",
        type: "range",
        description: "月の速度",
        min: 0,
        max: 100,
        value: 1.0,
    },
    {
        key: "moon radius",
        type: "range",
        description: "月の径",
        min: 0.1,
        max: 5.0,
        value: 1.0,
    },

    // Star
    {
        key: "star",
        type: "boolean",
        description: "恒星表示",
        value: true,
    },
    {
        key: "move star",
        type: "boolean",
        description: "恒星移動",
        value: true,
    },
    {
        key: "star speed",
        type: "range",
        description: "恒星の速度",
        min: 0,
        max: 100,
        value: 1.0,
    },
    {
        key: "star mask",
        type: "boolean",
        description: "　昼間の大気中星表現",
        value: true,
    },
    {
        key: "star intensity",
        type: "range",
        description: "恒星の強度",
        min: -3.0,
        max: 1,
        value: -2.0,
    },

    // Constellation
    {
        key: "constellation",
        type: "boolean",
        description: "星座線表示",
        value: true,
    },
    {
        key: "constellation intensity",
        type: "range",
        description: "星座の強度",
        min: 0,
        max: 2,
        value: 0.2,
    },

    // Milkyway
    {
        key: "milkyway",
        type: "boolean",
        description: "天の川表示",
        value: true,
    },
    {
        key: "milkyway intensity",
        type: "range",
        description: "天の川の強度",
        min: 0,
        max: 1,
        value: 0.2,
    },

    // Atmosphere parameters
    {
        key: "sky",
        type: "boolean",
        description: "大気圏表示",
        value: true,
    },
    {
        key: "ground",
        type: "boolean",
        description: "地表大気表示",
        value: true,
    },
    {
        key: "kr",
        type: "range",
        description: "Rayleigh",
        min: 0.0025,
        max: 0.015,
        value: 0.01,
    },
    {
        key: "km",
        type: "range",
        description: "Mie",
        min: 0.0001,
        max: 0.01,
        value: 0.001,
    },
    {
        key: "scale depth",
        type: "range",
        description: "ScaleDepth",
        min: 0.08,
        max: 0.25,
        value: 0.13,
    },
    {
        key: "eSun",
        type: "range",
        description: "eSun",
        min: 10.0,
        max: 25.0,
        value: 17.5,
    },
    {
        key: "exposure",
        type: "range",
        description: "Exposure",
        min: -3.0,
        max: -0.4,
        value: -1.4,
    },
    {
        key: "g_kr",
        type: "range",
        description: "Rayleigh",
        min: 0.0025,
        max: 0.015,
        value: 0.0025,
    },
    {
        key: "g_km",
        type: "range",
        description: "Mie",
        min: 0.0001,
        max: 0.01,
        value: 0.001,
    },
    {
        key: "g_scale depth",
        type: "range",
        description: "ScaleDepth",
        min: 0.08,
        max: 0.25,
        value: 0.25,
    },
    {
        key: "g_eSun",
        type: "range",
        description: "eSun",
        min: 10.0,
        max: 25.0,
        value: 16.0,
    },
    {
        key: "g_exposure",
        type: "range",
        description: "Exposure",
        min: -3.0,
        max: -0.4,
        value: -2.0,
    },

    // Night Layer
    {
        key: "night layer",
        type: "boolean",
        description: "夜間レイヤー",
        value: true,
    },
];



export default class AtmosphereModule extends Module {

    private _option: Option;

    private _sun_elapsed_time: number;
    private _moveSun: boolean;
    private _sunSpeed: number;

    private _moon_elapsed_time: number;
    private _moveMoon: boolean;
    private _moonSpeed: number;

    private _star_elapsed_time: number;
    private _moveStar: boolean;
    private _starSpeed: number;

    private _constellationIntensity: number;

    private _ui?: HTMLElement;


    constructor() {
        super( "Atmosphere and Stars" );

        this._sun_elapsed_time = 0;

        this._moveSun = true;
        this._sunSpeed = 30;

        this._moon_elapsed_time = 0;
        this._moveMoon = true;
        this._moonSpeed = 10;

        this._star_elapsed_time = 0;
        this._moveStar = true;
        this._starSpeed = 1;

        this._constellationIntensity = 1;

        this._option = new Option( OPTION_PROPERTIES );
    }


    override async init( debugViewer: DebugViewer ): Promise<void>
    {
        await super.init( debugViewer );
        this._setupInitialValue();
    }


    override async destroy(): Promise<void>
    {
        await super.destroy();
    }


    /**
     * update sun, moon, star
     * @param delta_time
     */
    updateFrame( delta_time: number ): void
    {
        if ( this._moveSun ) {
            this._sun_elapsed_time += delta_time * this._sunSpeed;
            const theta = - Math.PI / 180.0 * ( this._sun_elapsed_time + 180.0 );
            const x = Math.cos(theta);
            const y = Math.sin(theta);
            this.debugViewer.viewer.sun.setSunDirection( [ x, y, 0 ] );
          }

          if ( this._moveMoon ) {
            this._moon_elapsed_time += delta_time * this._moonSpeed;
            const theta = - Math.PI / 180.0 * this._moon_elapsed_time;
            const x = Math.cos(theta);
            const y = Math.sin(theta);
            this.debugViewer.viewer.moon.setMoonDirection( [ x, y, 0 ] );
          }

          if ( this._moveStar ) {
              if ( this.debugViewer.viewer.starVisualizer ) {
                  this._star_elapsed_time += delta_time * this._starSpeed;
                  this.debugViewer.viewer.starVisualizer.setLongitude( -this._star_elapsed_time );
              }
          }
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
        const viewer = this.debugViewer.viewer;
        const option = this._option;

        const top = document.createElement("div");
        top.setAttribute("class", "top");
        ui.appendChild(top);

        top.appendChild(document.createTextNode( "Visiblity" ));
        ui.appendChild(top);

        const top_visible = document.createElement("div");
        top_visible.setAttribute("class", "top");
        ui.appendChild(top_visible);
        top_visible.appendChild(DomTool.createCheckboxOption(option, "sun"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "moon"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "sky"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "ground"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "star"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "constellation"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "milkyway"));
        top_visible.appendChild(DomTool.createCheckboxOption(option, "night layer"));

        const top_stars = document.createElement("div");
        top_stars.setAttribute("class", "top");
        top_stars.appendChild(document.createElement("HR"));
        ui.appendChild(top_stars);

        top_stars.appendChild(DomTool.createCheckboxOption(option, "move sun"));
        const table1 = document.createElement("table");
        table1.appendChild(DomTool.createSliderOption(option, "sun speed", { mode: "key-value-table-row" }));
        table1.appendChild(DomTool.createSliderOption(option, "sun radius", { mode: "key-value-table-row" }));
        table1.appendChild(DomTool.createSliderOption(option, "sun intensity", { mode: "key-value-table-row" }));
        table1.style.width = "100%";
        top_stars.appendChild(table1);

        top_stars.appendChild(DomTool.createCheckboxOption(option, "move moon"));
        const table2 = document.createElement("table");
        table2.appendChild(DomTool.createSliderOption(option, "moon speed", { mode: "key-value-table-row" }));
        table2.appendChild(DomTool.createSliderOption(option, "moon radius", { mode: "key-value-table-row" }));
        table2.style.width = "100%";
        top_stars.appendChild(table2);

        top_stars.appendChild(DomTool.createCheckboxOption(option, "move star"));
        top_stars.appendChild(DomTool.createCheckboxOption(option, "star mask"));
        const table3 = document.createElement("table");
        table3.appendChild(DomTool.createSliderOption(option, "star speed", { mode: "key-value-table-row" }));
        table3.appendChild(DomTool.createSliderOption(option, "star intensity", { mode: "key-value-table-row" }));
        table3.appendChild(DomTool.createSliderOption(option, "constellation intensity", { mode: "key-value-table-row" }));
        table3.appendChild(DomTool.createSliderOption(option, "milkyway intensity", { mode: "key-value-table-row" }));
        table3.style.width = "100%";
        top_stars.appendChild(table3);

        const atmosphere_params = document.createElement("div");
        atmosphere_params.setAttribute("class", "top");
        atmosphere_params.appendChild(document.createElement("HR"));
        atmosphere_params.appendChild(document.createTextNode( "Atmosphere Params" ));
        ui.appendChild(atmosphere_params);

        const atmosphere_table = document.createElement("table");
        atmosphere_table.setAttribute("class", "top");
        atmosphere_table.style.width = "100%";
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "kr", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "km", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "scale depth", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "eSun", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "exposure", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "g_kr", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "g_km", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "g_scale depth", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "g_eSun", { mode: "key-value-table-row" }));
        atmosphere_table.appendChild(DomTool.createSliderOption(option, "g_exposure", { mode: "key-value-table-row" }));
        atmosphere_params.appendChild(atmosphere_table);

        option.onChange("move sun", event => {
            this._moveSun = event.value;
        });
        option.onChange("sun speed", event => {
            this._sunSpeed = event.value;
        });
        option.onChange("sun radius", event => {
            if ( viewer.sunVisualizer ) {
                viewer.sunVisualizer.setRadius( event.value );
            }
        });
        option.onChange("sun intensity", event => {
            if ( viewer.sunVisualizer ) {
                viewer.sunVisualizer.setIntensity( event.value );
            }
        });

        option.onChange("move moon", event => {
            this._moveMoon = event.value;
        });
        option.onChange("moon speed", event => {
            this._moonSpeed = event.value;
        });

        option.onChange("moon radius", event => {
            if ( viewer.moonVisualizer ) {
                viewer.moonVisualizer.setRadius( event.value );
            }
        });

        option.onChange("move star", event => {
            this._moveStar = event.value;
        });
        option.onChange("star speed", event => {
            this._starSpeed = event.value;
        });
        option.onChange("star intensity", event => {
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setIntensity( event.value );
            }
        });
        option.onChange("constellation intensity", event => {
            this._constellationIntensity = event.value;
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setLineColor(
                    mapray.GeoMath.createVector3([
                    0.3 * this._constellationIntensity,
                    0.5 * this._constellationIntensity,
                    1.0 * this._constellationIntensity
                ]) );
            }
        });
        option.onChange("milkyway intensity", event => {
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setMilkyWayIntensity( event.value );
            }
        });

        option.onChange("night layer", event => {
          if (viewer.layers && viewer.layers.getLayer(0)) {
              viewer.layers.getLayer(0).setOpacity(event.value);
          }
        });

        option.onChange("sun", event => {
            if ( viewer.sunVisualizer ) {
                viewer.sunVisualizer.setVisibility( event.value );
            }
        });

        option.onChange("moon", event => {
            if ( viewer.moonVisualizer ) {
                viewer.moonVisualizer.setVisibility( event.value );
            }
        });

        option.onChange("sky", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setSkyVisibility( event.value );
            }
        });

        option.onChange("ground", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundVisibility( event.value );
            }
        });

        option.onChange("star mask", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setStarMask( event.value );
            }
        });

        option.onChange("star", event => {
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setVisibility( event.value );
            }
        });

        option.onChange("constellation", event => {
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setConstellationVisibility( event.value );
            }
        });

        option.onChange("milkyway", event => {
            if ( viewer.starVisualizer ) {
                viewer.starVisualizer.setMilkyWayVisibility( event.value );
            }
        });

        option.onChange("kr", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setRayleigh( event.value );
            }
        });
        option.onChange("km", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setMie( event.value );
            }
        });
        option.onChange("scale depth", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setScaleDepth( event.value );
            }
        });
        option.onChange("eSun", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setSunRate( event.value );
            }
        });
        option.onChange("exposure", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setExposure( event.value );
            }
        });

        option.onChange("g_kr", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundRayleigh( event.value );
            }
        });
        option.onChange("g_km", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundMie( event.value );
            }
        });
        option.onChange("g_scale depth", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundScaleDepth( event.value );
            }
        });
        option.onChange("g_eSun", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundSunRate( event.value );
            }
        });
        option.onChange("g_exposure", event => {
            if ( viewer.atmosphere ) {
                viewer.atmosphere.setGroundExposure( event.value );
            }
        });

        return ui;
    }


    private _setupInitialValue() {
         if ( !this._option ) {
             return;
         }

        const viewer = this.debugViewer.viewer;
        const option = this._option;

        // atmosphere
        if ( viewer.atmosphere ) {
            //// atmosphere sky
            viewer.atmosphere.setSkyVisibility( option.get("sky") );
            viewer.atmosphere.setRayleigh( option.get("kr") );
            viewer.atmosphere.setMie( option.get("km") );
            viewer.atmosphere.setScaleDepth( option.get("scale depth") );
            viewer.atmosphere.setSunRate( option.get("eSun") );
            viewer.atmosphere.setExposure( option.get("exposure") );
            viewer.atmosphere.setStarMask( option.get("star mask") );

            //// atmosphere ground
            viewer.atmosphere.setGroundVisibility( option.get("ground") );
            viewer.atmosphere.setGroundRayleigh( option.get("g_kr") );
            viewer.atmosphere.setGroundMie( option.get("g_km") );
            viewer.atmosphere.setGroundScaleDepth( option.get("g_scale depth") );
            viewer.atmosphere.setGroundSunRate( option.get("g_eSun") );
            viewer.atmosphere.setGroundExposure( option.get("g_exposure") );
        }

        // sun
        if ( viewer.sunVisualizer ) {
            viewer.sunVisualizer.setVisibility( option.get("sun") );
            this._moveSun = option.get("move sun");
            this._sunSpeed = option.get("sun speed");
            viewer.sunVisualizer.setRadius( option.get("sun radius") );
            viewer.sunVisualizer.setIntensity( option.get("sun intensity") );
        }

        // moon
        if ( viewer.moonVisualizer ) {
            viewer.moonVisualizer.setVisibility( option.get("moon") );
            this._moveMoon = option.get("move moon");
            this._moonSpeed = option.get("moon speed");
            viewer.moonVisualizer.setRadius( option.get("moon radius") );
        }

        // star
        if ( viewer.starVisualizer ) {
            viewer.starVisualizer.setVisibility( option.get("star") );
            this._moveStar = option.get("move star");
            this._starSpeed = option.get("star speed");
            viewer.starVisualizer.setIntensity( option.get("star intensity") );

            //// constellation
            viewer.starVisualizer.setConstellationVisibility( option.get("constellation") );
            this._constellationIntensity = option.get("constellation intensity");
            viewer.starVisualizer.setLineColor(
                mapray.GeoMath.createVector3([
                0.3 * this._constellationIntensity,
                0.5 * this._constellationIntensity,
                1.0 * this._constellationIntensity
            ]) );

            // milkyway
            viewer.starVisualizer.setMilkyWayVisibility( option.get("milkyway") );
            viewer.starVisualizer.setMilkyWayIntensity( option.get("milkyway intensity") );
        }

        // night layer
        if ( viewer.layers && viewer.layers.getLayer(0) ) {
            viewer.layers.getLayer(0).setOpacity( option.get("night layer") );
        }
    }
}
