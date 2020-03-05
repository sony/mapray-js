import NextRamber from './NextRambler';
import maprayui from "../../../packages/ui/dist/es/maprayui.js";

class App {
    constructor( container ) {
        this._container = container;
        this._current = new NextRamber(this._container);
    }
}

export default App;