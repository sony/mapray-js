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
     * @param  {string} [options.base_uri = ""]     基底 URI
     * @param  {mapray.gltf.Tool.TransformCallback} [options.transform_binary]  バイナリ用リクエスト変換関数
     * @param  {mapray.gltf.Tool.TransformCallback} [options.transform_image]   イメージ用リクエスト変換関数
     * @return {Promise}           読込み Promise (mapray.gltf.Content)
     */
    static
    load( body, options )
    {
        const context = new Context( body, options );
        return context.load();
    }

}


/**
 * @summary リソース要求変換関数
 * @callback TransformCallback
 * @desc
 * <p>リソースのリクエスト時に URL などを変換する関数の型である。</p>
 *
 * @param  {string}                         url  変換前のリソース URL
 * @return {mapray.SceneLoader.TransformResult}  変換結果を表すオブジェクト
 *
 * @memberof mapray.gltf.Tool
 */


export default Tool;
