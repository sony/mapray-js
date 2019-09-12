import Entity from "./Entity";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Orientation from "./Orientation";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";


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
        super( scene, opts );

        this._position    = new GeoPoint( 0, 0, 0 );
        this._orientation = new Orientation( 0, 0, 0 );
        this._scale       = GeoMath.createVector3( [1, 1, 1] );

        this._primitive_producer = new PrimitiveProducer( this );

        if ( opts && opts.json ) {
            var json = opts.json;
            var refs = opts.refs || {};
            this._setupTransform( json );
            this._setupModelObject( json, refs );
        }
    }


    /**
     * @override
     */
    getPrimitiveProducer()
    {
        return this._primitive_producer;
    }


    /**
     * @override
     */
    onChangeAltitudeMode( prev_mode )
    {
        this._primitive_producer.onChangeAltitudeMode();
    }


    /**
     * @summary position, orientation, scale を設定
     *
     * @param {object} json  生成情報
     *
     * @private
     */
    _setupTransform( json )
    {
        let tr = json.transform;  // <TRANSFORM>

        // position
        this.setPosition( new GeoPoint().setFromArray( tr.position ) );

        // heading, tilt, roll
        this.setOrientation( new Orientation( tr.heading, tr.tilt, tr.roll ) );

        // scale
        var scale = (tr.scale !== undefined) ? tr.scale : [1, 1, 1];  // <PARAM-SCALE3>
        if ( typeof scale == 'number' ) {
            // スケールをベクトルに正規化
            scale = [scale, scale, scale];
        }
        this.setScale( scale );
    }


    /**
     * @summary モデルを設定
     *
     * @param {object} json  生成情報
     * @param {object} refs  参照辞書
     *
     * @throws Error
     *
     * @private
     */
    _setupModelObject( json, refs )
    {
        let container = refs[json.ref_model];

        this._primitive_producer.setModelObject( container, json.index );
    }


    /**
     * @summary モデル原点位置を設定
     *
     * @param {mapray.GeoPoint} value  モデル原点の位置
     */
    setPosition( value )
    {
        let op = this._position;  // 変更前の位置

        if ( value.longitude != op.longitude ||
             value.latitude  != op.latitude  ||
             value.altitude  != op.altitude ) {
            // 位置が変更された
            this._position.assign( value );
            this._primitive_producer.onChangePosition();
        }
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


    /**
     * @summary モデル位置の標高を取得
     *
     * @return {number} 標高値
     *
     * @private
     */
    _getElevation()
    {
        return this.scene.viewer.getExistingElevation( this._position );
    }

}


/**
 * @summary ModelEntity の PrimitiveProducer
 *
 * @private
 */
class PrimitiveProducer extends Entity.PrimitiveProducer {

    /**
     * @param {mapray.ModelEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._primitives = [];  // プリミティブ配列
        this._ptoe_array = [];  // 各プリミティブ座標系からエンティティ座標系への変換行列

        this._abs_position = null;  // 絶対高度に変換した位置のキャッシュ (null なら無効)
    }


    /**
     * @summary モデルを設定
     *
     * @param {mapray.ModelContainer} container  モデルコンテナ
     * @param {number|string}         [id]       モデル ID
     *
     * @throws Error
     */
    setModelObject( container, index )
    {
        let primitives = container.createPrimitives( index );

        if ( primitives ) {
            this._primitives = primitives;
            this._ptoe_array = primitives.map( prim => GeoMath.createMatrix( prim.transform ) );
        }
        else {
            // ModelContainer からモデルが見つからなかった
            throw new Error( "model is not found in ModelContainer" );
        }
    }


    /**
     * @override
     */
    createRegions()
    {
        const region = new EntityRegion();

        region.addPoint( this.entity._position );

        return [region];
    }


    /**
     * @override
     */
    onChangeElevation( regions )
    {
        this._abs_position = null;  // キャッシュを無効化
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        let entity = this.entity;

        // this._abs_position を更新
        this._updateAbsPosition();

        var  mlocs_to_gocs  = this._abs_position.getMlocsToGocsMatrix( GeoMath.createMatrix() );
        var entity_to_mlocs = entity._orientation.getTransformMatrix( entity._scale, GeoMath.createMatrix() );
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
     * @summary 高度モードが変更されたときに呼び出される
     */
    onChangeAltitudeMode()
    {
        this._abs_position = null;  // キャッシュを無効化
    }


    /**
     * @summary 位置が変更されたときに呼び出される
     */
    onChangePosition()
    {
        this.needToCreateRegions();
        this._abs_position = null;
    }


    /**
     * @summary 絶対高度位置を更新
     *
     * 出力: this._abs_position
     *
     * @private
     */
    _updateAbsPosition()
    {
        if ( this._abs_position !== null ) {
            // キャッシュされている
            return;
        }

        let entity = this.entity;

        this._abs_position = entity._position.clone();

        switch ( entity.altitude_mode ) {
        case AltitudeMode.RELATIVE:
            this._abs_position.altitude += entity._getElevation();
            break;

        case AltitudeMode.CLAMP:
            this._abs_position.altitude = entity._getElevation();
            break;

        default: // AltitudeMode.ABSOLUTE
            break;
        }
    }

}


export default ModelEntity;
