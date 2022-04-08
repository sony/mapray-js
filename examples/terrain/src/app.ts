import TerrainViewer, { InitValue }  from './TerrainViewer';
import { updateDateInterface } from "./config";
import mapray from "@mapray/mapray-js";
import BingMapsImageProvider from "./BingMapsImageProvider";

class App {

    private _container: HTMLElement | string;

    private _current: TerrainViewer;

    constructor( container: HTMLElement | string, initvalue: InitValue ) {
        this._container = container;
        this._current = new TerrainViewer(this._container, initvalue);
    }

    changeLocation( location: string ) {
        this._current.selectLocation( location );
    }

    changeSurface( initvalue: InitValue ) {
        if (this._current) {
            this._current.destroy();
        }

        this._current = new TerrainViewer( this._container, initvalue )
    }

    changeDateTime( year: number, month: number, day: number, hour: number, minute: number, location: string ) {
        this._current.selectDateTime( year, month, day, hour, minute, location );
    }

    enableAtmosphere(enable: boolean) {
        this._current.enableAtmosphere(enable);
    }

    destroy() {

    }

    sunAnimation( start: boolean, year: number, month: number, day: number, hour: number, minute: number, location: string, callback: updateDateInterface ) {
        this._current.sunAnimation( start, year, month, day, hour, minute, location, callback );
    }

    changeSunAnimationSpeed( factor: number ) {
        this._current.changeSunAnimationSpeed( factor );
    }




}

export default App;
