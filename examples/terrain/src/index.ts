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
    const surface = <HTMLInputElement>document.getElementById("surface");
    const surface_value = surface.value;

    const location = <HTMLInputElement>document.getElementById("location");
    const location_value = location.value;

    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    const atom_value = atom.checked;

    appInstance = new App( container, {"location": location_value, "surface": surface_value , "enable_atmosphere": atom_value } );
}

function onChangeLocation() {
    const elem_select = <HTMLInputElement>document.getElementById("location");
    if (elem_select && appInstance) {
        appInstance.changeLocation(elem_select.value);
    }
}

function onChangeSurface() {
    const elem_select = <HTMLInputElement>document.getElementById("surface");
    if (elem_select && appInstance) {
        appInstance.changeSurface(elem_select.value);
    }
}

function onClickCheckAtmosphere() {
    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    if (atom && appInstance) {
        appInstance.enableAtmosphere(atom.checked);
    }
}

// グローバル関数に登録
// @ts-ignore
window.startApp = startApp;
// @ts-ignore
window.onChangeLocation = onChangeLocation;
// @ts-ignore
window.onChangeSurface = onChangeSurface;
// @ts-ignore
window.onClickCheckAtmosphere = onClickCheckAtmosphere;
