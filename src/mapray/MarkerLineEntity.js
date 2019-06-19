import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import MarkerLineMaterial from "./MarkerLineMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";


/**
 * @summary 太さ付き連続線エンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class MarkerLineEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // 頂点管理
        this._buffer     = new Float64Array( 1 );
        this._num_floats = 0;
        this._geom_dirty = true;

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._pivot      = GeoMath.createVector3();
        this._bbox       = [GeoMath.createVector3(),
                            GeoMath.createVector3()];
        this._properties = {
            width:   1.0,
            color:   GeoMath.createVector3f( [1.0, 1.0, 1.0] ),
            opacity: 1.0
        };

        // プリミティブ
        var primitive = new Primitive( scene.glenv, null, this._getMarkerLineMaterial(), this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;
        this._primitive = primitive;

        // プリミティブ配列
        this._empty      = [];
        this._primitives = [primitive];

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        if ( this._num_floats < 6 ) {
            // 2頂点未満は表示しない
            return this._empty;
        }
        else {
            this._updatePrimitive();
            return this._primitives;
        }
    }


    /**
     * @summary 線の太さを設定
     * @param {number} width  線の太さ (画素単位)
     */
    setLineWidth( width )
    {
        this._properties.width = width;
    }


    /**
     * @summary 基本色を設定
     * @param {mapray.Vector3} color  基本色
     */
    setColor( color )
    {
        GeoMath.copyVector3( color, this._properties.color );
    }


    /**
     * @summary 不透明度を設定
     * @param {number} opacity  不透明度
     */
    setOpacity( opacity )
    {
        this._properties.opacity = opacity;
    }


    /**
     * @summary 複数の頂点を追加
     *
     * @desc
     * <p>points は [lon_0, lat_0, alt_0, lon_1, lat_1, alt_1, ...] のような形式の配列を与える。</p>
     *
     * @param {number[]} points  頂点の配列
     */
    addPoints( points )
    {
        var add_size = points.length;
        if ( add_size == 0 ) {
            // 追加頂点が無いので変化なし
            return;
        }

        // バッファを拡張
        var target_size = this._num_floats + add_size;
        var buffer_size = this._buffer.length;
        if ( target_size > buffer_size ) {
            var new_buffer = new Float64Array( Math.max( target_size, 2 * buffer_size ) );
            var old_buffer = this._buffer;
            var  copy_size = this._num_floats;
            for ( var i = 0; i < copy_size; ++i ) {
                new_buffer[i] = old_buffer[i];
            }
            this._buffer = new_buffer;
        }

        // 頂点追加処理
        var buffer = this._buffer;
        var   base = this._num_floats;
        for ( var j = 0; j < add_size; ++j ) {
            buffer[base + j] = points[j];
        }
        this._num_floats = target_size;
        this._geom_dirty = true;
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getMarkerLineMaterial()
    {
        var scene = this.scene;
        if ( !scene._MarkerLineEntity_markerline_material ) {
            // scene にマテリアルをキャッシュ
            scene._MarkerLineEntity_markerline_material = new MarkerLineMaterial( scene.glenv );
        }
        return scene._MarkerLineEntity_markerline_material;
    }


    /**
     * @summary プリミティブの更新
     * @desc
     * 条件: this._num_floats >= 6
     * 入力:
     *   this._geom_dirty
     *   this._buffer
     *   this._num_floats
     * 出力:
     *   this._transform
     *   this._pivot
     *   this._bbox
     *   this._primitive.mesh
     *   this._geom_dirty
     * @private
     */
    _updatePrimitive()
    {
        if ( !this._geom_dirty ) {
            // 更新する必要はない
            return;
        }

        // this._buffer を GOCS に変換した配列を生成
        var  num_points = this._num_floats / 3;
        var gocs_buffer = GeoPoint.toGocsArray( this._buffer, num_points,
                                                new Float64Array( this._num_floats ) );

        // プリミティブの更新
        //   primitive.transform
        //   primitive.pivot
        //   primitive.bbox
        this._updateTransformPivotBBox( gocs_buffer, num_points );

        // メッシュ生成
        var mesh_data = {
            vtype: [
                { name: "a_position",  size: 3 },
                { name: "a_direction", size: 3 },
                { name: "a_where",     size: 2 }
            ],
            vertices: this._createVertices( gocs_buffer, num_points ),
            indices:  this._createIndices()
        };
        var mesh = new Mesh( this.scene.glenv, mesh_data );

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
     * @private
     */
    _createVertices( gocs_buffer, num_points )
    {
        // モデル座標系の原点 (GOCS)
        var ox = gocs_buffer[0];
        var oy = gocs_buffer[1];
        var oz = gocs_buffer[2];

        var num_segments = num_points - 1;
        var num_vertices = 4 * num_segments;
        var vertices     = new Float32Array( 8 * num_vertices );

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
            var  v = 32 * i;

            // 始左
            vertices[v]      = sx;  // a_position.x
            vertices[v +  1] = sy;  // a_position.y
            vertices[v +  2] = sz;  // a_position.z
            vertices[v +  3] = dx;  // a_direction.x
            vertices[v +  4] = dy;  // a_direction.y
            vertices[v +  5] = dz;  // a_direction.z
            vertices[v +  6] = -1;  // a_where.x
            vertices[v +  7] =  1;  // a_where.y
            // 始右
            vertices[v +  8] = sx;
            vertices[v +  9] = sy;
            vertices[v + 10] = sz;
            vertices[v + 11] = dx;
            vertices[v + 12] = dy;
            vertices[v + 13] = dz;
            vertices[v + 14] = -1;
            vertices[v + 15] = -1;
            // 終左
            vertices[v + 16] = ex;
            vertices[v + 17] = ey;
            vertices[v + 18] = ez;
            vertices[v + 19] = dx;
            vertices[v + 20] = dy;
            vertices[v + 21] = dz;
            vertices[v + 22] =  1;
            vertices[v + 23] =  1;
            // 終右
            vertices[v + 24] = ex;
            vertices[v + 25] = ey;
            vertices[v + 26] = ez;
            vertices[v + 27] = dx;
            vertices[v + 28] = dy;
            vertices[v + 29] = dz;
            vertices[v + 30] =  1;
            vertices[v + 31] = -1;
        }

        return vertices;
    }


    /**
     * @summary 頂点配列は生成
     * @desc
     * 条件: this._num_floats >= 6
     * 入力:
     *   this._num_floats
     * @return {Uint32Array}  インデックス配列
     * @private
     */
    _createIndices()
    {
        var num_points   = this._num_floats / 3;
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
     * @private
     */
    _setupByJson( json )
    {
        // json.points
        this.addPoints( json.points );

        // json.line_width
        //     .color
        //     .opacity
        var props = this._properties;
        if ( json.line_width ) props.width = json.line_width;
        if ( json.color )      GeoMath.copyVector3( json.color, props.color );
        if ( json.opacity )    props.opacity = json.opacity;
    }

}


export default MarkerLineEntity;
