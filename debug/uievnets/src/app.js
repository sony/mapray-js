import AppViewer from './AppViewer';

class App {
    constructor( container ) {
        this._container = container;
        this._current = new AppViewer(this._container);
    }
}

export default App;
