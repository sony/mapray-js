import NextRamber from './NextRambler';

class App {
    constructor( container ) {
        this._container = container;
        this._current = new NextRamber(this._container);
    }
}

export default App;