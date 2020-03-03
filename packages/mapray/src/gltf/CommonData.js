/**
 * @summary glTF オブジェクトの共通データ
 *
 * @classdesc
 * <p>多くの glTF オブジェクトに共通に存在する、次のプロパティの値を取得する。<p>
 * <pre>
 *   - name
 *   - extensions
 *   - extras
 * </pre>
 *
 * @memberof mapray.gltf
 * @private
 */
class CommonData {

    /**
     * @param {object}             json  JSON オブジェクト
     * @param {mapray.gltf.Context} ctx  読み込みコンテキスト
     */
    constructor( json, ctx )
    {
        // specification/2.0/schema/glTFChildOfRootProperty.schema.json

        this._name       = json.name || null;
        this._extensions = ctx.extractUsedExtensions( json.extensions || {} );
        this._extras     = json.extras || {};
    }


    /**
     * @summary オブジェクト名を取得
     *
     * @return {?string}  オブジェクト名
     */
    getName()
    {
        return this._name;
    }


    /**
     * @summary 拡張機能固有オブジェクトを取得
     *
     * @param {string} id  拡張機能の識別子
     *
     * @return {?object}  拡張機能固有オブジェクト
     */
    getExtensions( id )
    {
        const extension = this._extensions[id];

        return (extension !== undefined) ? extension : null;
    }


    /**
     * @summary アプリケーション固有データを取得
     *
     * @param {string} id  アプリケーション固有データの識別子
     *
     * @return {?object}  アプリケーション固有データ
     */
    getExtras( id )
    {
        const extra = this._extras[id];

        return (extra !== undefined) ? extra : null;
    }

}


export default CommonData;
