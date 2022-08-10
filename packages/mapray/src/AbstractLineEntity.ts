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


    /**
     * @param scene        所属可能シーン
     * @param is_path      Pathかどうか
     * @param opts       オプション集合
     */
    constructor( scene: Scene, is_path: boolean, opts: AbstractLineEntity.Option = {} )
    {
        super( scene, opts );

        this.is_path = is_path;

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
    private _getLineMaterial( render_target: RenderStage.RenderTarget ): LineMaterial
    {
        const scene    = this.scene;
        const cache_id = (
            "_AbstractLineEntity_material" +
            (this.is_path ? "_path" : "_markerline") +
            (render_target === RenderStage.RenderTarget.RID ? "_pick" : "")
        );

        // @ts-ignore
        let material = scene[cache_id];
        if ( !material ) {
            // scene にマテリアルをキャッシュ
            const opt = { ridMaterial: render_target === RenderStage.RenderTarget.RID };
            // @ts-ignore
            material = scene[cache_id] = new LineMaterial( scene.glenv, this.is_path, opt );
        }

        return material;
    }
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
        const      material = entity._getLineMaterial( RenderStage.RenderTarget.SCENE );
        // @ts-ignore
        const primitive = new Primitive( entity.scene.glenv, null, material, this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;
        this._primitive = primitive;

        // @ts-ignore
        const pick_material = entity._getLineMaterial( RenderStage.RenderTarget.RID );
        // @ts-ignore
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
        let region = new EntityRegion();

        region.addPoints( this.getEntity().getPointArray(), 0, 3, this._numPoints() );

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
        // @ts-ignore
        const num_floats = this.getEntity()._num_floats;
        if ( num_floats < 6 ) {
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
     * 条件: this._num_floats >= 6
     *
     * 入力:
     * - this._geom_dirty
     * - this.entity._point_array
     * - this.entity._num_floats
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
        var  num_points = this._numPoints();
        var gocs_buffer = GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                                // @ts-ignore
                                                new Float64Array( entity._num_floats ) );

        // プリミティブの更新
        //   primitive.transform
        //   primitive.pivot
        //   primitive.bbox
        this._updateTransformPivotBBox( gocs_buffer, num_points );

        let add_length = entity.is_path;
        // @ts-ignore
        let length_array = add_length ? entity._length_array : undefined;

        // メッシュ生成
        var mesh_data = {
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

        var mesh = new Mesh( entity.scene.glenv, mesh_data );

        // メッシュ設定
        //   primitive.mesh
        var primitive = this._primitive;
        if ( primitive.mesh ) {
            primitive.mesh.dispose();
        }
        primitive.mesh = mesh;

        var pickPrimitive = this._pickPrimitive;
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
     * @summary GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * @return {number[]}  GeoPoint 平坦化配列
     * @private
     */
    _getFlatGeoPoints_with_Absolute()
    {
        let entity      = this.getEntity();
        let point_array = entity.getPointArray();
        // @ts-ignore
        let num_floats  = entity._num_floats;

        var abs_buffer = null;

        switch ( entity.altitude_mode ) {
        case AltitudeMode.RELATIVE:
            var num_points = this._numPoints();
            abs_buffer = new Float64Array( num_floats );
            // abs_buffer[] の高度要素に現在の標高を設定
            entity.scene.viewer.getExistingElevations( num_points, point_array, 0, 3, abs_buffer, 2, 3 );
            // abs_buffer[] に経度要素と緯度要素を設定し、高度要素に絶対高度を設定
            for ( var i = 0; i < num_floats; i += 3 ) {
                abs_buffer[i    ]  = point_array[i    ];  // 経度
                abs_buffer[i + 1]  = point_array[i + 1];  // 緯度
                abs_buffer[i + 2] += point_array[i + 2];  // 絶対高度
            }
            break;

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
        var add_length = (length_array !== undefined);

        // モデル座標系の原点 (GOCS)
        var ox = gocs_buffer[0];
        var oy = gocs_buffer[1];
        var oz = gocs_buffer[2];

        var num_segments = num_points - 1;
        var num_vertices = 4 * num_segments;
        var vertices     = new Float32Array( (add_length ? 9 : 8) * num_vertices );

        for ( var i = 0; i < num_segments; ++i ) {
            var  b = 3 * i;
            var sx = gocs_buffer[b]     - ox;
            var sy = gocs_buffer[b + 1] - oy;
            var sz = gocs_buffer[b + 2] - oz;
            var ex = gocs_buffer[b + 3] - ox;
            var ey = gocs_buffer[b + 4] - oy;
            var ez = gocs_buffer[b + 5] - oz;
            var dx = gocs_buffer[b + 3] - gocs_buffer[b];
            var dy = gocs_buffer[b + 4] - gocs_buffer[b + 1];
            var dz = gocs_buffer[b + 5] - gocs_buffer[b + 2];
            var  v = (add_length ? 36 : 32) * i;

            // 始左、始右、終左、終右のループ
            for ( var j = 0; j < 4; ++j ) {
                var start = j < 2;
                var id = v + j * ( add_length ? 9 : 8 );

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
     * 条件: this.entity._num_floats >= 6
     * 入力: this.entity._num_floats
     * </pre>
     *
     * @return {Uint32Array}  インデックス配列
     *
     * @private
     */
    _createIndices()
    {
        var num_points   = this._numPoints();
        var num_segments = num_points - 1;
        var num_indices = 6 * num_segments;
        var indices     = new Uint32Array( num_indices );

        for ( var i = 0; i < num_segments; ++i ) {
            var base_d = 6 * i;
            var base_s = 4 * i;
            indices[base_d]     = base_s;
            indices[base_d + 1] = base_s + 1;
            indices[base_d + 2] = base_s + 2;
            indices[base_d + 3] = base_s + 2;
            indices[base_d + 4] = base_s + 1;
            indices[base_d + 5] = base_s + 3;
        }

        return indices;
    }


    /**
     * @summary 頂点数を取得
     *
     * @return {number} 頂点数
     *
     * @private
     */
    _numPoints()
    {
        // @ts-ignore
        const num_floats = this.getEntity()._num_floats;
        return Math.floor( num_floats / 3 );
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
                this._material_map.set( renderTarget, entity._getLineMaterial( renderTarget ) );
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
        let segments = this._divideXY( area, dpows );
        if ( segments.length == 0 ) {
            return null;
        }

        let add_length = (this.getEntity().is_path);

        // メッシュ生成
        let mesh_data = {
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
            let entity = this.getEntity();
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
     * @summary すべての線分を垂直グリッドで分割
     *
     * @param area   地表断片の領域
     * @param msize  area 寸法 ÷ π (厳密値)
     * @param dpow   area の x 分割指数
     */
    private _divideXOnly( area: Area, msize: number, dpow: number )
    {
        let x_min = Math.PI * (area.x * msize - 1);
        let x_max = Math.PI * ((area.x + 1) * msize - 1);

        let  div_x = 1 << dpow;                // 横分割数: 2^dpow
        let step_x = (x_max - x_min) / div_x;  // 横分割間隔

        let segments = [];

        // 垂直グリッド線で分割
        for ( let [px, py, pl, qx, qy, ql] of this._area_manager.getAreaContent( area ) ) {

            let [x0, y0, l0, x1, y1, l1] = (px <= qx) ? [px, py, pl, qx, qy, ql] : [qx, qy, ql, px, py, pl];
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
                let mu1 = (x_min - x0) / (x1 - x0);
                let mu0 = 1 - mu1;
                tx0 = x_min;
                ty0 = mu0*y0 + mu1*y1;  // 左端線と線分の交点の y 座標
                tl0 = mu0*l0 + mu1*l1;
            }

            // 右端でトリミング
            let tx1 = x1;
            let ty1 = y1;
            let tl1 = l1;
            if ( x1 > x_max ) {
                let mu1 = (x_max - x0) / (x1 - x0);
                let mu0 = 1 - mu1;
                tx1 = x_max;
                ty1 = mu0*y0 + mu1*y1;  // 右端線と線分の交点の y 座標
                tl1 = mu0*l0 + mu1*l1;
            }

            // グリッド線の範囲
            let i_min = Math.max( Math.ceil(  (x0 - x_min) / step_x ), 1         );
            let i_max = Math.min( Math.floor( (x1 - x_min) / step_x ), div_x - 1 );

            let prev_x = tx0;
            let prev_y = ty0;
            let prev_l = tl0;

            for ( let i = i_min; i <= i_max; ++i ) {
                let next_x = x_min + step_x * i;  // 垂直グリッド線の x 座標

                let mu1 = (next_x - x0) / (x1 - x0);
                let mu0 = 1 - mu1;

                let next_y = mu0*y0 + mu1*y1;  // 垂直グリッド線と線分の交点の y 座標
                let next_l = mu0*l0 + mu1*l1;

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
     * @summary すべての線分をグリッドで分割
     *
     * @param area   地表断片の領域
     * @param dpows  area の xy 分割指数
     */
    private _divideXY( area: Area, dpows: number[] ): [number, number, number, number, number, number][]
    {
        // area 寸法 ÷ π (厳密値)
        // 線分の場合、領域の端によるクリッピングがシビアなので厳密値 (2^整数) を使う
        let msize = 2 / Math.round( Math.pow( 2, area.z ) );

        // area の y 座標の範囲
        let y_min = Math.PI * (1 - (area.y + 1) * msize);
        let y_max = Math.PI * (1 - area.y * msize);

        let  div_y = 1 << dpows[1];            // 縦分割数: 2^dpow
        let step_y = (y_max - y_min) / div_y;  // 縦分割間隔

        let segments: [number, number, number, number, number, number][] = [];

        // 水平グリッド線で分割
        for ( let [px, py, pl, qx, qy, ql] of this._divideXOnly( area, msize, dpows[0] ) ) {

            let [x0, y0, l0, x1, y1, l1] = (py <= qy) ? [px, py, pl, qx, qy, ql] : [qx, qy, ql, px, py, pl];
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
                let mu1 = (y_min - y0) / (y1 - y0);
                let mu0 = 1 - mu1;
                tx0 = mu0*x0 + mu1*x1;  // 下端線と線分の交点の x 座標
                ty0 = y_min;
                tl0 = mu0*l0 + mu1*l1;
            }

            // 上端でトリミング
            let tx1 = x1;
            let ty1 = y1;
            let tl1 = l1;
            if ( y1 > y_max ) {
                let mu1 = (y_max - y0) / (y1 - y0);
                let mu0 = 1 - mu1;
                tx1 = mu0*x0 + mu1*x1;  // 上端線と線分の交点の x 座標
                ty1 = y_max;
                tl1 = mu0*l0 + mu1*l1;
            }

            // グリッド線の範囲
            let i_min = Math.max( Math.ceil(  (y0 - y_min) / step_y ), 1         );
            let i_max = Math.min( Math.floor( (y1 - y_min) / step_y ), div_y - 1 );

            let prev_x = tx0;
            let prev_y = ty0;
            let prev_l = tl0;

            for ( let i = i_min; i <= i_max; ++i ) {
                let next_y = y_min + step_y * i;  // 水平グリッド線の y 座標

                let mu1 = (next_y - y0) / (y1 - y0);
                let mu0 = 1 - mu1;

                let next_x = mu0*x0 + mu1*x1;  // 水平グリッド線と線分の交点の x 座標
                let next_l = mu0*l0 + mu1*l1;

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
    private _createVertices( area: Area, dem: DemBinary, segments: [number, number, number, number, number, number][], add_length: boolean = false ): Float32Array
    {
        let sampler = dem.newLinearSampler();
        let [ox, oy, oz] = AreaUtil.getCenter( area, GeoMath.createVector3() );

        let num_segments = segments.length;
        let num_vertices = 4 * num_segments;
        let vertices     = new Float32Array( (add_length ? 9 : 8) * num_vertices );

        for ( let i = 0; i < num_segments; ++i ) {
            let [smx, smy, prev_length, emx, emy, next_length] = segments[i];

            let [sgx, sgy, sgz] = toGocs( smx, smy, sampler );
            let [egx, egy, egz] = toGocs( emx, emy, sampler );

            let sx = sgx - ox;
            let sy = sgy - oy;
            let sz = sgz - oz;

            let ex = egx - ox;
            let ey = egy - oy;
            let ez = egz - oz;

            let dx = egx - sgx;
            let dy = egy - sgy;
            let dz = egz - sgz;

            let v = (add_length ? 36 : 32) * i;

            // 始左、始右、終左、終右のループ
            for ( var j = 0; j < 4; ++j ) {
                var start = j < 2;
                var id = v + j * ( add_length ? 9 : 8 );

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
        let num_indices = 6 * num_segments;
        let indices     = new Uint32Array( num_indices );

        for ( let i = 0; i < num_segments; ++i ) {
            let base_d = 6 * i;
            let base_s = 4 * i;
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
    let λ = x;
    let φ = GeoMath.gudermannian( y );
    let r = GeoMath.EARTH_RADIUS + sampler.sample( x, y );

    let cosφ = Math.cos( φ );

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
    getInitialContent(): [number, number, number, number, number, number][]
    {
        const Degree = GeoMath.DEGREE;
        const RAngle = Math.PI / 2;  // 直角
        const TwoPI  = 2 * Math.PI;  // 2π

        let segments: [number, number, number, number, number, number][] = [];

        // 頂点データ
        let points    = this._entity.getPointArray();
        // @ts-ignore
        let end_point = this._entity._num_floats;

        if ( end_point < 6 ) {
            // 線分なし
            return segments;
        }

        const is_path = this._entity.is_path;
        // @ts-ignore
        let length_array = is_path ? this._entity._length_array : null;

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
            let x0 = lon0;
            let y0 = GeoMath.invGudermannian( lat0 );
            let l0 = length0;
            let x1 = lon1;
            let y1 = GeoMath.invGudermannian( lat1 );
            let l1 = length1;

            // 左端点と右端点
            let [xL, yL, lL, xR, yR, lR] = (x0 < x1) ? [x0, y0, l0, x1, y1, l1] : [x1, y1, l1, x0, y0, l0];

            // -π <= xL < π になるように xL を正規化
            if ( xL < -Math.PI || xL >= Math.PI ) {
                let dx = xR - xL;
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
    override createAreaContent( min_x: number, min_y: number, msize: number, parent_content: [number, number, number, number, number, number][] )
    {
        // 単位球メルカトルでの領域に変換
        const x_area_min = Math.PI * min_x;
        const x_area_max = Math.PI * (min_x + msize);
        const y_area_min = Math.PI * min_y;
        const y_area_max = Math.PI * (min_y + msize);

        let segments = [];

        for ( let segment of parent_content ) {
            let [xP, yP, /*lP*/, xQ, yQ, /*lQ*/] = segment;
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
        let [y_line_min, y_line_max] = (yP < yQ) ? [yP, yQ] : [yQ, yP];

        if ( y_line_min >= y_area_max || y_line_max < y_area_min ) {
            // 線分の y 範囲が矩形領域の y 範囲の外側なので交差しない
            return false;
        }

        // 矩形領域と線分の y 座標が重なる範囲 (順不同)
        let y_range_0 = (y_area_min >= y_line_min) ? y_area_min : y_line_min;
        let y_range_1 = (y_area_max <= y_line_max) ? y_area_max : y_line_max;

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲 (順不同)
        let x_range_0 = xP + (xQ - xP) * (y_range_0 - yP) / (yQ - yP);
        let x_range_1 = xP + (xQ - xP) * (y_range_1 - yP) / (yQ - yP);

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲
        let [x_range_min, x_range_max] = (x_range_0 < x_range_1) ? [x_range_0, x_range_1] : [x_range_1, x_range_0];

        // [x_range_min, x_range_max] 範囲は矩形領域の x の範囲と重なるか？
        return (x_range_min < x_area_max) && (x_range_max >= x_area_min);
    }

}



} // namespace AbstractLineEntity



export default AbstractLineEntity;
