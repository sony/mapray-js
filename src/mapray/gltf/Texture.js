import Sampler from "./Sampler";


/**
 * glTF の texture に対応
 * @memberof mapray.gltf
 * @private
 */
class Texture {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {object}              index  テクスチャ索引
     */
    constructor( ctx, index )
    {
        // specification/2.0/schema/texture.schema.json

        var jtexture = ctx.gjson.textures[index];

        this._sampler = new Sampler( ctx, jtexture.sampler );
        this._source  = ctx.findImage( jtexture.source );
    }


    /**
     * イメージを取得
     * @type {mapray.gltf.Image}
     * @readonly
     */
    get source() { return this._source; }


    /**
     * サンプラを取得
     * @type {mapray.gltf.Sampler}
     * @readonly
     */
    get sampler() { return this._sampler; }

}


export default Texture;
