import Primitive from "./Primitive";


/**
 * glTF の mesh に対応
 * @memberof mapray.gltf
 * @private
 */
class Mesh {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  メッシュ索引
     */
    constructor( ctx, index )
    {
        this._primitives = [];

        // glTF の mesh オブジェクト (specification/2.0/schema/mesh.schema.json)
        var jmesh = ctx.gjson.meshes[index];

        var jprimitives = jmesh.primitives;
        for ( var i = 0; i < jprimitives.length; ++i ) {
            // glTF の primitive オブジェクト (specification/2.0/schema/mesh.primitive.schema.json)
            var jprimitive = jprimitives[i];
            this._primitives.push( new Primitive( jprimitive, ctx ) );
        }
    }


    /**
     * プリミティブの配列を取得
     *
     * @type {mapray.gltf.Primitive[]}
     * @readonly
     */
    get primitives() { return this._primitives; }

}


export default Mesh;
