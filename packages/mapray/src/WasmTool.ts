/**
 * WebAssembly 関連のツール
 */
class WasmTool {

    // インスタンスは生成できない
    private constructor() {}


    /**
     * `WebAssembly.Module` インスタンスを生成
     *
     * @param wasm_base64 - wasm バイナリを base64 化した文字列
     *
     * @return `WebAssembly.Module` インスタンス (Promise)
     */
    static async createModuleByBese64( wasm_base64: string ): Promise<WebAssembly.Module>
    {
        const wasm_binary = await WasmTool._createArrayBuffer( wasm_base64 );

        return WebAssembly.compile( wasm_binary );
    }


    /**
     * Emscripten モジュールを生成 (base64 wasm から)
     *
     * @param wasm_base64 - wasm バイナリを base64 化した文字列
     * @param em_factory  - Emscripten モジュールを生成する関数
     *
     * @return Emscripten モジュール (Promise)
     *
     * @see createEmObjectByModule
     */
    static async createEmObjectByBese64( wasm_base64: string,
                                         em_factory: EmModuleFactory ): Promise<EmModule>
    {
        const wasm_binary = await WasmTool._createArrayBuffer( wasm_base64 );

        // Emscripten モジュールを生成
        const es_module = await em_factory( {
            // 生成用プロパティを設定
            wasmBinary: wasm_binary
        } );

        // 生成が済んだので生成用プロパティを削除
        delete es_module.wasmBinary;

        return es_module;
    }


    /**
     * Emscripten モジュールを生成 (`WebAssembly.Module` から)
     *
     * @param wa_module  - WebAssembly モジュール
     * @param em_factory - Emscripten モジュールを生成する関数
     *
     * @return Emscripten モジュール (Promise)
     *
     * @see createEmObjectByBese64
     */
    static async createEmObjectByModule( wa_module: WebAssembly.Module,
                                         em_factory: EmModuleFactory ): Promise<EmModule>
    {
        type callback = ( inst: WebAssembly.Instance ) => void;

        // Emscripten モジュールを生成
        return em_factory( {
            // 生成用プロパティを設定
            // WebAssembly インスタンス化のユーザー実装コールバック関数
            // See: https://emscripten.org/docs/api_reference/module.html#Module.instantiateWasm
            instantiateWasm: ( imports: WebAssembly.Imports,
                               successCallback: callback ) => {
                                   // WebAssembly.Instance インスタンスを生成
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
        } );
    }


    /**
     * `wasm_base64` をバイナリに変換
     */
    private static async _createArrayBuffer( wasm_base64: string ): Promise<ArrayBuffer>
    {
        const response = await fetch( "data:application/wasm;base64," + wasm_base64 );

        if ( !response.ok ) {
            throw new Error( response.statusText );
        }

        return response.arrayBuffer();
    }

}


/**
 * Emscripten モジュールの型
 *
 * ツールにより動的にプロパティが作成されるので、ここでは個々のプロパ
 * ティを定義しない。
 *
 * 詳細は以下を参照のこと。
 * https://emscripten.org/docs/api_reference/module.html
 */
export interface EmModule {

    [id: string]: any;

}


/**
 * Emscripten モジュールを生成する関数の型
 *
 * この関数の実装は一般的に Emscripten のツールによって生成される。
 */
export interface EmModuleFactory {

    /**
     * @param em_module - 入力 Emscripten モジュール
     *
     * @return 出力 Emscripten モジュール
     */
    ( em_module: EmModule ): Promise<EmModule>;

}


export default WasmTool;
