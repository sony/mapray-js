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

            this._transform = this.parseTransform( json.transform );

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
