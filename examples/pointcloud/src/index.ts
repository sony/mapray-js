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

function onClickRadio(style: string) {
    if ( appInstance ) {
        console.log("OnClickRadio:" + style);
    }
}

function onClickCheckbox(style: string) {
    const cba = <HTMLInputElement>document.getElementById("cbA");
    const cbb = <HTMLInputElement>document.getElementById("cbB");
    if (cba) {
        console.log("OnClickCheckbox A:" + cba.checked);
    }
    if (cbb) {
        console.log("OnClickCheckbox B:" + cbb.checked);
    }
}

function onChangeSelect() {
    // Selectに対するリアルタイム処理
    const elem_select = <HTMLInputElement>document.getElementById("select0102");
    if (elem_select) {
        console.log("onChangeSelect:" + elem_select.value)
    }
}

// Rangeに対するリアルタイム処理
const elem_range = <HTMLInputElement>document.getElementById("range")!;
const target_range = document.getElementById("range-output")!;

let rangeValue = (elem : HTMLInputElement, target : HTMLElement) => {
    return function() {
        if (appInstance) {
            // appInstance.hoge(elem.value);
        }
        target.innerHTML = elem.value;
    }
}
elem_range.addEventListener("input", rangeValue(elem_range, target_range));

// グローバル関数に登録
// @ts-ignore
window.startApp = startApp;
// @ts-ignore
window.onClickRadio = onClickRadio;
// @ts-ignore
window.onClickCheckbox = onClickCheckbox;
// @ts-ignore
window.onChangeSelect = onChangeSelect;
