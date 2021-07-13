import mapray from "@mapray/mapray-js";

import PointCloudViewer from './PointCloudViewer';


class App {

    private _container: HTMLElement | string;

    private _current: PointCloudViewer;

    constructor( container: HTMLElement | string ) {
        this._container = container;
        this._current = new PointCloudViewer(this._container);
    }

    destroy() {

    }
}

export default App;