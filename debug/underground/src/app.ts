import UndergroundViewer from './UndergroundViewer';


class App {

    private _viewer: UndergroundViewer;


    constructor( container: HTMLElement | string )
    {
        this._viewer = new UndergroundViewer( container );
    }


    destroy(): void
    {
        this._viewer.destroy();
    }

}


export default App;
