import '../../../packages/ui/dist/mapray.css';


import DatasetViewer from './DatasetViewer';


function getContainer( containerOrId: HTMLElement | string ) {
    const container = (
        typeof(containerOrId) === "string" ? document.getElementById(containerOrId) :
        containerOrId
    );
    if ( !container ) {
        throw new Error( "element not found: " + containerOrId );
    }
    return container;
}


export async function startApp( containerOrId: HTMLElement | string, options?: DatasetViewer.Option ) {
    const container = getContainer( containerOrId );

    let viewerInstance = loadStatusMap.get( container );
    if ( viewerInstance ) {
        viewerInstance.destroy();
        loadStatusMap.delete( container );
    }
    viewerInstance = new DatasetViewer( container, options );
    viewerInstance.init();
    loadStatusMap.set( container, viewerInstance );
    return viewerInstance;
}


export async function stopApp( containerOrId: HTMLElement | string ) {
    const container = getContainer( containerOrId );

    let viewerInstance = loadStatusMap.get( container );
    if ( viewerInstance ) {
        viewerInstance.destroy();
        loadStatusMap.delete( container );
    }
}


const loadStatusMap = new Map<HTMLElement, DatasetViewer>();
