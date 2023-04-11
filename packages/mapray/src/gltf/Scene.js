import Node from "./Node";
import CommonData from "./CommonData";


/**
 * @summary glTF scene
 *
 * @classdesc
 * <p>glTF の scene に対応するオブジェクトである。</p>
 *
 * @memberof mapray.gltf
 * @private
 * @see https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/scene.schema.json
 */
class Scene {

    /**
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  シーン索引
     */
    constructor( ctx, index )
    {
        // glTF の scene オブジェクト
        const jscene = ctx.gjson.scenes[index];

        this._commonData = new CommonData( jscene, ctx );

        this._root_nodes = [];

        for ( const node_index of jscene.nodes || [] ) {
            this._root_nodes.push( new Node( ctx, node_index ) );
        }
    }


    /**
     * glTF オブジェクトの共通データ
     *
     * @type {mapray.gltf.CommonData}
     * @readonly
     */
    get commonData() { return this._commonData; }


    /**
     * 最上位ノードの配列
     *
     * @type {mapray.gltf.Node[]}
     * @readonly
     */
    get root_nodes()
    {
        return this._root_nodes;
    }


    /**
     * @summary シーン名を取得
     *
     * <p>シーン名が存在すればシーン名の文字列を返し、存在しなければ null を返す。</p>
     *
     * @type {?string}
     * @readonly
     */
    get name() { return this._commonData.getName(); }

}


export default Scene;
