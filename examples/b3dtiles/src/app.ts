import B3dTileViewer, { InitValue } from './B3dTileViewer';


class App {

    private _container: HTMLElement | string;

    private _current: B3dTileViewer;

    constructor( container: HTMLElement | string, initvalue: InitValue ) {
        this._container = container;
        this._current = new B3dTileViewer(this._container, initvalue);
    }

    enableAtmosphere(enable: boolean) {
        this._current.enableAtmosphere(enable);
    }

    changeCamera(area: string) {
        this._current.moveCameraPosition(area);
    }

    destroy() {

    }
}

export default App;
