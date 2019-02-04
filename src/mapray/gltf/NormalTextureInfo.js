import TextureInfo from "./TextureInfo";


/**
 * glTF の normalTextureInfo に対応
 * @memberof mapray.gltf
 * @private
 */
class NormalTextureInfo extends TextureInfo {

    /**
     * 初期化
     * @param {object}              jtexinfo  テクスチャ情報
     * @param {mapray.gltf.Context} ctx       読み込みコンテキスト
     */
    constructor( jtexinfo, ctx )
    {
        super( jtexinfo, ctx );

        // specification/2.0/schema/material.normalTextureInfo.schema.json
        this._scale = (jtexinfo.scale !== undefined) ? jtexinfo.scale : 1.0;
    }


    /**
     * 法線スケール
     * @type {number}
     * @readonly
     */
    get texCoord() { return this._scale; }

}


export default NormalTextureInfo;
