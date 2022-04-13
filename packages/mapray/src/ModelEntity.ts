import ModelContainer from "./ModelContainer";
import Primitive from "./Primitive";

import Scene from "./Scene";
import Entity from "./Entity";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import GeoRegion from "./GeoRegion";
import Orientation from "./Orientation";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Type from "./animation/Type";
import AnimUtil from "./animation/AnimUtil";
import Curve from "./animation/Curve";
import RenderStage from "./RenderStage";



/**
 * モデルエンティティ
 */
class ModelEntity extends Entity {

    private _position: GeoPoint = new GeoPoint( 0, 0, 0 );

    private _matrix: Matrix = GeoMath.setIdentity( GeoMath.createMatrix() );

    private _scale: Vector3 = GeoMath.createVector3( [1, 1, 1] );

    private _primitive_producer: ModelEntity.PrimitiveProducer = new ModelEntity.PrimitiveProducer( this );

    /** アンカーモード */
    private _anchor_mode: boolean = false;

    /** 座標変換モード */
    private _transform_mode: ModelEntity.TransformMode = ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION;



    /**
     * @param scene  所属可能シーン
     * @param opts   オプション集合
     *
     * @throws Error  ModelContainer からモデルが見つからなかった
     */
    constructor( scene: Scene, opts?: ModelEntity.Option )
    {
        super( scene, opts );

        this._setupAnimationBindingBlock();

        if ( opts && opts.json ) {
            var json = opts.json;
            var refs = opts.refs || {};
            this._setupTransform( json );
            this._setupModelObject( json, refs );
        }
    }


    /**
     * アンカーモード
     * @internal
     */
    get anchor_mode(): boolean { return this._anchor_mode; }

    /**
     * アンカーモードを設定。
     * @see {@link mapray.Entity.anchor_mode}
     * @param anchor_mode
     * @internal
     */
    setAnchorMode( anchor_mode: boolean )
    {
      this._anchor_mode = anchor_mode;
    }


    /**
     * @internal
     */
    get transform_mode(): ModelEntity.TransformMode { return this._transform_mode; }


    /**
     * @internal
     */
    setTransformMode( transform_mode: ModelEntity.TransformMode )
    {
      if ( this._transform_mode !== transform_mode ) {
        if ( this._transform_mode === ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION ) {
          if ( transform_mode === ModelEntity.TransformMode.GOCS_MATRIX ) {
            // POSITION_MLOCS_SCALE_ORIENTATION => GOCS_MATRIX
            this._primitive_producer.getMatrix( this._matrix );
          }
        }
        else {
          if ( transform_mode === ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION ) {
            // GOCS_MATRIX => POSITION_MLOCS_SCALE_ORIENTATION
            const gPos = GeoMath.createVector3([
                this._matrix[ 12 ],
                this._matrix[ 13 ],
                this._matrix[ 14 ]
            ]);
            this._position.setFromGocs( gPos );
            const mat = this._position.getMlocsToGocsMatrix( GeoMath.createMatrix() );
            GeoMath.inverse_A( mat, mat );
            GeoMath.mul_AA( mat, this._matrix, mat );

            // restore scale from mat
            for ( let j=0; j<3; ++j ) {
              let tmp = 0;
              for ( let i=0; i<3; ++i ) {
                const v = mat[ j * 4 + i ];
                tmp += v * v;
              }
              if ( tmp < 1.0 || 1.0 < tmp ) {
                tmp = Math.sqrt( tmp );
                for ( let i=0; i<3; ++i ) {
                  mat[ j * 4 + i ] /= tmp;
                }
                this._scale[ j ] = tmp;
              }
            }

            GeoMath.copyMatrix( mat, this._matrix );
          }
        }
        this._transform_mode = transform_mode;
        this._primitive_producer.onChangePosition();
      }
    }


    override getPrimitiveProducer(): ModelEntity.PrimitiveProducer | undefined
    {
        return this._primitive_producer;
    }


    protected override onChangeAltitudeMode( prev_mode: AltitudeMode )
    {
        this._primitive_producer.onChangeAltitudeMode();
    }


    override getBounds()
    {
        const bounds = this._primitive_producer.getBounds();
        const region = new GeoRegion();
        region.addPointsAsArray( bounds );
        return region;
    }


    /**
     * アニメーションの BindingBlock を初期化
     */
    private _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const vector3 = Type.find( "vector3" );
        const matrix  = Type.find( "matrix"  );

        // パラメータ名: position
        // パラメータ型: vector3
        //   ベクトルの要素が longitude, latitude, altitude 順であると解釈
        const position_temp = new GeoPoint();

        block.addEntry( "position", [ vector3 ], null, ( value: any ) => {
            position_temp.setFromArray( value );  // Vector3 -> GeoPoint
            this.setPosition( position_temp );
        } );

        // パラメータ名: orientation
        // パラメータ型: matrix | vector3
        //   型が matrix のとき MLOCS での回転行列
        //   型が vector3 のとき、要素が heading, tilt, roll 順であると解釈
        const orientation_temp = new Orientation();
        let   orientation_type: Type | null;

        let orientation_tsolver = ( curve: Curve ) => {
            orientation_type = AnimUtil.findFirstTypeSupported( curve, [matrix, vector3] );
            if ( !orientation_type ) {
                throw new Error("could not find type of orientation.");
            }
            return orientation_type;
        };

        block.addEntry( "orientation", [matrix, vector3], orientation_tsolver, ( value: any ) => {
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
        let   scale_type: Type | null;

        let scale_tsolver = ( curve: Curve ) => {
            scale_type = AnimUtil.findFirstTypeSupported( curve, [vector3, number] );
            if ( !scale_type ) throw new Error("could not find type of scale.");
            return scale_type;
        };

        block.addEntry( "scale", [vector3, number], scale_tsolver, ( value: any ) => {
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
     * position, orientation, scale を設定
     *
     * @param json  生成情報
     */
    private _setupTransform( json: ModelEntity.Json )
    {
        let tr = json.transform;  // <TRANSFORM>

        // transform mode
        if ( this.transform_mode !== ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION ) {
            this.setTransformMode( ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION )
        }

        // position
        this.setPosition( new GeoPoint().setFromArray( tr.position ) );

        // heading, tilt, roll
        this.setOrientation( new Orientation( tr.heading, tr.tilt, tr.roll ) );

        // scale <PARAM-SCALE3>
        const scale = tr.scale;
        this.setScale(
            scale === undefined       ? [ 1, 1, 1 ]:
            typeof scale === 'number' ? [ scale, scale, scale ]:
            scale
        );
    }


    /**
     * モデルを設定
     *
     * @param json  生成情報
     * @param refs  参照辞書
     *
     * @throws Error
     */
    private _setupModelObject( json: ModelEntity.Json, refs: Entity.ReferenceMap )
    {
        let container = refs[json.ref_model] as ModelContainer;

        this._primitive_producer.setModelObject( container, json.index );
    }


    /**
     * モデル原点位置を設定
     *
     * @param value  モデル原点の位置
     */
    setPosition( value: GeoPoint )
    {
        if ( this.transform_mode === ModelEntity.TransformMode.GOCS_MATRIX ) {
            console.log("Warning: invalid transform mode: " + this.transform_mode);
            return;
        }
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
     * モデルの向きを設定
     *
     * @param value  モデルの向き
     */
    setOrientation( value: Orientation )
    {
        if ( this.transform_mode === ModelEntity.TransformMode.GOCS_MATRIX ) {
            console.log("Warning: invalid transform mode: " + this.transform_mode);
            return;
        }
        value.getTransformMatrix( sameScaleVector3, this._matrix );
    }


    /**
     * モデルのスケールを設定
     *
     * @param value  モデルのスケール
     */
    setScale( value: Vector3 )
    {
        if ( this.transform_mode === ModelEntity.TransformMode.GOCS_MATRIX ) {
            console.log("Warning: invalid transform mode: " + this.transform_mode);
            return;
        }
        GeoMath.copyVector3( value, this._scale );
    }


    /**
     * モデルの回転を設定
     *
     * 今のところアニメーション専用
     * @param value  回転行列
     */
    private _setRotation( value: Matrix )
    {
        if ( this.transform_mode === ModelEntity.TransformMode.GOCS_MATRIX ) {
            console.log("Warning: invalid transform mode: " + this.transform_mode);
            return;
        }
        GeoMath.copyMatrix( value, this._matrix );
    }

    /**
     * モデルの行列を直接設定
     */
    private setMatrix( value: Matrix )
    {
        if ( this.transform_mode === ModelEntity.TransformMode.POSITION_MLOCS_SCALE_ORIENTATION ) {
            console.log("Warning: invalid transform mode: " + this.transform_mode);
            return;
        }
        GeoMath.copyMatrix( value, this._matrix );
    }


    /**
     * モデル位置の標高を取得
     *
     * @return 標高値
     */
    private _getElevation(): number
    {
        return this.scene.viewer.getExistingElevation( this._position );
    }

}



namespace ModelEntity {



/** ModelEntity Option */
export interface Option extends Entity.Option {
    /**
     * 生成情報
     */
    json?: ModelEntity.Json;
}



export interface Json extends Entity.Json {
    transform: TransformJson;
    ref_model: string;
    index?: number | string;
}



export interface TransformJson {
    position: [ x: number, y: number, z: number ];
    heading: number;
    tilt: number;
    roll: number;
    scale: number | [ x: number, y: number, z: number ];
}



/**
 * ModelEntity の PrimitiveProducer
 *
 * @internal
 */
export class PrimitiveProducer extends Entity.PrimitiveProducer {

    /** プリミティブ配列 */
    private _primitives: Primitive[] = [];

    /** プリミティブ配列 */
    private _pickPrimitives: Primitive[] = [];

    /** 各プリミティブ座標系からエンティティ座標系への変換行列 */
    private _ptoe_array: Matrix[] = [];

    /** 絶対高度に変換した位置のキャッシュ (null なら無効) */
    private _abs_position: GeoPoint | null = null;

    /**
     * @param entity
     */
    constructor( entity: ModelEntity )
    {
        super( entity );
    }


    override getEntity(): ModelEntity {
        return super.getEntity() as ModelEntity;
    }


    /**
     * モデルを設定
     *
     * @param container  モデルコンテナ
     * @param id         モデル ID
     *
     * @throws Error
     */
    setModelObject( container: ModelContainer, index?: number|string )
    {
        let primitives = container.createPrimitives( index, { ridMaterial: false } );
        let pickPrimitives = container.createPrimitives( index, { ridMaterial: true } );

        if ( primitives ) {
            this._primitives = primitives;
            this._pickPrimitives = pickPrimitives ? pickPrimitives : [];
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

        // @ts-ignore
        region.addPoint( this.getEntity()._position );

        return [region];
    }


    /**
     * @override
     */
    onChangeElevation( regions: EntityRegion[] )
    {
        this._abs_position = null;  // キャッシュを無効化
    }


    /**
     * @override
     */
    getPrimitives( stage: RenderStage )
    {
        const entity_to_gocs = this.getMatrix( GeoMath.createMatrix() );

        // Primitive#transform を設定
        var primitives = stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ? this._primitives : this._pickPrimitives;
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
     * bboxを利用して簡易的にバウンディングを算出
     *
     * @return  min_lon,min_lat,min_alt,max_lon,max_lat,max_alt
     */
    getBounds(): Float64Array
    {
        const entity_to_gocs = this.getMatrix( GeoMath.createMatrix() );

        // Primitive#transform を設定
        const primitives = this._primitives;
        const ptoe_array = this._ptoe_array;

        let min_lon =  Number.MAX_VALUE;
        let max_lon = -Number.MAX_VALUE;
        let min_lat =  Number.MAX_VALUE;
        let max_lat = -Number.MAX_VALUE;
        let min_alt =  Number.MAX_VALUE;
        let max_alt = -Number.MAX_VALUE;

        let transform = new Float64Array( 4 * 4 );
        for ( var i = 0; i < primitives.length; ++i ) {
            const prim = primitives[i];
            const ptoe = ptoe_array[i];
            // prim.transform = entity_to_gocs * ptoe
            GeoMath.mul_AA( entity_to_gocs, ptoe, transform );

            const bbox = prim.bbox as Vector3[];
            const bbox0_x = bbox[0][0]*transform[0] + bbox[0][1]*transform[4] + bbox[0][2]*transform[8]  + transform[12];
            const bbox0_y = bbox[0][0]*transform[1] + bbox[0][1]*transform[5] + bbox[0][2]*transform[9]  + transform[13];
            const bbox0_z = bbox[0][0]*transform[2] + bbox[0][1]*transform[6] + bbox[0][2]*transform[10] + transform[14];

            const bbox1_x = bbox[1][0]*transform[0] + bbox[1][1]*transform[4] + bbox[1][2]*transform[8]  + transform[12];;
            const bbox1_y = bbox[1][0]*transform[1] + bbox[1][1]*transform[5] + bbox[1][2]*transform[9]  + transform[13];;
            const bbox1_z = bbox[1][0]*transform[2] + bbox[1][1]*transform[6] + bbox[1][2]*transform[10] + transform[14];;

            let points0 = new GeoPoint();
            points0.setFromGocs( [bbox0_x, bbox0_y, bbox0_z] );
            let points1 = new GeoPoint();
            points1.setFromGocs( [bbox1_x, bbox1_y, bbox1_z] );

            // bbox0
            let lon = points0.longitude;
            let lat = points0.latitude;
            let alt = points0.altitude;

            if ( lon < min_lon ) min_lon = lon;
            if ( lon > max_lon ) max_lon = lon;
            if ( lat < min_lat ) min_lat = lat;
            if ( lat > max_lat ) max_lat = lat;
            if ( alt < min_alt ) min_alt = alt;
            if ( alt > max_alt ) max_alt = alt;

            // bbox1
            lon = points1.longitude;
            lat = points1.latitude;
            alt = points1.altitude;

            if ( lon < min_lon ) min_lon = lon;
            if ( lon > max_lon ) max_lon = lon;
            if ( lat < min_lat ) min_lat = lat;
            if ( lat > max_lat ) max_lat = lat;
            if ( alt < min_alt ) min_alt = alt;
            if ( alt > max_alt ) max_alt = alt;
        }
        const bounds_array = new Float64Array( 3 * 2 );
        bounds_array[0] = min_lon;
        bounds_array[1] = min_lat;
        bounds_array[2] = min_alt;
        bounds_array[3] = max_lon;
        bounds_array[4] = max_lat;
        bounds_array[5] = max_alt;

        return bounds_array;
    }


    /**
     * 高度モードが変更されたときに呼び出される
     */
    onChangeAltitudeMode()
    {
        this._abs_position = null;  // キャッシュを無効化
    }


    /**
     * 位置が変更されたときに呼び出される
     */
    onChangePosition()
    {
        this.needToCreateRegions();
        this._abs_position = null;
    }


    /**
     * 現在の設定に応じた行列を取得します
     */
    getMatrix( dst: Matrix ): Matrix
    {
        const entity = this.getEntity();
        this._updateAbsPosition();
        const abs_position = this._abs_position;

        if ( !abs_position ) {
            throw new Error("Unknown Error");
        }

        switch ( entity.transform_mode ) {
            case TransformMode.GOCS_MATRIX: {
                // @ts-ignore
                return GeoMath.copyMatrix(entity._matrix, dst);
            }
            case TransformMode.POSITION_MLOCS_SCALE_ORIENTATION: {
                const mlocs_to_gocs = abs_position.getMlocsToGocsMatrix( GeoMath.createMatrix() );
                // @ts-ignore
                const entity_to_mlocs = mul_RS( entity._matrix, entity._scale, GeoMath.createMatrix() );
                return GeoMath.mul_AA( mlocs_to_gocs, entity_to_mlocs, dst );
            }
            default: {
                // @ts-ignore
                throw new Error( "Unsupported transform mode: " + entity._transform_mode );
            }
        }
    }


    /**
     * 絶対高度位置を更新
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

        const entity = this.getEntity();

        // @ts-ignore
        const abs_position = entity._position.clone();

        switch ( entity.altitude_mode ) {
        case AltitudeMode.RELATIVE:
            // @ts-ignore
            abs_position.altitude += entity._getElevation();
            break;

        case AltitudeMode.CLAMP:
            // @ts-ignore
            abs_position.altitude = entity._getElevation();
            break;

        default: // AltitudeMode.ABSOLUTE
            break;
        }

        this._abs_position = abs_position;
    }

}



/**
 * 座標変換モードの列挙型
 *
 * モードによってパラメータや関数が無効になる。
 * - (a) POSITION_MLOCS_SCALE_ORIENTATION
 * - (b) GOCS_MATRIX
 *
 * |                          | (a) | (b) |
 * |--------------------------|-----|-----|
 * | _position, setPosition() | 有効 | 無効 |
 * | _scale, setScale()       | 有効 | 無効 |
 * | setOrientation()         | 有効 | 無効 |
 * | setMatrix()              | 無効 | 有効 |
 * | _matrix                  | 有効（回転部分のみ） | 有効 |
 * | altitude_mode            | 無効 | 有効 |
 * 
 * モード変更時の位置・姿勢の変化
 *
 * | 遷移 | 位置・姿勢の変化 |
 * |-----|----------------|
 * | (a) &rarr; (b) | 姿勢が維持され、見かけ上位置・姿勢に変化がない |
 * | (b) &rarr; (a) | できるだけ姿勢を維持する |
 *
 * @internal
 */
export enum TransformMode {

    /**
     * Position位置を原点としたMLocsにおいて Scale、Orientation を適用する。デフォルトの座標変換モード。
     */
    POSITION_MLOCS_SCALE_ORIENTATION,

    /**
     * Gocs 座標系において、直接変換行列を適用する。
     * Position, Scale, Orientationによって指定された値は無視されます。
     */
    GOCS_MATRIX,

}



}



// 等倍を表すベクトル
const sameScaleVector3 = GeoMath.createVector3( [1, 1, 1] );


/**
 * 回転行列 * 倍率
 *
 * @param  rmat  回転行列
 * @param  svec  倍率ベクトル
 * @param  dst   結果
 *
 * @return dst
 */
function mul_RS( rmat: Matrix, svec: Vector3, dst: Matrix )
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
