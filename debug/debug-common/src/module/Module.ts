import DebugViewer from "../DebugViewer";



class Module {
    private _name: string;
    private _status: Module.Status;

    private _debugViewer!: DebugViewer;


    constructor( name: string ) {
        this._name = name;
        this._status = Module.Status.NOT_LOADED;
    }


    get name(): string
    {
        return this._name;
    }


    protected get debugViewer(): DebugViewer {
        return this._debugViewer;
    }


    async init( debugViewer: DebugViewer ): Promise<void>
    {
        this._debugViewer = debugViewer;
    }


    async loadData(): Promise<void>
    {
        if ( this._status !== Module.Status.NOT_LOADED ) {
            return;
        }
        try {
            await this.doLoadData();
            this._status = Module.Status.LOADED;
        }
        catch( e ) {
            this._status = Module.Status.ERROR;
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
        try {
            await this.doUnloadData();
        }
        catch( e ) {
            // skip error
        }
        this._status = Module.Status.NOT_LOADED;
    }

    protected async doUnloadData(): Promise<void>
    {
    }



    async destroy(): Promise<void>
    {
    }


    getDebugUI(): HTMLElement
    {
        return document.createElement( "div" );
    }


    updateFrame( delta_time: number ): void
    {
    }

}



namespace Module {



export enum Status {
    NOT_LOADED,
    LOADING,
    LOADED,
    ERROR,
}



}



export default Module;
