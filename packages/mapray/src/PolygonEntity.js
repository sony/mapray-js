import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import PolygonMaterial from "./PolygonMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Triangulator from "./Triangulator";
import QAreaManager from "./QAreaManager";
import ConvexPolygon from "./ConvexPolygon";
import AreaUtil from "./AreaUtil";
import Type from "./animation/Type";


/**
 * @summary 多角形エンティティ
 * @memberof mapray
 * @extends mapray.Entity
 */
class PolygonEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        this._extruded_height = 0.0;
        this._color    = GeoMath.createVector3( [1, 1, 1] );
        this._opacity  = 1.0;

        // 頂点管理
        this._boundaries = [];    // Boundary のリスト
        this._position   = null;  // 中央付近の GeoPoint

        // this._producer
        // this._is_flake_mode
        if ( this.altitude_mode === AltitudeMode.CLAMP ) {
            this._producer = new FlakePrimitiveProducer( this );
            this._is_flake_mode = true;
        }
        else {
            this._producer = new PrimitiveProducer( this );
            this._is_flake_mode = false;
        }

        this._setupAnimationBindingBlock();

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     * @summary 押し出し量（0より大きい値）
     * @type {number}
     */
    set extruded_height( value )
    {
        var prev = this._extruded_height;

        if ( prev !== value ) {
            this._extruded_height = value;
            this._producer.onChangeExtruded();
        }
    }


    /**
     * @summary 押し出し量
     * @type {number}
     */
    get extruded_height() { return this._extruded_height; }


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
     * アニメーションの BindingBlock を初期化
     *
     * @private
     */
    _setupAnimationBindingBlock()
    {
        const block = this.animation;  // 実体は EasyBindingBlock

        const number  = Type.find( "number"  );
        const vector3 = Type.find( "vector3" );

        // パラメータ名: color
        // パラメータ型: vector3
        //   色
        block.addEntry( "color", [vector3], null, value => {
            this.setColor( value );
        } );
        
        // パラメータ名: opacity
        // パラメータ型: number
        //   不透明度
        block.addEntry( "opacity", [number], null, value => {
            this.setOpacity( value );
        } );
        
        // パラメータ名: height
        // パラメータ型: number
        //   線の太さ
        block.addEntry( "height", [number], null, value => {
            this.setExtrudedHeight( value );
        } );
    }


    /**
     * @summary 基本色を設定
     * @param {mapray.Vector3} color  基本色
     */
    setColor( color )
    {
        if ( this._color[0] !== color[0] ||
             this._color[1] !== color[1] ||
             this._color[2] !== color[2] ) {
            GeoMath.copyVector3( color, this._color );
            this._producer.onChangeProperty();
        }
    }


    /**
     * @summary 不透明度を設定
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
     * @summary 押し出し量を設定
     * @param {number} opacity  押し出し量
     */
    setExtrudedHeight( height )
    {
        this.extruded_height = height;
    }


    /**
     * @summary 外側境界を追加
     *
     * @desc
     * <p>points は [lon_0, lat_0, alt_0, lon_1, lat_1, alt_1, ...] のような形式で配列を与える。</p>
     *
     * @param {number[]} points  頂点の配列
     */
    addOuterBoundary( points )
    {
        this._addBoundary( points, false );
    }


    /**
     * @summary 内側境界を追加
     *
     * @desc
     * <p>points は [lon_0, lat_0, alt_0, lon_1, lat_1, alt_1, ...] のような形式で配列を与える。</p>
     *
     * @param {number[]} points  頂点の配列
     */
    addInnerBoundary( points )
    {
        this._addBoundary( points, true );
    }


    /**
     * @summary 境界を追加
     *
     * @desc
     * <p>addOuterBoundary(), addInnerBoundary() の実装である。</p>
     *
     * @param {number[]} points  頂点の配列
     *
     * @private
     */
    _addBoundary( points, is_inner )
    {
        this._boundaries.push( new Boundary( points, is_inner ) );
        this._position = null;

        // 境界の変更を通知
        this._producer.onChangeBoundary();
    }


    /**
     * @summary 専用マテリアルを取得
     * @private
     */
    _getPolygonMaterial()
    {
        var scene = this.scene;
        if ( !scene._PolygonEntity_material ) {
            // scene にマテリアルをキャッシュ
            scene._PolygonEntity_material = new PolygonMaterial( scene.glenv );
        }
        return scene._PolygonEntity_material;
    }


    /**
     * @private
     */
    _setupByJson( json )
    {
        // json.boundaries
        for ( let boundary of json.boundaries ) {
            if ( boundary.type == "inner" ) {
                this.addInnerBoundary( boundary.points );
            }
            else {
                this.addOuterBoundary( boundary.points );
            }
        }

        // json.extruded_height
        if ( json.extruded_height !== undefined ) {
            this.extruded_height = json.extruded_height;
        }

        // json.color
        //     .opacity
        if ( json.color   !== undefined ) GeoMath.copyVector3( json.color, this._color );
        if ( json.opacity !== undefined ) this._opacity = json.opacity;
    }


    /**
     * @summary 中央位置を取得
     *
     * @desc
     * <p>中央位置を計算して返す。多角形が存在しないときは null を返す。</p>
     *
     * <p>中央位置が変化する可能性があるときは this._position にを null を設定すること。</p>
     *
     * <pre>
     * 入力: this._boundaries
     * </pre>
     *
     * @return {mapray.GeoPoint}  中央位置 (高度は 0) または null
     *
     * @private
     */
    _getPosition()
    {
        if ( this._position !== null ) {
            // キャッシュさている値を返す
            return this._position;
        }

        if ( this._boundaries.length == 0 ) {
            // 多角形が存在しない
            return null;
        }

        var min_lon =  Number.MAX_VALUE;
        var max_lon = -Number.MAX_VALUE;
        var min_lat =  Number.MAX_VALUE;
        var max_lat = -Number.MAX_VALUE;

        for ( let bo of this._boundaries ) {
            let count  = bo.num_points;
            let points = bo.points;

            for ( let i = 0; i < count; ++i ) {
                var lon = points[3*i    ];
                var lat = points[3*i + 1];

                if ( lon < min_lon ) min_lon = lon;
                if ( lon > max_lon ) max_lon = lon;
                if ( lat < min_lat ) min_lat = lat;
                if ( lat > max_lat ) max_lat = lat;
            }
        }

        this._position = new GeoPoint( (min_lon + max_lon) / 2,
                                       (min_lat + max_lat) / 2 );

        return this._position;
    }


    /**
     * @summary すべての境界の頂点数の合計を取得
     *
     * @private
     */
    _countNumPointsOnBoundaries()
    {
        let num_points = 0;

        for ( let bo of this._boundaries ) {
            num_points += bo.num_points;
        }

        return num_points;
    }


    /**
     * @summary 結合された境界点列を取得
     *
     * @return {Float64Array}  結合された境界点列
     */
    _getCombinedBoundaryPoints()
    {
        let points = new Float64Array( 3 * this._countNumPointsOnBoundaries() );
        let offset = 0;

        for ( let bo of this._boundaries ) {
            points.set( bo.points, offset );
            offset += 3 * bo.num_points;
        }

        return points;
    }


    /**
     * @summary 結合された 2D 境界点列を取得 (高度なし)
     *
     * @return {Float64Array}  結合された 2D 境界点列
     */
    _getCombinedBoundary2DPoints()
    {
        let dst_points = new Float64Array( 2 * this._countNumPointsOnBoundaries() );
        let di = 0;

        for ( let bo of this._boundaries ) {
            let src_size   = 3 * bo.num_points;
            let src_points = bo.points;
            for ( let si = 0; si < src_size; si += 3 ) {
                dst_points[di++] = src_points[si    ];
                dst_points[di++] = src_points[si + 1];
            }
        }

        return dst_points;
    }


    /**
     * @summary 三角形リストを生成
     *
     * @desc
     * <p>this.entity._boundaries を三角形に変換してリストを返す。ただし変換に失敗したときは null を返す。</p>
     *
     * @return {Uint32Array}  三角形リストまたは null
     *
     * @private
     */
    _createTriangles()
    {
        let src_points     = this._getCombinedBoundary2DPoints();
        let num_src_points = this._countNumPointsOnBoundaries();

        // 境界を登録
        let triangulator = new Triangulator( src_points, 0, 2, num_src_points );
        let index = 0;

        for ( let bo of this._boundaries ) {
            let num_indices = bo.num_points;
            let indices     = new Uint32Array( num_indices );
            for ( let i = 0; i < num_indices; ++i ) {
                indices[i] = index++;
            }
            triangulator.addBoundary( indices );
        }

        try {
            // 変換を実行
            return triangulator.run();
        }
        catch ( e ) {
            // 変換に失敗
            console.error( e.message );
            return null;
        }
    }

}


/**
 * @summary PolygonEntity の PrimitiveProducer
 *
 * @private
 */
class PrimitiveProducer extends Entity.PrimitiveProducer {


    /**
     * @param {mapray.PolygonEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._status    = Status.INVALID;
        this._triangles = null;  // 三角形リスト (Uint32Array)

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._pivot      = GeoMath.createVector3();
        this._bbox       = [GeoMath.createVector3(),
                            GeoMath.createVector3()];
        this._properties = {
            color:    GeoMath.createVector3f(),
            opacity:  1.0,
            lighting: false
        };

        // プリミティブ
        var primitive = new Primitive( entity.glenv, null, entity._getPolygonMaterial(), this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;

        this._primitive = primitive;
    }


    /**
     * @override
     */
    needsElevation()
    {
        const owner = this.entity;
        return owner.altitude_mode !== AltitudeMode.ABSOLUTE;
    }


    /**
     * @override
     */
    createRegions()
    {
        let owner = this.entity;

        if ( this._status === Status.INVALID ) {
            // 多角形なし、または三角形に変換できなかったとき
            return [];
        }

        // 正常な多角形のとき

        var region = new EntityRegion();

        for ( let bo of owner._boundaries ) {
            region.addPoints( bo.points, 0, 3, bo.num_points );
        }

        region.addPoint( owner._getPosition() );

        return [region];
    }


    /**
     * @override
     */
    onChangeElevation( regions )
    {
        if ( this._status === Status.NORMAL ) {
            this._status = Status.MESH_DIRTY;
        }
    }


    /**
     * @override
     */
    getPrimitives( stage )
    {
        if ( this._status === Status.INVALID ) {
            // 多角形なし、または三角形に変換できなかったとき
            return [];
        }
        else if ( this._status === Status.TRIANGLE_DIRTY ) {
            this._triangles = this.entity._createTriangles();
            if ( this._triangles === null ) {
                // 多角形の三角形化に失敗
                this._primitive.mesh = null;
                this._status = Status.INVALID;
                return [];
            }
            this._updatePrimitiveMesh();
        }
        else if ( this._status === Status.MESH_DIRTY ) {
            this._updatePrimitiveMesh();
        }

        this._updatePrimitiveProperties();

        this._status = Status.NORMAL;
        return [this._primitive];
    }


    /**
     * @summary 押し出しモードが変更されたことを通知
     */
    onChangeExtruded()
    {
        if ( this._status === Status.NORMAL ) {
            this._status = Status.MESH_DIRTY;
        }
    }


    /**
     * @summary プロパティが変更されたことを通知
     */
    onChangeProperty()
    {
        // することなし
    }


    /**
     * @summary 境界が変更されたことを通知
     */
    onChangeBoundary()
    {
        this._status    = Status.TRIANGLE_DIRTY;
        this._triangles = null;
        this.needToCreateRegions();
    }


    /**
     * @summary プリミティブの更新
     *
     * 入力:
     *   this.entity
     *   this._triangles
     * 出力:
     *   this._transform
     *   this._pivot
     *   this._bbox
     *   this._primitive.mesh
     *
     * @private
     */
    _updatePrimitiveMesh()
    {
        var cb_data = new BoundaryConbiner( this.entity );

        // プリミティブの更新
        //   primitive.transform
        //   primitive.pivot
        //   primitive.bbox
        this._updateTransformPivotBBox( cb_data );

        // メッシュ生成
        var mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_normal",   size: 3 }
            ],
            vertices: this._createVertices( cb_data ),
            indices:  this._createIndices( cb_data )
        };
        var mesh = new Mesh( this.entity.scene.glenv, mesh_data );

        // メッシュ設定
        this._primitive.mesh = mesh;
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
     * @param {BoundaryConbiner} cb_data  入力データ
     *
     * @private
     */
    _updateTransformPivotBBox( cb_data )
    {
        // 変換行列の更新
        let transform = this._transform;
        transform[12] = cb_data.origin[0];
        transform[13] = cb_data.origin[1];
        transform[14] = cb_data.origin[2];

        // 統計
        let xmin = Number.MAX_VALUE;
        let ymin = Number.MAX_VALUE;
        let zmin = Number.MAX_VALUE;

        let xmax = -Number.MAX_VALUE;
        let ymax = -Number.MAX_VALUE;
        let zmax = -Number.MAX_VALUE;

        // [cb_data.upper, cb_data.lower]
        let points_array = [cb_data.upper];
        if ( cb_data.lower ) {
            points_array.push( cb_data.lower );
        }

        for ( let j = 0; j < points_array.length; ++j ) {
            let points = points_array[j];
            for ( let i = 0; i < cb_data.num_points; ++i ) {
                let b = 3 * i;
                let x = points[b    ];
                let y = points[b + 1];
                let z = points[b + 2];

                if ( x < xmin ) { xmin = x; }
                if ( y < ymin ) { ymin = y; }
                if ( z < zmin ) { zmin = z; }

                if ( x > xmax ) { xmax = x; }
                if ( y > ymax ) { ymax = y; }
                if ( z > zmax ) { zmax = z; }
            }
        }

        // 中心点
        let pivot = this._pivot;
        pivot[0] = (xmin + xmax) / 2;
        pivot[1] = (ymin + ymax) / 2;
        pivot[2] = (zmin + zmax) / 2;

        // 境界箱
        let bbox  = this._bbox;
        let bmin = bbox[0];
        let bmax = bbox[1];
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
     * @desc
     * 生成される形式は [Px, Py, Pz, Nx, Ny, Nz, ...] のような形で、それぞれの座標はローカル座標系になる。
     * 配列の頂点データは 2 つの領域で分かれ、上面ポリゴンの頂点配列(S1) → 側面ポリゴンの頂点配列(S2) の順序で格納される。
     * ただし cb_data.lower == null のとき、配列は S1 部分しか設定されない。
     *
     * S1 は cb_data.upper に対応する頂点データが同じ順序で格納される。
     *
     * S2 は cb_data.num_points 個の四角形に対する頂点データが順番に並んでいる。
     * 各四角形の頂点データは 左下、右下、左上、右上 の順序で格納されている。
     *
     * 入力: this.entity._boundaries
     *
     * @param {BoundaryConbiner} cb_data  入力データ
     *
     * @return {Float32Array}  Mesh 用の頂点配列
     *
     * @private
     */
    _createVertices( cb_data )
    {
        const fpv = 6;  // 1頂点データあたりの float 数

        const s1_num_floats = fpv * cb_data.num_points;                          // 上面のデータサイズ
        const s2_num_floats = cb_data.lower ? fpv * (4*cb_data.num_points) : 0;  // 側面のデータサイズ
        const s3_num_floats = cb_data.lower ? s1_num_floats : 0;                 // 底面のデータサイズ

        let vertices = new Float32Array( s1_num_floats + s2_num_floats + s3_num_floats );

        // 上面の法線を取得
        let unormal = GeoMath.normalize3( cb_data.origin, GeoMath.createVector3() );

        // 上面の頂点データ
        for ( let i = 0; i < cb_data.num_points; ++i ) {
            let b  = 3 * i;
            let px = cb_data.upper[b];
            let py = cb_data.upper[b + 1];
            let pz = cb_data.upper[b + 2];

            let vi = fpv * i;
            vertices[vi    ] = px;  // a_position.x
            vertices[vi + 1] = py;  // a_position.y
            vertices[vi + 2] = pz;  // a_position.z
            setVec3ToArray( unormal, vertices, vi + 3 );  // a_normal
        }

        // 側面の頂点データ
        if ( cb_data.lower ) {
            let p00 = GeoMath.createVector3();  // 左下位置
            let p10 = GeoMath.createVector3();  // 右下位置
            let p01 = GeoMath.createVector3();  // 左上位置
            let p11 = GeoMath.createVector3();  // 右上位置
            let snormal = GeoMath.createVector3();  // 側面の法線

            let beg_i = 0;  // bo の最初の頂点のインデックス

            for ( let bo of this.entity._boundaries ) {
                let end_i = beg_i + bo.num_points;  // bo の最後の頂点のインデックス + 1

                for ( let i = beg_i; i < end_i; ++i ) {
                    let i0 = i;
                    let i1 = (i + 1 < end_i) ? i + 1 : beg_i;

                    // 四隅の位置を取得
                    let b0 = 3 * i0;
                    let b1 = 3 * i1;
                    setArrayToVec3( cb_data.lower, b0, p00 );
                    setArrayToVec3( cb_data.lower, b1, p10 );
                    setArrayToVec3( cb_data.upper, b0, p01 );
                    setArrayToVec3( cb_data.upper, b1, p11 );

                    // 側面の法線を取得
                    setTriangleNormal( p00, p10, p01, snormal );

                    // 四隅の頂点データを設定
                    let vi = s1_num_floats + 4*fpv*i;
                    setVec3ToArray( p00,     vertices, vi     );  // a_position
                    setVec3ToArray( snormal, vertices, vi + 3 );  // a_normal
                    vi += fpv;
                    setVec3ToArray( p10,     vertices, vi     );  // a_position
                    setVec3ToArray( snormal, vertices, vi + 3 );  // a_normal
                    vi += fpv;
                    setVec3ToArray( p01,     vertices, vi     );  // a_position
                    setVec3ToArray( snormal, vertices, vi + 3 );  // a_normal
                    vi += fpv;
                    setVec3ToArray( p11,     vertices, vi     );  // a_position
                    setVec3ToArray( snormal, vertices, vi + 3 );  // a_normal
                }

                beg_i = end_i;
            }
        }

        if ( cb_data.lower ) {
            const bnormal = GeoMath.scale3( -1.0, unormal, GeoMath.createVector3() );

            // 底面の頂点データ
            for ( let i = 0; i < cb_data.num_points; ++i ) {
                let b  = 3 * i;
                let px = cb_data.lower[b];
                let py = cb_data.lower[b + 1];
                let pz = cb_data.lower[b + 2];

                let vi = s1_num_floats + s2_num_floats + fpv * i;
                vertices[vi    ] = px;  // a_position.x
                vertices[vi + 1] = py;  // a_position.y
                vertices[vi + 2] = pz;  // a_position.z
                setVec3ToArray( bnormal, vertices, vi + 3 );  // a_normal
            }
        }

        return vertices;
    }


    /**
     * @summary インデックス配列の生成
     *
     * 入力: this._triangles
     *
     * @param {BoundaryConbiner} cb_data  入力データ
     *
     * @return {Uint32Array}  インデックス配列
     *
     * @private
     */
    _createIndices( cb_data )
    {
        // 頂点の並びは _createVertices() を参照

        let num_upper_triangles = this._triangles.length / 3;
        let num_side_triangles  = cb_data.lower ? 2 * cb_data.num_points : 0;
        let num_bottom_triangles  = cb_data.lower ? num_upper_triangles : 0;

        let indices = new Uint32Array( 3 * (num_upper_triangles + num_side_triangles + num_bottom_triangles) );

        // 前半に上面のポリゴンを設定
        indices.set( this._triangles );

        // 側面のポリゴンを設定
        if ( cb_data.lower ) {
            let num_quads = cb_data.num_points;
            let   ioffset = 3 * num_upper_triangles;  // indices 内の現在の四角形のオフセット
            let   voffset = cb_data.num_points;       // 頂点配列内の現在の四角形のオフセット

            for ( let i = 0; i < num_quads; ++i, ioffset += 6, voffset += 4 ) {
                // 左下三角形
                indices[ioffset    ] = voffset;
                indices[ioffset + 1] = voffset + 1;
                indices[ioffset + 2] = voffset + 2;
                // 右上三角形
                indices[ioffset + 3] = voffset + 2;
                indices[ioffset + 4] = voffset + 1;
                indices[ioffset + 5] = voffset + 3;
            }
        }

        // 底面のポリゴンを設定
        if ( cb_data.lower ) {
            const len =  this._triangles.length / 3;
            const voffset = cb_data.num_points + 4 * cb_data.num_points;
            for ( let i = 0; i < len; ++i ) {
                indices[ (num_upper_triangles + num_side_triangles + i) * 3 + 0 ] = this._triangles[ i * 3 + 0 ] + voffset;
                indices[ (num_upper_triangles + num_side_triangles + i) * 3 + 1 ] = this._triangles[ i * 3 + 2 ] + voffset;
                indices[ (num_upper_triangles + num_side_triangles + i) * 3 + 2 ] = this._triangles[ i * 3 + 1 ] + voffset;
            }
        }

        return indices;
    }


    /**
     * @summary プリミティブのプロパティを更新
     *
     * 入力: this.entity
     * 出力: this._properties
     *
     * @private
     */
    _updatePrimitiveProperties()
    {
        let owner = this.entity;
        let props = this._properties;

        GeoMath.copyVector3( owner._color, props.color );
        props.opacity  = owner._opacity;
        props.lighting = this.extruded_height !== 0.0;
    }

}


/**
 * @summary PolygonEntity の FlakePrimitiveProducer
 *
 * @private
 */
class FlakePrimitiveProducer extends Entity.FlakePrimitiveProducer {

    /**
     * @param {mapray.PolygonEntity} entity
     */
    constructor( entity )
    {
        super( entity );

        this._material     = entity._getPolygonMaterial();
        this._properties   = null;
        this._area_manager = new PolygonAreaManager( entity );
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
        // ConvexPolygon の配列、または Entity.AreaStatus.FULL
        let polygons = this._area_manager.getAreaContent( area );

        let msize = Math.PI * Math.pow( 2, 1 - area.z );
        let x_min = area.x * msize - Math.PI;
        let y_min = Math.PI - (area.y + 1) * msize;

        let div_x = 1 << dpows[0];
        let div_y = 1 << dpows[1];

        // サブメッシュの配列を生成
        let submeshes = this._createSubmeshes( x_min, y_min,
                                               x_min + msize, y_min + msize,
                                               div_x, div_y,
                                               polygons );

        // メッシュ生成
        let mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_normal",   size: 3 }
            ],
            vertices: this._createVertices( submeshes, area, dem ),
            indices:  this._createIndices( submeshes )
        };

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
                color:    GeoMath.createVector3f( entity._color ),
                opacity:  entity._opacity,
                lighting: false
            };
        }

        return {
            material:   this._material,
            properties: this._properties
        };
    }


    /**
     * @summary 押し出しモードが変更されたことを通知
     */
    onChangeExtruded()
    {
        // flake_mode なので押し出しモードは関係ない
    }


    /**
     * @summary プロパティが変更されたことを通知
     */
    onChangeProperty()
    {
        this._properties = null;
    }


    /**
     * @summary 境界が変更されたことを通知
     */
    onChangeBoundary()
    {
        this._area_manager.notifyForUpdateContent();
        this.notifyForUpdate();
    }


    /**
     * @summary 頂点配列を生成
     *
     * @param {iterable.<Submesh>} submeshes
     * @param {mapray.Area}        area
     * @param {mapray.DemBinary}   dem
     *
     * @return {Float32Array}
     *
     * @private
     */
    _createVertices( submeshes, area, dem )
    {
        let  origin = AreaUtil.getCenter( area, GeoMath.createVector3() );
        let sampler = dem.newSampler( area );

        // 頂点配列を生成
        let num_vertices = 0;
        for ( let smesh of submeshes ) {
            num_vertices += smesh.getNumVertices();
        }
        let vertices = new Float32Array( 6 * num_vertices );

        // 頂点配列に座標を書き込む
        let offset = 0;
        for ( let smesh of submeshes ) {
            offset = smesh.addVertices( origin, sampler, vertices, offset );
        }

        return vertices;
    }


    /**
     * @summary インデックス配列を生成
     *
     * @param {iterable.<Submesh>} submeshes
     *
     * @return {Uint32Array}
     *
     * @private
     */
    _createIndices( submeshes )
    {
        // インデックス配列を生成
        let num_triangles = 0;
        for ( let smesh of submeshes ) {
            num_triangles += smesh.getNumTriangles();
        }
        let indices = new Uint32Array( 3 * num_triangles );

        // インデックス配列にインデックスを書き込む
        let voffset = 0;
        let ioffset = 0;
        for ( let smesh of submeshes ) {
            ioffset = smesh.addIndices( voffset, indices, ioffset );
            voffset += smesh.getNumVertices();
        }

        return indices;
    }


    /**
     * @summary サブメッシュの配列を生成
     *
     * <p>polygons は領域と交差する ConvexPolygon の配列である。ただし領域が多角形で覆われているときは
     * Entity.AreaStatus.FULL になる場合がある。</p>
     *
     * @param {number} x_min  領域の最小 x 座標
     * @param {number} y_min  領域の最小 y 座標
     * @param {number} x_max  領域の最大 x 座標
     * @param {number} y_max  領域の最大 y 座標
     * @param {number} div_x  領域の x 方向の分割数
     * @param {number} div_y  領域の y 方向の分割数
     * @param {iterable.<mapray.ConvexPolygon>|mapray.Entity.AreaStatus} polygons
     *
     * @return {iterable.<Submesh>}  サブメッシュの配列
     *
     * @private
     */
    _createSubmeshes( x_min, y_min, x_max, y_max, div_x, div_y, polygons )
    {
        if ( polygons === Entity.AreaStatus.FULL ) {
            // 領域内は多角形に覆われている
            return [ new RectSubmesh( x_min, y_min, x_max, y_max, div_x, div_y ) ];
        }
        else if ( polygons.length == 0 ) {
            // 領域内に多角形は無い
            return [];
        }
        else if ( div_x == 1 && div_y == 1 ) {
            // これ以上分割できないので切り取り多角形を返す
            let t1 = [x_min, y_min, x_max, y_min, x_min, y_max];  // 左下三角形
            let t2 = [x_min, y_max, x_max, y_min, x_max, y_max];  // 右上三角形

            let m1 = this._create_clipped_polygons_submeshes( t1, polygons );
            let m2 = this._create_clipped_polygons_submeshes( t2, polygons );
            return m1.concat( m2 );
        }
        else {
            if ( div_x >= div_y ) {
                // 左右分割
                let msize = (x_max - x_min) / 2;
                let div_w = div_x / 2;

                let m1 = this._create_submeshes_sp( x_min,         y_min, x_min + msize, y_max, div_w, div_y, polygons );
                let m2 = this._create_submeshes_sp( x_min + msize, y_min, x_max,         y_max, div_w, div_y, polygons );
                return m1.concat( m2 );
            }
            else {
                // 上下分割
                let msize = (y_max - y_min) / 2;
                let div_w = div_y / 2;

                let m1 = this._create_submeshes_sp( x_min, y_min,         x_max, y_min + msize, div_x, div_w, polygons );
                let m2 = this._create_submeshes_sp( x_min, y_min + msize, x_max, y_max,         div_x, div_w, polygons );
                return m1.concat( m2 );
            }
        }
    }


    /**
     * @summary サブメッシュの配列を生成
     *
     * @desc
     * <p>_createSubmeshes() との違いは polygons に Entity.AreaStatus.FULL を指定できない。
     * また、polygons には領域の外側の多角形が含まれている可能性がある。</p>
     *
     * @param {number} x_min  領域の最小 x 座標
     * @param {number} y_min  領域の最小 y 座標
     * @param {number} x_max  領域の最大 x 座標
     * @param {number} y_max  領域の最大 y 座標
     * @param {number} div_x  領域の x 方向の分割数
     * @param {number} div_y  領域の y 方向の分割数
     * @param {iterable.<mapray.ConvexPolygon>} polygons
     *
     * @return {Submesh[]}  サブメッシュの配列
     *
     * @private
     */
    _create_submeshes_sp( x_min, y_min, x_max, y_max, div_x, div_y, polygons )
    {
        // 領域を凸多角形に変換
        let area_rect = ConvexPolygon.createByRectangle( x_min, y_min, x_max, y_max );

        let selected_polygons = [];

        for ( let polygon of polygons ) {
            if ( polygon.includes( area_rect ) ) {
                // polygon は area_rect を覆う
                // つまり area_rect は全体の多角形に覆われている
                selected_polygons = Entity.AreaStatus.FULL;
                break;
            }

            try {
                if ( area_rect.hasIntersection( polygon ) ) {
                    // 領域と交差しているので polygon 追加
                    selected_polygons.push( polygon );
                }
            }
            catch ( e ) {
                // polygon の交差判定に失敗したときは polygon は無いことにする
            }
        }

        return this._createSubmeshes( x_min, y_min, x_max, y_max, div_x, div_y, selected_polygons );
    }


    /**
     * @summary 凸多角形のサブメッシュの配列を生成
     * 
     * @desc
     * <p>area_triangle の三角形で src_polygons の凸多角形を切り取り、それらの切り取られた凸多角形に対応する
     * PolygonsSubmesh インスタンスの配列を生成する。</p>
     *
     * arit = Area Right Isosceles Triangle (領域直角二等辺三角形)
     *
     * @param {number[]}                        arit_coords   領域の三角形座標配列 (左下または右上の三角形)
     * @param {iterable.<mapray.ConvexPolygon>} src_polygons  切り取り対象の凸多角形の配列
     *
     * @return {PolygonsSubmesh[]}  PolygonsSubmesh の配列
     *
     * @private
     */
    _create_clipped_polygons_submeshes( arit_coords, src_polygons )
    {
        let area_polygon = new ConvexPolygon( arit_coords );

        let clipped_polygons = [];

        for ( let polygon of src_polygons ) {
            try {
                let clipped = area_polygon.getIntersection( polygon );
                if ( clipped !== null ) {
                    clipped_polygons.push( clipped );
                }
            }
            catch ( e ) {
                // polygon の切り抜きに失敗したときは polygon の切り抜きは返さない
            }
        }

        if ( clipped_polygons.length > 0 ) {
            return [ new PolygonsSubmesh( arit_coords, clipped_polygons ) ];
        }
        else {
            return [];
        }
    }

}


/**
 * @summary 多角形の境界
 *
 * @classdesc
 * <p>多角形の1つの境界を表現する。</p>
 * <p>外側境界のときは反時計回り、内側境界のときは時計回りで格納される。</p>
 *
 * @private
 */
class Boundary {

    /**
     * @desc
     * <p>points は addOuterBoundary(), addInnerBoundary() と同じ形式である。</p>
     *
     * @param {number[]} points    境界の頂点データ
     * @param {boolean}  is_inner  内側境界か？
     */
    constructor( points, is_inner )
    {
        let num_points = Math.floor( points.length / 3 );

        this._points     = new Float64Array( 3 * num_points );
        this._num_points = num_points;

        let is_ccw = Boundary.isCCW( points, num_points );

        let si;
        let si_step;

        if ( (!is_inner && is_ccw) || (is_inner && !is_ccw) ) {
            // 順方向
            si      = 0;
            si_step = 3;
        }
        else {
            // 逆方向
            si      = 3 * (num_points - 1);
            si_step = -3;
        }

        // 内部の配列にコピー
        for ( let i = 0; i < num_points; ++i ) {
            this._points[3*i    ] = points[si    ];
            this._points[3*i + 1] = points[si + 1];
            this._points[3*i + 2] = points[si + 2];
            si += si_step;
        }
    }


    /**
     * @summary 頂点座標の配列
     * @type {number[]}
     * @readonly
     */
    get points() { return this._points; }


    /**
     * @summary 頂点数
     * @type {number}
     * @readonly
     */
    get num_points() { return this._num_points; }


    /**
     * @summary 境界は反時計回りか？
     *
     * @param {number[]} points  境界の頂点データ
     *
     * @return {boolean}  反時計回りのとき true, それ以外のとき false
     */
    static
    isCCW( points, num_points )
    {
        // 頂上の点、同じ高さなら左側優先
        let top_i;
        let top_x = -Number.MAX_VALUE;
        let top_y = -Number.MAX_VALUE;

        for ( let i = 0; i < num_points; ++i ) {
            let x = points[3*i    ];
            let y = points[3*i + 1];
            if ( (y > top_y) || (y == top_y && x < top_x)) {
                top_i = i;
                top_x = x;
                top_y = y;
            }
        }

        // top の前方の点
        let next_i = (top_i == num_points - 1) ? 0 : top_i + 1;
        let next_x = points[3*next_i    ];
        let next_y = points[3*next_i + 1];

        // top の後方の点
        let prev_i = (top_i == 0) ? num_points - 1 : top_i - 1;
        let prev_x = points[3*prev_i    ];
        let prev_y = points[3*prev_i + 1];

        // prev と next は top より下または同じ高さだが、少なくともどちらか一方は top より下になる
        // またエッジは交差しないことが前提なので、2 つのエッジの内角は 0 度より大きく 180 度未満になる
        // したがって a, b の行列式が正のとき反時計回り、それ以外のとき時計回り
        let ax = next_x - top_x;
        let ay = next_y - top_y;
        let bx = prev_x - top_x;
        let by = prev_y - top_y;

        return ax*by - bx*ay > 0;
    }

}


/**
 * @summary 境界線データを結合
 *
 * @classdesc
 * <p>pe._bounaries に対応する上頂点と底頂点の LOCS 平坦化配列を取得する。</p>
 * <p>pe._extruded_height === 0 のときは lower に null を設定する。</p>
 *
 * <pre>
 * プロパティ:
 *   origin: Vector3       // LOCS の原点位置 (GOCS)
 *   num_points: number    // upper の頂点数
 *   upper: Float64Array   // 上頂点 (LOCS, 順序は pe._bounaries.points の連結)
 *   lower: Float64Array   // 底頂点 (LOCS, 順序は upper と同じ, nullable)
 * </pre>
 *
 * @private
 */
class BoundaryConbiner {

    /**
     * @desc
     * <pre>
     * 入力:
     *   pe.viewer
     *   pe.altitude_mode
     *   pe._extruded_height
     *   pe._bounaries
     * </pre>
     *
     * @param {mapray.PolygonEntity} pe  呼び出し側のポリゴンエンティティ
     */
    constructor( pe )
    {
        /*
        pe._extruded_height !== 0             == 0    
                                                      
                    ---  _.-*---*._        _.-*---*._ 
        upper_points    *-_      _-*      *-_      _-*
                    --- |  *----*  |         *----*   
                        |  |    |  |                  
                    --- |  |    |  |                  
        lower_points    *-_|    |_-*         (null)   
                    ---    *----*                     
        */
        let        viewer = pe.scene.viewer;
        let altitude_mode = pe.altitude_mode;

        let src_points = pe._getCombinedBoundaryPoints();
        let num_points = pe._countNumPointsOnBoundaries();

        let base_points = Float64Array.from( src_points );

        if ( altitude_mode === AltitudeMode.RELATIVE ) {
            let elevation = viewer.getExistingElevation( pe._getPosition() );
            for ( let i = 0; i < num_points; ++i ) {
                let ai = 3 * i + 2;
                base_points[ai] +=  elevation;
            }
        }

        let upper_points = null;
        let lower_points = null;
        if ( pe._extruded_height !== 0 ) {
            if ( altitude_mode === AltitudeMode.CLAMP ) {
                upper_points = base_points;
                lower_points = Float64Array.from( src_points );
                for ( let i = 0; i < num_points; ++i ) {
                    let ai = 3 * i + 2;
                    lower_points[ai] = 0;
                }
            }
            else { // altitude_mode !== AltitudeMode.ABSOLUTE || altitude_mode !== AltitudeMode.RELATIVE
                lower_points = base_points;
                upper_points = Float64Array.from( src_points );
                for ( let i = 0; i < num_points; ++i ) {
                    let ai = 3 * i + 2;
                    upper_points[ai] = lower_points[ai] + pe._extruded_height;
                }
            }
        }
        else {
            upper_points = base_points;
        }

        let origin = pe._getPosition().getAsGocs( GeoMath.createVector3() );

        // LOCS 平坦化配列
        let upper_ocs_points = GeoPoint.toGocsArray( upper_points, num_points,
                                                      new Float64Array( 3 * num_points ) );
        for ( let i = 0; i < num_points; ++i ) {
            let d = 3 * i;
            upper_ocs_points[d    ] -= origin[0];
            upper_ocs_points[d + 1] -= origin[1];
            upper_ocs_points[d + 2] -= origin[2];
        }

        let lower_ocs_points = null;
        if ( lower_points ) {
            // ASSERT: lower_points != null
            lower_ocs_points = GeoPoint.toGocsArray( lower_points, num_points,
                                                      new Float64Array( 3 * num_points ) );
            for ( let i = 0; i < num_points; ++i ) {
                let d = 3 * i;
                lower_ocs_points[d    ] -= origin[0];
                lower_ocs_points[d + 1] -= origin[1];
                lower_ocs_points[d + 2] -= origin[2];
            }
        }

        // プロパティを設定
        this.origin     = origin;
        this.num_points = num_points;
        this.upper      = upper_ocs_points;
        this.lower      = lower_ocs_points;
    }

}


/**
 * @summary 多角形の領域管理
 *
 * @private
 */
class PolygonAreaManager extends QAreaManager {

    /**
     * @param {mapray.PolygonEntity} entity  管理対象のエンティティ
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
        let     src_indices = this._entity._createTriangles() || [];
        let num_src_indices = src_indices.length;

        let src_coords = this._entity._getCombinedBoundary2DPoints();
        let    content = [];  // ConvexPolygon の配列

        for ( let si = 0; si < num_src_indices; si += 3 ) {
            let i0 = src_indices[si    ];
            let i1 = src_indices[si + 1];
            let i2 = src_indices[si + 2];
            this._add_polygon_to_array( src_coords, i0, i1, i2, content );
        }

        return content;
    }


    /**
     * @override
     */
    createAreaContent( min_x, min_y, msize, parent_content )
    {
        // 単位球メルカトルでの領域に変換
        const x_area_min = Math.PI * min_x;
        const y_area_min = Math.PI * min_y;
        const x_area_max = Math.PI * (min_x + msize);
        const y_area_max = Math.PI * (min_y + msize);

        // 領域を凸多角形に変換
        const area_rect = ConvexPolygon.createByRectangle( x_area_min, y_area_min,
                                                           x_area_max, y_area_max );

        let content = [];  // ConvexPolygon の配列

        for ( let polygon of parent_content ) {

            if ( polygon.includes( area_rect ) ) {
                // polygon は area_rect を覆う
                // つまり area_rect は全体の多角形に覆われている
                return Entity.AreaStatus.FULL;
            }

            try {
                if ( area_rect.hasIntersection( polygon ) ) {
                    // 領域と交差しているので polygon 追加
                    content.push( polygon );
                }
            }
            catch ( e ) {
                // polygon の交差判定に失敗したときは polygon は無いことにする
            }
        }

        return (content.length > 0) ? content : Entity.AreaStatus.EMPTY;
    }


    /**
     * @summary 三角形を凸多角形として追加
     *
     * @param {number[]} src_coords  入力頂点の座標配列 (経緯度)
     * @param {number}   si0         三角形の頂点 0
     * @param {number}   si1         三角形の頂点 1
     * @param {number}   si2         三角形の頂点 2
     * @param {mapray.ConvexPolygon[]} dst_polygons  出力先の ConvexPolygon 配列
     *
     * @private
     */
    _add_polygon_to_array( src_coords, si0, si1, si2, dst_polygons )
    {
        const Degree = GeoMath.DEGREE;
        const RAngle = Math.PI / 2;  // 直角
        const TwoPI  = 2 * Math.PI;  // 2π

        // 三角形の頂点座標配列 (単位球メルカトル座標系) を作成
        let vertices = [];
        let mx_min_1 = Number.MAX_VALUE;  // オフセット処理前の最小 mx 座標

        for ( let si of [si0, si1, si2] ) {
            let lon = src_coords[2*si    ] * Degree;
            let lat = src_coords[2*si + 1] * Degree;

            if ( Math.abs( lat ) >= RAngle ) {
                // 緯度の絶対値が RAngle 以上の頂点が存在する三角形は除外
                // ※ まだ検討していないので、とりあえずの処置
                return;
            }

            let mx = lon;
            let my = GeoMath.invGudermannian( lat );

            vertices.push( mx );
            vertices.push( my );

            mx_min_1 = Math.min( mx, mx_min_1 );
        }

        // mx_min_2: mx 座標が mx_min_1 だった頂点のオフセット後の mx 座標
        let mx_min_2 = mx_min_1 - TwoPI * (Math.floor( (mx_min_1 - Math.PI) / TwoPI ) + 1);
        if ( mx_min_2 < -Math.PI || mx_min_2 >= Math.PI ) {
            // 数値計算誤差により稀に区間からはみ出る可能性があるので
            mx_min_2 = -Math.PI;
        }
        // Assert: -Math.PI <= mx_min_2 < Math.PI

        // mx 座標にオフセットを適用
        let mx_max_2 = -Number.MAX_VALUE;  // オフセット後の最大 mx 座標

        for ( let i = 0; i < 3; ++i ) {
            let ix   = 2 * i;
            let mx_1 = vertices[ix];  // オフセット前の mx 座標

            // mx_2: オフセット後の mx 座標
            let dx_1 = mx_1 - mx_min_1;  // Assert: dx_1 >= 0
            let mx_2 = mx_min_2 + dx_1;  // Assert: mx_2 >= mx_min_2
            // Assert: (mx_1 == mx_min_1) ⇒ (mx_2 == mx_min_2)

            vertices[ix] = mx_2;

            mx_max_2 = Math.max( mx_2, mx_max_2 );
        }

        // オフセットを適用した三角形を加える
        dst_polygons.push( new ConvexPolygon( vertices ) );

        // 三角形が 180 度子午線をまたぐとき
        // 360 度左にずらした三角形をもう1つ加える
        if ( mx_max_2 > Math.PI ) {
            for ( let i = 0; i < 3; ++i ) {
                let ix   = 2 * i;
                let mx_2 = vertices[ix];  // オフセット後の mx 座標
                let mx_3 = mx_2 - TwoPI;  // 360 度左にずらした mx 座標
                vertices[ix] = mx_3;
            }

            dst_polygons.push( new ConvexPolygon( vertices ) );
        }
    }

}


/**
 * @summary サブメッシュ
 *
 * @private
 */
class Submesh {

    /**
     */
    constructor()
    {
    }


    /**
     * @summary 頂点数を取得
     *
     * @return {number}  頂点数
     *
     * @abstract
     */
    getNumVertices()
    {
        throw "";
    }


    /**
     * @summary 三角形数を取得
     *
     * @return {number}  三角形数
     *
     * @abstract
     */
    getNumTriangles()
    {
        throw "";
    }


    /**
     * @summary 頂点配列に頂点データを書き込む
     *
     * @param {mapray.Vector3} origin    座標系の原点 (GOCS)
     * @param {mapray.Sampler} sampler   DEM サンプラー
     * @param {number[]}       vertices  書き込み先の配列
     * @param {number}         offset    書き込み開始インデックス
     *
     * @return {number}  offset + 書き込んだ要素数
     *
     * @abstract
     */
    addVertices( origin, sampler, vertices, offset )
    {
        throw "";
    }


    /**
     * @summary インデックス配列にインデックスを書き込む
     *
     * @param {number}   voffset  this 用頂点の先頭の頂点インデックス
     * @param {number[]} indices  書き込み先の配列
     * @param {number}   ioffset  書き込み開始インデックス
     *
     * @return {number}  ioffset + 書き込んだ要素数
     *
     * @abstract
     */
    addIndices( voffset, indices, ioffset )
    {
        throw "";
    }

}


/**
 * @summary 矩形サブメッシュ
 *
 * @private
 */
class RectSubmesh extends Submesh {

    /**
     * @param {number} x_min
     * @param {number} y_min
     * @param {number} x_max
     * @param {number} y_max
     * @param {number} div_x
     * @param {number} div_y
     */
    constructor( x_min, y_min, x_max, y_max, div_x, div_y )
    {
        super();

        this._x_min = x_min;
        this._y_min = y_min;
        this._x_max = x_max;
        this._y_max = y_max;
        this._div_x = div_x;
        this._div_y = div_y;
    }


    /**
     * @override
     */
    getNumVertices()
    {
        return (this._div_x + 1) * (this._div_y + 1);
    }


    /**
     * @override
     */
    getNumTriangles()
    {
        return 2 * this._div_x * this._div_y;
    }


    /**
     * @override
     */
    addVertices( origin, sampler, vertices, offset )
    {
        // 刻み幅
        let mx_step = (this._x_max - this._x_min) / this._div_x;
        let my_step = (this._y_max - this._y_min) / this._div_y;

        let end_iu = this._div_x + 1;
        let end_iv = this._div_y + 1;

        let index = offset;

        for ( let iv = 0, my = this._y_min; iv < end_iv; ++iv, my += my_step ) {
            let ey    = Math.exp( my );
            let ey2   = ey * ey;
            let sinφ = (ey2 - 1) / (ey2 + 1);
            let cosφ =   2 * ey  / (ey2 + 1);
            for ( let iu = 0, mx = this._x_min; iu < end_iu; ++iu, mx += mx_step ) {
                let sinλ = Math.sin( mx );
                let cosλ = Math.cos( mx );

                let height = sampler.sample( mx, my );
                let radius = GeoMath.EARTH_RADIUS + height;

                // 法線 (GOCS)
                let nx = cosφ * cosλ;
                let ny = cosφ * sinλ;
                let nz = sinφ;

                // 位置 (GOCS)
                let gx = radius * nx;
                let gy = radius * ny;
                let gz = radius * nz;

                vertices[index++] = gx - origin[0];  // x
                vertices[index++] = gy - origin[1];  // y
                vertices[index++] = gz - origin[2];  // z
                vertices[index++] = nx;              // nx
                vertices[index++] = ny;              // ny
                vertices[index++] = nz;              // nz
            }
        }

        return index;
    }


    /**
     * @override
     */
    addIndices( voffset, indices, ioffset )
    {
        let div_x = this._div_x;
        let div_y = this._div_y;

        let index = ioffset;

        for ( let y = 0; y < div_y; ++y ) {
            for ( let x = 0; x < div_x; ++x ) {
                var i00 = voffset + (div_x + 1) * y + x;  // 左下頂点
                var i10 = i00 + 1;                        // 右下頂点
                var i01 = i00 + div_x + 1;                // 左上頂点
                var i11 = i01 + 1;                        // 右上頂点

                // 左下三角形
                indices[index++] = i00;
                indices[index++] = i10;
                indices[index++] = i01;

                // 右上三角形
                indices[index++] = i01;
                indices[index++] = i10;
                indices[index++] = i11;
            }
        }

        return index;
    }

}


/**
 * @summary 凸多角形集合サブメッシュ
 *
 * @private
 */
class PolygonsSubmesh extends Submesh {

    /**
     * this の生存中はパラメータのオブジェクトを変更しないこと。
     *
     * @param {number[]}                     arit_coords  領域の三角形座標配列 (左下または右上の三角形)
     * @param {iterable.<mapray.ConvexPolygon>} polygons  arit_coords の上にある凸多角形集合
     */
    constructor( arit_coords, polygons )
    {
        super();

        this._arit_coords = arit_coords;
        this._polygons    = polygons;

        this._num_vertices  = 0;
        this._num_triangles = 0;

        for ( let polygon of polygons ) {
            this._num_vertices  += polygon.num_vertices;
            this._num_triangles += polygon.num_vertices - 2;
        }
    }


    /**
     * @override
     */
    getNumVertices()
    {
        return this._num_vertices;
    }


    /**
     * @override
     */
    getNumTriangles()
    {
        return this._num_triangles;
    }


    /**
     * @override
     */
    addVertices( origin, sampler, vertices, offset )
    {
        let plane = this._get_elevation_plane( sampler );

        let index = offset;

        for ( let polygon of this._polygons ) {
            index = this._add_polygon_vertices( polygon, plane, origin, vertices, index );
        }

        return index;
    }


    /**
     * @override
     */
    addIndices( voffset, indices, ioffset )
    {
        let iofs_next = ioffset;
        let vofs_next = voffset;

        for ( let polygon of this._polygons ) {
            iofs_next  = this._add_polygon_indices( polygon, vofs_next, indices, iofs_next );
            vofs_next += polygon.num_vertices;
        }

        return iofs_next;
    }


    /**
     * @summary 凸多角形の頂点を追加
     *
     * @param {mapray.ConvexPolygon} polygon   凸多角形
     * @param {number[]}             plane     平面係数
     * @param {mapray.Vector3}       origin    座標系の原点 (GOCS)
     * @param {number[]}             vertices  書き込み先の配列
     * @param {number}               offset    書き込み開始インデックス
     *
     * @return {number}  offset + 書き込んだ要素数
     *
     * @private
     */
    _add_polygon_vertices( polygon, plane, origin, vertices, offset )
    {
        let index = offset;

        let num_vertices = polygon.num_vertices;
        let src_vertices = polygon.vertices;

        for ( let vi = 0; vi < num_vertices; ++vi ) {
            let mx = src_vertices[2*vi    ];
            let my = src_vertices[2*vi + 1];

            let ey  = Math.exp( my );
            let ey2 = ey * ey;

            let sinλ = Math.sin( mx );
            let cosλ = Math.cos( mx );
            let sinφ = (ey2 - 1) / (ey2 + 1);
            let cosφ =   2 * ey  / (ey2 + 1);

            // mx*plane[0] + my*plane[1] + height*plane[2] + plane[3] == 0
            let height = -(mx*plane[0] + my*plane[1] + plane[3]) / plane[2];
            let radius = GeoMath.EARTH_RADIUS + height;

            // 法線 (GOCS)
            let nx = cosφ * cosλ;
            let ny = cosφ * sinλ;
            let nz = sinφ;

            // 位置 (GOCS)
            let gx = radius * nx;
            let gy = radius * ny;
            let gz = radius * nz;

            vertices[index++] = gx - origin[0];  // x
            vertices[index++] = gy - origin[1];  // y
            vertices[index++] = gz - origin[2];  // z
            vertices[index++] = nx;              // nx
            vertices[index++] = ny;              // ny
            vertices[index++] = nz;              // nz
        }

        return index;
    }


    /**
     * @summary 凸多角形のインデックスを追加
     *
     * @param {mapray.ConvexPolygon} polygon  凸多角形
     * @param {number}               voffset  this 用頂点の先頭の頂点インデックス
     * @param {number[]}             indices  書き込み先の配列
     * @param {number}               ioffset  書き込み開始インデックス
     *
     * @return {number}  ioffset + 書き込んだ要素数
     *
     * @private
     */
    _add_polygon_indices( polygon, voffset, indices, ioffset )
    {
        let index = ioffset;

        let num_triangles = polygon.num_vertices - 2;

        for ( let i = 1; i <= num_triangles; ++i ) {
            indices[index++] = voffset;
            indices[index++] = voffset + i;
            indices[index++] = voffset + i + 1;
        }

        return index;
    }


    /**
     * @summary 平面ベースで標高を計算するための係数を取得
     *
     * @param {mapray.Sampler} sampler
     *
     * @return {number[]}  平面係数 [x, y, z, w]
     *
     * @private
     */
    _get_elevation_plane( sampler )
    {
        let coords = this._arit_coords;

        // 三角形の頂点の高さを取得
        let z_coords = new Array( 3 );

        for ( let i = 0; i < 3; ++i ) {
            let mx = coords[2*i    ];
            let my = coords[2*i + 1];
            z_coords[i] = sampler.sample( mx, my );
        }

        let ox =   coords[0];
        let oy =   coords[1];
        let oz = z_coords[0];

        let x1 =   coords[2] - ox;
        let y1 =   coords[3] - oy;
        let z1 = z_coords[1] - oz;

        let x2 =   coords[4] - ox;
        let y2 =   coords[5] - oy;
        let z2 = z_coords[2] - oz;

        // [nx, ny, nz] = [x1, y1, z1] x [x2, y2, z2]
        let nx = y1*z2 - z1*y2;
        let ny = z1*x2 - x1*z2;
        let nz = x1*y2 - y1*x2;

        return [nx, ny, nz, -ox*nx - oy*ny - oz*nz];
    }

}


/**
 * @summary 配列からベクトルを設定
 *
 * array[index] から vec に設定する。
 *
 * @private
 */
function
setArrayToVec3( array, index, vec )
{
    vec[0] = array[index];
    vec[1] = array[index + 1];
    vec[2] = array[index + 2];
}


/**
 * @summary 配列からベクトルを設定
 *
 * vec から array[index] に設定する。
 *
 * @private
 */
function
setVec3ToArray( vec, array, index )
{
    array[index]     = vec[0];
    array[index + 1] = vec[1];
    array[index + 2] = vec[2];
}


/**
 * @summary 3頂点から正規化法線ベクトルを設定
 * @private
 */
function
setTriangleNormal( p0, p1, p2, normal )
{
    for ( let i = 0; i < 3; ++i ) {
        temp_normal_ax[i] = p1[i] - p0[i];
        temp_normal_ay[i] = p2[i] - p0[i];
    }

    GeoMath.cross3( temp_normal_ax, temp_normal_ay, normal );
    GeoMath.normalize3( normal, normal );

    return normal;
}


var temp_normal_ax = GeoMath.createVector3();
var temp_normal_ay = GeoMath.createVector3();


/**
 * @summary 内部ステータス
 * @enum {object}
 * @constant
 * @private
 */
var Status = {

    INVALID:        { id: "INVALID" },
    NORMAL:         { id: "NORMAL" },
    TRIANGLE_DIRTY: { id: "TRIANGLE_DIRTY" },
    MESH_DIRTY:     { id: "MESH_DIRTY" }

};


export default PolygonEntity;
