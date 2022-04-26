import mapray, { URLResource } from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import StatusBar from "./StatusBar";
import Commander from "./Commander";

import { snakeToCamel } from "./utils";
import Option, { DomTool } from "./Option";



// Attirbute
const GSI_ATTRIBUTE = "国土地理院";



const targetPos = new mapray.GeoPoint(137.7238014361, 34.7111256306);



function getPointShapeText( pointShapeType: mapray.PointCloud.PointShapeType ): string
{
    switch (pointShapeType) {
        case mapray.PointCloud.PointShapeType.RECTANGLE:          return "Rectangle";
        case mapray.PointCloud.PointShapeType.CIRCLE:             return "Circle";
        case mapray.PointCloud.PointShapeType.CIRCLE_WITH_BORDER: return "Circle with Border";
        case mapray.PointCloud.PointShapeType.GRADIENT_CIRCLE:    return "Gradient";
    }
}



const RENDER_OPTION_PROPERTIES = [
    {
        key: "box",
        type: "boolean",
        description: "ボックスを表示します",
        value: false,
    },
    {
        key: "section",
        type: "boolean",
        description: "ボックスごとに認識した平面を描画します",
        value: false,
    },
    {
        key: "ellipsoid",
        type: "boolean",
        description: "ボックスごとに認識した平面を円として描画します",
        value: false,
    },
    {
        key: "axis",
        type: "boolean",
        description: "ボックスごとに認識した平面の法線を描画します",
        value: false,
    },
    {
        key: "point size",
        type: "select",
        description: "点を描画する際の大きさを指定します",
        options: [
            "1px", "2px", "3px", "4px", "5px",
            "10mm", "20mm", "30mm", "40mm", "50mm", "100mm",
            "Flexible",
        ],
        value: "Flexible",
    },
    {
        key: "point size limit",
        type: "select",
        description: "点を描画する際の大きさの最大値を指定します",
        options: [
            "1px", "2px", "3px", "4px", "5px",
            "10px", "20px", "30px",
            "no limit"
        ],
        value: "10px",
    },
    {
        key: "point shape",
        type: "select",
        description: "点を描画する際の形状を指定します",
        options: mapray.PointCloud.ListOfPointShapeTypes.map((type) => {
            return {
                value: type,
                domValue: type,
                label: getPointShapeText(type),
            };
        }),
        value: mapray.PointCloud.PointShapeType.CIRCLE,
    },
    {
        key: "points per pixel",
        type: "select",
        description: (
            "点を読み込む際の細かさをpoints/pixelで指定します。\n" +
            "画面１ピクセルあたり指定した点数を下回らないように読み込みを行います。(0.5は2ピクセルにつき1点)"
        ),
        options: [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2],
        value: 0.7,
    },
    {
        key: "debug shader",
        type: "boolean",
        value: false,
    },
];



class PointCloudViewer extends maprayui.StandardUIViewer {

    private _commander: Commander;

    private _statusbar: StatusBar;

    private _container: HTMLElement | string;

    private _init_camera: mapray.GeoPointData;

    private _init_camera_parameter: maprayui.StandardUIViewer.CameraParameterOption;

    private _lookat_position: mapray.GeoPointData;

    private _isChangedGIS: boolean;

    private _layerUpParameter: number;

    private _isGIS: boolean;

    private _layer_transparency: number;

    private _point_cloud_mode?: string;

    private _point_cloud_cache: {
        mode?: string;
        bbox_geoms: mapray.MarkerLineEntity[];
        pointCloudList?: mapray.PointCloud[];
        ui?: HTMLElement;
    };


    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement )
    {
        super( container, process.env.MAPRAY_ACCESS_TOKEN as string, {
            debug_stats: new mapray.DebugStats(),
            // render_mode: mapray.Viewer.RenderMode.WIREFRAME,
          }
        );

        this._commander = new Commander( this._viewer );
        this._statusbar = new StatusBar( this._viewer, GSI_ATTRIBUTE );
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

        this._point_cloud_mode = undefined;
        this._point_cloud_cache = {
            bbox_geoms: [],
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

        this._point_cloud_mode = "raw";
        this._updatePointCloud();
    }

    /**
     * GIS情報の非表示
     */
    _clearGISInfo()
    {
        this.viewer.scene.clearEntities();
        this._point_cloud_mode = undefined;
        this._updatePointCloud();
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

        var layer = this._commander.getLayer();


        this._updateRenderMode();
        this._updateLayerParams(layer);
        this._updateGISMode();

        const camera_position = this.getCameraPosition();
        var elevation = this.viewer.getElevation( camera_position.latitude, camera_position.longitude );

        var camera_matrix = this.viewer.camera.view_to_gocs;
        var direction = [camera_matrix[4], camera_matrix[5], camera_matrix[6] ];
        const camera_parameter = this.getCameraParameter();
        var pitch = this.getCameraAngle().pitch - 90;

        // ステータスバーを更新
        var statusbar = this._statusbar;
        statusbar.setCameraPosition( camera_position );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        statusbar.setFovAngle( camera_parameter.fov );
        statusbar.updateElements( delta_time );
        statusbar.setLayer( this._layer_transparency );

        this._commander.endFrame();
    }

    override onKeyDown( event: KeyboardEvent )
    {
        super.onKeyDown( event );
        this._commander.OnKeyDown( event );
    }

    async _updatePointCloud() {
        if (this._point_cloud_mode === this._point_cloud_cache.mode) {
            return;
        }

        const maprayApi = new mapray.cloud.CloudApiV1({
            basePath: process.env.MAPRAY_API_BASE_PATH || undefined,
            userId: process.env.MAPRAY_API_USER_ID as string,
            token: process.env.MAPRAY_API_KEY as string,
        });

        const point_cloud_collection = this.viewer.point_cloud_collection;

        if (this._point_cloud_cache.mode) {
            if (this._point_cloud_cache.pointCloudList) {
                this._point_cloud_cache.pointCloudList.forEach(pointCloud => {
                        point_cloud_collection.remove(pointCloud);
                });
            }
            delete this._point_cloud_cache.pointCloudList;
            const ui = this._point_cloud_cache.ui
            if ( ui && ui.parentElement ) {
                ui.parentElement.removeChild(ui);
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
            const tools = document.getElementById("tools");
            if ( !tools ) throw new Error("?");
            const ui = document.createElement("div");
            ui.setAttribute("class", "tool-item");
            tools.appendChild(ui);

            const top = document.createElement("div");
            top.setAttribute("class", "top");

            top.appendChild(document.createTextNode("PointCloud "));

            const items = ["raw"];

            top.appendChild(DomTool.createSelect(items, {
                        initialValue: mode,
                        onchange: (event) => {
                            this._point_cloud_mode = event;
                            this._updatePointCloud();
                        },
            }));
            ui.appendChild(top);

            const top2 = document.createElement("div");
            top2.setAttribute("class", "top");
            top2.appendChild(DomTool.createButton("Print Traverse", {
                        class: "box-statistics",
                        onclick: async (event) => {
                            // @ts-ignore
                            const traverse_summary = await mapray.PointCloud.requestTraverseSummary();
                            // @ts-ignore
                            for (let i=0; i<traverse_summary.length; i++) {
                                // @ts-ignore
                                const traverse = traverse_summary[i];
                                const statistics = traverse.pcb_collection.reduce((statistics: any, renderObject: any) => {
                                        const box = renderObject.box;
                                        statistics.numberOfBoxes++;
                                        let level = statistics.levelData[box.level];
                                        if (!level) {
                                            level = statistics.levelData[box.level] = {
                                                count: 0,
                                                distance: 0,
                                                points: 0,
                                            };
                                            statistics.levels.push(box.level);
                                        }
                                        level.count++;
                                        level.distance += renderObject.distance;
                                        if (box.vertex_length) {
                                            level.points += box.vertex_length/6;
                                        }
                                        return statistics;
                                    },
                                    {
                                        levelData: [],
                                        levels: [],
                                        numberOfBoxes: 0,
                                    }
                                );

                                let csv = "level\tdistance\tboxes\tpoints\n";
                                for (let i of statistics.levels) {
                                    const level = statistics.levelData[i];
                                    level.distance /= level.count;
                                    csv += `${i}\t${level.distance}\t${level.count}\t${level.points}\n`;
                                }
                                console.log(traverse.point_cloud.provider.toString() + ":\n" + csv);
                            }
                        }
            }));
            ui.appendChild(top2);

            const renderOption = new Option( RENDER_OPTION_PROPERTIES );
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "box"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "section"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "ellipsoid"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "axis"));
            top2.appendChild(DomTool.createSelectOption(renderOption, "point size"));
            top2.appendChild(DomTool.createSelectOption(renderOption, "point size limit"));
            top2.appendChild(DomTool.createSelectOption(renderOption, "point shape"));
            top2.appendChild(DomTool.createCheckboxOption(renderOption, "debug shader"));
            top2.appendChild(DomTool.createSelectOption(renderOption, "points per pixel"));

            // Register Handler for the properties
            renderOption.onChange("point shape", event => {
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        point_cloud_collection.get( i ).setPointShape( event.value );
                    }
            });

            renderOption.onChange("point size", event => {
                    const option: {
                        type?: any;
                        value?: number;
                    } = {};
                    if ( event.value.endsWith( "px" ) ) {
                        option.type = mapray.PointCloud.PointSizeType.PIXEL;
                        option.value = parseFloat(event.value.slice(0, -2));
                    }
                    else if ( event.value.endsWith( "mm" ) ) {
                        option.type = mapray.PointCloud.PointSizeType.MILLIMETERS;
                        option.value = parseFloat(event.value.slice(0, -2));
                    }
                    else {
                        option.type = mapray.PointCloud.PointSizeType.FLEXIBLE;
                    }
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        const pc = point_cloud_collection.get( i );
                        if ( option.value != null ) {
                            pc.setPointSize( option.value );
                        }
                        pc.setPointSizeType( option.type );
                    }
            });

            renderOption.onChange("points per pixel", event => {
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        point_cloud_collection.get( i ).setPointsPerPixel( event.value );
                    }
            });

            renderOption.onChange("point size limit", event => {
                    let size_limit: number;
                    if ( event.value.endsWith("px") ) {
                        size_limit = parseFloat( event.value.slice(0, -2) );
                    }
                    else { // no limit
                        size_limit = 10000;
                    }
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        point_cloud_collection.get( i ).setPointSizeLimit( size_limit );
                    }
            });

            renderOption.onChange("debug shader", event => {
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        // @ts-ignore
                        point_cloud_collection.get( i ).setDebugShader( event.value );
                    }
            });

            renderOption.onChangeAny(event => {
                    if ( ["box", "axis", "ellipsoid", "section"].indexOf( event.key ) === -1 ) return;
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        const pc = point_cloud_collection.get( i );
                        switch( event.key ) {
                            // @ts-ignore
                            case "box":       pc.setDebugRenderBox( event.value ); break;
                            // @ts-ignore
                            case "axis":      pc.setDebugRenderAxis( event.value ); break;
                            // @ts-ignore
                            case "ellipsoid": pc.setDebugRenderEllipsoid( event.value ); break;
                            // @ts-ignore
                            case "section":   pc.setDebugRenderSection( event.value ); break;
                        }
                    }
            });

            const log_area = document.createElement("pre");
            log_area.setAttribute("class", "log-area");
            ui.appendChild(log_area);

            const pointCloudList = [];
            const bbox_geoms: mapray.MarkerLineEntity[] = [];
            if ( mode === "raw" ) {
                const resource = maprayApi.getPointCloudDatasetAsResource( process.env.DATASET_POINT_CLOUD_ID as string );
                const point_cloud = point_cloud_collection.add( new mapray.RawPointCloudProvider( resource ) );
                pointCloudList.push( point_cloud );

                const datasets = await maprayApi.loadPointCloudDatasets();
                console.log( datasets );
                const dataset = await maprayApi.loadPointCloudDataset( process.env.DATASET_POINT_CLOUD_ID as string );
                console.log( dataset );
            }

            // @ts-ignore
            mapray.PointCloud.setStatisticsHandler((statistics: any) => {
                    const render_point_count = (statistics.render_point_count/1000000).toFixed(2);
                    const total_point_count  = (statistics.total_point_count /1000000).toFixed(2);
                    log_area.innerHTML = (`\
  boxes: ${statistics.render_boxes} / ${statistics.total_boxes} (created: ${statistics.created_boxes}, disposed: ${statistics.disposed_boxes})
loading: ${statistics.loading_boxes}
 points: ${render_point_count}M / ${total_point_count}M
   time: ${statistics.total_time.toFixed(2)}ms (traverse: ${statistics.traverse_time.toFixed(2)}ms, render: ${statistics.render_time.toFixed(2)}ms)`);
            });

            this._point_cloud_cache = {
                mode: this._point_cloud_mode,
                pointCloudList: pointCloudList,
                ui: ui,
                bbox_geoms: bbox_geoms
            };
        }
    }

    /**
     * @summary Viewer のレンダリングモードを更新
     * @private
     */
    _updateRenderMode()
    {
        if ( this._commander.isRenderModeChanged() ) {
            var RenderMode = mapray.Viewer.RenderMode;
            var     viewer = this.viewer;
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
    _updateLayerParams( value: number )
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
}

export default PointCloudViewer;
