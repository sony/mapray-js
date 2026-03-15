import '../../../packages/ui/dist/mapray.css';
import App from './app';

let appInstance: App | undefined;


function startApp( container: HTMLElement | string )
{
    if ( appInstance ) {
        appInstance.destroy();
        appInstance = undefined;
    }

    appInstance = new App( container );
}


// @ts-ignore
window.startApp = startApp;
