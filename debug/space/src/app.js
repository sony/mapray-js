import SpaceApp from './SpaceApp';

class App {
    constructor( container ) {
        this._container = container;
        this._current = new SpaceApp(this._container);
    }
}

export default App;
