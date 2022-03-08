import TerrainViewer, { InitValue }  from './TerrainViewer';


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

    changeSurface( surface: string ) {
        this._current.selectSurface( surface );
    }

    changeDateTime( year: number, month: number, day: number, hour: number, minute: number, location: string ) {
        this._current.selectDateTime( year, month, day, hour, minute, location );
    }

    enableAtmosphere(enable: boolean) {
        this._current.enableAtmosphere(enable);
    }

    destroy() {

    }
}

export default App;
