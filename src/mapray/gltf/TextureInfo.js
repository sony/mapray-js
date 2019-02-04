import Texture from "./Texture";


/**
 * glTF の textureInfo に対応
 * @memberof mapray.gltf
 * @private
 */
class TextureInfo {

    /**
     * 初期化
     * @param {object}              jtexinfo  テクスチャ情報
     * @param {mapray.gltf.Context} ctx       読み込みコンテキスト
     */
    constructor( jtexinfo, ctx )
    {
        // specification/2.0/schema/textureInfo.schema.json

        this._texture  = new Texture( ctx, jtexinfo.index );
        this._texCoord = (jtexinfo.texCoord !== undefined) ? jtexinfo.texCoord : 0;
    }


    /**
     * 参照するテクスチャを取得
     * @type {mapray.gltf.Texture}
     */
    get texture() { return this._texture; }


    /**
     * 参照するテクスチャを設定
     * @type {mapray.gltf.Texture}
     */
    set texture( value ) { this._texture = value; }


    /**
     * テクスチャ座標のインデックス
     * @type {number}
     * @readonly
     */
    get texCoord() { return this._texCoord; }

}


export default TextureInfo;
