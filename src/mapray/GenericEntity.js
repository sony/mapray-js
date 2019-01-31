import Entity from "./Entity";
import Primitive from "./Primitive";
import BasicMaterial from "./BasicMaterial";
import GeoMath from "./GeoMath";


/**
 * @summary 汎用エンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class GenericEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene );

        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._primitives = [];

        if ( opts && opts.json ) {
            var json = opts.json;
            var refs = opts.refs || {};
            GenericEntity._getJsonTransform( json, this._transform );

            var      mesh = refs[json.ref_mesh];
            var  material = this._getJsonMaterial( json );

            var primitive = new Primitive( scene.glenv, mesh, material, this._transform );
            primitive.properties = this.loadProperties( json, refs );

            this._primitives.push( primitive );
        }
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        return this._primitives;
    }


    /**
     * @summary 変換行列を設定
     * @param {mapray.Matrix} matrix  モデル座標系から GOCS への変換行列
     */
    setTransform( matrix )
    {
        GeoMath.copyMatrix( matrix, this._transform );
    }


    /**
     * JSON から変換情報を取得
     * @private
     */
    static _getJsonTransform( json, transform )
    {
        var matrix = json.transform.matrix;
        if ( matrix ) {
            // 直接変換行列
            GeoMath.copyMatrix( matrix, transform );
        }
        else {
            // mapray 球面座標系
            var carto = json.transform.cartographic;
            var  iscs = { longitude: carto[0],
                          latitude:  carto[1],
                          height:    carto[2] };
            GeoMath.iscs_to_gocs_matrix( iscs, transform );
        }
    }


    /**
     * @private
     */
    _getJsonMaterial( json )
    {
        var mode = json.mode || "basic";

        switch ( mode ) {
        case "basic":
            return this._getBasicMaterial();
        default:
            console.error( "mapray: unknown GenericEntity mode: " + mode );
            return null;
        }
    }


    /**
     * @private
     */
    _getBasicMaterial()
    {
        var scene = this.scene;
        if ( !scene._GenericEntity_basic_material ) {
            // scene にマテリアルをキャッシュ
            scene._GenericEntity_basic_material = new BasicMaterial( scene.glenv );
        }
        return scene._GenericEntity_basic_material;
    }

}


export default GenericEntity;
