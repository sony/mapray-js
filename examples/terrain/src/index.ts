import '@mapray/ui/dist/mapray.css';
import App from './app';
import { default_config, getCameraInfoFromLocation } from "./config";

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

    _setDefaultDateInfo( location.value );

    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    const atom_value = atom.checked;

    appInstance = new App( container, {"location": location_value, "surface": surface_value , "enable_atmosphere": atom_value } );
}

function onChangeLocation() {
    const elem_select = <HTMLInputElement>document.getElementById("location");
    if (elem_select && appInstance) {
        _setDefaultDateInfo( elem_select.value );
        appInstance.changeLocation(elem_select.value);
    }
}

function onChangeSurface() {
    const elem_select = <HTMLInputElement>document.getElementById("surface");
    if ( elem_select && appInstance ) {
        appInstance.changeSurface(elem_select.value);
    }
}

function onClickCheckAtmosphere() {
    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    if ( atom && appInstance ) {
        appInstance.enableAtmosphere(atom.checked);
    }
}

function onChangeDateTime() {
    const input_date = <HTMLInputElement>document.getElementById( "simulate-date" );
    const input_time = <HTMLInputElement>document.getElementById( "simulate-time" );
    const elem_select = <HTMLInputElement>document.getElementById("location");
    if ( input_date && input_time && elem_select && appInstance ) {
        const location_index = getCameraInfoFromLocation( elem_select.value );
        if ( location_index < 0 ) {
            throw new Error("the initial value of location has any problem");
        }
        const input_timezone = <HTMLInputElement>document.getElementById( "simulate-timezone" );
        input_timezone.value = default_config[location_index].timezone;

        const date_array = input_date.value.split( "-" );
        const time_array = input_time.value.split( ":" );
        appInstance.changeDateTime( Number(date_array[0]), Number(date_array[1]), Number(date_array[2]), Number(time_array[0]), Number(time_array[1]), elem_select.value );
    }
}

//set default Datainfo
function _setDefaultDateInfo( location: string ) {
    const location_index = getCameraInfoFromLocation( location );
    if ( location_index < 0 ) {
        throw new Error("the initial value of location has any problem");
    }
    const input_date = <HTMLInputElement>document.getElementById( "simulate-date" );
    input_date.value = default_config[location_index].year + '-' + _getDNumber( default_config[location_index].month ) + '-' + _getDNumber( default_config[location_index].day );

    const input_time = <HTMLInputElement>document.getElementById( "simulate-time" );
    input_time.value = _getDNumber( default_config[location_index].hour ) + ':' + _getDNumber( default_config[location_index].minute );

    const input_timezone = <HTMLInputElement>document.getElementById( "simulate-timezone" );
    input_timezone.value = default_config[location_index].timezone;
}

function _getDNumber( src: number ) {
    return ("0" + src).slice(-2);
}

function onStartDayAnimation() {
 console.log('play');
    const player = document.getElementById( "player-sun" );

    const icon = document.getElementById("player-play-start");

    if ( player ) {
        const child_id = player.firstChild.id;

        if (icon) {
            icon.innerHTML = '<button id="player-play-stop" onclick="(function(){window.onStartDayAnimation();})();"><img src="./resources/icon/pause_circle_filled-24px.svg" width="64" height="64" uk-svg></button>'
        } else {
            const stop = document.getElementById("player-play-stop");
            if (stop) {
                stop.innerHTML = '<button id="player-play-start" onclick="(function(){window.onStartDayAnimation();})();"><img src="./resources/icon/play_circle_filled-24px.svg" width="64" height="64" uk-svg></button>'
            }
        }
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
// @ts-ignore
window.onChangeDateTime = onChangeDateTime;
// @ts-ignore
window.onStartDayAnimation = onStartDayAnimation;
