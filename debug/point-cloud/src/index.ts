import '../../../packages/ui/dist/mapray.css';
import App from './app';

// 現在のアプリインスタンス
var appInstance: App | undefined;


/**
 * アプリを開始
 * @param  {string|Element} container  コンテナ (ID または要素)
 */
function startApp( container: HTMLElement | string )
{
    if ( appInstance ) {
        // すでに動作していれば停止して消去
        appInstance.destroy();
        appInstance = undefined;
    }
    appInstance = new App( container );
}



// グローバル関数に登録
// @ts-ignore
window.startApp = startApp;
