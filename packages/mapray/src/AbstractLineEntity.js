import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import LineMaterial from "./LineMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import AreaUtil from "./AreaUtil";
import QAreaManager from "./QAreaManager";
import Type from "./animation/Type";

/**
 * @summary 線エンティティ
 *
 * @classdesc
 * <p>{@link mapray.MarkerLineEntity} と {@link mapray.PathEntity} の共通機能を
 *    提供するクラスである。</p>
 *
 * @memberof mapray
 * @extends mapray.Entity
 * @abstract
 * @protected
 */
class AbstractLineEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {mapray.AbstractLineEntity.LineType} line_type  クラス種別
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, line_type, opts )
    {
        super( scene, opts );
        
        this._line_type = line_type;

        if ( this.altitude_mode === AltitudeMode.CLAMP ) {
            this._producer = new FlakePrimitiveProducer( this );
            this._is_flake_mode = true;
        }
        else {
            this._producer = new PrimitiveProducer( this );
            this._is_flake_mode = false;
        }
    }


    /**
     * @override
     */
    getPrimitiveProducer()
    {
        return (!this._is_flake_mode) ? this._producer : null;
    }


    /**
     * @override
     */
    getFlakePrimitiveProducer()
    {
        return (this._is_flake_mode) ? this._producer : null;
    }


    /**
     * @override
     */
    onChangeAltitudeMode( prev_mode )
    {
        if ( this.altitude_mode === AltitudeMode.CLAMP ) {
            this._producer = new FlakePrimitiveProducer( this );
            this._is_flake_mode = true;
        }
        else {
            this._producer = new PrimitiveProducer( this );
            this._is_flake_mode = false;
        }
    }


    /**
     * @summary 線の太さを設定
     *
     * @param {number} width  線の太さ (画素単位)
     */
    setLineWidth( width )
    {
        if ( this._width !== width ) {
            this._width = width;
            this._producer.onChangeProperty();
        }
    }


    /**
     * @summary 基本色を設定
     *
     * @param {mapray.Vector3} color  基本色
     */
    setColor( color )
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
     * @summary 不透明度を設定
     *
     * @param {number} opacity  不透明度
     */
    setOpacity( opacity )
    {
        if ( this._opacity !== opacity ) {
            this._opacity = opacity;
            this._producer.onChangeProperty();
        }
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getLineMaterial()
    {
        // キャッシュの場所を決定
        const cache_suffix = (this._line_type === LineType.PATH) ? "path" : "markerline";

        const scene    = this.scene;
        const cache_id = "_AbstractLineEntity_material_" + cache_suffix;

        if ( !scene[cache_id] ) {
            // scene にマテリアルをキャッシュ
            scene[cache_id] = new LineMaterial( scene.glenv, this._line_type );
        }

        return scene[cache_id];
    }
}


/**
 * @summary MarkerLineEntity の PrimitiveProducer
 *
 * @private
 */
class PrimitiveProducer extends Entity.PrimitiveProducer {

    /**
     * @param {mapray.MarkerLineEntity} entity
     */
    constructor( entity )
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
            opacity: 1.0
        };
        
        if ( entity._line_type == LineType.PATH ) {
            this._properties["lower_length"] = 0.0;
            this._properties["upper_length"] = 0.0;
        }

        // プリミティブ
        var primitive = new Primitive( entity.scene.glenv, null, entity._getLineMaterial(), this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;
        this._primitive = primitive;

        // プリミティブ配列
        this._primitives = [primitive];

        this._geom_dirty = true;
    }


    /**
     * @override
     */
    createRegions()
    {
        let region = new EntityRegion();

        region.addPoints( this.entity._point_array, 0, 3, this._numPoints() );

        return [region];
    }


    /**
     * @override
     */
    onChangeElevation( regions )
    {
        this._geom_dirty = true;
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        if ( this._num_floats < 6 ) {
            // 2頂点未満は表示しない
            return [];
        }
        else {
            this._updatePrimitive();
            return this._primitives;
        }
    }


    /**
     * @summary 頂点が変更されたことを通知
     */
    onChangePoints()
    {
        this.needToCreateRegions();
        this._geom_dirty = true;
    }


    /**
     * @summary プロパティが変更されたことを通知
     */
    onChangeProperty()
    {
    }


    /**
     * @summary プリミティブの更新
     *
     * @desc
     * <pre>
     * 条件: this._num_floats >= 6
     * 入力:
     *   this._geom_dirty
     *   this.entity._point_array
     *   this.entity._num_floats
     *   this.entity._width
     *   this.entity._color
     *   this.entity._opacity
     *   this.entity._length_array
     * 出力:
     *   this._transform
     *   this._pivot
     *   this._bbox
     *   this._properties
     *   this._primitive.mesh
     *   this._geom_dirty
     * </pre>
     *
     * @private
     */
    _updatePrimitive()
    {
        this._updateProperties();

        if ( !this._geom_dirty ) {
            // メッシュは更新する必要がない
            return;
        }

        let entity = this.entity;

        // GeoPoint 平坦化配列を GOCS 平坦化配列に変換
        var  num_points = this._numPoints();
        var gocs_buffer = GeoPoint.toGocsArray( this._getFlatGeoPoints_with_Absolute(), num_points,
                                                new Float64Array( entity._num_floats ) );

        // プリミティブの更新
        //   primitive.transform
        //   primitive.pivot
        //   primitive.bbox
        this._updateTransformPivotBBox( gocs_buffer, num_points );

        let add_length = (entity._line_type === LineType.PATH);
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
        let entity = this.entity;
        let props  = this._properties;

        props.width = entity._width;
        GeoMath.copyVector3( entity._color, props.color );
        props.opacity = entity._opacity;
        props.lower_length = entity._lower_length;
        props.upper_length = entity._upper_length;
    }


    /**
     * @summary GeoPoint 平坦化配列を取得 (絶対高度)
     *
     * @return {number[]}  GeoPoint 平坦化配列
     * @private
     */
    _getFlatGeoPoints_with_Absolute()
    {
        let entity      = this.entity;
        let point_array = entity._point_array;
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
     * @summary プリミティブの更新
     *
     * @desc
     * <pre>
     * 出力:
     *   this._transform
     *   this._pivot
     *   this._bbox
     * </pre>
     *
     * @param {Float64Array} gocs_buffer  入力頂点配列 (GOCS)
     * @param {number}       num_points   入力頂点数
     * @private
     */
    _updateTransformPivotBBox( gocs_buffer, num_points )
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
    _createVertices( gocs_buffer, num_points, length_array = undefined )
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
        return Math.floor( this.entity._num_floats / 3 );
    }

}


/**
 * @summary MarkerLineEntity の FlakePrimitiveProducer
 *
 * @private
 */
class FlakePrimitiveProducer extends Entity.FlakePrimitiveProducer {

    /**
     * @param {mapray.MarkerLineEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._material     = entity._getLineMaterial();
        this._properties   = null;
        this._area_manager = new LineAreaManager( entity );
    }


    /**
     * @override
     */
    getAreaStatus( area )
    {
        return this._area_manager.getAreaStatus( area );
    }


    /**
     * @override
     */
    createMesh( area, dpows, dem )
    {
        let segments = this._divideXY( area, dpows );
        if ( segments.length == 0 ) {
            return null;
        }

        let add_length = (this.entity._line_type === LineType.PATH);

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

        return new Mesh( this.entity.scene.glenv, mesh_data );
    }


    /**
     * @override
     */
    getMaterialAndProperties( stage )
    {
        if ( this._properties === null ) {
            let entity = this.entity;
            this._properties = {
                width:   entity._width,
                color:   GeoMath.createVector3f( entity._color ),
                opacity: entity._opacity
            };

            if ( entity._line_type == LineType.PATH ) {
                this._properties["lower_length"] = entity._lower_length;
                this._properties["upper_length"] = entity._upper_length;
            }
        }

        return {
            material:   this._material,
            properties: this._properties
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
        this._properties = null;
    }


    /**
     * @summary すべての線分を垂直グリッドで分割
     *
     * @param {mapray.Area} area   地表断片の領域
     * @param {number}      msize  area 寸法 ÷ π (厳密値)
     * @param {number}      dpow   area の x 分割指数
     *
     * @private
     */
    _divideXOnly( area, msize, dpow )
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
     * @param {mapray.Area} area   地表断片の領域
     * @param {number[]}    dpows  area の xy 分割指数
     *
     * @private
     */
    _divideXY( area, dpows )
    {
        // area 寸法 ÷ π (厳密値)
        // 線分の場合、領域の端によるクリッピングがシビアなので厳密値 (2^整数) を使う
        let msize = 2 / Math.round( Math.pow( 2, area.z ) );

        // area の y 座標の範囲
        let y_min = Math.PI * (1 - (area.y + 1) * msize);
        let y_max = Math.PI * (1 - area.y * msize);

        let  div_y = 1 << dpows[1];            // 縦分割数: 2^dpow
        let step_y = (y_max - y_min) / div_y;  // 縦分割間隔

        let segments = [];

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
     * @summary 頂点配列の生成
     *
     * @param {mapray.Area}      area  地表断片の領域
     * @param {mapray.DemBinary} dem   DEM バイナリ
     *
     * @return {Float32Array}  Mesh 用の頂点配列
     *
     * @private
     */
    _createVertices( area, dem, segments, add_length = false )
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
     * @summary @summary 頂点インデックスの生成
     *
     * @param {number} num_segments  線分の数
     *
     * @return {Uint32Array}  Mesh 用の頂点インデックス
     *
     * @private
     */
    _createIndices( num_segments )
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
toGocs( x, y, sampler )
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
class LineAreaManager extends QAreaManager {

    /**
     * @param {mapray.MarkerLineEntity} entity  管理対象のエンティティ
     */
    constructor( entity )
    {
        super();

        this._entity = entity;
    }


    /**
     * @override
     */
    getInitialContent()
    {
        const Degree = GeoMath.DEGREE;
        const RAngle = Math.PI / 2;  // 直角
        const TwoPI  = 2 * Math.PI;  // 2π

        let segments = [];

        // 頂点データ
        let points    = this._entity._point_array;
        let end_point = this._entity._num_floats;

        if ( end_point < 6 ) {
            // 線分なし
            return segments;
        }

        let is_path = (this._entity._line_type === LineType.PATH);
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
     * @override
     */
    createAreaContent( min_x, min_y, msize, parent_content )
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
     * @summary 矩形と線分の交差判定
     *
     * @desc
     * <p>矩形領域と線分が交差するかどうかを返す。</p>
     * <p>矩形領域には x 座標が x_area_max の点と、y 座標が y_area_max の点は含まれないものとする。</p>
     *
     * <pre>
     * 事前条件:
     *   x_area_min < x_area_max
     *   y_area_min < y_area_max
     * </pre>
     *
     * @param {number} x_area_min  矩形領域の最小 x 座標
     * @param {number} x_area_max  矩形領域の最大 x 座標
     * @param {number} y_area_min  矩形領域の最小 y 座標
     * @param {number} y_area_max  矩形領域の最大 y 座標
     * @param {number} xP          線分端点 P の x 座標
     * @param {number} yP          線分端点 P の y 座標
     * @param {number} xQ          線分端点 Q の x 座標
     * @param {number} yQ          線分端点 Q の y 座標
     *
     * @return {boolean}  交差するとき true, それ以外のとき false
     *
     * @private
     */
    _intersect( x_area_min, x_area_max, y_area_min, y_area_max, xP, yP, xQ, yQ )
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
     * @summary 矩形と非水平線分の交差判定
     *
     * @desc
     * <p>矩形領域と線分が交差するかどうかを返す。</p>
     * <p>矩形領域には x 座標が x_area_max の点と、y 座標が y_area_max の点は含まれないものとする。</p>
     *
     * <pre>
     * 事前条件:
     *   x_area_min < x_area_max
     *   y_area_min < y_area_max
     *   yP != yQ
     * </pre>
     *
     * <p>注意: |yP - yQ| が小さいと精度が悪くなる。</p>
     *
     * @param {number} x_area_min  矩形領域の最小 x 座標
     * @param {number} x_area_max  矩形領域の最大 x 座標
     * @param {number} y_area_min  矩形領域の最小 y 座標
     * @param {number} y_area_max  矩形領域の最大 y 座標
     * @param {number} xP          線分端点 P の x 座標
     * @param {number} yP          線分端点 P の y 座標
     * @param {number} xQ          線分端点 Q の x 座標
     * @param {number} yQ          線分端点 Q の y 座標
     *
     * @return {boolean}  交差するとき true, それ以外のとき false
     *
     * @private
     */
    _nhorz_intersect( x_area_min, x_area_max, y_area_min, y_area_max, xP, yP, xQ, yQ )
    {
        // 線分の y 座標の範囲
        let [y_line_min, y_line_max] = (yP < yQ) ? [yP, yQ] : [yQ, yP];

        if ( y_line_min >= y_area_max || y_line_max < y_area_min ) {
            // 線分の y 範囲が矩形領域の y 範囲の外側なので交差しない
            return false;
        }

        // 矩形領域と線分の y 座標が重なる範囲 (順不同)
        let y_range_0 = (y_area_min >= y_line_max) ? y_area_min : y_line_max;
        let y_range_1 = (y_area_max <= y_line_min) ? y_area_max : y_line_min;

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲 (順不同)
        let x_range_0 = xP + (xQ - xP) * (y_range_0 - yP) / (yQ - yP);
        let x_range_1 = xP + (xQ - xP) * (y_range_1 - yP) / (yQ - yP);

        // y が {y_range_0, y_range_1} 範囲での線分の x 範囲
        let [x_range_min, x_range_max] = (x_range_0 < x_range_1) ? [x_range_0, x_range_1] : [x_range_1, x_range_0];

        // [x_range_min, x_range_max] 範囲は矩形領域の x の範囲と重なるか？
        return (x_range_min < x_area_max) && (x_range_max >= x_area_min);
    }

}


 /**
 * @summary エンティティの種類の列挙型
 * @enum {object}
 * @memberof mapray.AbstractLineEntity
 * @constant
 * @see mapray.AbstractLineEntity#line_type
 */
var LineType = {

    /**
     * MarkerLineEntity
     */
    MARKERLINE: { id: "MARKERLINE" },


    /**
     * PathEntity
     */
    PATH: { id: "PATH" }
};

AbstractLineEntity.LineType = LineType;


export default AbstractLineEntity;
