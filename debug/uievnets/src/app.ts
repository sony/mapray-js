import AppViewer from './AppViewer';

class App {

    private _container: string | HTMLElement;

    private _current: AppViewer;


    constructor( container: string | HTMLElement ) {
        this._container = container;
        this._current = new AppViewer( this._container );
    }

    destroy() {
        this._current.destroy();
    }
}

export default App;
