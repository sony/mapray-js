import mapray, { Viewer } from "@mapray/mapray-js";

import Module from "./Module";
import DebugViewer from "../DebugViewer";
import Option, { DomTool } from "../Option";



const OPTION_PROPERTIES = [
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



export default class PointCloudModule extends Module {

    private _init_option: PointCloudModule.Option;

    private _option: Option;

    private _point_cloud_mode?: string;

    private _ui?: HTMLElement;
    private _top?: HTMLElement;
    private _top2?: HTMLElement;
    private _log_area?: HTMLElement;

    constructor( option: PointCloudModule.Option = {} ) {
        super( "PointCloud" );
        this._option = new Option( OPTION_PROPERTIES );
        this._init_option = option;
    }


    protected override async doLoadData(): Promise<void>
    {
        if ( this._init_option.datasets ) {
            for ( const dataset of this._init_option.datasets ) {
                await this.debugViewer.addPointCloud( dataset );
            }
        }
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const ui = super.getDebugUI();

        const point_cloud_collection = this.debugViewer.viewer.point_cloud_collection;
        const mode = this._point_cloud_mode;

        const top = document.createElement("div") as HTMLDivElement;

        const items = ["raw"];

        top.appendChild(DomTool.createSelect(items, {
                    initialValue: mode,
                    onchange: (event) => {
                        this._point_cloud_mode = event;
                        // this._changePointCloudMode();
                    },
        }));
        ui.appendChild( top );

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

        const option = this._option;
        top2.appendChild(DomTool.createCheckboxOption(option, "box"));
        top2.appendChild(DomTool.createCheckboxOption(option, "section"));
        top2.appendChild(DomTool.createCheckboxOption(option, "ellipsoid"));
        top2.appendChild(DomTool.createCheckboxOption(option, "axis"));
        top2.appendChild(DomTool.createSelectOption(option, "point size"));
        top2.appendChild(DomTool.createSelectOption(option, "point size limit"));
        top2.appendChild(DomTool.createSelectOption(option, "point shape"));
        top2.appendChild(DomTool.createCheckboxOption(option, "debug shader"));
        top2.appendChild(DomTool.createSelectOption(option, "points per pixel"));

        // Register Handler for the properties
        option.onChange("point shape", event => {
                for ( let i=0; i<point_cloud_collection.length; i++ ) {
                    point_cloud_collection.get( i ).setPointShape( event.value );
                }
        });

        option.onChange("point size", event => {
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

        option.onChange("points per pixel", event => {
                for ( let i=0; i<point_cloud_collection.length; i++ ) {
                    point_cloud_collection.get( i ).setPointsPerPixel( event.value );
                }
        });

        option.onChange("point size limit", event => {
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

        option.onChange("debug shader", event => {
                for ( let i=0; i<point_cloud_collection.length; i++ ) {
                    // @ts-ignore
                    point_cloud_collection.get( i ).setDebugShader( event.value );
                }
        });

        option.onChangeAny(event => {
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
        ui.appendChild( top2 );

        if ( !this._log_area ) {
            const log_area = document.createElement("pre");
            log_area.setAttribute("class", "log-area");

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
            this._log_area = log_area;
        }
        if ( this._log_area ) {
            ui.appendChild( this._log_area );
        }

        return this._ui = ui;
    }
}



function getPointShapeText( pointShapeType: mapray.PointCloud.PointShapeType ): string
{
    switch ( pointShapeType ) {
        case mapray.PointCloud.PointShapeType.RECTANGLE:          return "Rectangle";
        case mapray.PointCloud.PointShapeType.CIRCLE:             return "Circle";
        case mapray.PointCloud.PointShapeType.CIRCLE_WITH_BORDER: return "Circle with Border";
        case mapray.PointCloud.PointShapeType.GRADIENT_CIRCLE:    return "Gradient";
    }
}


namespace PointCloudModule {



export interface Option {
    datasets?: string[];
}



}
