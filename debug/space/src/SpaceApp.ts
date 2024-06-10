import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import BingMapsImageProvider from "./BingMapsImageProvider"
import StatusBar from "./StatusBar";
import Commander from "./Commander";

import Option, { DomTool } from "./Option";



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
        key: "move moon",
        type: "boolean",
        description: "月移動",
        value: true,
    },
    {
        key: "night layer",
        type: "boolean",
        description: "夜間レイヤー",
        value: true,
    },
    {
        key: "sun",
        type: "boolean",
        description: "太陽表示",
        value: true,
    },
    {
        key: "moon",
        type: "boolean",
        description: "月表示",
        value: true,
    },
    {
        key: "cloud",
        type: "boolean",
        description: "雲表示",
        value: true,
    },
    {
        key: "star",
        type: "boolean",
        description: "恒星表示",
        value: true,
    },
    {
        key: "constellation",
        type: "boolean",
        description: "星座線表示",
        value: true,
    },
    {
        key: "milkyway",
        type: "boolean",
        description: "天の川表示",
        value: true,
    },
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
        key: "star mask",
        type: "boolean",
        description: "　昼間の大気中星表現",
        value: true,
    },
    {
        key: "sun speed",
        type: "range",
        description: "太陽の速度",
        min: 0,
        max: 300,
        value: 20.0,
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
    {
        key: "moon speed",
        type: "range",
        description: "月の速度",
        min: 0,
        max: 300,
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
    {
        key: "move cloud",
        type: "boolean",
        description: "雲移動",
        value: false,
    },
    {
        key: "cloud intensity",
        type: "range",
        description: "雲の強度",
        min: 0.0,
        max: 1.0,
        value: 0.0,
    },
    {
        key: "cloud stream",
        type: "range",
        description: "cloud stream",
        min: 0,
        max: 1.0,
        value: 0.0,
    },
    {
        key: "cloud fade",
        type: "range",
        description: "cloud",
        min: 0,
        max: 1.0,
        value: 0.0,
    },
    {
        key: "cloud select",
        type: "select",
        description: "cloud data",
        options: [
            "0", "1", "2"
        ],
        value: "0",
    },
    {
        key: "cloud contour",
        type: "select",
        description: "cloud contour",
        options: [
            "1", "2", "3"
        ],
        value: "1",
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
        key: "star intensity",
        type: "range",
        description: "恒星の強度",
        min: -5,
        max: 0,
        value: -3.0,
    },
    {
        key: "constellation intensity",
        type: "range",
        description: "星座の強度",
        min: 0,
        max: 2,
        value: 0.2,
    },
    {
        key: "milkyway intensity",
        type: "range",
        description: "天の川の強度",
        min: 0,
        max: 2,
        value: 0.3,
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
];

interface InitCamera {
    latitude: number,
    longitude: number,
    height: number,
    fov: number
}


export default class SpaceApp extends maprayui.StandardUIViewer {

    private _commander: Commander;
    private _statusbar: StatusBar;
    private _container: HTMLElement | string;

    private _init_camera: InitCamera;

    private _lookat_position: mapray.GeoPointData;

    private _isChangedGIS: boolean;
    private _isChangedBing: boolean;
    private _layerUpParameter: number;

    private _isGIS: boolean;
    private _isBing: boolean;
    private _layer_transparency: number;

    private _elapsedTime: number;

    private _moveSun: boolean;
    private _sunSpeed: number;

    private _moonElapsedTime: number;
    private _moveMoon: boolean;
    private _moonSpeed: number;

    private _starElapsedTime: number;
    private _moveStar: boolean;
    private _starSpeed: number;

    private _fps: number[];
    private _fps_count: number;

    private _point_cloud_mode?: string;

    private _moveCloud: boolean;

    private _renderOption!: Option;

    private _point_cloud_cache: {
        mode?: string;
        bbox_geoms: mapray.MarkerLineEntity[];
        pointCloudList?: mapray.PointCloud[];
        ui?: HTMLElement;
    };

    private _cloudURLArray: string[];

    private _cloudImageArray: any[];

    private _constellationIntensity: number;

    /**
     * @param container  コンテナ (ID または要素)
     */
    constructor( container: HTMLElement | string )
    {
        const renderOption = new Option( RENDER_OPTION_PROPERTIES );

        super( container, process.env.MAPRAY_ACCESS_TOKEN as string, {
                debug_stats: new mapray.DebugStats(),
                image_provider: process.env.BINGMAP_ACCESS_TOKEN ?
                    new BingMapsImageProvider( {
                        uriScheme: "https",
                        key: process.env.BINGMAP_ACCESS_TOKEN as string,
                    } ) : undefined,
                atmosphere: new mapray.Atmosphere(),
                sun_visualizer: new mapray.SunVisualizer( 32 ),
                moon_visualizer: new mapray.MoonVisualizer( './data/moon.jpg' ),
                cloud_visualizer: new mapray.CloudVisualizer(),
                star_visualizer: new mapray.StarVisualizer( './data/star75.json', './data/starmap_512n2.jpg' ),
                // north_pole: { color: [0, 0.07, 0.12], },
                // south_pole: { color: [0.88, 0.89, 0.94], },
        });

        this._renderOption = renderOption;

        this._cloudURLArray = [];
        this._moveCloud = false;

        this._cloudImageArray = [];

        this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.Type.IMAGE, draw_type: mapray.ImageLayer.DrawType.NIGHT } );
        this._commander = new Commander( this.viewer );
        this._statusbar = new StatusBar( this.viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE );
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

        const options = { camera_position: this._init_camera, lookat_position: this._lookat_position, url_update: true };

        this.enableURLUpdate( true );

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
        this._sunSpeed = 30;

        this._moonElapsedTime = 0;
        this._moveMoon = true;
        this._moonSpeed = 10;

        this._starElapsedTime = 0;
        this._moveStar = true;
        this._starSpeed = 1;

        this._constellationIntensity = 1;

        this._fps = [];
        this._fps_count = 240;
        for ( let i=0; i<this._fps_count; i++ ) {
            this._fps.push(0);
        }

        // PointCloud
        this._point_cloud_mode = undefined;
        this._point_cloud_cache = {
            bbox_geoms: [],
        };

        this._init();
    }

    // await viewer init
    private async _init(): Promise<void>
    {
        await this.viewer.init_promise;

        this._updateDebugUI();

        await this._loadClouds();

        // 初期値設定
        this._setupInitialValue();
    }

    /**
     * Viewerを閉じる
     */
    private _closeViewer()
    {
        this.destroy();
        this._isGIS = false;
        this._layer_transparency = 10;
    }

    /**
     * Layer用の画像プロバイダを生成
     */
     private _createLayerImageProvider()
    {
        // night image
        return new mapray.StandardImageProvider({ url: "https://opentiles.mapray.com/xyz/night-satellite/", format: ".png", min_level: 0, max_level: 8 });
    }

    /**
     * GIS情報の表示
     */
     private _loadGISInfo()
    {
        // シーンの読み込みを開始
        (async () => {
            await this._loadClouds();
        })();
        this._setCloudContour( this._renderOption.get("cloud contour") );

        const targetPos = new mapray.GeoPoint(137.7238014361, 34.7111256306);
        var pin = new mapray.PinEntity( this.viewer.scene );
        pin.addMakiIconPin( "landmark-15", targetPos);
        this.addEntity(pin);

        // 直線のエンティティを作成
        {
           var line_entity = new mapray.MarkerLineEntity(this.viewer.scene);
           // 皇居の座標を設定
           var line_fast_position = { longitude: 139.7528, latitude: 35.685175, height: 50 };
           // 東京タワーの座標を設定
           var line_second_position = { longitude: 139.745433, latitude: 35.658581, height: 30 };

           var position_array = [line_fast_position.longitude, line_fast_position.latitude, line_fast_position.height,
                                 line_second_position.longitude, line_second_position.latitude, line_second_position.height];
           line_entity.addPoints(position_array);
           this.viewer.scene.addEntity(line_entity);

           // 文字のエンティティを作成
           var font_entity = new mapray.TextEntity(this.viewer.scene);
           var fast_font_position = { longitude: 139.7528, latitude: 35.685175, height: 50 };
           var fast_font_geopoint = new mapray.GeoPoint(fast_font_position.longitude, fast_font_position.latitude, fast_font_position.height);
           font_entity.addText("The Imperial Palace", fast_font_geopoint, { color: mapray.Color.createOpaqueColor([ 1, 1, 0 ]), font_size: 25 });
           var second_font_position = { longitude: 139.745433, latitude: 35.658581, height: 50 };
           var second_font_geopoint = new mapray.GeoPoint(second_font_position.longitude, second_font_position.latitude, second_font_position.height);
           font_entity.addText("Tokyo Tower", second_font_geopoint, { color: mapray.Color.createOpaqueColor([ 1, 1, 0 ]), font_size: 25 });
           this.viewer.scene.addEntity(font_entity);
         }
    }

    /**
     * GIS情報の非表示
     */
     private _clearGISInfo()
    {
        this.viewer.scene.clearEntities();
        this._point_cloud_mode = undefined;
        this._updatePointCloud();
    }

    async _updatePointCloud() {
        if (this._point_cloud_mode === this._point_cloud_cache.mode) {
            return;
        }

        const maprayApi = new mapray.cloud.CloudApiV1({
            basePath: process.env.MAPRAY_API_BASE_PATH || undefined,
            userId: process.env.MAPRAY_API_USER_ID as string,
            token: process.env.MAPRAY_API_ACCESS_TOKEN as string,
        });

        const point_cloud_collection = this.viewer.point_cloud_collection;

        if (this._point_cloud_cache.mode) {
            if (this._point_cloud_cache.pointCloudList) {
                this._point_cloud_cache.pointCloudList.forEach(pointCloud => {
                        point_cloud_collection.remove(pointCloud);
                });
            }
            delete this._point_cloud_cache.pointCloudList;
            if (this._point_cloud_cache.ui) {
                if ( this._point_cloud_cache.ui.parentElement ) {
                    this._point_cloud_cache.ui.parentElement.removeChild(this._point_cloud_cache.ui);
                }
                delete this._point_cloud_cache.ui;
            }
            delete this._point_cloud_cache.mode;
            this._point_cloud_cache.bbox_geoms.forEach(bbox_geom => {
                    this.viewer.scene.removeEntity( bbox_geom );
            });
        }
        this._point_cloud_cache.bbox_geoms = [];

        if ( this._point_cloud_mode ) {
            const mode = this._point_cloud_mode;
            const pointCloudList = [];
            const bbox_geoms: mapray.MarkerLineEntity[] = [];
            if ( mode === "raw" ) {
                const resource = maprayApi.getPointCloudDatasetAsResource( process.env.DATASET_POINT_CLOUD_ID as string );
                const point_cloud = point_cloud_collection.add( new mapray.StandardPointCloudProvider( resource ) );
                pointCloudList.push( point_cloud );

                const datasets = await maprayApi.loadPointCloudDatasets();
                console.log( datasets );
                const dataset = await maprayApi.loadPointCloudDataset( process.env.DATASET_POINT_CLOUD_ID as string );
                console.log( dataset );
            }

            this._point_cloud_cache = {
                mode: this._point_cloud_mode,
                pointCloudList: pointCloudList,
                // ui: ui,
                bbox_geoms: bbox_geoms
            };
        }

    }

    /**
     * シーンを読み込み終わったときの処理
     */
     private _onLoadScene( loader: mapray.SceneLoader, isSuccess: boolean )
    {

    }

    /**
     * リソース要求関数
     */
     private _onTransform( url: string, type: mapray.Resource.Type.JSON )
    {
        return {
            url: url,
            credentials: mapray.CredentialMode.SAME_ORIGIN,
            headers: {}
        };
    }

    onUpdateFrame( delta_time: number )
    {
        if (!this.viewer) {
            return;
        }
        super.onUpdateFrame( delta_time );

        var layer = this._commander.getLayer();


        this._updateRenderMode();
        this._updateLayerParams(layer);
        this._updateGISMode();
        this._updateBingLayerParams();
        this._updateCapture();

        const camera_position = this.getCameraPosition();
        const camera_roll_pitch_yaw = this.getCameraAngle();
        const camera_parameter = this.getCameraParameter();

        var elevation = this.viewer.getElevation( camera_position.latitude, camera_position.longitude );

        var camera_matrix = this.viewer.camera.view_to_gocs
        var direction = mapray.GeoMath.createVector3( [ camera_matrix[4], camera_matrix[5], camera_matrix[6] ]);
        var pitch = camera_roll_pitch_yaw.pitch - 90;

        // ステータスバーを更新
        var statusbar = this._statusbar;
        statusbar.setCameraPosition( camera_position );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        statusbar.setFovAngle( camera_parameter.fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer( this._layer_transparency );


        const fps = 1.0 / delta_time;
        this._fps.shift();
        this._fps.push(fps);
        let ave_fps = 0;
        for ( let i=0; i<this._fps_count; i++ ) {
            ave_fps += this._fps[i];
        }

        statusbar.setFps( ave_fps / this._fps_count );


        if ( this._moveSun ) {
          this._elapsedTime += delta_time * this._sunSpeed;
          const theta = - Math.PI / 180.0 * this._elapsedTime;
          const x = Math.cos(theta);
          const y = Math.sin(theta);
          this.viewer.sun.setSunDirection( [ x, y, 0 ] );
        }

        if ( this._moveMoon ) {
          this._moonElapsedTime += delta_time * this._moonSpeed;
          const theta = - Math.PI / 180.0 * this._moonElapsedTime;
          const x = Math.cos(theta);
          const y = Math.sin(theta);
          this.viewer.moon.setMoonDirection( [ x, y, 0 ] );
        }

        if ( this._moveCloud ) {
            const v = this._renderOption.get("cloud stream");
            const dv = 1.0 / 36.0;
            this._renderOption.set("cloud stream", v + delta_time * dv > 1.0 ? 0 : v + delta_time * dv);
        }

        if ( this._moveStar ) {
            if( this.viewer.starVisualizer)  {
                this._starElapsedTime += delta_time * this._starSpeed;
                this.viewer.starVisualizer.setLongitude( -this._starElapsedTime );
            }
        }


        this._commander.endFrame();
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
        this._commander.OnKeyDown( event );
    }

    /**
     * Viewer のレンダリングモードを更新
     */
    private _updateRenderMode()
    {
        if ( this._commander.isRenderModeChanged() ) {
            var     viewer = this.viewer;
            var      rmode = viewer.render_mode;
            if ( rmode === mapray.Viewer.RenderMode.SURFACE ) {
                viewer.render_mode = mapray.Viewer.RenderMode.WIREFRAME;
            }
            else {
                viewer.render_mode = mapray.Viewer.RenderMode.SURFACE;
            }
        }
    }

    /**
     * Layerパラメータ更新
     * @param value 増減値
     */
    private _updateLayerParams(value: number)
    {
        if ( value != 0 ){
            this._layer_transparency = this._layer_transparency + value;
            if ( this._layer_transparency > 10 ) {
                this._layer_transparency = 10;
            } else if ( this._layer_transparency < 0 ) {
                this._layer_transparency = 0;
            }
            var d = ( this._layer_transparency ) / 10.0;
            if (this.viewer.layers && this.viewer.layers.getLayer(0)) {
                this.viewer.layers.getLayer(0).setOpacity(d);
            }
        }
    }

    _updateBingLayerParams()
    {
        if ( this._commander.isBingModeChanged() ) {
            if ( this._isBing ) {
                this._isBing = false;
                this.createViewer(
                    this._container,
                    process.env.MAPRAY_ACCESS_TOKEN as string,
                    {
                        debug_stats: new mapray.DebugStats()
                    }
                );
                this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.Type.IMAGE, draw_type: mapray.ImageLayer.DrawType.NIGHT } );
                this._commander = new Commander( this.viewer );
                this._statusbar = new StatusBar( this.viewer, DEM_ATTRIBUTE + ", " + GSI_ATTRIBUTE);
            } else {
                this._isBing = true;
                this.createViewer(
                    this._container,
                    process.env.MAPRAY_ACCESS_TOKEN as string,
                    {
                        debug_stats: new mapray.DebugStats(),
                        image_provider: this._createBingImageProvider()
                    }
                );
                this.addLayer( { image_provider: this._createLayerImageProvider(), opacity: 1.0, type: mapray.Layer.Type.IMAGE, draw_type: mapray.ImageLayer.DrawType.NIGHT } );
                this._commander = new Commander( this.viewer );
                this._statusbar = new StatusBar( this.viewer, DEM_ATTRIBUTE + ", " + BING_ATTRIBUTE);
            }
        }
    }

    /**
     * Viewer のレンダリングモードを更新
     */
     private _updateGISMode()
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
        const blob = await this.viewer.capture( isPng ? {type: 'png'} : {type: 'jpeg'} );
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = isPng ? 'download.png' : 'download.jpg';
        a.click();
      }
    }

    private _createBingImageProvider()
    {
        return new BingMapsImageProvider( {
            uriScheme: "https",
            key: "<your Bing Maps Key here>"
        } );
    }

    private _updateDebugUI() {
        const tools = document.getElementById("tools") || (()=>{
                const maprayContainer = document.getElementById("mapray-container");
                const tools = document.createElement("div");
                tools.setAttribute("id", "tools");
                if ( maprayContainer ) {
                    maprayContainer.appendChild(tools);
                }
                return tools;
        })();
        const ui = document.createElement("div");
        ui.setAttribute("class", "tool-item");
        tools.appendChild(ui);

        const top = document.createElement("div");
        top.setAttribute("class", "top");

        top.appendChild(document.createTextNode("Option "));

        const top2 = document.createElement("div");
        top2.setAttribute("class", "top");
        ui.appendChild(top2);

        const renderOption = this._renderOption;
        top2.appendChild(DomTool.createCheckboxOption(renderOption, "move sun"));

        const kv = document.createElement("table");
        kv.appendChild(DomTool.createSliderOption(renderOption, "sun speed", { mode: "key-value-table-row" }));
        kv.appendChild(DomTool.createSliderOption(renderOption, "sun radius", { mode: "key-value-table-row" }));
        kv.appendChild(DomTool.createSliderOption(renderOption, "sun intensity", { mode: "key-value-table-row" }));
        kv.style.width = "100%";
        top2.appendChild(kv);

        top2.appendChild(DomTool.createCheckboxOption(renderOption, "move moon"));
        const kv2 = document.createElement("table");
        kv2.appendChild(DomTool.createSliderOption(renderOption, "moon speed", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "moon radius", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "cloud intensity", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "cloud stream", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "cloud fade", { mode: "key-value-table-row" }));
        top2.appendChild(DomTool.createCheckboxOption(renderOption, "move star"));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "star speed", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "star intensity", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "constellation intensity", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSliderOption(renderOption, "milkyway intensity", { mode: "key-value-table-row" }));
        kv2.appendChild(DomTool.createSelectOption(renderOption, "cloud select"));
        kv2.appendChild(DomTool.createSelectOption(renderOption, "cloud contour"));
        kv2.style.width = "100%";
        top2.appendChild(kv2);

        const top3 = document.createElement("div");
        top3.setAttribute("class", "top");
        ui.appendChild(top3);
        top3.appendChild(DomTool.createCheckboxOption(renderOption, "night layer"));


        const top4 = document.createElement("div");
        top4.setAttribute("class", "top");
        ui.appendChild(top4);
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "sun"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "moon"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "sky"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "ground"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "star mask"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "cloud"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "star"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "constellation"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "milkyway"));
        top4.appendChild(DomTool.createCheckboxOption(renderOption, "move cloud"));

        const top5 = document.createElement("table");
        top5.setAttribute("class", "top");
        top5.style.width = "100%";
        ui.appendChild(top5);
        top5.appendChild(DomTool.createSliderOption(renderOption, "kr", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "km", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "scale depth", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "eSun", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "exposure", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "g_kr", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "g_km", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "g_scale depth", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "g_eSun", { mode: "key-value-table-row" }));
        top5.appendChild(DomTool.createSliderOption(renderOption, "g_exposure", { mode: "key-value-table-row" }));

        renderOption.onChange("move sun", event => {
            this._moveSun = event.value;
        });
        renderOption.onChange("sun speed", event => {
            this._sunSpeed = event.value;
        });
        renderOption.onChange("sun radius", event => {
            if ( this.viewer.sunVisualizer ) {
                this.viewer.sunVisualizer.setRadius( event.value );
            }
        });
        renderOption.onChange("sun intensity", event => {
            if ( this.viewer.sunVisualizer ) {
                this.viewer.sunVisualizer.setIntensity( event.value );
            }
        });

        renderOption.onChange("move moon", event => {
            this._moveMoon = event.value;
        });
        renderOption.onChange("moon speed", event => {
            this._moonSpeed = event.value;
        });
        renderOption.onChange("moon radius", event => {
            if ( this.viewer.moonVisualizer ) {
                this.viewer.moonVisualizer.setRadius( event.value );
            }
        });

        renderOption.onChange("move star", event => {
            this._moveStar = event.value;
        });
        renderOption.onChange("star speed", event => {
            this._starSpeed = event.value;
        });
        renderOption.onChange("star intensity", event => {
            if ( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setIntensity( event.value );
            }
        });
        renderOption.onChange("constellation intensity", event => {
            this._constellationIntensity = event.value;
            if( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setLineColor(
                    mapray.GeoMath.createVector3([
                    0.3 * this._constellationIntensity,
                    0.5 * this._constellationIntensity,
                    1.0 * this._constellationIntensity
                ]) );
            }
        });
        renderOption.onChange("milkyway intensity", event => {
            if( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setMilkyWayIntensity( event.value );
            }
        });

        renderOption.onChange("move cloud", event => {
            this._moveCloud = event.value;
        });
        renderOption.onChange("cloud intensity", event => {
            if ( this.viewer.cloudVisualizer ) {
                this.viewer.cloudVisualizer.setIntensity( event.value );
            }
        });
        renderOption.onChange("cloud stream", event => {
            if ( this.viewer.cloudVisualizer ) {
                if ( event.value >= 1.0) {
                    const nowStep = this._cloudURLArray.length - 2;
                    const nowFade = 1.0;
                    this.viewer.cloudVisualizer.loadData( this._cloudImageArray[nowStep], this._cloudImageArray[nowStep+1], nowFade );
                }
                else {
                    const step = 1 / (this._cloudURLArray.length - 1);
                    // URLを決定
                    const nowStep = Math.floor ( event.value / step );
                    // fadeを決定
                    const nowFade = ( event.value / step ) - nowStep;
                    this.viewer.cloudVisualizer.loadData( this._cloudImageArray[nowStep], this._cloudImageArray[nowStep+1], nowFade );
                }
            }
        });

        renderOption.onChange("cloud fade", event => {
            if ( this.viewer.cloudVisualizer !== undefined ) {
                this.viewer.cloudVisualizer.setFade( event.value );
            }
        });

        renderOption.onChange("cloud select", event => {
            if ( this.viewer.cloudVisualizer !== undefined ) {
                this.viewer.cloudVisualizer.pushFront( './data/cloud_' + event.value + '.png', 1);
            }
        });

        renderOption.onChange("cloud contour", event => {
            this._setCloudContour( event.value );
        });

        renderOption.onChange("night layer", event => {
            if (this.viewer.layers && this.viewer.layers.getLayer(0)) {
                this.viewer.layers.getLayer(0).setOpacity(event.value);
            }
        });

        renderOption.onChange("sun", event => {
            if ( this.viewer.sunVisualizer ) {
                this.viewer.sunVisualizer.setVisibility( event.value );
            }
        });

        renderOption.onChange("moon", event => {
            if ( this.viewer.moonVisualizer ) {
                this.viewer.moonVisualizer.setVisibility( event.value );
            }
        });

        renderOption.onChange("sky", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setSkyVisibility( event.value );
            }
        });

        renderOption.onChange("ground", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundVisibility( event.value );
            }
        });

        renderOption.onChange("star mask", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setStarMask( event.value );
            }
        });

        renderOption.onChange("cloud", event => {
            if ( this.viewer.cloudVisualizer ) {
                this.viewer.cloudVisualizer.setVisibility( event.value );
            }
        });

        renderOption.onChange("star", event => {
            if( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setVisibility( event.value );
            }
        });

        renderOption.onChange("constellation", event => {
            if( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setConstellationVisibility( event.value );
            }
        });

        renderOption.onChange("milkyway", event => {
            if( this.viewer.starVisualizer ) {
                this.viewer.starVisualizer.setMilkyWayVisibility( event.value );
            }
        });

        renderOption.onChange("kr", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setRayleigh( event.value );
            }
        });
        renderOption.onChange("km", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setMie( event.value );
            }
        });
        renderOption.onChange("scale depth", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setScaleDepth( event.value );
            }
        });
        renderOption.onChange("eSun", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setSunRate( event.value );
            }
        });
        renderOption.onChange("exposure", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setExposure( event.value );
            }
        });

        renderOption.onChange("g_kr", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundRayleigh( event.value );
            }
        });
        renderOption.onChange("g_km", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundMie( event.value );
            }
        });
        renderOption.onChange("g_scale depth", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundScaleDepth( event.value );
            }
        });
        renderOption.onChange("g_eSun", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundSunRate( event.value );
            }
        });
        renderOption.onChange("g_exposure", event => {
            if ( this.viewer.atmosphere ) {
                this.viewer.atmosphere.setGroundExposure( event.value );
            }
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
    }

    private _setCloudContour( value: string ) {
        if ( this.viewer.cloudVisualizer ) {
            // contour array
            const gradientArray = [];

            if ( value === '1' ) {
                // cloud
                gradientArray.push( mapray.GeoMath.createVector4([1,1,1,0]) );
                gradientArray.push( mapray.GeoMath.createVector4([1,1,1,1]) );
                this.viewer.cloudVisualizer.setGradient(gradientArray, mapray.CloudVisualizer.GradientMode.LINEAR);
                }
                else if ( value === '2' ) {
                // contour
                gradientArray.push( mapray.GeoMath.createVector4([0,1,1,0]) );
                gradientArray.push( mapray.GeoMath.createVector4([0,1,1,0.5]) );
                gradientArray.push( mapray.GeoMath.createVector4([0,1,1,1]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.5,1,0.5,1]) );
                gradientArray.push( mapray.GeoMath.createVector4([1,1,0,1]) );
                gradientArray.push( mapray.GeoMath.createVector4([1,0.5,0.5,1]) );
                this.viewer.cloudVisualizer.setGradient(gradientArray, mapray.CloudVisualizer.GradientMode.STEP);
            }
            else {
                // cloud
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 0.0]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 0.2]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 0.4]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 0.6]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 0.8]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.00, 0.60, 0.00, 1.0]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.90, 0.90, 0.00, 1.0]) );
                gradientArray.push( mapray.GeoMath.createVector4([1.00, 0.50, 0.00, 1.0]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.50, 0.00, 0.00, 1.0]) );
                gradientArray.push( mapray.GeoMath.createVector4([0.40, 0.10, 0.90, 1.0]) );
                this.viewer.cloudVisualizer.setGradient(gradientArray, mapray.CloudVisualizer.GradientMode.LINEAR);
            }
        }
    }

    private _setupInitialValue() {
        // atmosphere
        if ( this.viewer.atmosphere ) {
            //// atmosphere sky
            // visible
            this.viewer.atmosphere.setSkyVisibility( this._renderOption.get("sky") );
            // kr
            this.viewer.atmosphere.setRayleigh( this._renderOption.get("kr") );
            // km
            this.viewer.atmosphere.setMie( this._renderOption.get("km") );
            // scale depth
            this.viewer.atmosphere.setScaleDepth( this._renderOption.get("scale depth") );
            // eSun
            this.viewer.atmosphere.setSunRate( this._renderOption.get("eSun") );
            // exposure
            this.viewer.atmosphere.setExposure( this._renderOption.get("exposure") );
            // star mask
            this.viewer.atmosphere.setStarMask( this._renderOption.get("star mask") );

            //// atmosphere ground
            // visible
            this.viewer.atmosphere.setGroundVisibility( this._renderOption.get("ground") );
            // kr
            this.viewer.atmosphere.setGroundRayleigh( this._renderOption.get("g_kr") );
            // km
            this.viewer.atmosphere.setGroundMie( this._renderOption.get("g_km") );
            // scale depth
            this.viewer.atmosphere.setGroundScaleDepth( this._renderOption.get("g_scale depth") );
            // eSun
            this.viewer.atmosphere.setGroundSunRate( this._renderOption.get("g_eSun") );
            // exposure
            this.viewer.atmosphere.setGroundExposure( this._renderOption.get("g_exposure") );
        }

        // sun
        if ( this.viewer.sunVisualizer ) {
            // visible
            this.viewer.sunVisualizer.setVisibility( this._renderOption.get("sun") );
            // move
            this._moveSun = this._renderOption.get("move sun");
            // speed
            this._sunSpeed = this._renderOption.get("sun speed");
            // radius
            this.viewer.sunVisualizer.setRadius( this._renderOption.get("sun radius") );
            // intensity
            this.viewer.sunVisualizer.setIntensity( this._renderOption.get("sun intensity") );
        }

        // moon
        if ( this.viewer.moonVisualizer ) {
            // visible
            this.viewer.moonVisualizer.setVisibility( this._renderOption.get("moon") );
            // move
            this._moveMoon = this._renderOption.get("move moon");
            // speed
            this._moonSpeed = this._renderOption.get("moon speed");
            // radius
            this.viewer.moonVisualizer.setRadius( this._renderOption.get("moon radius") );
        }

        // star
        if( this.viewer.starVisualizer ) {
            //// star
            // visible
            this.viewer.starVisualizer.setVisibility( this._renderOption.get("star") );
            // move
            this._moveStar = this._renderOption.get("move star");
            // speed
            this._starSpeed = this._renderOption.get("star speed");
            // intensity
            this.viewer.starVisualizer.setIntensity( this._renderOption.get("star intensity") );

            //// constellation
            // visible
            this.viewer.starVisualizer.setConstellationVisibility( this._renderOption.get("constellation") );
            // intensity
            this._constellationIntensity = this._renderOption.get("constellation intensity");
            this.viewer.starVisualizer.setLineColor(
                mapray.GeoMath.createVector3([
                0.3 * this._constellationIntensity,
                0.5 * this._constellationIntensity,
                1.0 * this._constellationIntensity
            ]) );
            //// milkyway
            // visible
            this.viewer.starVisualizer.setMilkyWayVisibility( this._renderOption.get("milkyway") );
            // intensity
            this.viewer.starVisualizer.setMilkyWayIntensity( this._renderOption.get("milkyway intensity") );
        }

        // cloud
        if ( this.viewer.cloudVisualizer ) {
            // visible
            this.viewer.cloudVisualizer.setVisibility( this._renderOption.get("cloud") );
            // move
            this._moveCloud = this._renderOption.get("move cloud");
            // intensity
            this.viewer.cloudVisualizer.setIntensity( this._renderOption.get("cloud intensity") );
            // stream
            // (no support)
            // fade
            this.viewer.cloudVisualizer.setFade( this._renderOption.get("cloud fade") );
            // select
            // (no support)
            // contour
            this._setCloudContour( this._renderOption.get("cloud contour") );
        }

        // night layer
        if (this.viewer.layers && this.viewer.layers.getLayer(0)) {
            // visible
            this.viewer.layers.getLayer(0).setOpacity( this._renderOption.get("night layer") );
        }
    }

    private async _loadClouds() {
        // set cloud image
        // 1440 x 722 pixel
        // 8bit gray

        const cloudURLArray = [];
        for ( let num=0; num < 3; num++ ) {
            cloudURLArray.push( './data/cloud_' + num + '.png' );
        }
        this._cloudURLArray = cloudURLArray;

        const tasks = cloudURLArray.map(url => {
                const image = new Image();
                image.src = url;
                image.crossOrigin = "Anonymous";
                return mapray.Dom.waitForLoad(image);
        });

        const twoImages = await Promise.all([tasks[0], tasks[1]]); // wait for first two images
        if ( this.viewer.cloudVisualizer ) {
            this.viewer.cloudVisualizer.loadData( twoImages[0], twoImages[1], 0.0 );
        }

        this._cloudImageArray = await Promise.all(tasks);
    }

}

// @ts-ignore
window.mapray = mapray;
