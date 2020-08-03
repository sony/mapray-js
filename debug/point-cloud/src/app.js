import PointCloudViewer from './PointCloudViewer';

class App {
    constructor( container ) {
        this._container = container;
        this._current = new PointCloudViewer(this._container);
    }
}

export default App;