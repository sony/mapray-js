import '../../../packages/ui/dist/mapray.css';


import DatasetViewer from './DatasetViewer';



export async function startApp( container: HTMLElement | string ) {
    if ( viewerInstance ) {
        viewerInstance.destroy();
    }
    viewerInstance = new DatasetViewer( container );
    viewerInstance.init();
}



let viewerInstance: DatasetViewer | undefined;
