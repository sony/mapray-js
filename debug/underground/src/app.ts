import UndergroundViewer from './UndergroundViewer';


class App {

    private _viewer: UndergroundViewer;

    private readonly _wireframe_button: HTMLButtonElement;

    private readonly _on_click_wireframe_button: () => void;


    constructor( container: HTMLElement | string )
    {
        this._viewer = new UndergroundViewer( container );
        const button = document.getElementById( "wireframe-toggle" );
        if ( !(button instanceof HTMLButtonElement) ) {
            throw new Error( "wireframe toggle button not found" );
        }
        this._wireframe_button = button;
        this._on_click_wireframe_button = () => {
            this._viewer.toggleRenderMode();
            this._syncWireframeButtonLabel();
        };
        this._wireframe_button.addEventListener( "click", this._on_click_wireframe_button );
        this._syncWireframeButtonLabel();
    }


    destroy(): void
    {
        this._wireframe_button.removeEventListener( "click", this._on_click_wireframe_button );
        this._viewer.destroy();
    }


    private _syncWireframeButtonLabel(): void
    {
        this._wireframe_button.textContent =
            this._viewer.isWireframeMode() ? "Surface" : "Wireframe";
    }

}


export default App;
