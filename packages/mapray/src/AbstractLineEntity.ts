import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import Scene from "./Scene";
import LineMaterial from "./LineMaterial";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import GeoRegion from "./GeoRegion";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import AreaUtil, { Area } from "./AreaUtil";
import QAreaManager from "./QAreaManager";
import Type from "./animation/Type";
import RenderStage from "./RenderStage";
import DemSampler from "./DemSampler";
import DemBinary from "./DemBinary";


/**
 * 線エンティティ
 *
 * {@link mapray.MarkerLineEntity} と {@link mapray.PathEntity} の共通機能を提供するクラスである。
 */
abstract class AbstractLineEntity extends Entity {

    protected _producer: AbstractLineEntity.FlakePrimitiveProducer | AbstractLineEntity.PrimitiveProducer;

    private _is_flake_mode: boolean;

    protected _width!: number;

    protected _color!: Vector3;

    protected _opacity!: number;

    protected _point_array!: Float64Array;

    readonly is_path: boolean;

    protected _num_points: number;


    /**
     * @param scene        所属可能シーン
     * @param is_path      Pathかどうか
     * @param opts       オプション集合
     */
    constructor( scene: Scene, is_path: boolean, opts: AbstractLineEntity.Option = {} )
    {
        super( scene, opts );

        this.is_path = is_path;
        this._point_array = new Float64Array( 0 );
        this._num_points  = 0;

        if ( this.altitude_mode === AltitudeMode.CLAMP ) {
            this._producer = new AbstractLineEntity.FlakePrimitiveProducer( this );
            this._is_flake_mode = true;
        }
        else {
            this._producer = new AbstractLineEntity.PrimitiveProducer( this );
            this._is_flake_mode = false;
        }
    }


    /**
     */
    override getPrimitiveProducer()
    {
        return (!this._is_flake_mode) ? this._producer as AbstractLineEntity.PrimitiveProducer: undefined;
    }


    /**
     */
    override getFlakePrimitiveProducer()
    {
        return (this._is_flake_mode) ? this._producer as AbstractLineEntity.FlakePrimitiveProducer: undefined;
    }


    /**
     */
    override onChangeAltitudeMode( _prev_mode: AltitudeMode )
    {
        if ( this.altitude_mode === AltitudeMode.CLAMP ) {
            this._producer = new AbstractLineEntity.FlakePrimitiveProducer( this );
            this._is_flake_mode = true;
        }
        else {
            this._producer = new AbstractLineEntity.PrimitiveProducer( this );
            this._is_flake_mode = false;
        }
    }


    /**
     * 線の太さを取得
     * @internal
     */
    getLineWidth(): number
    {
        return this._width;
    }


    /**
     * 線の太さを設定
     *
     * @param width  線の太さ (画素単位)
     */
    setLineWidth( width: number )
    {
        if ( this._width !== width ) {
            this._width = width;
            this._producer.onChangeProperty();
        }
    }


    /**
     * 基本色を取得
     * @internal
     */
    getColor(): Vector3
    {
        return this._color;
    }


    /**
     * 基本色を設定
     *
     * @param color  基本色
     */
    setColor( color: Vector3 )
    {
        if ( this._color[0] !== color[0] ||
             this._color[1] !== color[1] ||
             this._color[2] !== color[2] ) {
            // 位置が変更された
            GeoMath.copyVector3( color, this._color );
            this._producer.onChangeProperty();
        }
    }


    /**
     * 不透明度を設定
     *
     * @param opacity  不透明度
     */
    setOpacity( opacity: number )
    {
        if ( this._opacity !== opacity ) {
            this._opacity = opacity;
            this._producer.onChangeProperty();
        }
    }


    /**
     * @internal
     */
    getPointArray() {
        return this._point_array;
    }


    /**
     * 頂点数
     * @experimental
     */
    get num_points(): number
    {
        return this._num_points;
    }


    /**
     * すべての頂点のバウンディングを算出
     *
     * @return バウンディング情報を持ったGeoRegion
     */
    override getBounds(): GeoRegion
    {
        const region = new GeoRegion();
        region.addPointsAsArray( this._point_array );
        return region;
    }


    /**
     * 専用マテリアルを取得
     */
    protected abstract getLineMaterial( render_target: RenderStage.RenderTarget ): LineMaterial;

}



namespace AbstractLineEntity {


export interface Option extends Entity.Option {
    
}


export interface Json extends Entity.Json {
    color: Vector3;

    opacity: number;

    line_width: number;
}


/**
 * MarkerLineEntity の PrimitiveProducer
 *
 * @internal
 */
export class PrimitiveProducer extends Entity.PrimitiveProducer {

    private _transform: Matrix;

    private _pivot: Vector3;

    private _bbox: [ Vector3, Vector3 ];

    private _properties: {
        width: number;
        color: Vector3;
        opacity: number;
        lower_length?: number;
        upper_length?: number;
    };

    private _geom_dirty: boolean;

    private _primitive: Primitive;

    private _pickPrimitive: Primitive;

    private _primitives: Primitive[];

    private _pickPrimitives: Primitive[];


    /**
     * @param entity
     */
    constructor( entity: AbstractLineEntity )
    {
        super( entity );

        // プリミティブの要素
        this._transform = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._pivot     = GeoMath.createVector3();
        this._bbox      = [GeoMath.createVector3(),
                            GeoMath.createVector3()];

        this._properties = {
            width:   1.0,
            color:   GeoMath.createVector3f(),
            opacity: 1.0,
        };

        // プリミティブ
        // @ts-ignore
        const      material = entity.getLineMaterial( RenderStage.RenderTarget.SCENE );
        const primitive = new Primitive( entity.scene.glenv, null, material, this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;
        this._primitive = primitive;

        // @ts-ignore
        const pick_material = entity.getLineMaterial( RenderStage.RenderTarget.RID );
        const pickPrimitive = new Primitive( entity.scene.glenv, null, pick_material, this._transform );
        pickPrimitive.pivot      = this._pivot;
        pickPrimitive.bbox       = this._bbox;
        pickPrimitive.properties = this._properties;
        this._pickPrimitive = pickPrimitive;

        // プリミティブ配列
        this._primitives = [primitive];
        this._pickPrimitives = [pickPrimitive];

        this._geom_dirty = true;
    }


    getEntity(): AbstractLineEntity
    {
        return super.getEntity() as AbstractLineEntity;
    }


    /**
     */
    override createRegions()
    {
        const region = new EntityRegion();

        region.addPoints( this.getEntity().getPointArray(), 0, 3, this.getEntity().num_points );

        return [region];
    }


    /**
     */
    override onChangeElevation( _regions: EntityRegion[] )
    {
        this._geom_dirty = true;
    }


    /**
     */
    override getPrimitives( stage: RenderStage ): Primitive[]
    {
        if ( this.getEntity().num_points < 2 ) {
            // 2頂点未満は表示しない
            return [];
        }
        else {
            this._updatePrimitive();
            return stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ? this._primitives : this._pickPrimitives;
        }
    }


    /**
     * 頂点が変更されたことを通知
     */
    onChangePoints()
    {
        this.needToCreateRegions();
        this._geom_dirty = true;
    }


    /**
     * プロパティが変更されたことを通知
     */
    onChangeProperty()
    {
    }


    /**
     * プリミティブの更新
     *
     * 条件: this._num_points >= 2
     *
     * 入力:
     * - this._geom_dirty
     * - this.entity._point_array
     * - this.entity._num_points
     * - this.entity._width
     * - this.entity._color
     * - this.entity._opacity
     * - this.entity._length_array
     * 出力:
     * - this._transform
     * - this._pivot
     * - this._bbox
     * - this._properties
     * - this._primitive.mesh
     * - this._geom_dirty
     *
     */
    private _updatePrimitive()
    {
        this._updateProperties();

        if ( !this._geom_dirty ) {
            // メッシュは更新する必要がない
            return;
        }

        const entity = this.getEntity();

        // GeoPoint 平坦化配列を GOCS 平坦化配列に変換
        const  num_points = entity.num_points;
        const gocs_buffer = GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                                  new Float64Array( num_points * 3 ) );

        // プリミティブの更新
        //   primitive.transform
        //   primitive.pivot
        //   primitive.bbox
        this._updateTransformPivotBBox( gocs_buffer, num_points );

        const add_length = entity.is_path;
        // @ts-ignore
        const length_array = add_length ? entity._length_array : undefined;

        // メッシュ生成
        const mesh_data = {
            vtype: [
                { name: "a_position",  size: 3 },
                { name: "a_direction", size: 3 },
                { name: "a_where",     size: 2 }
            ],
            vertices: this._createVertices( gocs_buffer, num_points, length_array ),
            indices:  this._createIndices()
        };

        if ( add_length ) {
            mesh_data.vtype.push( { name: "a_length", size: 1 } );
        }

        const mesh = new Mesh( entity.scene.glenv, mesh_data );

        // メッシュ設定
        //   primitive.mesh
        const primitive = this._primitive;
        if ( primitive.mesh ) {
            primitive.mesh.dispose();
        }
        primitive.mesh = mesh;

        const pickPrimitive = this._pickPrimitive;
        if ( pickPrimitive.mesh ) {
            pickPrimitive.mesh.dispose();
        }
        pickPrimitive.mesh = mesh;

        // 更新終了
        this._geom_dirty = false;
    }


    /**
     * @summary プロパティを更新
     *
     * @desc
     * <pre>
     * 入力:
     *   this.entity._width
     *   this.entity._color
     *   this.entity._opacity
     *   this.entity._lower_length
     *   this.entity._upper_length
     * 出力:
     *   this._properties
     * </pre>
     *
     * @private
     */
    _updateProperties()
    {
        let entity = this.getEntity();
        let props  = this._properties;

        props.width = entity.getLineWidth();
        GeoMath.copyVector3( entity.getColor(), props.color );
        // @ts-ignore
        props.opacity = entity._opacity;
        if ( entity.is_path ) {
            // @ts-ignore
            props.lower_length = entity._lower_length;
            // @ts-ignore
            props.upper_length = entity._upper_length;
        }
    }


    /**
     * GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * @return GeoPoint 平坦化配列
     */
    private _getFlatGeoPoints_with_Absolute(): Float64Array
    {
        const entity      = this.getEntity();
        const point_array = entity.getPointArray();
        const num_points  = entity.num_points;

        let abs_buffer = null;

        switch ( entity.altitude_mode ) {
        case AltitudeMode.RELATIVE: {
            abs_buffer = new Float64Array( num_points * 3 );
            // abs_buffer[] の高度要素に現在の標高を設定
            entity.scene.viewer.getExistingElevations( num_points, point_array, 0, 3, abs_buffer, 2, 3 );
            // abs_buffer[] に経度要素と緯度要素を設定し、高度要素に絶対高度を設定
            let p = 0;
            for ( let i = 0; i < num_points; i++ ) {
                abs_buffer[p]  = point_array[p++];  // 経度
                abs_buffer[p]  = point_array[p++];  // 緯度
                abs_buffer[p] += point_array[p++];  // 絶対高度
            }
            break;
        }

        default: // AltitudeMode.ABSOLUTE
            abs_buffer = point_array;
            break;
        }

        return abs_buffer;
    }


    /**
     * プリミティブの更新
     *
     * 出力:
     * - this._transform
     * - this._pivot
     * - this._bbox
     *
     * @param gocs_buffer  入力頂点配列 (GOCS)
     * @param num_points   入力頂点数
     */
    private _updateTransformPivotBBox( gocs_buffer: Float64Array, num_points: number )
    {
        // モデル座標系の原点 (GOCS)
        var ox = gocs_buffer[0];
        var oy = gocs_buffer[1];
        var oz = gocs_buffer[2];

        // 変換行列の更新
        var transform = this._transform;
        transform[12] = ox;
        transform[13] = oy;
        transform[14] = oz;

        // 統計
        var xsum = 0;
        var ysum = 0;
        var zsum = 0;

        var xmin = Number.MAX_VALUE;
        var ymin = Number.MAX_VALUE;
        var zmin = Number.MAX_VALUE;

        var xmax = -Number.MAX_VALUE;
        var ymax = -Number.MAX_VALUE;
        var zmax = -Number.MAX_VALUE;

        for ( var i = 0; i < num_points; ++i ) {
            var b = 3 * i;
            var x = gocs_buffer[b]     - ox;
            var y = gocs_buffer[b + 1] - oy;
            var z = gocs_buffer[b + 2] - oz;

            xsum += x;
            ysum += y;
            zsum += z;

            if ( x < xmin ) { xmin = x; }
            if ( y < ymin ) { ymin = y; }
            if ( z < zmin ) { zmin = z; }

            if ( x > xmax ) { xmax = x; }
            if ( y > ymax ) { ymax = y; }
            if ( z > zmax ) { zmax = z; }
        }

        // 中心点
        var pivot = this._pivot;
        pivot[0] = xsum / num_points;
        pivot[1] = ysum / num_points;
        pivot[2] = zsum / num_points;

        // 境界箱
        var bbox  = this._bbox;
        var bmin = bbox[0];
        var bmax = bbox[1];
        bmin[0] = xmin;
        bmin[1] = ymin;
        bmin[2] = zmin;
        bmax[0] = xmax;
        bmax[1] = ymax;
        bmax[2] = zmax;
    }


    /**
     * @summary 頂点配列の生成
     *
     * @param  {Float64Array} gocs_buffer  入力頂点配列 (GOCS)
     * @param  {number}       num_points   入力頂点数
     * @return {Float32Array}              Mesh 用の頂点配列
     *
     * @private
     */
    _createVertices( gocs_buffer: Float64Array, num_points: number, length_array?: number[] )
    {
        // 頂点の距離を追加するか
        const add_length = (length_array !== undefined);

        // モデル座標系の原点 (GOCS)
        const ox = gocs_buffer[0];
        const oy = gocs_buffer[1];
        const oz = gocs_buffer[2];

        const num_segments = num_points - 1;
        const num_vertices = 4 * num_segments;
        const vertices     = new Float32Array( (add_length ? 9 : 8) * num_vertices );

        for ( let i = 0; i < num_segments; ++i ) {
            const  b = 3 * i;
            const sx = gocs_buffer[b]     - ox;
            const sy = gocs_buffer[b + 1] - oy;
            const sz = gocs_buffer[b + 2] - oz;
            const ex = gocs_buffer[b + 3] - ox;
            const ey = gocs_buffer[b + 4] - oy;
            const ez = gocs_buffer[b + 5] - oz;
            const dx = gocs_buffer[b + 3] - gocs_buffer[b];
            const dy = gocs_buffer[b + 4] - gocs_buffer[b + 1];
            const dz = gocs_buffer[b + 5] - gocs_buffer[b + 2];
            const  v = (add_length ? 36 : 32) * i;

            // 始左、始右、終左、終右のループ
            for ( let j = 0; j < 4; ++j ) {
                const start = j < 2;
                const id = v + j * ( add_length ? 9 : 8 );

                vertices[id]      = start ? sx : ex;  // a_position.x
                vertices[id +  1] = start ? sy : ey;  // a_position.y
                vertices[id +  2] = start ? sz : ez;  // a_position.z
                vertices[id +  3] = dx;  // a_direction.x
                vertices[id +  4] = dy;  // a_direction.y
                vertices[id +  5] = dz;  // a_direction.z

                switch ( j ) {
                    case 0:
                        vertices[id +  6] = -1;  // a_where.x
                        vertices[id +  7] =  1;  // a_where.y
                        break;
                    case 1:
                        vertices[id +  6] = -1;  // a_where.x
                        vertices[id +  7] = -1;  // a_where.y
                        break;
                    case 2:
                        vertices[id +  6] =  1;  // a_where.x
                        vertices[id +  7] =  1;  // a_where.y
                        break;
                    case 3:
                        vertices[id +  6] =  1;  // a_where.x
                        vertices[id +  7] = -1;  // a_where.y
                        break;
                }

                if ( add_length ) {
                    // @ts-ignore
                    vertices[id + 8] = length_array[start ? i : i + 1];
                }
            }
        }

        return vertices;
    }


    /**
     * @summary 頂点インデックスの生成
     *
     * @desc
     * <pre>
     * 条件: this.entity._num_points >= 2
     * 入力: this.entity._num_points
     * </pre>
     *
     * @return {Uint32Array}  インデックス配列
     *
     * @private
     */
    _createIndices()
    {
        const num_points   = this.getEntity().num_points;
        const num_segments = num_points - 1;
        const num_indices = 6 * num_segments;
        const indices     = new Uint32Array( num_indices );

        for ( let i = 0; i < num_segments; ++i ) {
            const base_d = 6 * i;
            const base_s = 4 * i;
            indices[base_d]     = base_s;
            indices[base_d + 1] = base_s + 1;
            indices[base_d + 2] = base_s + 2;
            indices[base_d + 3] = base_s + 2;
            indices[base_d + 4] = base_s + 1;
            indices[base_d + 5] = base_s + 3;
        }

        return indices;
    }

}


/**
 * @summary MarkerLineEntity の FlakePrimitiveProducer
 *
 * @private
 */
export class FlakePrimitiveProducer extends Entity.FlakePrimitiveProducer {

    private _material_map: Map<RenderStage.RenderTarget, object>;

    private _area_manager: LineAreaManager;

    private _properties?: {};

    /**
     * @param entity
     */
    constructor( entity: AbstractLineEntity )
    {
        super( entity );

        this._material_map = new Map<RenderStage.RenderTarget, object>();
        RenderStage.ListOfRenderTarget.forEach(renderTarget => {
                // @ts-ignore
                this._material_map.set( renderTarget, entity.getLineMaterial( renderTarget ) );
        });

        this._properties   = undefined;
        this._area_manager = new LineAreaManager( entity );
    }


    getEntity(): AbstractLineEntity
    {
        return super.getEntity() as AbstractLineEntity;
    }


    override getAreaStatus( area: Area ): Entity.AreaStatus
    {
        return this._area_manager.getAreaStatus( area );
    }


    /**
     * @override
     */
    createMesh( area: Area, dpows: number[], dem: any ): Mesh | null // DemBinary
    {
        const segments = this._divideXY( area, dpows );
        if ( segments.length == 0 ) {
            return null;
        }

        const add_length = (this.getEntity().is_path);

        // メッシュ生成
        const mesh_data = {
            vtype: [
                { name: "a_position",  size: 3 },
                { name: "a_direction", size: 3 },
                { name: "a_where",     size: 2 }
            ],
            vertices: this._createVertices( area, dem, segments, add_length ),
            indices:  this._createIndices( segments.length )
        };

        if ( add_length ) {
            mesh_data.vtype.push( { name: "a_length", size: 1 } );
        }

        return new Mesh( this.getEntity().scene.glenv, mesh_data );
    }


    /**
     */
    override getMaterialAndProperties( stage: RenderStage )
    {
        if ( !this._properties ) {
            const entity = this.getEntity();
            this._properties = {
                // @ts-ignore
                width:   entity._width,
                // @ts-ignore
                color:   GeoMath.createVector3f( entity._color ),
                // @ts-ignore
                opacity: entity._opacity
            };

            if ( entity.is_path ) {
                // @ts-ignore
                this._properties.lower_length = entity._lower_length;
                // @ts-ignore
                this._properties.upper_length = entity._upper_length;
            }
        }

        return {
            material:     this._material_map.get( stage.getRenderTarget() ),
            properties:   this._properties
        };
    }


    /**
     * @summary 頂点が変更されたことを通知
     */
    onChangePoints()
    {
        this._area_manager.notifyForUpdateContent();
        this.notifyForUpdate();
    }


    /**
     * @summary プロパティが変更されたことを通知
     */
    onChangeProperty()
    {
        this._properties = undefined;
    }


    /**
     * すべての線分を垂直グリッドで分割
     *
     * @param area   地表断片の領域
     * @param msize  area 寸法 ÷ π (厳密値)
     * @param dpow   area の x 分割指数
     */
    private _divideXOnly( area: Area, msize: number, dpow: number )
    {
        const x_min = Math.PI * (area.x * msize - 1);
        const x_max = Math.PI * ((area.x + 1) * msize - 1);

        const  div_x = 1 << dpow;                // 横分割数: 2^dpow
        const step_x = (x_max - x_min) / div_x;  // 横分割間隔

        const segments = [];

        // 垂直グリッド線で分割
        for ( const [px, py, pl, qx, qy, ql] of this._area_manager.getAreaContent( area ) ) {

            const [x0, y0, l0, x1, y1, l1] = (px <= qx) ? [px, py, pl, qx, qy, ql] : [qx, qy, ql, px, py, pl];
            // assert: x0 <= x1

            if ( x1 < x_min || x0 >= x_max ) {
                // 線分の x 座標が area の範囲外
                continue;
            }

            if ( x0 == x1 ) {
                // 垂直線分なので、垂直グリッド線で分割しない
                segments.push( [x0, y0, l0, x1, y1, l1] );
                continue;
            }

            // 左端でトリミング
            let tx0 = x0;
            let ty0 = y0;
            let tl0 = l0;
            if ( x0 < x_min ) {
                const mu1 = (x_min - x0) / (x1 - x0);
                const mu0 = 1 - mu1;
                tx0 = x_min;
                ty0 = mu0*y0 + mu1*y1;  // 左端線と線分の交点の y 座標
                tl0 = mu0*l0 + mu1*l1;
            }

            // 右端でトリミング
            let tx1 = x1;
            let ty1 = y1;
            let tl1 = l1;
            if ( x1 > x_max ) {
                const mu1 = (x_max - x0) / (x1 - x0);
                const mu0 = 1 - mu1;
                tx1 = x_max;
                ty1 = mu0*y0 + mu1*y1;  // 右端線と線分の交点の y 座標
                tl1 = mu0*l0 + mu1*l1;
            }

            // グリッド線の範囲
            const i_min = Math.max( Math.ceil(  (x0 - x_min) / step_x ), 1         );
            const i_max = Math.min( Math.floor( (x1 - x_min) / step_x ), div_x - 1 );

            let prev_x = tx0;
            let prev_y = ty0;
            let prev_l = tl0;

            for ( let i = i_min; i <= i_max; ++i ) {
                const next_x = x_min + step_x * i;  // 垂直グリッド線の x 座標

                const mu1 = (next_x - x0) / (x1 - x0);
                const mu0 = 1 - mu1;

                const next_y = mu0*y0 + mu1*y1;  // 垂直グリッド線と線分の交点の y 座標
                const next_l = mu0*l0 + mu1*l1;

                if ( prev_x != next_x || prev_y != next_y ) {
                    segments.push( [prev_x, prev_y, prev_l, next_x, next_y, next_l] );
                }

                prev_x = next_x;
                prev_y = next_y;
                prev_l = next_l;
            }

            if ( prev_x != tx1 || prev_y != ty1 ) {
                segments.push( [prev_x, prev_y, prev_l, tx1, ty1, tl1] );
            }
        }

        return segments;
    }


    /**
     * すべての線分をグリッドで分割
     *
     * @param area   地表断片の領域
     * @param dpows  area の xy 分割指数
     */
    private _divideXY( area: Area, dpows: number[] ): LineSegment[]
    {
        // area 寸法 ÷ π (厳密値)
        // 線分の場合、領域の端によるクリッピングがシビアなので厳密値 (2^整数) を使う
        const msize = 2 / Math.round( Math.pow( 2, area.z ) );

        // area の y 座標の範囲
        const y_min = Math.PI * (1 - (area.y + 1) * msize);
        const y_max = Math.PI * (1 - area.y * msize);

        const  div_y = 1 << dpows[1];            // 縦分割数: 2^dpow
        const step_y = (y_max - y_min) / div_y;  // 縦分割間隔

        const segments: LineSegment[] = [];

        // 水平グリッド線で分割
        for ( const [px, py, pl, qx, qy, ql] of this._divideXOnly( area, msize, dpows[0] ) ) {

            const [x0, y0, l0, x1, y1, l1] = (py <= qy) ? [px, py, pl, qx, qy, ql] : [qx, qy, ql, px, py, pl];
            // assert: y0 <= y1

            if ( y1 < y_min || y0 >= y_max ) {
                // 線分の y 座標が area の範囲外
                continue;
            }

            if ( y0 == y1 ) {
                // 水平線分なので、水平グリッド線で分割しない
                segments.push( [x0, y0, l0, x1, y1, l1] );
                continue;
            }

            // 下端でトリミング
            let tx0 = x0;
            let ty0 = y0;
            let tl0 = l0;
            if ( y0 < y_min ) {
                const mu1 = (y_min - y0) / (y1 - y0);
                const mu0 = 1 - mu1;
                tx0 = mu0*x0 + mu1*x1;  // 下端線と線分の交点の x 座標
                ty0 = y_min;
                tl0 = mu0*l0 + mu1*l1;
            }

            // 上端でトリミング
            let tx1 = x1;
            let ty1 = y1;
            let tl1 = l1;
            if ( y1 > y_max ) {
                const mu1 = (y_max - y0) / (y1 - y0);
                const mu0 = 1 - mu1;
                tx1 = mu0*x0 + mu1*x1;  // 上端線と線分の交点の x 座標
                ty1 = y_max;
                tl1 = mu0*l0 + mu1*l1;
            }

            // グリッド線の範囲
            const i_min = Math.max( Math.ceil(  (y0 - y_min) / step_y ), 1         );
            const i_max = Math.min( Math.floor( (y1 - y_min) / step_y ), div_y - 1 );

            let prev_x = tx0;
            let prev_y = ty0;
            let prev_l = tl0;

            for ( let i = i_min; i <= i_max; ++i ) {
                const next_y = y_min + step_y * i;  // 水平グリッド線の y 座標

                const mu1 = (next_y - y0) / (y1 - y0);
                const mu0 = 1 - mu1;

                const next_x = mu0*x0 + mu1*x1;  // 水平グリッド線と線分の交点の x 座標
                const next_l = mu0*l0 + mu1*l1;

                if ( prev_x != next_x || prev_y != next_y ) {
                    segments.push( [prev_x, prev_y, prev_l, next_x, next_y, next_l] );
                }

                prev_x = next_x;
                prev_y = next_y;
                prev_l = next_l;
            }

            if ( prev_x != tx1 || prev_y != ty1 ) {
                segments.push( [prev_x, prev_y, prev_l, tx1, ty1, tl1] );
            }
        }

        return segments;
    }


    /**
     * 頂点配列の生成
     *
     * @param area  地表断片の領域
     * @param dem   DEM バイナリ
     *
     * @return Mesh 用の頂点配列
     */
    private _createVertices( area: Area, dem: DemBinary, segments: LineSegment[], add_length: boolean = false ): Float32Array
    {
        const sampler = dem.newLinearSampler();
        const [ox, oy, oz] = AreaUtil.getCenter( area, GeoMath.createVector3() );

        const num_segments = segments.length;
        const num_vertices = 4 * num_segments;
        const vertices     = new Float32Array( (add_length ? 9 : 8) * num_vertices );

        for ( let i = 0; i < num_segments; ++i ) {
            const [smx, smy, prev_length, emx, emy, next_length] = segments[i];

            const [sgx, sgy, sgz] = toGocs( smx, smy, sampler );
            const [egx, egy, egz] = toGocs( emx, emy, sampler );

            const sx = sgx - ox;
            const sy = sgy - oy;
            const sz = sgz - oz;

            const ex = egx - ox;
            const ey = egy - oy;
            const ez = egz - oz;

            const dx = egx - sgx;
            const dy = egy - sgy;
            const dz = egz - sgz;

            const v = (add_length ? 36 : 32) * i;

            // 始左、始右、終左、終右のループ
            for ( let j = 0; j < 4; ++j ) {
                const start = j < 2;
                const id = v + j * ( add_length ? 9 : 8 );

                vertices[id]      = start ? sx : ex;  // a_position.x
                vertices[id +  1] = start ? sy : ey;  // a_position.y
                vertices[id +  2] = start ? sz : ez;  // a_position.z
                vertices[id +  3] = dx;  // a_direction.x
                vertices[id +  4] = dy;  // a_direction.y
                vertices[id +  5] = dz;  // a_direction.z
                
                switch ( j ) {
                    case 0:
                        vertices[id +  6] = -1;  // a_where.x
                        vertices[id +  7] =  1;  // a_where.y
                        break;
                    case 1:
                        vertices[id +  6] = -1;  // a_where.x
                        vertices[id +  7] = -1;  // a_where.y
                        break;
                    case 2:
                        vertices[id +  6] =  1;  // a_where.x
                        vertices[id +  7] =  1;  // a_where.y
                        break;
                    case 3:
                        vertices[id +  6] =  1;  // a_where.x
                        vertices[id +  7] = -1;  // a_where.y
                        break;
                }

                if ( add_length ) {
                    vertices[id +  8] = start ? prev_length : next_length;
                }
            }
        }

        return vertices;
    }


    /**
     * 頂点インデックスの生成
     *
     * @param num_segments  線分の数
     *
     * @return Mesh 用の頂点インデックス
     */
    private _createIndices( num_segments: number ): Uint32Array
    {
        const num_indices = 6 * num_segments;
        const indices     = new Uint32Array( num_indices );

        for ( let i = 0; i < num_segments; ++i ) {
            const base_d = 6 * i;
            const base_s = 4 * i;
            indices[base_d    ] = base_s;
            indices[base_d + 1] = base_s + 1;
            indices[base_d + 2] = base_s + 2;
            indices[base_d + 3] = base_s + 2;
            indices[base_d + 4] = base_s + 1;
            indices[base_d + 5] = base_s + 3;
        }

        return indices;
    }

}


/**
 * @private
 */
function
toGocs( x: number, y: number, sampler: DemSampler )
{
    const λ = x;
    const φ = GeoMath.gudermannian( y );
    const r = GeoMath.EARTH_RADIUS + sampler.sample( x, y );

    const cosφ = Math.cos( φ );

    return [r * cosφ * Math.cos( λ ),
            r * cosφ * Math.sin( λ ),
            r * Math.sin( φ )];
}


/**
 * @summary 線分の領域管理
 *
 * @private
 */
export class LineAreaManager extends QAreaManager {

    private _entity: AbstractLineEntity;

    /**
     * @param entity  管理対象のエンティティ
     */
    constructor( entity: AbstractLineEntity )
    {
        super();

        this._entity = entity;
    }


    /**
     * @override
     */
    getInitialContent(): LineSegment[]
    {
        const Degree = GeoMath.DEGREE;
        const RAngle = Math.PI / 2;  // 直角
        const TwoPI  = 2 * Math.PI;  // 2π

        const segments: LineSegment[] = [];

        // 頂点データ
        const points    = this._entity.getPointArray();
        // @ts-ignore
        const end_point = this._entity._num_points * 3;

        if ( end_point < 6 ) {
            // 線分なし
            return segments;
        }

        const is_path = this._entity.is_path;
        // @ts-ignore
        const length_array = is_path ? this._entity._length_array : null;

        // 線分の始点 (ラジアン)
        let lon0 = points[0] * Degree;
        let lat0 = points[1] * Degree;
        let length0 = (is_path ? length_array[0] : 0);
        let lon1;
        let lat1;
        let length1;

        for ( let i = 3; i < end_point; i += 3, lon0 = lon1, lat0 = lat1, length0 = length1 ) {
            // 線分の終点 (ラジアン)
            lon1 = points[i    ] * Degree;
            lat1 = points[i + 1] * Degree;
            length1 = (is_path ? length_array[i / 3] : 0);

            if ( lat0 <= -RAngle || lat0 >= RAngle ||
                 lat1 <= -RAngle || lat1 >= RAngle ) {
                // 端点の緯度の絶対値が RAngle 以上の線分は除外
                // ※ まだ検討していないので、とりあえずの処置
                continue;
            }

            // 単位球メルカトル座標系に変換
            const x0 = lon0;
            const y0 = GeoMath.invGudermannian( lat0 );
            const l0 = length0;
            const x1 = lon1;
            const y1 = GeoMath.invGudermannian( lat1 );
            const l1 = length1;

            // 西→東となるようにソート（経度+-180°線を超える場合は、入力値の大小関係により整列される点に注意）
            let [xL, yL, lL, xR, yR, lR] = (x0 < x1) ? [x0, y0, l0, x1, y1, l1] : [x1, y1, l1, x0, y0, l0];

            // -π <= xL < π になるように xL を正規化
            if ( xL < -Math.PI || xL >= Math.PI ) {
                const dx = xR - xL;
                xL -= TwoPI * (Math.floor( (xL - Math.PI) / TwoPI ) + 1);
                if ( xL < -Math.PI || xL >= Math.PI ) {
                    // 誤差対策
                    xL = -Math.PI;
                }
                xR = xL + dx;
            }

            if ( xL == xR && yL == yR ) {
                // 長さ 0 の線分は除外
                continue;
            }

            // 線分を追加
            segments.push( [xL, yL, lL, xR, yR, lR] );

            if ( xR > Math.PI ) {
                // 線分が 180 度子午線をまたぐとき
                // こちらは多少厳密さを無視する
                segments.push( [xL - TwoPI, yL, lL, xR - TwoPI, yR, lR] );
            }
        }

        return segments;
    }


    /**
     */
    override createAreaContent( min_x: number, min_y: number, msize: number, parent_content: LineSegment[] )
    {
        // 単位球メルカトルでの領域に変換
        const x_area_min = Math.PI * min_x;
        const x_area_max = Math.PI * (min_x + msize);
        const y_area_min = Math.PI * min_y;
        const y_area_max = Math.PI * (min_y + msize);

        const segments = [];

        for ( const segment of parent_content ) {
            const [xP, yP, lP, xQ, yQ, lQ] = segment;
            if ( this._intersect( x_area_min, x_area_max, y_area_min, y_area_max, xP, yP, xQ, yQ ) ) {
                segments.push( segment );
            }
        }

        return (segments.length > 0) ? segments : Entity.AreaStatus.EMPTY;
    }


    /**
     * 矩形と線分の交差判定
     *
     * 矩形領域と線分が交差するかどうかを返す。
     * 矩形領域には x 座標が x_area_max の点と、y 座標が y_area_max の点は含まれないものとする。
     *
     * 事前条件:
     * - x_area_min < x_area_max
     * - y_area_min < y_area_max
     *
     * @param x_area_min  矩形領域の最小 x 座標
     * @param x_area_max  矩形領域の最大 x 座標
     * @param y_area_min  矩形領域の最小 y 座標
     * @param y_area_max  矩形領域の最大 y 座標
     * @param xP          線分端点 P の x 座標
     * @param yP          線分端点 P の y 座標
     * @param xQ          線分端点 Q の x 座標
     * @param yQ          線分端点 Q の y 座標
     *
     * @return {boolean}  交差するとき true, それ以外のとき false
     */
    private _intersect( x_area_min: number, x_area_max: number, y_area_min: number, y_area_max: number, xP: number, yP: number, xQ: number, yQ: number )
    {
        if ( Math.abs( xP - xQ ) < Math.abs( yP - yQ ) ) {
            // 線分が垂直に近いとき
            return this._nhorz_intersect( x_area_min, x_area_max, y_area_min, y_area_max, xP, yP, xQ, yQ );
        }
        else {
            // 線分が水平に近いとき
            return this._nhorz_intersect( y_area_min, y_area_max, x_area_min, x_area_max, yP, xP, yQ, xQ );
        }
    }


    /**
     * 矩形と非水平線分の交差判定
     *
     * 矩形領域と線分が交差するかどうかを返す。
     * 矩形領域には x 座標が x_area_max の点と、y 座標が y_area_max の点は含まれないものとする。
     *
     * 事前条件:
     * - x_area_min < x_area_max
     * - y_area_min < y_area_max
     * - yP != yQ
     *
     *
     * 注意: |yP - yQ| が小さいと精度が悪くなる。
     *
     * @param x_area_min  矩形領域の最小 x 座標
     * @param x_area_max  矩形領域の最大 x 座標
     * @param y_area_min  矩形領域の最小 y 座標
     * @param y_area_max  矩形領域の最大 y 座標
     * @param xP          線分端点 P の x 座標
     * @param yP          線分端点 P の y 座標
     * @param xQ          線分端点 Q の x 座標
     * @param yQ          線分端点 Q の y 座標
     *
     * @return 交差するとき true, それ以外のとき false
     */
    private _nhorz_intersect( x_area_min: number, x_area_max: number, y_area_min: number, y_area_max: number, xP: number, yP: number, xQ: number, yQ: number ): boolean
    {
        // 線分の y 座標の範囲
        const [y_line_min, y_line_max] = (yP < yQ) ? [yP, yQ] : [yQ, yP];

        if ( y_line_min >= y_area_max || y_line_max < y_area_min ) {
            // 線分の y 範囲が矩形領域の y 範囲の外側なので交差しない
            return false;
        }

        // 矩形領域と線分の y 座標が重なる範囲 (順不同)
        const y_range_0 = (y_area_min >= y_line_min) ? y_area_min : y_line_min;
        const y_range_1 = (y_area_max <= y_line_max) ? y_area_max : y_line_max;

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲 (順不同)
        const x_range_0 = xP + (xQ - xP) * (y_range_0 - yP) / (yQ - yP);
        const x_range_1 = xP + (xQ - xP) * (y_range_1 - yP) / (yQ - yP);

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲
        const [x_range_min, x_range_max] = (x_range_0 < x_range_1) ? [x_range_0, x_range_1] : [x_range_1, x_range_0];

        // [x_range_min, x_range_max] 範囲は矩形領域の x の範囲と重なるか？
        return (x_range_min < x_area_max) && (x_range_max >= x_area_min);
    }

}



} // namespace AbstractLineEntity



type LineSegment = [
    x0: number, y0: number, l0: number,
    x1: number, y1: number, l1: number,
];



export default AbstractLineEntity;
