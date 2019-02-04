import TextureInfo from "./TextureInfo";
import NormalTextureInfo from "./NormalTextureInfo";
import OcclusionTextureInfo from "./OcclusionTextureInfo";


/**
 * glTF の material に対応
 * @memberof mapray.gltf
 * @private
 */
class Material {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  マテリアル索引
     */
    constructor( ctx, index )
    {
        this._pbrMetallicRoughness = {
            baseColorFactor: [1.0, 1.0, 1.0, 1.0],
            baseColorTexture: null,
            metallicFactor: 1.0,
            roughnessFactor: 1.0,
            metallicRoughnessTexture: null
        };

        this._doubleSided      = false;
        this._alphaMode        = "OPAQUE";
        this._alphaCutoff      = 0.5;
        this._emissiveFactor   = [0.0, 0.0, 0.0];
        this._emissiveTexture  = null;
        this._normalTexture    = null;
        this._occlusionTexture = null;

        // glTF の material オブジェクト (specification/2.0/schema/material.schema.json)
        var jmaterial = ctx.gjson.materials[index];
        this._setupPbrMetallicRoughness( jmaterial, ctx );
        this._setupGenericParameters( jmaterial, ctx );
    }


    /**
     * MetallicRoughness PBR パラメータ
     * @type {object}
     * @readonly
     */
    get pbrMetallicRoughness() { return this._pbrMetallicRoughness; }


    /**
     * 両面レンダリングの有無
     * @type {boolean}
     * @readonly
     */
    get doubleSided() { return this._doubleSided; }


    /**
     * αモード
     * @type {string}
     * @readonly
     */
    get alphaMode() { return this._alphaMode; }


    /**
     * αカットオフ
     * @type {number}
     * @readonly
     */
    get alphaCutoff() { return this._alphaCutoff; }


    /**
     * 自己発光係数
     * @type {mapray.Vector3}
     * @readonly
     */
    get emissiveFactor() { return this._emissiveFactor; }


    /**
     * 自己発光テクスチャ
     * @type {?mapray.gltf.TextureInfo}
     * @readonly
     */
    get emissiveTexture() { return this._emissiveTexture; }


    /**
     * 法線テクスチャ
     * @type {?mapray.gltf.NormalTextureInfo}
     * @readonly
     */
    get normalTexture() { return this._normalTexture; }


    /**
     * 遮蔽テクスチャ
     * @type {?mapray.gltf.OcclusionTextureInfo}
     * @readonly
     */
    get occlusionTexture() { return this._occlusionTexture; }


    /**
     * this._pbrMetallicRoughness を設定
     *
     * @param {object}              jmaterial  glTF の material オブジェクト
     * @param {mapray.gltf.Context} ctx        読み込みコンテキスト
     * @private
     */
    _setupPbrMetallicRoughness( jmaterial, ctx )
    {
        if ( jmaterial.pbrMetallicRoughness === undefined ) {
            return;
        }

        // glTF の pbrMetallicRoughness オブジェクト (specification/2.0/schema/material.pbrMetallicRoughness.schema.json)
        var src = jmaterial.pbrMetallicRoughness;
        var dst = this._pbrMetallicRoughness;

        if ( src.baseColorFactor !== undefined ) {
            dst.baseColorFactor = src.baseColorFactor.slice();
        }

        if ( src.baseColorTexture !== undefined ) {
            dst.baseColorTexture = new TextureInfo( src.baseColorTexture, ctx );
            ctx.addTextureInfo( dst.baseColorTexture );
        }

        if ( src.metallicFactor !== undefined ) {
            dst.metallicFactor = src.metallicFactor;
        }

        if ( src.roughnessFactor !== undefined ) {
            dst.roughnessFactor = src.roughnessFactor;
        }

        if ( src.metallicRoughnessTexture !== undefined ) {
            dst.metallicRoughnessTexture = new TextureInfo( src.metallicRoughnessTexture, ctx );
            ctx.addTextureInfo( dst.metallicRoughnessTexture );
        }
    }


    /**
     * this._doubleSided などを設定
     *
     * @param {object}              jmaterial  glTF の material オブジェクト
     * @param {mapray.gltf.Context} ctx        読み込みコンテキスト
     * @private
     */
    _setupGenericParameters( jmaterial, ctx )
    {
        if ( jmaterial.doubleSided !== undefined ) {
            this._doubleSided = jmaterial.doubleSided;
        }

        if ( jmaterial.alphaMode !== undefined ) {
            this._alphaMode = jmaterial.alphaMode;
        }

        if ( jmaterial.alphaCutoff !== undefined ) {
            this._alphaCutoff = jmaterial.alphaCutoff;
        }

        if ( jmaterial.emissiveFactor !== undefined ) {
            this._emissiveFactor = jmaterial.emissiveFactor.slice();
        }

        if ( jmaterial.emissiveTexture !== undefined ) {
            this._emissiveTexture = new TextureInfo( jmaterial.emissiveTexture, ctx );
            ctx.addTextureInfo( this._emissiveTexture );
        }

        if ( jmaterial.normalTexture !== undefined ) {
            this._normalTexture = new NormalTextureInfo( jmaterial.normalTexture, ctx );
            ctx.addTextureInfo( this._normalTexture );
        }

        if ( jmaterial.occlusionTexture !== undefined ) {
            this._occlusionTexture = new OcclusionTextureInfo( jmaterial.occlusionTexture, ctx );
            ctx.addTextureInfo( this._occlusionTexture );
        }
    }

}


export default Material;
