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

    // init value
    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    const atom_value = atom.checked;

    const area = <HTMLInputElement>document.getElementById("area");
    const area_value = area.value;

    appInstance = new App( container, {"enable_atmosphere": atom_value, "camera_area": area_value} );
}

function onClickCheckbox(style: string) {
    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    if (atom && appInstance) {
        appInstance.enableAtmosphere(atom.checked);
    }
}

function onChangeCamera() {
    // Selectに対するリアルタイム処理
    const elem_select = <HTMLInputElement>document.getElementById("area");
    if (elem_select && appInstance) {
        appInstance.changeCamera(elem_select.value);
    }
}

// グローバル関数に登録
// @ts-ignore
window.startApp = startApp;

// @ts-ignore
window.onClickCheckbox = onClickCheckbox;

// @ts-ignore
window.onChangeCamera = onChangeCamera;
