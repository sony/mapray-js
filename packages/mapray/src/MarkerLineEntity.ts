import GeoMath, { Vector3 } from "./GeoMath";
import Scene from "./Scene";
import Entity from "./Entity";
import Type from "./animation/Type";
import AbstractLineEntity from "./AbstractLineEntity";


/**
 * 太さ付き連続線エンティティ
 */
class MarkerLineEntity extends AbstractLineEntity {

    private _num_floats: number;

    /**
     * @param scene 所属可能シーン
     * @param opts  オプション集合
     */
    constructor( scene: Scene, opts: MarkerLineEntity.Option = {} )
    {
        super( scene, AbstractLineEntity.LineType.MARKERLINE, opts );

        this._point_array = new Float64Array( 0 );
        this._num_floats  = 0;

        this._width   = 1.0;
        this._color   = GeoMath.createVector3( [1.0, 1.0, 1.0] );
        this._opacity = 1.0;

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
    }


    /**
     * 複数の頂点を追加
     *
     * points は [lon_0, lat_0, alt_0, lon_1, lat_1, alt_1, ...] のような形式の配列を与える。
     *
     * @param points 頂点の配列
     */
    addPoints( points: number[] | Vector3 )
    {
        var add_size = points.length;
        if ( add_size == 0 ) {
            // 追加頂点が無いので変化なし
            return;
        }

        // バッファを拡張
        var target_size = this._num_floats + add_size;
        var buffer_size = this._point_array.length;
        if ( target_size > buffer_size ) {
            var new_buffer = new Float64Array( Math.max( target_size, 2 * buffer_size ) );
            var old_buffer = this._point_array;
            var  copy_size = this._num_floats;
            for ( var i = 0; i < copy_size; ++i ) {
                new_buffer[i] = old_buffer[i];
            }
            this._point_array = new_buffer;
        }

        // 頂点追加処理
        var buffer = this._point_array;
        var   base = this._num_floats;
        for ( var j = 0; j < add_size; ++j ) {
            buffer[base + j] = points[j];
        }
        this._num_floats = target_size;

        // 形状が変化した可能性がある
        this._producer.onChangePoints();
    }


    /**
     * すべての頂点を削除する
     * @experimental
     */
    removeAllPoints() {
        this._num_floats = 0;
        // 形状が変化した可能性がある
        this._producer.onChangePoints();
    }


    /**
     * 指定された頂点を削除する
     * @experimental
     * @param pos 対象頂点のindex
     */
    removePointAt( pos: number ) {
        let idx = pos * 3;

        if ( idx >= this._num_floats ) {
            console.log( 'out of index', idx, this._num_floats );
            return;
        }

        // 負の値は後ろから数える
        if ( idx < 0 ) {
            idx = this._num_floats + idx;
        }

        this._num_floats -= 3;

        // 最後の要素でない場合
        if ( idx !== this._num_floats - 3 ) {
            // それ以外の場合
            for ( let i = idx; i < this._num_floats - 3; ++i ) {
                this._point_array[i] = this._point_array[i + 3];
            }
        }
        // 形状が変化した可能性がある
        // @ts-ignore
        this._producer.onChangePoints();
    }


    /**
     * 頂点数を返す
     * @experimental
     * @returns 頂点数
     */
    getPointCount(): number {
        return this._num_floats / 3;
    }


    /**
     * 指定された頂点座標を返す
     * @experimental
     * @param {number} pos
     */
    getPointAt( pos: number ): Vector3 | undefined {
        let idx = pos * 3;

        if ( idx >= this._num_floats ) {
            console.log( 'out of index', idx, this._num_floats );
            return;
        }

        // 負の値は後ろから
        if ( idx < 0 ) {
            idx = this._num_floats + idx;
        }

        return [
            this._point_array[ idx++ ],
            this._point_array[ idx++ ],
            this._point_array[ idx++ ],
        ];
    }


    /**
     * 指定された頂点座標を変更する
     * @experimental
     * @param pos 変更対象の頂点Index
     * @param point 変更後の座標
     */
    replacePointAt( pos: number, point: Vector3 ) {
        let idx = pos * 3;

        if ( idx >= this._num_floats ) {
          console.log( 'out of index', idx, this._num_floats );
          return;
        }

        // 負の値は後ろから
        if ( idx < 0 ) {
          idx = this._num_floats + idx;
        }

        for ( let i = 0; i < 3; ++i ) {
          this._point_array[idx + i] = point[i];
        }
        // 形状が変化した可能性がある
        this._producer.onChangePoints();
    }


    /**
     */
    private _setupByJson( json: MarkerLineEntity.Json )
    {
        // json.points
        this.addPoints( json.points );

        // json.line_width
        //     .color
        //     .opacity
        if ( json.line_width !== undefined ) this.setLineWidth( json.line_width );
        if ( json.color      !== undefined ) this.setColor( json.color );
        if ( json.opacity    !== undefined ) this.setOpacity( json.opacity );
    }

}




namespace MarkerLineEntity {



export interface Option extends AbstractLineEntity.Option {
    /**
     * 生成情報
     */
    json?: Json;
}



export interface Json extends AbstractLineEntity.Json {
    points: number[];
}



} // namespace MarkerLineEntity




export default MarkerLineEntity;
