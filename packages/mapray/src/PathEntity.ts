import GeoMath, { Vector3 } from "./GeoMath";
import RenderStage from "./RenderStage";
import Scene from "./Scene";
import Entity from "./Entity";
import Type from "./animation/Type";
import AbstractLineEntity from "./AbstractLineEntity";
import LineMaterial from "./LineMaterial";



/**
 * 太さ付き連続線エンティティ
 */
class PathEntity extends AbstractLineEntity {

    private _length_array: Float64Array;

    private _lower_length: number;

    private _upper_length: number;


    /**
     * @param scene 所属可能シーン
     * @param opts  オプション集合
     */
    constructor( scene: Scene, opts: PathEntity.Option = {} )
    {
        super( scene, true, opts );

        this._length_array = new Float64Array( 0 );

        this._width   = 1.0;
        this._color   = GeoMath.createVector3( [1.0, 1.0, 1.0] );
        this._opacity = 1.0;
        this._lower_length = 0;
        this._upper_length = 0;

        this._setupAnimationBindingBlock();

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     * アニメーションの BindingBlock を初期化
     */
    private _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const vector3 = Type.find( "vector3" );

        // パラメータ名: width
        // パラメータ型: number
        //   線の太さ
        block.addEntry( "width", [number], null, (value: number) => {
            this.setLineWidth( value );
        } );
        
        // パラメータ名: color
        // パラメータ型: vector3
        //   色
        block.addEntry( "color", [vector3], null, (value: Vector3) => {
            this.setColor( value );
        } );
        
        // パラメータ名: opacity
        // パラメータ型: number
        //   不透明度
        block.addEntry( "opacity", [number], null, (value: number) => {
            this.setOpacity( value );
        } );
        
        // パラメータ名: lower_length
        // パラメータ型: number
        //   距離の下限値
        block.addEntry( "lower_length", [number], null, (value: number) => {
            this.setLowerLength( value );
        } );

        // パラメータ名: upper_length
        // パラメータ型: number
        //   距離の上限値
        block.addEntry( "upper_length", [number], null, (value: number) => {
            this.setUpperLength( value );
        } );
    }


    /**
     * 距離の下限値を設定
     *
     * @param lower_length  距離の下限値
     */
    setLowerLength( lower_length: number )
    {
        if ( this._lower_length !== lower_length ) {
            this._lower_length = lower_length;
            this._producer.onChangeProperty();
        }
    }


    /**
     * 距離の上限値を設定
     *
     * @param upper_length  距離の上限値
     */
    setUpperLength( upper_length: number )
    {
        if ( this._upper_length !== upper_length ) {
            this._upper_length = upper_length;
            this._producer.onChangeProperty();
        }
    }


    /**
     * 複数の頂点を追加
     *
     * points は [lon_0, lat_0, alt_0, lon_1, lat_1, alt_1, ...] のような形式の配列を与える。
     *
     * @param points  頂点の配列
     * @param length_array  始点からの距離の配列
     */
    addPoints( points: number[], length_array: number[] ): void
    {
        const add_size = points.length;
        const add_length_size = length_array.length;
        if ( add_size == 0 || add_length_size == 0) {
            // 追加頂点が無いので変化なし
            return;
        }

        // バッファを拡張
        const target_size = this._num_points * 3 + add_size;
        const buffer_size = this._point_array.length;
        if ( target_size > buffer_size ) {
            const new_buffer = new Float64Array( Math.max( target_size, 2 * buffer_size ) );
            const old_buffer = this._point_array;
            const  copy_size = this._num_points * 3;
            for ( let i = 0; i < copy_size; ++i ) {
                new_buffer[i] = old_buffer[i];
            }
            this._point_array = new_buffer;
        }

        // 距離配列バッファを拡張
        const target_length_size = this._num_points + add_length_size;
        const buffer_length_size = this._length_array.length;
        if ( target_length_size > buffer_length_size ) {
            const new_buffer = new Float64Array( Math.max( target_length_size, 2 * buffer_length_size ) );
            const old_buffer = this._length_array;
            const  copy_size = this._num_points;
            for ( let i = 0; i < copy_size; ++i ) {
                new_buffer[i] = old_buffer[i];
            }
            this._length_array = new_buffer;
        }

        // 頂点追加処理
        const buffer = this._point_array;
        const   base = this._num_points * 3;
        for ( let i = 0; i < points.length; ++i ) {
            buffer[base + i] = points[i];
        }

        // 距離の配列を追加
        const buffer_length = this._length_array;
        const   base_length = this._num_points;
        for ( let i = 0; i < length_array.length; ++i ) {
            buffer_length[base_length + i] = length_array[i];
        }

        this._num_points = target_size / 3;

        // 形状が変化した可能性がある
        this._producer.onChangePoints();
    }

    /**
     */
    private _setupByJson( json: PathEntity.Json )
    {
        // json.points
        this.addPoints( json.points.positions, json.points.lengths );

        // json.line_width
        //     .color
        //     .opacity
        //     .lower_length
        //     .upper_length
        if ( json.line_width    !== undefined ) this.setLineWidth( json.line_width );
        if ( json.color         !== undefined ) this.setColor( json.color );
        if ( json.opacity       !== undefined ) this.setOpacity( json.opacity );
        if ( json.lower_length  !== undefined ) this.setLowerLength( json.lower_length );
        if ( json.upper_length  !== undefined ) this.setUpperLength( json.upper_length );
    }


    /**
     * 専用マテリアルを取得
     */
    protected override getLineMaterial( render_target: RenderStage.RenderTarget ): LineMaterial
    {
        const scene    = this.scene;
        const cache_id = (
            "_AbstractLineEntity_material_path" +
            (render_target === RenderStage.RenderTarget.RID ? "_pick" : "")
        );

        // @ts-ignore
        let material = scene[cache_id];
        if ( !material ) {
            // scene にマテリアルをキャッシュ
            const opt = { ridMaterial: render_target === RenderStage.RenderTarget.RID };
            material = new LineMaterial( scene.glenv, true, opt );
            // @ts-ignore
            scene[cache_id] = material;
        }

        return material;
    }
}



namespace PathEntity {



export interface Option extends AbstractLineEntity.Option {
    /**
     * 生成情報
     */
    json?: Json;
}



export interface Json extends AbstractLineEntity.Json {

    points: PointsJson;

    lower_length: number;

    upper_length: number;
}



export interface PointsJson {
    positions: number[];

    lengths: number[];
}



} // namespace PathEntity



export default PathEntity;
