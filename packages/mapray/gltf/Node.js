import GeoMath from "../GeoMath";
import Mesh from "./Mesh";


/**
 * glTF の node に対応
 * @memberof mapray.gltf
 * @private
 */
class Node {

    /**
     * 初期化
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @param {number}              index  ノード索引
     */
    constructor( ctx, index )
    {
        // glTF の node オブジェクト (specification/2.0/schema/node.schema.json)
        var jnode = ctx.gjson.nodes[index];

        this._children = [];
        this._matrix   = null;
        this._mesh     = null;

        this._setupChildren( jnode, ctx );
        this._setupMatrix( jnode );
        this._setupMesh( jnode, ctx );
    }


    /**
     * 子ノードの配列を取得
     * @type {mapray.gltf.Node[]}
     * @readonly
     */
    get children() { return this._children; }


    /**
     * 変換行列を取得
     * @type {?mapray.Matrix}
     * @readonly
     */
    get matrix() { return this._matrix; }


    /**
     * メッシュを取得
     * @type {?mapray.gltf.Mesh}
     * @readonly
     */
    get mesh() { return this._mesh; }


    /**
     * this._children を設定
     *
     * @param {object}              jnode  glTF の node オブジェクト
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @private
     */
    _setupChildren( jnode, ctx )
    {
        var children = jnode.children;
        if ( children === undefined ) return;

        for ( var i = 0; i < children.length; ++i ) {
            var index = children[i];
            this._children.push( new Node( ctx, index ) );
        }
    }


    /**
     * this._matrix を設定
     *
     * @param {object} jnode  glTF の node オブジェクト
     * @private
     */
    _setupMatrix( jnode )
    {
        if ( jnode.matrix ) {
            // 行列指定
            this._matrix = GeoMath.createMatrix( jnode.matrix );
        }
        else if ( jnode.scale || jnode.rotation || jnode.translation ) {
            // SQT 指定
            var [sx, sy, sz]     = jnode.scale       || [1, 1, 1];
            var [qx, qy, qz, qw] = jnode.rotation    || [0, 0, 0, 1];
            var [tx, ty, tz]     = jnode.translation || [0, 0, 0];

            //                        [ 1 - 2y^2 - 2z^2,      2x y - 2w z,      2x z + 2w y ]
            // rotation[x, y, z, w] = [     2x y + 2w z,  1 - 2x^2 - 2z^2,      2y z - 2w x ]
            //                        [     2x z - 2w y,      2y z + 2w x,  1 - 2x^2 - 2y^2 ]

            this._matrix = GeoMath.createMatrix( [
                (1 - 2*(qy*qy + qz*qz))*sx,
                2*(qx*qy + qz*qw)*sx,
                2*(qx*qz - qy*qw)*sx,
                0,
                2*(qx*qy - qz*qw)*sy,
                (1 - 2*(qx*qx + qz*qz))*sy,
                2*(qx*qw + qy*qz)*sy,
                0,
                2*(qy*qw + qx*qz)*sz,
                2*(qy*qz - qx*qw)*sz,
                (1 - 2*(qx*qx + qy*qy))*sz,
                0,
                tx,
                ty,
                tz,
                1
            ] );
        }
    }


    /**
     * this._mesh を設定
     *
     * @param {object}              jnode  glTF の node オブジェクト
     * @param {mapray.gltf.Context} ctx    読み込みコンテキスト
     * @private
     */
    _setupMesh( jnode, ctx )
    {
        var index = jnode.mesh;
        if ( index === undefined ) return;  // メッシュなしのノード

        this._mesh = new Mesh( ctx, index );
    }

}


export default Node;
