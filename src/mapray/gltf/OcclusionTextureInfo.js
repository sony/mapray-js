import TextureInfo from "./TextureInfo";


/**
 * glTF の occlusionTextureInfo に対応
 * @memberof mapray.gltf
 * @private
 */
class OcclusionTextureInfo extends TextureInfo {

    /**
     * 初期化
     * @param {object}              jtexinfo  テクスチャ情報
     * @param {mapray.gltf.Context} ctx       読み込みコンテキスト
     */
    constructor( jtexinfo, ctx )
    {
        super( jtexinfo, ctx );

        // specification/2.0/schema/material.occlusionTextureInfo.schema.json
        this._strength = (jtexinfo.strength !== undefined) ? jtexinfo.strength : 1.0;
    }


    /**
     * 遮蔽強度
     * @type {number}
     * @readonly
     */
    get strength() { return this._strength; }

}


export default OcclusionTextureInfo;
