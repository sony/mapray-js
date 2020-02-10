/**
 * glTF の sampler に対応
 * @memberof mapray.gltf
 * @private
 */
class Sampler {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {object}              index  サンプラー索引 (非数の場合は既定値サンプラー)
     */
    constructor( ctx, index )
    {
        // specification/2.0/schema/sampler.schema.json
        // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplers

        var jsampler = (typeof index == 'number') ? ctx.gjson.samplers[index] : {};

        this._magFilter = jsampler.magFilter;  // フィルタの既定値は実装依存
        this._minFilter = jsampler.minFilter;  // ↑↑↑
        this._wrapS     = (jsampler.wrapS !== undefined) ? jsampler.wrapS : Sampler.WRAP_DEFAULT;
        this._wrapT     = (jsampler.wrapT !== undefined) ? jsampler.wrapT : Sampler.WRAP_DEFAULT;
    }


    /**
     * 拡大フィルタ
     * @type {number|undefined}
     * @readonly
     */
    get magFilter() { return this._magFilter; }


    /**
     * 縮小フィルタ
     * @type {number|undefined}
     * @readonly
     */
    get minFilter() { return this._minFilter; }


    /**
     * S-wrap
     * @type {number}
     * @readonly
     */
    get wrapS() { return this._wrapS; }


    /**
     * T-wrap
     * @type {number}
     * @readonly
     */
    get wrapT() { return this._wrapT; }

}


Sampler.WRAP_DEFAULT = 10497;  // REPEAT


export default Sampler;
