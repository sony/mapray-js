import SampleTemplate from './SampleTemplate';


class App {

    private _container: HTMLElement | string;

    private _current: SampleTemplate;

    constructor( container: HTMLElement | string ) {
        this._container = container;
        this._current = new SampleTemplate(this._container);
    }

    destroy() {

    }
}

export default App;
