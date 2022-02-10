import B3dTileViewer from './B3dTileViewer';


class App {

    private _container: HTMLElement | string;

    private _current: B3dTileViewer;

    constructor( container: HTMLElement | string ) {
        this._container = container;
        this._current = new B3dTileViewer(this._container);
    }

    changeLodFactor(factor: string) {
        this._current.setLodFactor(factor)
    }

    destroy() {

    }
}

export default App;
