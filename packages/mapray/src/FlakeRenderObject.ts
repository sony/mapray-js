import GLEnv from "./GLEnv";
import AreaUtil, { Area } from "./AreaUtil";
import GeoMath, { GeoPoint, Matrix, Vector3 } from "./GeoMath";
import Primitive from "./Primitive";
import FlakeMesh from "./FlakeMesh";
import Mesh from "./Mesh";
import Entity from "./Entity";
import RenderStage from "./RenderStage";
import Globe from "./Globe";


/**
 * 地表断片レンダリングためのオブジェクト
 *
 * 地表 DEM のメッシュと、地表上の 0 個以上の (Entity, Primitive) を取
 * 得することができる。
 */
class FlakeRenderObject implements Area {

    // from Area
    readonly z: number;
    readonly x: number;
    readonly y: number;


    /**
     * @param area       地表断片の領域
     * @param glenv      WebGL 環境
     * @param base_mesh  地表断片の基本メッシュ
     */
    constructor( area:           Area,
                 glenv:         GLEnv,
                 base_mesh: FlakeMesh )
    {
        this.z = area.z;
        this.x = area.x;
        this.y = area.y;

        this._glenv      = glenv;
        this._base_mesh  = base_mesh;
        this._edata_list = [];
        this._transform  = null;

        this._gocs_bbox_mesh = null;
        this._geo_bbox_mesh = null;
    }


    /**
     * エンティティ・データを追加
     */
    addEntityData( mesh:     Mesh,
                   producer: Entity.FlakePrimitiveProducer ): void
    {
        this._edata_list.push( { mesh, producer } );
    }


    /**
     * 地表断片上のエンティティ数
     */
    get num_entities(): number
    {
        return this._edata_list.length;
    }


    /**
     * 地表断片の基本メッシュを取得
     */
    getBaseMesh(): FlakeMesh
    {
        return this._base_mesh;
    }


    /**
     * @summary エンティティのプリミティブを取得
     *
     * @param index  エンティティのインデックス
     * @param stage  レンダリングステージ
     */
    getEntityPrimitive( index: number,
                        stage: RenderStage ): EntityPrimitivePair
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
            entity: edata.producer.getEntity(),
            primitive: primitive
        };
    }

    /**
     * @summary Flakeの境界箱メッシュを設定
     *
     * @param bbox_mesh_info  境界箱メッシュの情報
     */
    setDebugMesh( gocs_bbox_mesh: Mesh, geo_bbox_mesh: Mesh )
    {
        this._gocs_bbox_mesh = gocs_bbox_mesh;
        this._geo_bbox_mesh = geo_bbox_mesh;
    }


    get gocs_bbox_mesh(): Mesh | null
    {
        return this._gocs_bbox_mesh;
    }

    get geo_bbox_mesh(): Mesh | null
    {
        return this._geo_bbox_mesh;
    }

    private readonly _glenv:      GLEnv;
    private readonly _base_mesh:  FlakeMesh;
    private readonly _edata_list: EntityData[];
    private          _transform:  Matrix | null;
    private          _gocs_bbox_mesh: Mesh | null;
    private          _geo_bbox_mesh: Mesh | null;
}


/** FlakeRenderObject の内部で使用 */
interface EntityData {
    mesh:     Mesh;
    producer: Entity.FlakePrimitiveProducer;
}


/** getEntityPrimitive() が返す値の型 */
interface EntityPrimitivePair {
    entity:    Entity;
    primitive: Primitive;
}


export default FlakeRenderObject;
