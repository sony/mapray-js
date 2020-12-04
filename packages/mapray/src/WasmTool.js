/**
 * @summary WebAssembly 関連のツール
 *
 * @hideconstructor
 * @memberof mapray
 * @private
 */
class WasmTool {

    /**
     * @summary WebAssembly.Module インスタンスを生成
     *
     * @param {string} wasm_base64  wasm バイナリを base64 化した文字列
     *
     * @return {Promise.<WebAssembly.Module>}  WebAssembly.Module インスタンス (Promise)
     */
    static
    createModuleByBese64( wasm_base64 )
    {
        return WasmTool._createArrayBuffer( wasm_base64 )
            .then( wasm_binary => WebAssembly.compile( wasm_binary ) );
    }


    /**
     * @summary Emscripten モジュールを生成 (base64 wasm から)
     *
     * @param {string}  wasm_base64  wasm バイナリを base64 化した文字列
     * @param {function} em_factory  Emscripten モジュールを生成する関数
     *
     * @return {Promise.<object>}  Emscripten モジュール (Promise)
     */
    static
    createEmObjectByBese64( wasm_base64, em_factory )
    {
        return WasmTool._createArrayBuffer( wasm_base64 )
            .then( wasm_binary => {

                const em_module = {
                    // 生成用プロパティを設定
                    wasmBinary: wasm_binary
                };

                return em_factory( em_module );
            } )
            .then( em_module => {

                // 生成が済んだので生成用プロパティを削除
                delete em_module.wasmBinary;

                return em_module;
            } );
    }


    /**
     * @summary Emscripten モジュールを生成 (WebAssembly.Module から)
     *
     * @param {WebAssembly.Module} wa_module  WebAssembly モジュール
     * @param {function}          em_factory  Emscripten モジュールを生成する関数
     *
     * @return {Promise.<object>}  Emscripten モジュール (Promise)
     */
    static
    createEmObjectByModule( wa_module, em_factory )
    {
        const em_module = {
            // 生成用プロパティを設定
            // WebAssembly インスタンス化のユーザー実装コールバック関数
            // See: https://emscripten.org/docs/api_reference/module.html#Module.instantiateWasm
            instantiateWasm: (imports, successCallback) => {

                WebAssembly.instantiate( wa_module, imports )
                    .then( wasm_instance => {
                        // インスタンス生成の成功を通知
                        successCallback( wasm_instance );
                    } )
                    .catch ( e => {
                        // 非同期で失敗したときの仕様は存在しない!
                        console.error( "error: " + e.message );
                    } );

                // 非同期なので空の辞書オブジェクトを返す
                // (同期の場合は、成功したとき exports, 失敗したとき false を返す)
                return {};
            }
        };

        return em_factory( em_module )
            .then( em_module => {

                // 生成が済んだので生成用プロパティを削除
                delete em_module.instantiateWasm;

                return em_module;
            } );
    }


    /**
     * @return {Promise.<ArrayBuffer>}
     * @private
     */
    static
    _createArrayBuffer( wasm_base64 )
    {
        return fetch( "data:application/wasm;base64," + wasm_base64 )
            .then( response => response.ok ?
                   response.arrayBuffer() :
                   Promise.reject( Error( response.statusText ) ) );
    }

}


export default WasmTool;
