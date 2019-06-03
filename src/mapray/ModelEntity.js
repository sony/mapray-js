import Entity from "./Entity";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Orientation from "./Orientation";


/**
 * @summary モデルエンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class ModelEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     *
     * @throws Error  ModelContainer からモデルが見つからなかった
     */
    constructor( scene, opts )
    {
        super( scene );

        this._position    = new GeoPoint( 0, 0, 0 );
        this._orientation = new Orientation( 0, 0, 0 );
        this._scale       = GeoMath.createVector3( [1, 1, 1] );

        this._primitives = [];  // プリミティブ配列
        this._ptoe_array = [];  // 各プリミティブ座標系からエンティティ座標系への変換行列

        if ( opts && opts.json ) {
            var json = opts.json;
            var refs = opts.refs || {};
            this._setupTransform( json );
            this._setupPrimitives( json, refs );
        }
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        var  mlocs_to_gocs  = this._position.getMlocsToGocsMatrix( GeoMath.createMatrix() );
        var entity_to_mlocs = this._orientation.getTransformMatrix( this._scale, GeoMath.createMatrix() );
        var entity_to_gocs  = GeoMath.mul_AA( mlocs_to_gocs, entity_to_mlocs, GeoMath.createMatrix() );

        // Primitive#transform を設定
        var primitives = this._primitives;
        var ptoe_array = this._ptoe_array;
        for ( var i = 0; i < primitives.length; ++i ) {
            var prim = primitives[i];
            var ptoe = ptoe_array[i];
            // prim.transform = entity_to_gocs * ptoe
            GeoMath.mul_AA( entity_to_gocs, ptoe, prim.transform );
        }

        return this._primitives;
    }


    /**
     * this._position, this._orientation, this._scale を設定
     *
     * @param {object} json  生成情報
     *
     * @private
     */
    _setupTransform( json )
    {
        var tr = json.transform;  // <TRANSFORM>

        // position
        this._position.setFromArray( tr.position );  // <GEO-POINT>

        // heading, tilt, roll
        this._orientation = new Orientation( tr.heading, tr.tilt, tr.roll );

        // scale
        var scale = (tr.scale !== undefined) ? tr.scale : [1, 1, 1];  // <PARAM-SCALE3>
        if ( typeof scale == 'number' ) {
            // スケールをベクトルに正規化
            scale = [scale, scale, scale];
        }
        GeoMath.copyVector3( scale, this._scale );
    }


    /**
     * this._primitives と this._ptoe_array を設定
     *
     * @param {object} json  生成情報
     * @param {object} refs  参照辞書
     *
     * @throws Error
     *
     * @private
     */
    _setupPrimitives( json, refs )
    {
        var  container = refs[json.ref_model];
        var primitives = container.createPrimitives( json.index );
        if ( primitives ) {
            this._primitives = primitives;
            this._ptoe_array = primitives.map( prim => GeoMath.createMatrix( prim.transform ) );
        }
        else {
            // ModelContainer からモデルが見つからなかった
            throw new Error( "model is not found in ModelContiner" );
        }
    }


    /**
     * @summary モデル原点位置を設定
     *
     * @param {mapray.GeoPoint} value  モデル原点の位置
     */
    setPosition( value )
    {
        this._position.assign( value );
    }


    /**
     * @summary モデルの向きを設定
     *
     * @param {mapray.Orientation} value  モデルの向き
     */
    setOrientation( value )
    {
        this._orientation.assign( value );
    }


    /**
     * @summary モデルのスケールを設定
     *
     * @param {mapray.Vector3} value  モデルのスケール
     */
    setScale( value )
    {
        GeoMath.copyVector3( value, this._scale );
    }

}


export default ModelEntity;
