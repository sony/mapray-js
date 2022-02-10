import '@mapray/ui/dist/mapray.css';
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

const elem = <HTMLInputElement>document.getElementById('range')!;
const target = document.getElementById('range-output')!;

let rangeValue = (elem : HTMLInputElement, target : HTMLElement) => {
    return function() {
        if (appInstance) {
            appInstance.changeLodFactor(elem.value);
        }
        target.innerHTML = elem.value;
    }
}
elem.addEventListener('input', rangeValue(elem, target));

// グローバル関数に登録
// @ts-ignore
window.startApp = startApp;

