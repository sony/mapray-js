import mapray from "@mapray/mapray-js";
import Module from "./Module";
import Option, { DomTool } from "../Option";
import TOption, { TDomTool } from "../TOption";



export default class DemModule extends Module {

    private _init_option: DemModule.Option;

    private _ui?: HTMLElement;
    private _ui_status?: HTMLElement;
    private _toption;

    private _pin_info_map: Map<mapray.PinEntity, DemModule.PinInfo>;

    constructor( option: DemModule.Option = {} ) {
        super( "Dem" );
        this._init_option = option;

        this._pin_info_map = new Map<mapray.PinEntity, DemModule.PinInfo>();

        this._toption =  TOption.create({
            "pos_lon": {
                type: "range",
                value: 0,
                max: +180,
                min: -180,
            },
            "pos_lat": {
                type: "range",
                value: 0,
                max: +90,
                min: -90,
            },
            "pos_alt": {
                type: "range",
                value: 0,
                max: +1000000,
                min: -10000,
            },

            "area_z": {
                type: "range",
                value: 0,
                max: 30,
                min: 0,
            },
            "area_x": {
                type: "range",
                value: 0,
                max: 1073741824,
                min: 0,
            },
            "area_y": {
                type: "range",
                value: 0,
                max: 1073741824,
                min: 0,
            },

            "gocs_bbox": {
                type: "boolean",
                description: "gocsのbboxの表示切り替え",
                value: true,
            },
            "geo_bbox": {
                type: "boolean",
                description: "flakeのbboxの表示切り替え",
                value: true,
            },
            "wireframe_inner_grid": {
                type: "boolean",
                description: "ワイヤーフレームの分割線表示切り替え",
                value: true,
            },
            "ω_limit": {
                type: "range",
                description: "地形複雑度の上限を操作",
                min: 0,
                max: 6,
                value: 6,
            },
        });
    }


    protected override async doLoadData(): Promise<void>
    {
        for( const info of this._pin_info_map.values() ) {
            info.id = this.addBbox( info.place );
            this.debugViewer.addEntity( info.pin )
        }
    }


    protected async doUnloadData(): Promise<void>
    {
        for( const info of this._pin_info_map.values() ) {
            this.removeBbox( info );
            this.debugViewer.removeEntity( info.pin );
        }
    }



    protected onStatusChange( status: Module.Status ): void
    {
        super.onStatusChange( status );
    }

    override onMouseDown( point: [x: number, y: number], event: MouseEvent ): boolean
    {
        const viewer = this.debugViewer.viewer;
        const pick_result = viewer.pick( point );
        if( !pick_result ) return false;

        const geo_pos = new mapray.GeoPoint().setFromGocs( pick_result.position );
        // @ts-ignore
        const area = viewer.getFlakeAreaAt( geo_pos );
        if ( !area ) return false;


        if ( pick_result.category === mapray.Viewer.Category.GROUND ) {
            const toption = this._toption;
            if ( toption ) {
                // Update Position
                toption.set( "pos_lon", geo_pos.longitude );
                toption.set( "pos_lat", geo_pos.latitude );
                toption.set( "pos_alt", geo_pos.altitude );
                // Update Area
                toption.set( "area_z", area.z );
                toption.set( "area_x", area.x );
                toption.set( "area_y", area.y );
            }
        }

        if ( event.shiftKey && pick_result.category === mapray.Viewer.Category.GROUND ) {
            this._debugPos( geo_pos );
            return true;
        }
        else if ( event.ctrlKey && pick_result.entity instanceof mapray.PinEntity ) {
            this.debugViewer.removeEntity( pick_result.entity );
            const item = this._pin_info_map.get( pick_result.entity );
            if ( item ) {
                this.removeBbox( item );
                this._pin_info_map.delete( pick_result.entity );
                return true;
            }
        }

        return false;
    }

    private addBbox( place: Area | mapray.GeoPoint ): number
    {
        const viewer = this.debugViewer.viewer;
        if ( place instanceof mapray.GeoPoint ) {
            // @ts-ignore
            return viewer.globe.addDebugBboxForPoint( place ) as number;
        }
        else {
            // @ts-ignore
            return viewer.globe.addDebugBboxForArea( place ) as number;
        }
    }

    private removeBbox( pin_info: DemModule.PinInfo ) {
        const viewer = this.debugViewer.viewer;
        if ( pin_info.place instanceof mapray.GeoPoint ) {
            // @ts-ignore
            viewer.globe.removeDebugBboxForPoint( pin_info.id );
        }
        else {
            // @ts-ignore
            viewer.globe.removeDebugBboxForArea( pin_info.id );
        }
    }

    private _debugPos( geo_pos: mapray.GeoPoint ) {
        const viewer = this.debugViewer.viewer;
        const pin = new mapray.PinEntity( viewer.scene );
        pin.setSize([ 15, 15 ]);
        pin.setFontFamily( "Arial" );
        pin.addPin( geo_pos );
        this.debugViewer.addEntity(pin);
        const id = this.addBbox( geo_pos );
        this._pin_info_map.set( pin, {
            pin: pin,
            place: geo_pos,
            id: id,
        } );
    }


    private _debugArea( area: Area ) {
        for ( const info of this._pin_info_map.values() ) {
            if ( !( info.place instanceof mapray.GeoPoint ) && isSameArea( info.place, area) ) {
                return;
            }
        }

        const center_gocs = mapray.AreaUtil.getCenter( area, mapray.GeoMath.createVector3() );
        const geo_pos = new mapray.GeoPoint().setFromGocs( center_gocs );
        geo_pos.altitude = this.debugViewer.viewer.getElevation( geo_pos.latitude, geo_pos.longitude );

        const pin = new mapray.PinEntity( this.debugViewer.viewer.scene );
        pin.setSize([ 15, 15 ]);
        pin.setFontFamily( "Arial" );
        pin.addTextPin( area.z.toString(), geo_pos );
        this.debugViewer.addEntity(pin);
        const id = this.addBbox( area );
        this._pin_info_map.set( pin, {
            id: id,
            pin: pin,
            place: area
        } );
    }


    private _removeAllDebugItems() {
        // @ts-ignore
        this.debugViewer.viewer.globe.removeAllDebugBboxes();
        for ( const pin of this._pin_info_map.keys() ) {
            this.debugViewer.removeEntity( pin );
        }
        this._pin_info_map.clear();
    }


    override getDebugUI(): HTMLElement
    {
        if ( this._ui ) {
            return this._ui;
        }

        const toption = this._toption;

        toption.onChange("gocs_bbox", event => {
            // @ts-ignore
            this.debugViewer.viewer.globe.gocs_bbox_visibility = event.value;
        });
        // @ts-ignore
        this.debugViewer.viewer.globe.gocs_bbox_visibility = this._toption.get("gocs_bbox");
        toption.onChange("geo_bbox", event => {
            // @ts-ignore
            this.debugViewer.viewer.globe.geo_bbox_visibility = event.value;
        });
        // @ts-ignore
        this.debugViewer.viewer.globe.geo_bbox_visibility = this._toption.get("geo_bbox");
        toption.onChange("wireframe_inner_grid", event => {
            // @ts-ignore
            this.debugViewer.viewer.wireframe_inner_grid_visibility = event.value;
        });
        toption.onChange("ω_limit", event => {
            this.debugViewer.viewer.setOmagaLimit( event.value );
        });


        const ui = this._ui = super.getDebugUI();

        const remove_all = document.createElement("div");
        remove_all.setAttribute("class", "top");
        remove_all.appendChild(TDomTool.createButton("Remove All", {
            onclick: event => {
                this._removeAllDebugItems();
            },
        }));

        const geo_point_log = document.createElement("div");
        geo_point_log.style.marginTop = "5px";
        geo_point_log.setAttribute("class", "top");
        geo_point_log.appendChild( document.createTextNode( "Position: " ) );
        geo_point_log.appendChild( TDomTool.createButton("Debug this position", {
            onclick: async (event) => {
                const geo_pos = new mapray.GeoPoint( toption.get( "pos_lon" ), toption.get( "pos_lat" ), toption.get( "pos_alt" ) );
                this._debugPos( geo_pos );
            },
        } ) );
        {
            const values = document.createElement( "div" );
            values.style.margin = "0 0 10px 30px";
            geo_point_log.appendChild( values );
            values.appendChild( document.createTextNode( "lon:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "pos_lon" ) ) );
            values.appendChild( document.createTextNode( "lat:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "pos_lat" ) ) );
            values.appendChild( document.createTextNode( "alt:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "pos_alt" ) ) );
        }

        const area_log = document.createElement("div");
        area_log.setAttribute("class", "top");
        area_log.appendChild( document.createTextNode( "Flake: " ) );
        area_log.appendChild( TDomTool.createButton("Debug this flake", {
            onclick: async (event) => {
                const area = {
                    z: toption.get( "area_z" ),
                    x: toption.get( "area_x" ),
                    y: toption.get( "area_y" ),
                };
                this._debugArea( area );
            },
        }));
        {
            const values = document.createElement( "div" );
            values.style.margin = "0 0 10px 30px";
            area_log.appendChild( values );
            values.appendChild( document.createTextNode( "z:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "area_z" ) ) );
            values.appendChild( document.createTextNode( "x:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "area_x" ) ) );
            values.appendChild( document.createTextNode( "y:" ) );
            values.appendChild( TDomTool.createNumberOption( toption.getProperty( "area_y" ) ) );
        }

        const control = document.createElement("div");
        control.setAttribute("class", "top");
        control.append( TDomTool.createCheckboxOption( toption.getProperty("gocs_bbox") ) );
        control.append( TDomTool.createCheckboxOption( toption.getProperty("geo_bbox") ) );
        control.append( TDomTool.createCheckboxOption( toption.getProperty("wireframe_inner_grid") ) );
        control.appendChild(TDomTool.createSliderOption(toption.getProperty( "ω_limit" ), { mode: "key-value-table-row" }));

        ui.appendChild( geo_point_log );
        ui.appendChild( area_log );
        ui.appendChild( remove_all );
        ui.appendChild( document.createElement("hr"));
        ui.appendChild( control );

        return ui;
    }

}



namespace DemModule {



export interface Option {
}

export interface PinInfo {
    pin: mapray.PinEntity;
    place: Area | mapray.GeoPoint;
    id: number;
}


} // namespace DemModule


function isSameArea(areaA: Area, areaB: Area): boolean
{
    return areaA.z === areaB.z && areaA.x === areaB.x && areaA.y === areaB.y;
}

type Area =  { z: number, x: number, y: number };
