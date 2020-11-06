import Entity from "./Entity";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import Orientation from "./Orientation";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Type from "./animation/Type";
import AnimUtil from "./animation/AnimUtil";
import { RenderTarget } from "./RenderStage";


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

        this._position = new GeoPoint( 0, 0, 0 );
        this._rotation = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._scale    = GeoMath.createVector3( [1, 1, 1] );

        this._primitive_producer = new PrimitiveProducer( this );

        this._setupAnimationBindingBlock();

        // アンカーモード
        this._anchor_mode = false;

        if ( opts && opts.json ) {
            var json = opts.json;
            var refs = opts.refs || {};
            this._setupTransform( json );
            this._setupModelObject( json, refs );
        }
    }


    /**
     * @override
     * @private
     */
    get anchor_mode() { return this._anchor_mode; }

    /**
     * @summary アンカーモードを設定。
     * @see {@link mapray.Entity#anchor_mode}
     * @param {boolean} anchor_mode
     * @private
     */
    setAnchorMode( anchor_mode )
    {
      this._anchor_mode = anchor_mode;
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
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */
    _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const vector3 = Type.find( "vector3" );
        const matrix  = Type.find( "matrix"  );

        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [vector3], null, value => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: orientation
        // パラメータ型: matrix | vector3
        //   型が matrix のとき MLOCS での回転行列
        //   型が vector3 のとき、要素が heading, tilt, roll 順であると解釈
        const orientation_temp = new Orientation();
        let   orientation_type;

        let orientation_tsolver = curve => {
            orientation_type = AnimUtil.findFirstTypeSupported( curve, [matrix, vector3] );
            return orientation_type;
        };

        block.addEntry( "orientation", [matrix, vector3], orientation_tsolver, value => {
            if ( orientation_type === matrix ) {
                this._setRotation( value );
            }
            else { // orientation_type === vector3
                orientation_temp.heading = value[0];
                orientation_temp.tilt    = value[1];
                orientation_temp.roll    = value[2];
                this.setOrientation( orientation_temp );
            }
        } );

        // パラメータ名: scale
        // パラメータ型: vector3 | number
        //   型が vector3 のときは XYZ 別の倍率
        //   型が number のときは均等倍率
        const scale_temp = GeoMath.createVector3();
        let   scale_type;

        let scale_tsolver = curve => {
            scale_type = AnimUtil.findFirstTypeSupported( curve, [vector3, number] );
            return scale_type;
        };

        block.addEntry( "scale", [vector3, number], scale_tsolver, value => {
            if ( scale_type === vector3 ) {
                this.setScale( value );
            }
            else { // scale_type === number
                scale_temp[0] = value;
                scale_temp[1] = value;
                scale_temp[2] = value;
                this.setScale( scale_temp );
            }
        } );
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
        value.getTransformMatrix( sameScaleVector3, this._rotation );
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
     * @summary モデルの回転を設定
     *
     * @desc
     * <p>今のところアニメーション専用</p>
     *
     * @param {mapray.Matrix} value  回転行列
     *
     * @private
     */
    _setRotation( value )
    {
        GeoMath.copyMatrix( value, this._rotation );
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
        this._pickPrimitives = [];  // プリミティブ配列
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
        let primitives = container.createPrimitives( index, { ridMaterial: false } );
        let pickPrimitives = container.createPrimitives( index, { ridMaterial: true } );

        if ( primitives ) {
            this._primitives = primitives;
            this._pickPrimitives = pickPrimitives;
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
        var entity_to_mlocs = mul_RS( entity._rotation, entity._scale, GeoMath.createMatrix() );
        var entity_to_gocs  = GeoMath.mul_AA( mlocs_to_gocs, entity_to_mlocs, GeoMath.createMatrix() );

        // Primitive#transform を設定
        var primitives = stage.getRenderTarget() === RenderTarget.SCENE ? this._primitives : this._pickPrimitives;
        var ptoe_array = this._ptoe_array;
        for ( var i = 0; i < primitives.length; ++i ) {
            var prim = primitives[i];
            var ptoe = ptoe_array[i];
            // prim.transform = entity_to_gocs * ptoe
            GeoMath.mul_AA( entity_to_gocs, ptoe, prim.transform );
        }
        return primitives;
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


// 等倍を表すベクトル
const sameScaleVector3 = GeoMath.createVector3( [1, 1, 1] );


/**
 * @summary 回転行列 * 倍率
 *
 * @param {mapray.Matrix}  rmat  回転行列
 * @param {mapray.Vector3} svec  倍率ベクトル
 * @param {mapray.Matrix}  dst   結果
 *
 * @return {mapray.Matrix}  dst
 *
 * @private
 */
function
mul_RS( rmat, svec, dst )
{
    let sx = svec[0];
    let sy = svec[1];
    let sz = svec[2];
        
    dst[ 0] = rmat[ 0] * sx;
    dst[ 1] = rmat[ 1] * sx;
    dst[ 2] = rmat[ 2] * sx;
    dst[ 3] = 0;

    dst[ 4] = rmat[ 4] * sy;
    dst[ 5] = rmat[ 5] * sy;
    dst[ 6] = rmat[ 6] * sy;
    dst[ 7] = 0;

    dst[ 8] = rmat[ 8] * sz;
    dst[ 9] = rmat[ 9] * sz;
    dst[10] = rmat[10] * sz;
    dst[11] = 0;

    dst[12] = 0;
    dst[13] = 0;
    dst[14] = 0;
    dst[15] = 1;
    
    return dst;
}


export default ModelEntity;
