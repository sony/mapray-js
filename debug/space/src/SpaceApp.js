
import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import BingMapsImageProvider from "./BingMapsImageProvider"
import StatusBar from "./StatusBar";
import Commander from "./Commander";

import { snakeToCamel } from "./utils";
import Option, { DomTool } from "./Option";

const accessToken = "<your access token here>";

const NATS_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2FthreeDModel%2FNATS%2FNATS.json?alt=media&token=081ad161-ad70-449e-b279-c2ea2beb109b";
const NATS_MARKER_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoNATS.json?alt=media&token=ba0298fb-042a-4ae0-b0fd-3427b457cf8a";
const AED_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoAED.json?alt=media&token=04715b01-d890-4f18-b22f-aa831598ab39";
const MOUNTAIN_JSON_URL = "https://firebasestorage.googleapis.com/v0/b/ino-sandbox.appspot.com/o/inousample%2Fmarker%2FDemoMountain.json?alt=media&token=18b2b427-bac0-43ec-aace-8d34cdc30d07";

// Attirbute
const DEM_ATTRIBUTE = "この地図の作成に当たっては、国土地理院の承認を得て、同院発行の基盤地図情報を使用した。（承認番号　平30情使、 第626号）";
const BING_ATTRIBUTE = "© 2018 Microsoft Corporation, © 2018 DigitalGlobe, ©CNES (2018) Distribution Airbus DS, © 2018 SK telecom / NGII, Earthstar Geographics  SIO";
const GSI_ATTRIBUTE = "国土地理院";

const RENDER_OPTION_PROPERTIES = [
    {
        key: "move sun",
        type: "boolean",
        description: "太陽移動",
        value: true,
    },
    {
        key: "check1",
        type: "boolean",
        description: "チェックボックス1",
        value: false,
    },
    {
        key: "check2",
        type: "boolean",
        description: "チェックボックス2",
        value: false,
    },
    {
        key: "check3",
        type: "boolean",
        description: "チェックボックス3",
        value: false,
    },
    {
        key: "select1",
        type: "select",
        description: "セレクター",
        options: [
            "1px", "2px", "3px", "4px", "5px",
            "10mm", "20mm", "30mm", "40mm", "50mm", "100mm",
            "Flexible",
        ],
        value: "Flexible",
    },
];


class SpaceApp extends maprayui.StandardUIViewer {

    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container )
    {
        super( container, accessToken, {
            debug_stats: new mapray.DebugStats()
        }
        );

        this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.LayerType.NIGHT } );
        this._commander = new Commander( this._viewer );
        this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE );
        this._container = container;

        // カメラの初期設定
        this._init_camera = {
            latitude: 28.0,         // 緯度
            longitude: 142.0,       // 経度
            height: 2500000,        // 高度
            fov: 46.0               // 画角
        };

        // 注視点の初期設定（長野県松本市付近）
        this._lookat_position = {
            latitude: 38.00,
            longitude: 138.00,
            height: 1000
        };

        // カメラ位置
        this.setCameraPosition( this._init_camera );

        // 注視点
        this.setLookAtPosition( this._lookat_position );

        // カメラパラメータ
        this.setCameraParameter( this._init_camera );

        // コンテンツ制御
        this._isChangedGIS = false;
        this._isChangedBing = false;
        this._layerUpParameter = 0;

        // DEMOコンテンツ
        this._isGIS = false;
        this._isBing = false;
        this._layer_transparency = 10; //layer
        this._elapsedTime = 0;

        this._moveSun = true;

        this._updateDebugUI();

    }

    /**
     * Viewerを閉じる
     */
    _closeViewer()
    {
        this.destroy();
        this._commander = null;
        this._statusBar = null;
        this._isGIS = false;
        this._layer_transparency = 10;
    }

    /**
     * Layer用の画像プロバイダを生成
     */
    _createLayerImageProvider()
    {
      return new mapray.StandardImageProvider("https://storage.googleapis.com/inou-dev-mapray-additional-resources/image-tile/night/", ".png", 256, 0, 8);
      // return new mapray.StandardImageProvider("https://cyberjapandata.gsi.go.jp/xyz/std/", ".png", 256, 2, 8);
      // return new mapray.StandardImageProvider( "https://cyberjapandata.gsi.go.jp/xyz/20160414kumamoto_0429dol1/", ".png", 256, 10, 18 );
    }

    /**
     * GIS情報の表示
     */
    _loadGISInfo()
    {
        // シーンの読み込みを開始
        // 3D
        /*  new mapray.SceneLoader( this._viewer.scene, NATS_JSON_URL, {
              transform: (url, type) => this._onTransform( url, type ),
              callback: (loader, isSuccess) => {
                  this._onLoadScene( loader, isSuccess );
              }
          } );

          // NATS marker
          new mapray.SceneLoader( this._viewer.scene, NATS_MARKER_JSON_URL, {
              transform: (url, type) => this._onTransform( url, type ),
              callback: (loader, isSuccess) => {
                  this._onLoadScene( loader, isSuccess );
              }
          } );
          // AED
          new mapray.SceneLoader( this._viewer.scene, AED_JSON_URL, {
              callback: (loader, isSuccess) => { this._onLoadScene( loader, isSuccess ); }
          } );
          // Mountain
          new mapray.SceneLoader( this._viewer.scene, MOUNTAIN_JSON_URL, {
              callback: (loader, isSuccess) => { this._onLoadScene( loader, isSuccess ); }
          } ); */

        // GeoJSON
        new mapray.GeoJSONLoader( this._viewer.scene, "./shinjuku_linestring.json", {
            onLoad: ( loader, isSuccess ) => { console.log( "success load geojson" ) },
            getLineColor: d => d.properties && d.properties.color ? d.properties.color : [0, 255, 255, 255],
            getLineWidth: d => d.properties && d.properties.width ? d.properties.width : 3,
            getExtrudedHeight: () => null,
            getAltitude: () => 40
        } );
    }

    /**
     * GIS情報の非表示
     */
    _clearGISInfo()
    {
        this._viewer.scene.clearEntities();
    }

    /**
     * シーンを読み込み終わったときの処理
     */
    _onLoadScene( loader, isSuccess )
    {

    }

    /**
     * リソース要求関数
     */
    _onTransform( url, type )
    {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    onUpdateFrame( delta_time )
    {
        if (!this._viewer) {
            return;
        }
        super.onUpdateFrame( delta_time );

        var layer = this._commander.getLayer();


        this._updateRenderMode();
        this._updateLayerParams(layer);
        this._updateGISMode();
        this._updateBingLayerParams();
        this._updateCapture();

        var elevation = this._viewer.getElevation( this._camera_parameter.latitude, this._camera_parameter.longitude );

        var camera_matrix = this._viewer.camera.view_to_gocs
        var direction = [camera_matrix[4], camera_matrix[5], camera_matrix[6] ];
        var pitch = this._camera_parameter.pitch - 90;

        // ステータスバーを更新
        var statusbar = this._statusbar;
        statusbar.setCameraPosition( this._camera_parameter );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        statusbar.setFovAngle( this._camera_parameter.fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer( this._layer_transparency );

        const fps = 1.0 / delta_time;
        statusbar.setFps( fps );


        if ( this._moveSun ) {
          this._elapsedTime += delta_time;
          const theta = - Math.PI / 180.0 * ( this._elapsedTime * 36 );
          const x = Math.cos(theta);
          const y = Math.sin(theta);
          this._viewer.setSunDirection( [ x, y, 0 ] );
        }

        this._commander.endFrame();
    }

    _onKeyDown( event )
    {
        super._onKeyDown( event );
        this._commander.OnKeyDown( event );
    }

    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateRenderMode()
    {
        if ( this._commander.isRenderModeChanged() ) {
            var RenderMode = mapray.Viewer.RenderMode;
            var     viewer = this._viewer;
            var      rmode = viewer.render_mode;
            if ( rmode === RenderMode.SURFACE ) {
                viewer.render_mode = RenderMode.WIREFRAME;
            }
            else {
                viewer.render_mode = RenderMode.SURFACE;
            }
        }
    }

    /**
     * @summary Layerパラメータ更新
     * @desc
     * <p>入力パラメータ</p>
     * <pre>
     * this._layer  Layer
     * layer      layer更新
     * </pre>
     * <p>出力パラメータ</p>
     * <pre>
     * this._fov  画角
     * </pre>
     * @param {number} value 増減値
     * @private
     */
    _updateLayerParams(value)
    {
        if ( value != 0 ){
            this._layer_transparency = this._layer_transparency + value;
            if ( this._layer_transparency > 10 ) {
                this._layer_transparency = 10;
            } else if ( this._layer_transparency < 0 ) {
                this._layer_transparency = 0;
            }
            var d = ( this._layer_transparency ) / 10.0;
            if (this._viewer.layers && this._viewer.layers.getLayer(0)) {
                this._viewer.layers.getLayer(0).setOpacity(d);
            }
        }
    }

    _updateBingLayerParams()
    {
        if ( this._commander.isBingModeChanged() ) {
            if ( this._isBing ) {
                this._isBing = false;
                this._viewer = this.createViewer(
                    this._container,
                    accessToken,
                    {
                        debug_stats: new mapray.DebugStats()
                    }
                );
                this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.LayerType.NIGHT } );
                this._commander = new Commander( this._viewer );
                this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE);
            } else {
                this._isBing = true;
                this._viewer = this.createViewer(
                    this._container,
                    accessToken,
                    {
                        debug_stats: new mapray.DebugStats(),
                        image_provider: this._createBingImageProvider()
                    }
                );
                this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.LayerType.NIGHT } );
                this._commander = new Commander( this._viewer );
                this._statusbar = new StatusBar( this._viewer, DEM_ATTRIBUTE + ", " + BING_ATTRIBUTE);
            }
        }
    }

    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateGISMode()
    {
        if ( this._commander.isGISModeChanged() ) {
            if ( this._isGIS ) {
                this._isGIS = false;
                this._clearGISInfo();
            } else {
                this._isGIS = true;
                this._loadGISInfo();
            }
        }
    }

    async _updateCapture()
    {
      if ( this._commander.isCapture() ) {
        const isPng = false;
        const options = isPng ? {type: 'png'} : {type: 'jpeg'};
        const blob = await this.viewer.capture( options );
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = isPng ? 'download.png' : 'download.jpg';
        a.click();
      }
    }

    _createBingImageProvider()
    {
        return new BingMapsImageProvider( {
            uriScheme: "https",
            key: "<your Bing Maps Key here>"
        } );
    }

    _updateDebugUI() {

        // if ( this._point_cloud_mode ) {
            // const tools = document.getElementById("tools");
            const tools = document.getElementById("tools") || (()=>{
                    const maprayContainer = document.getElementById("mapray-container");
                    const tools = document.createElement("div");
                    tools.setAttribute("id", "tools");
                    maprayContainer.appendChild(tools);
                    return tools;
            })();
            const ui = document.createElement("div");
            ui.setAttribute("class", "tool-item");
            tools.appendChild(ui);

            const top = document.createElement("div");
            top.setAttribute("class", "top");

            top.appendChild(document.createTextNode("Option "));

            const items = ["item1", "item2"];

            const mode = "1";
            /*
            top.appendChild(DomTool.createSelect(items, {
                        initialValue: mode,
                        onchange: event => {
                            console.log("select", event);
                        },
            }));
            ui.appendChild(top);
            */

            const top2 = document.createElement("div");
            top2.setAttribute("class", "top");
            ui.appendChild(top2);

            const renderOption = new Option( RENDER_OPTION_PROPERTIES );
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "move sun"));
            /*
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "check1"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "check2"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "check3"));
            */

            /*
            top2.appendChild(DomTool.createButton("Button", {
                        class: "box-statistics",
                        onclick: async (event) => {
                          console.log('click button');
                        }
            }));

            top2.appendChild(DomTool.createSelectOption(renderOption, "select1"));
            */

            renderOption.onChange("select1", event => {
                console.log('select', event.value);
            });

            renderOption.onChange("move sun", event => {
                this._moveSun = event.value;
            });

            renderOption.onChangeAny(event => {
                    if ( ["check1", "check2", "check3"].indexOf( event.key ) === -1 ) return;
                    switch( event.key ) {
                        case "check1":
                          console.log('check1', event.value);
                          break;
                        case "check2":
                          console.log('check2', event.value);
                          break;
                        case "check3":
                          console.log('check3', event.value);
                          break;
                    }
            });

            const log_area = document.createElement("pre");
            log_area.setAttribute("class", "log-area");
            ui.appendChild(log_area);
        // }
    }

}

export default SpaceApp;
