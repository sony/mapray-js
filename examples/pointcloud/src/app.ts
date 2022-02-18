import PointCloudTileViewer, { InitValue }  from './PointCloudTileViewer';


class App {

    private _container: HTMLElement | string;

    private _current: PointCloudTileViewer;

    constructor( container: HTMLElement | string, initvalue: InitValue ) {
        this._container = container;
        this._current = new PointCloudTileViewer(this._container, initvalue);
    }

    changeLocation( location: string ) {
        this._current.selectLocation( location );
    }

    changeSurface( surface: string ) {
        this._current.selectSurface( surface );
    }

    changePointCloudStyle( style: string ) {
        this._current.selectPointCloudRenderStyle( style );
    }

    changePointCloudSize( size: string ) {
        this._current.selectPointCloudSize( size );
    }

    destroy() {

    }
}

export default App;
