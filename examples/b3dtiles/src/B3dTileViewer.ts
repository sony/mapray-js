import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import Option, { DomTool } from "./Option";


const MAPRAY_ACCESS_TOKEN = "<your access token here>";

// Attirbute
const GSI_ATTRIBUTE = "国土地理院";

const targetPos = new mapray.GeoPoint(137.7238014361, 34.7111256306);

const RENDER_OPTION_PROPERTIES = [
    {
        key: "test",
        type: "select",
        description: "テスト",
        options: [
            "item1", "item2", "item3",
        ],
        value: "item1",
    },
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



class B3DTileViewer extends maprayui.StandardUIViewer {

    private _container: HTMLElement | string;

    private _init_camera: mapray.GeoPointData;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _lookat_position: mapray.GeoPointData;

    private _isChangedGIS: boolean;

    private _layerUpParameter: number;

    private _isGIS: boolean;

    private _layer_transparency: number;

    private _mode?: string;

    private _cache: {
        mode?: string;
        scenes?: mapray.B3dScene[];
        ui?: HTMLElement;
    };


    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement )
    {
        super( container, MAPRAY_ACCESS_TOKEN, {
            debug_stats: new mapray.DebugStats()
          }
        );

        this._container = container;

        this._init_camera = {
            latitude: targetPos.latitude,
            longitude: targetPos.longitude,
            height: targetPos.altitude + 1000000,
        };

        this._init_camera_parameter = {
            fov: 46.0,
        };

        this._lookat_position = {
            latitude: targetPos.latitude,
            longitude: targetPos.longitude,
            height: targetPos.altitude
        };

        // カメラ位置
        this.setCameraPosition( this._init_camera );

        // 注視点
        this.setLookAtPosition( this._lookat_position );

        // カメラパラメータ
        this.setCameraParameter( this._init_camera_parameter );

        // コンテンツ制御
        this._isChangedGIS = false;
        this._layerUpParameter = 0;

        // DEMOコンテンツ
        this._isGIS = false;
        this._layer_transparency = 10; //layer

        this._mode = undefined;
        this._cache = {
        };
    }

    /**
     * Viewerを閉じる
     */
    _closeViewer()
    {
        this.destroy();
        this._isGIS = false;
        this._layer_transparency = 10;
    }

    /**
     * GIS情報の表示
     */
    async _loadGISInfo()
    {
        var pin = new mapray.PinEntity( this.viewer.scene );
        pin.addMakiIconPin( "landmark-15", targetPos);
        this.addEntity(pin);

        const tools = document.getElementById("tools") || (()=>{
                const maprayContainer = document.getElementById("mapray-container");
                if ( !maprayContainer ) throw new Error("?");
                const tools = document.createElement("div");
                tools.setAttribute("id", "tools");
                maprayContainer.appendChild(tools);
                return tools;
        })();

        this._mode = "raw";
        this._updateScene();
    }

    /**
     * GIS情報の非表示
     */
    _clearGISInfo()
    {
        this.viewer.scene.clearEntities();
        this._mode = undefined;
        this._updateScene();
        const tools = document.getElementById("tools");
        if ( tools && tools.parentElement ) {
            tools.parentElement.removeChild( tools );
        }
    }

    onUpdateFrame( delta_time: number )
    {
        if (!this._viewer) {
            return;
        }
        super.onUpdateFrame( delta_time );
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
    }

    async _updateScene() {
        if (this._mode === this._cache.mode) {
            return;
        }

        if (this._cache.mode) {
            if (this._cache.scenes) {
                this._cache.scenes.forEach(scene => {
                        this.viewer.b3d_collection.removeScene( scene );
                });
            }
            delete this._cache.scenes;
            const ui = this._cache.ui
            if ( ui && ui.parentElement ) {
                ui.parentElement.removeChild(ui);
                delete this._cache.ui;
            }
            delete this._cache.mode;
        }

        if ( this._mode ) {
            const mode = this._mode;
            const tools = document.getElementById("tools");
            if ( !tools ) throw new Error("?");
            const ui = document.createElement("div");
            ui.setAttribute("class", "tool-item");
            tools.appendChild(ui);

            const top = document.createElement("div");
            top.setAttribute("class", "top");

            top.appendChild(document.createTextNode("B3dTile "));

            ui.appendChild(top);

            const renderOption = new Option( RENDER_OPTION_PROPERTIES );

            const top2 = document.createElement("div");
            top2.setAttribute("class", "top");
            // top2.appendChild(DomTool.createSelectOption(renderOption, "test"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "visibility"));

            const paramKV = document.createElement("table");
            paramKV.style.width = "100%";
            paramKV.appendChild(DomTool.createSliderOption(renderOption, "lod", { mode: "key-value-table-row" }));
            top2.appendChild(paramKV);

            ui.appendChild(top2);

            // Register Handler for the properties
            renderOption.onChange("test", event => {
                    console.log(event.value);
            });
            renderOption.onChange("visibility", event => {
                    this.viewer.setVisibility( mapray.Viewer.Category.B3D_SCENE, event.value );
            });
            renderOption.onChange("lod", event => {
                    this._cache?.scenes?.forEach(scene => {
                            scene.setLodFactor( event.value );
                    });
            });

            const log_area = document.createElement("pre");
            log_area.setAttribute("class", "log-area");
            ui.appendChild(log_area);

            //
            const urls = [
                "https://storage.googleapis.com/inou-dev-mapray-additional-resources/b3dtiles/tokyo_n_z/",
                "https://storage.googleapis.com/inou-dev-mapray-additional-resources/b3dtiles/tokyo_s_z/",
            ];
            const scenes = urls.map(url => {
                    const provider = new mapray.StandardB3dProvider(url, ".bin");
                    return this.viewer.b3d_collection.createScene( provider );
            });

            this._cache = {
                mode: this._mode,
                scenes: scenes,
                ui: ui,
            };
        }
    }
}

export default B3DTileViewer;
