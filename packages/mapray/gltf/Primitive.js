import Accessor from "./Accessor";
import Material from "./Material";


/**
 * glTF の primitive に対応
 * @memberof mapray.gltf
 * @private
 */
class Primitive {

    /**
     * 初期化
     * @param {object}              jprimitive  glTF の primitive オブジェクト (specification/2.0/schema/mesh.primitive.schema.json)
     * @param {mapray.gltf.Context} ctx         読み込みコンテキスト
     */
    constructor( jprimitive, ctx )
    {
        this._mode = (jprimitive.mode !== undefined) ? jprimitive.mode : 4;
        this._attributes = {};
        this._indices    = null;
        this._material   = null;

        this._setupAttributes( jprimitive.attributes, ctx );
        this._setupIndices( jprimitive, ctx );
        this._setupMaterial( jprimitive, ctx );
    }


    /**
     * プリミティブモード
     *
     * @type {number}
     * @readonly
     */
    get mode() { return this._mode; }


    /**
     * @summary 頂点属性の辞書
     *
     * <p>頂点属性名から Accessor を引く辞書</p>
     *
     * @type {object}
     * @readonly
     */
    get attributes() { return this._attributes; }


    /**
     * インデックス
     *
     * @type {?mapray.gltf.Accessor}
     * @readonly
     */
    get indices() { return this._indices; }


    /**
     * マテリアル
     *
     * @type {?mapray.gltf.Material}
     * @readonly
     */
    get material() { return this._material; }


    /**
     * this._attributes を設定
     *
     * @param {object}              jattributes  glTF の primitive/attributes オブジェクト
     * @param {mapray.gltf.Context} ctx          読み込みコンテキスト
     * @private
     */
    _setupAttributes( jattributes, ctx )
    {
        for ( var name in jattributes ) {
            var accessor = new Accessor( ctx, jattributes[name] );
            this._attributes[name] = accessor;
            ctx.addAccessor( accessor, "ATTRIBUTE" );
        }
    }


    /**
     * this._indices を設定
     *
     * @param {object}              jprimitive  glTF の primitive オブジェクト
     * @param {mapray.gltf.Context} ctx         読み込みコンテキスト
     * @private
     */
    _setupIndices( jprimitive, ctx )
    {
        if ( jprimitive.indices !== undefined ) {
            var accessor = new Accessor( ctx, jprimitive.indices );
            this._indices = accessor;
            ctx.addAccessor( accessor, "INDEX" );
        }
    }


    /**
     * this._material を設定
     *
     * @param {object}              jprimitive  glTF の primitive オブジェクト
     * @param {mapray.gltf.Context} ctx         読み込みコンテキスト
     * @private
     */
    _setupMaterial( jprimitive, ctx )
    {
        if ( jprimitive.material !== undefined ) {
            this._material = new Material( ctx, jprimitive.material );
        }
    }

}


export default Primitive;
