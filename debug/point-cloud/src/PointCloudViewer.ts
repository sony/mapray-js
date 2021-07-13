import mapray from "@mapray/mapray-js";
import maprayui from "@mapray/ui";
import StatusBar from "./StatusBar";
import Commander from "./Commander";

import { snakeToCamel } from "./utils";
import Option, { DomTool } from "./Option";


const MAPRAY_ACCESS_TOKEN = "<your access token here>";
const MAPRAY_API_BASE_PATH = "https://cloud.mapray.com";
const MAPRAY_API_ACCESS_TOKEN = MAPRAY_ACCESS_TOKEN;
const MAPRAY_API_USER_ID = "<user id>";
const POINT_CLOUD_DATASET_ID = "<point cloud dataset id>";
const DATASET_3D_ID = "<3d dataset id>";



// Attirbute
const GSI_ATTRIBUTE = "国土地理院";



const targetPos = new mapray.GeoPoint(137.7238014361, 34.7111256306);



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
        options: Object.keys(mapray.PointCloud.PointShapeType).map(key => {
                const value = mapray.PointCloud.PointShapeType[key];
                return {
                    value: value,
                    domValue: value.id,
                    label: snakeToCamel(value.id),
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
        bbox_geoms: number[];
        pointCloudList?: mapray.PointCloud[];
        ui?: HTMLElement;
    };


    /**
     * @param {string|Element} container  コンテナ (ID または要素)
     */
    constructor( container: string | HTMLElement )
    {
        super( container, MAPRAY_ACCESS_TOKEN, { 
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
            bbox_geoms: []
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

        {
          const button = document.createElement("button");
          button.innerHTML = "camera";
          button.onclick = event => {
            const c2g = this.viewer.camera.getCanvasToGocs();

            const p = new mapray.GeoPoint();
            const points: number[] = [];
            for ( let w=0; w<2; ++w ) for ( let v=0; v<2; ++v ) for ( let u=0; u<2; ++u ) {
              let x = u * this.viewer.canvas_element.width;
              let y = v * this.viewer.canvas_element.height;
              let z = w * 0.6;

              const gocs_point = mapray.GeoMath.createVector3([
                x*c2g[0] + y*c2g[4] + z*c2g[ 8] + c2g[12],
                x*c2g[1] + y*c2g[5] + z*c2g[ 9] + c2g[13],
                x*c2g[2] + y*c2g[6] + z*c2g[10] + c2g[14],
                // x*c2g[3] + y*c2g[7] + z*c2g[11] + c2g[15],
              ]);
              gocs_point[0] /= gocs_point[3];
              gocs_point[1] /= gocs_point[3];
              gocs_point[2] /= gocs_point[3];

              p.setFromGocs(gocs_point);
              points.push(p.longitude);
              points.push(p.latitude);
              points.push(p.altitude);
            }

            const render_points = [0,1,3,2,0,4,5,1,5,7,3,7,6,2,6,4].reduce<number[]>( (arr, index) => {
                arr.push(points[index*3+0]);
                arr.push(points[index*3+1]);
                arr.push(points[index*3+2]);
                return arr;
            } , [] );

            const line = new mapray.MarkerLineEntity( this.viewer.scene );
            line.setLineWidth( 2.0 );
            line.setColor( [1.0, 0.0, 0.0] );
            line.addPoints( render_points );
            this.viewer.scene.addEntity( line );

            const rInfo = this.viewer.camera.createRenderInfo();
            const vp: Float64Array[] = rInfo.volume_planes.map<number[], Float64Array>((arr: number[]) => new Float64Array(arr));

            vp.forEach( (plane, index) => {
                if ( index !== 4) return;

                const v2g = this.viewer.camera.view_to_gocs;

                // const w = index===1 ? 200 : 10;
                const w = 10;
                const Y_UP = [0, 1, 0];
                const center = [plane[0]*plane[3], plane[1]*plane[3], -plane[2]*plane[3]];

                const u = [
                  plane[1]*Y_UP[2] - plane[2]*Y_UP[1],
                  plane[2]*Y_UP[0] - plane[0]*Y_UP[2],
                  plane[0]*Y_UP[1] - plane[1]*Y_UP[0],
                ];
                const v = [
                  plane[1]*u[2] - plane[2]*u[1],
                  plane[2]*u[0] - plane[0]*u[2],
                  plane[0]*u[1] - plane[1]*u[0],
                ];
                const vpoints = [
                  [center[0]+w*plane[0], center[1]+w*plane[1], center[2]+w*plane[2]],
                  center,
                ];
                // const r = index===1 ? 200 : 10;
                const r = 10;
                const N = 20;
                for (let j=0; j<4; j++) {
                  for (let i=0; i<N+1; i++) {
                    const th = (i / N + j) * Math.PI / 2;
                    const r_cos_th = r*Math.cos(th);
                    const r_sin_th = r*Math.sin(th);
                    vpoints.push([
                        r_cos_th*u[0] + r_sin_th*v[0] + center[0],
                        r_cos_th*u[1] + r_sin_th*v[1] + center[1],
                        r_cos_th*u[2] + r_sin_th*v[2] + center[2]
                    ]);
                  }
                  vpoints.push(center);
                }

                const points = vpoints.reduce( (ps, xyz) => {
                    const [ x, y, z ] = xyz;

                    //*
                    const gocs_point = mapray.GeoMath.createVector3([
                        x*v2g[0] + y*v2g[4] + z*v2g[ 8] + v2g[12],
                        x*v2g[1] + y*v2g[5] + z*v2g[ 9] + v2g[13],
                        x*v2g[2] + y*v2g[6] + z*v2g[10] + v2g[14],
                        // x*v2g[3] + y*v2g[7] + z*v2g[11] + v2g[15],
                    ]);
                    gocs_point[0] /= gocs_point[3];
                    gocs_point[1] /= gocs_point[3];
                    gocs_point[2] /= gocs_point[3];
                    p.setFromGocs(gocs_point);
                    /*/
                    p.setFromGocs([x, y, z]);
                    //*/

                    ps.push(p.longitude);
                    ps.push(p.latitude);
                    ps.push(p.altitude);
                    return ps;
                }, []);

                const line = new mapray.MarkerLineEntity( this.viewer.scene );
                line.setLineWidth( 3.0 );
                line.setColor( [0.0, 1.0, 0.0] );
                line.addPoints( points );
                this.viewer.scene.addEntity( line );
            });
        }
        tools.appendChild(button);
      }
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

        // @ts-ignore
        var elevation = this._viewer.getElevation( this._camera_parameter.latitude, this._camera_parameter.longitude );

        var camera_matrix = this._viewer.camera.view_to_gocs
        var direction = [camera_matrix[4], camera_matrix[5], camera_matrix[6] ];
        // @ts-ignore
        var pitch = this._camera_parameter.pitch - 90;

        // ステータスバーを更新
        var statusbar = this._statusbar;
        // @ts-ignore
        statusbar.setCameraPosition( this._camera_parameter );
        statusbar.setElevation( elevation );
        statusbar.setDirection( direction, pitch );
        // @ts-ignore
        statusbar.setFovAngle( this._camera_parameter.fov );
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

        const maprayApi = new mapray.MaprayApi({
            basePath: MAPRAY_API_BASE_PATH,
            version: "v1",
            userId: MAPRAY_API_USER_ID,
            token: MAPRAY_API_ACCESS_TOKEN,
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
                            const traverse_summary = await mapray.PointCloud.requestTraverseSummary();
                            for (let i=0; i<traverse_summary.length; i++) {
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
                        type?: mapray.PointCloud.PointSizeType;
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
                        point_cloud_collection.get( i ).setDebugShader( event.value );
                    }
            });

            renderOption.onChangeAny(event => {
                    if ( ["box", "axis", "ellipsoid", "section"].indexOf( event.key ) === -1 ) return;
                    for ( let i=0; i<point_cloud_collection.length; i++ ) {
                        const pc = point_cloud_collection.get( i );
                        switch( event.key ) {
                            case "box":       pc.setDebugRenderBox( event.value ); break;
                            case "axis":      pc.setDebugRenderAxis( event.value ); break;
                            case "ellipsoid": pc.setDebugRenderEllipsoid( event.value ); break;
                            case "section":   pc.setDebugRenderSection( event.value ); break;
                        }
                    }
            });

            const log_area = document.createElement("pre");
            log_area.setAttribute("class", "log-area");
            ui.appendChild(log_area);

            const pointCloudList = [];
            const bbox_geoms: number[] = [];
            if ( mode === "raw" ) {
                const resource = maprayApi.getPointCloudDatasetAsResource( POINT_CLOUD_DATASET_ID );
                const point_cloud = point_cloud_collection.add( new mapray.RawPointCloudProvider( resource ) );
                pointCloudList.push( point_cloud );

                const datasets = await maprayApi.loadPointCloudDatasets();
                console.log( datasets );
                const dataset = await maprayApi.loadPointCloudDataset( POINT_CLOUD_DATASET_ID );
                console.log( dataset );
            }

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
