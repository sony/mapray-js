import '@mapray/ui/dist/mapray.css';
import App from './app';
import { default_config, getCameraInfoFromLocation } from "./config";
import app from "./app";

// 現在のアプリインスタンス
var appInstance: App | undefined;

const play_icon = "play_circle_filled-24px.svg";
const pause_icon = "pause_circle_filled-24px.svg";
const resource_path = "./resources/icon/";

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

    const elem_range = <HTMLInputElement>document.getElementById("range");
    const speed_value = Number(elem_range.value);

    const date_time_info = _getDate();
    if( date_time_info && date_time_info.length == 3 ) {
        const date_array = date_time_info[0];
        const time_array = date_time_info[1];

        appInstance = new App(container, {
            "location": location_value,
            "surface": surface_value,
            "enable_atmosphere": atom_value,
            "date_time": {
                year: Number(date_array[0]),
                month:Number(date_array[1]),
                day: Number(date_array[2]),
                hour: Number(time_array[0]),
                minute: Number(time_array[1])
            },
            "sun_speed": speed_value
        });
    }
}

function onChangeLocation() {
    const elem_select = <HTMLInputElement>document.getElementById("location");
    if (elem_select && appInstance) {
        _setDefaultDateInfo( elem_select.value );
        appInstance.changeLocation(elem_select.value);
    }
}

function onChangeSurface() {


    const elem_surface = <HTMLInputElement>document.getElementById("surface");
    const surface = elem_surface!.value;

    const elem_location = <HTMLInputElement>document.getElementById("location");
    const location = elem_location.value;

    const elem_atom = <HTMLInputElement>document.getElementById("AtmoON");
    const isAtom = elem_atom.checked;

    const date_time_info = _getDate();

    const elem_range = <HTMLInputElement>document.getElementById("range");
    const speed_value =Number(elem_range.value);


    if ( date_time_info && date_time_info.length == 3 && appInstance ) {
        const date_array = date_time_info[0];
        const time_array = date_time_info[1];

        appInstance.changeSurface( {
            "location": location,
            "surface": surface,
            "enable_atmosphere": isAtom,
            "date_time": {
                year: Number(date_array[0]),
                month:Number(date_array[1]),
                day: Number(date_array[2]),
                hour: Number(time_array[0]),
                minute: Number(time_array[1])
            },
            "sun_speed": speed_value
        });
    }
}

function onClickCheckAtmosphere() {
    const atom = <HTMLInputElement>document.getElementById("AtmoON");
    if ( atom && appInstance ) {
        appInstance.enableAtmosphere(atom.checked);
    }
}

function onChangeDateTime() {
    const date_time_info = _getDate();
    if( date_time_info && date_time_info.length == 3 && appInstance ) {
        const date_array = date_time_info[0];
        const time_array = date_time_info[1];
        const location = date_time_info[2] as string;
        appInstance.changeDateTime( Number(date_array[0]), Number(date_array[1]), Number(date_array[2]), Number(time_array[0]), Number(time_array[1]), location );
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

function _getDate() {
    const input_date = <HTMLInputElement>document.getElementById( "simulate-date" );
    const input_time = <HTMLInputElement>document.getElementById( "simulate-time" );
    const elem_select = <HTMLInputElement>document.getElementById("location");
    if ( input_date && input_time && elem_select ) {
        const location_index = getCameraInfoFromLocation(elem_select.value);
        if (location_index < 0) {
            throw new Error("the initial value of location has any problem");
        }
        const input_timezone = <HTMLInputElement>document.getElementById("simulate-timezone");
        input_timezone.value = default_config[location_index].timezone;

        const date_array = input_date.value.split("-");
        const time_array = input_time.value.split(":");
        return [date_array, time_array, elem_select.value as string];
    }
    return null;
}

function onStartDayAnimation() {
    const icon_img = <HTMLImageElement>document.getElementById("sun-player-icon");
    if ( icon_img && appInstance ) {
        let next_start = true;
        if (icon_img.src.split("/").pop() == play_icon) {
            icon_img.src = resource_path + pause_icon;
        } else {
            next_start = false;
            icon_img.src = resource_path + play_icon;
        }
        const date_time_info = _getDate();
        if( date_time_info && date_time_info.length == 3 ) {
            const date_array = date_time_info[0];
            const time_array = date_time_info[1];
            const location = date_time_info[2] as string;
            appInstance.sunAnimation( next_start, Number(date_array[0]), Number(date_array[1]), Number(date_array[2]), Number(time_array[0]), Number(time_array[1]), location, updateSunAnimation );
        }
    }
}

function updateSunAnimation( year: number, month: number, day: number, hour: number, minute: number ) {
    const input_date = <HTMLInputElement>document.getElementById( "simulate-date" );
    const input_time = <HTMLInputElement>document.getElementById( "simulate-time" );
    input_date.value = String(year) + "-" + _getDNumber(month) + "-" + _getDNumber(day);
    input_time.value = _getDNumber(hour) + ":" + _getDNumber(minute);
}

// Rangeに対するリアルタイム処理
const elem_range = <HTMLInputElement>document.getElementById("range")!;
const target_range = document.getElementById("range-output")!;

let rangeValue = (elem : HTMLInputElement, target : HTMLElement) => {
    return function() {
        if ( appInstance ) {
            appInstance.changeSunAnimationSpeed( Number( elem.value ) * 500 );
        }
        target.innerHTML = elem.value;
    }
}
elem_range.addEventListener( "input", rangeValue( elem_range, target_range ) );


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
