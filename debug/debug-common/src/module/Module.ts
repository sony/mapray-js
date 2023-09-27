import DebugViewer from "../DebugViewer";
import Option, { DomTool } from "../Option";



class Module {
    private _name: string;
    private _status: Module.Status;
    private _loadable: boolean;

    private _debugViewer!: DebugViewer;

    private _ui_cache: {
        tool: HTMLElement,
        loadButton: HTMLButtonElement,
        unloadButton: HTMLButtonElement,
    };

    constructor( name: string, loadable: boolean = true ) {
        this._name = name;
        this._status = Module.Status.NOT_LOADED;
        this._loadable = loadable;

        const tool  = document.createElement( "span" );
        tool.style.marginLeft = "10px";

        const loadButton = DomTool.createButton("Load", {
                onclick: async event => {
                    await this.loadData();
                },
        });
        const unloadButton = DomTool.createButton("Unload", {
                onclick: async event => {
                    await this.unloadData();
                },
        });
        if ( loadable ) {
            tool.appendChild( loadButton );
        }

        this._ui_cache = { tool, loadButton, unloadButton };
    }


    get name(): string
    {
        return this._name;
    }


    isLoaded(): boolean
    {
        return this._status === Module.Status.LOADED;
    }

    getToolBar(): HTMLElement {
        return this._ui_cache.tool;
    }


    protected get debugViewer(): DebugViewer {
        return this._debugViewer;
    }


    async init( debugViewer: DebugViewer ): Promise<void>
    {
        this._debugViewer = debugViewer;
    }


    private _setStatus( status: Module.Status ): void
    {
        if ( this._status === status ) {
            return;
        }
        this._status = status;
        this.onStatusChange( status );
    }


    protected onStatusChange( status: Module.Status ): void
    {
        const { tool, loadButton, unloadButton } = this._ui_cache;
        if ( this._loadable ) {
            while ( tool.firstChild ) tool.firstChild.remove();
            switch ( status ) {
                case Module.Status.NOT_LOADED: { tool.appendChild( loadButton ); break; }
                case Module.Status.LOADED:     {
                    tool.appendChild( unloadButton );
                    tool.appendChild( this.getDebugUI() );
                    break;
                }
                case Module.Status.LOADING:    { tool.innerText = "Loading...";    break; }
                case Module.Status.UNLOADING:  { tool.innerText = "Unloading...";  break; }
                case Module.Status.ERROR:      { tool.innerText = "Error";         break; }
            }
        }
    }


    async loadData(): Promise<void>
    {
        if ( this._status !== Module.Status.NOT_LOADED ) {
            return;
        }
        this._setStatus( Module.Status.LOADING );
        try {
            await this.doLoadData();
            this._setStatus( Module.Status.LOADED );
        }
        catch( e ) {
            console.log( e );
            this._setStatus( Module.Status.ERROR );
        }
    }

    protected async doLoadData(): Promise<void>
    {
    }


    async unloadData(): Promise<void>
    {
        if ( this._status !== Module.Status.LOADED ) {
            return;
        }
        this._setStatus( Module.Status.UNLOADING );
        try {
            await this.doUnloadData();
        }
        catch( e ) {
            // skip error
        }
        this._setStatus( Module.Status.NOT_LOADED );
    }

    protected async doUnloadData(): Promise<void>
    {
    }



    async destroy(): Promise<void>
    {
    }


    /**
     * DebugUIのルート要素を作成
     * @param name
     * @returns
     */
    createUI(): HTMLElement
    {
        const ui = document.createElement( "div" );
        if ( !this._loadable || this._status === Module.Status.LOADED ) {
            ui.appendChild( this.getDebugUI() );
        }
        return ui;
    }


    /**
     * DebugUIを作成。
     * @param name
     * @returns
     */
    getDebugUI(): HTMLElement
    {
        return document.createElement( "div" );
    }


    onMouseDown( point: [x: number, y: number], event: MouseEvent ): boolean
    {
        return false;
    }

    onMouseUp( point: [x: number, y: number], event: MouseEvent ): boolean
    {
        return false;
    }

    onMouseMove( point: [x: number, y: number], event: MouseEvent ): boolean
    {
        return false;
    }


    onKeyDown( event: KeyboardEvent ): boolean
    {
        return false;
    }


    updateFrame( delta_time: number ): void
    {
    }

}



namespace Module {



export const enum Status {
    NOT_LOADED,
    LOADING,
    LOADED,
    UNLOADING,
    ERROR,
}



}



export default Module;
