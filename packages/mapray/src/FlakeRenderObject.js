import Primitive from "./Primitive";
import GeoMath from "./GeoMath";
import AreaUtil from "./AreaUtil";


/**
 * @summary 地表断片レンダリングためのオブジェクト
 *
 * @memberof mapray
 * @private
 */
class FlakeRenderObject {

    /**
     * @param {mapary.Area}      area       地表断片の領域
     * @param {mapary.GLEnv}     glenv      WebGL 環境
     * @param {mapray.FlakeMesh} base_mesh  地表断片の基本メッシュ
     */
    constructor( area, glenv, base_mesh )
    {
        /**
         * @summary 地表分割レベル
         * @member mapray.FlakeRenderObject#z
         * @type {number}
         */
        this.z = area.z;

        /**
         * @summary 地表タイル X 座標
         * @member mapray.FlakeRenderObject#x
         * @type {number}
         */
        this.x = area.x;

        /**
         * @summary 地表タイル Y 座標
         * @member mapray.FlakeRenderObject#y
         * @type {number}
         */
        this.y = area.y;

        this._glenv      = glenv;
        this._base_mesh  = base_mesh;
        this._edata_list = [];  //  { mesh: Mesh, producer: FlakePrimitiveProducer }
        this._transform  = null;
    }


    /**
     * @summary エンティティ・データを追加
     *
     * @param {mapray.Mesh} mesh
     * @param {mapray.Entity.FlakePrimitiveProducer} producer
     */
    addEntityData( mesh, producer )
    {
        let edata = { mesh: mesh, producer: producer };
        this._edata_list.push( edata );
    }


    /**
     * @summary 地表断片上のエンティティ数
     *
     * @type {number}
     * @readonly
     */
    get num_entities()
    {
        return this._edata_list.length;
    }


    /**
     * @summary 地表断片の基本メッシュを取得
     *
     * @return {mapray.FlakeMesh}
     */
    getBaseMesh()
    {
        return this._base_mesh;
    }


    /**
     * @summary エンティティのプリミティブを取得
     *
     * @param {number}             index  エンティティのインデックス
     * @param {mapray.RenderStage} stage  レンダリングステージ
     *
     * @return {mapray.FlakeRenderObject.EntityPrimitivePair}
     */
    getEntityPrimitive( index, stage )
    {
        let edata = this._edata_list[index];
        let { material, properties } = edata.producer.getMaterialAndProperties( stage );

        // this._transform を設定
        if ( this._transform === null ) {
            this._transform = GeoMath.setIdentity( GeoMath.createMatrix() );
            let pos = AreaUtil.getCenter( this, GeoMath.createVector3() );
            this._transform[12] = pos[0];
            this._transform[13] = pos[1];
            this._transform[14] = pos[2];
        }

        const primitive = new Primitive( this._glenv, edata.mesh, material, this._transform );
        primitive.properties = properties;

        return {
            entity: edata.producer.entity,
            primitive: primitive
        };
    }

}


/**
 * @typedef {Object} EntityPrimitivePair
 * @memberof mapray.FlakeRenderObject
 * @property {mapray.Entity} entity
 * @property {mapray.Primitive} primitive
 */


export default FlakeRenderObject;
