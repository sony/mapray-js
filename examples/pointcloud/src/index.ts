import '@mapray/ui/mapray.css';
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

    const render = <HTMLInputElement>document.getElementById("render-style");
    const render_value = render.value;

    const size = <HTMLInputElement>document.getElementById("render-size");
    const size_value = size.value;



    appInstance = new App( container, {"location": location_value, "surface": surface_value , "style": render_value, "size": size_value} );
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

function onChangePointCloudStyle() {
    const elem_select = <HTMLInputElement>document.getElementById("render-style");
    if (elem_select && appInstance) {
        appInstance.changePointCloudStyle(elem_select.value);
    }
}

function onChangePointCloudSize() {
    const elem_select = <HTMLInputElement>document.getElementById("render-size");
    if (elem_select && appInstance) {
        appInstance.changePointCloudSize(elem_select.value);
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
window.onChangePointCloudStyle = onChangePointCloudStyle;
// @ts-ignore
window.onChangePointCloudSize = onChangePointCloudSize;
