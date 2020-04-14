import CommonData from "./CommonData";


/**
 * 読み込んだ glTF データの内容
 *
 * @memberof mapray.gltf
 * @private
 */
class Content {

    /**
     * @param {mapray.gltf.Context}    ctx  読み込みコンテキスト
     * @param {mapray.gltf.Scene[]} scenes  シーンの配列
     * @param {number} default_scene_index  既定シーンの索引 (既定シーンがないときは -1)
     */
    constructor( ctx, scenes, default_scene_index )
    {
        this._commonData = new CommonData( ctx.gjson, ctx );

        this._scenes              = scenes;
        this._default_scene_index = default_scene_index;
    }


    /**
     * glTF オブジェクトの共通データ
     *
     * @type {mapray.gltf.CommonData}
     * @readonly
     */
    get commonData() { return this._commonData; }


    /**
     * @summary シーンの配列
     *
     * @type {mapray.gltf.Scene[]}
     * @readonly
     */
    get scenes()
    {
        return this._scenes;
    }


    /**
     * @summary 既定シーンの索引
     *
     * <p>既定シーンの索引を返す。ただし既定シーンがないときは -1 を返す。</p>
     *
     * @type {number}
     * @readonly
     */
    get default_scene_index()
    {
        return this._default_scene_index;
    }

}


export default Content;
