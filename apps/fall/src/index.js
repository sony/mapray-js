import '../../../packages/ui/dist/mapray.css';
import Fall from "./Fall";
import Turn from "./Turn";


// 現在のアプリインスタンス
var appInstance;


/**
 * アプリを開始
 * @param  {string|Element} container  コンテナ (ID または要素)
 */
function startApp( container, type )
{
    if ( appInstance ) {
        // すでに動作していれば停止して消去
        appInstance.destroy();
        appInstance = null;
    }
    if (type === "fall") {
        appInstance = new Fall( container );
    }
    else if (type === "turn") {
        appInstance = new Turn( container );
    }
    else {
        console.log("type not found: " + type);
    }
}


// グローバル関数に登録
window.startApp = startApp;
