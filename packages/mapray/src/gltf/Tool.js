import Context from "./Context";


/**
 * glTF 関連のツール
 *
 * @memberof mapray.gltf
 * @private
 */
class Tool {

    /**
     * @summary glTF データを解析してオブジェクトを構築
     *
     * @param  {object} body       データの本体 (JSON オブジェクト)
     * @param  {object} [options]  オプション集合
     * @param  {string} [options.base_resouece]     基底となるリソース
     * @param  {any} [options.binary_type]  バイナリタイプ
     * @param  {any} [options.image_type]   イメージタイプ
     * @param  {string[]} [options.supported_extensions]  ローダーを呼び出す側が対応できる glTF 拡張機能のリスト
     * @return {Promise}           読込み Promise (mapray.gltf.Content)
     */
    static
    load( body, options )
    {
        const context = new Context( body, options );
        return context.load();
    }

}


export default Tool;
