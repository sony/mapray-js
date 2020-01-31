import AppClass from "./NextRambler";


// 現在のアプリインスタンス
var appInstance;


/**
 * アプリを開始
 * @param  {string|Element} container  コンテナ (ID または要素)
 */
function startApp( container )
{
    appInstance = new AppClass( container );
}


// グローバル関数に登録
window.startApp = startApp;
