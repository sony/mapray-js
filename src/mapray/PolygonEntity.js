import Entity from "./Entity";
import Primitive from "./Primitive";
import Mesh from "./Mesh";
import PolygonMaterial from "./PolygonMaterial";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AltitudeMode from "./AltitudeMode";
import EntityRegion from "./EntityRegion";
import Triangulator from "./Triangulator";


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

        this._status   = Status.INVALID;
        this._extruded = false;

        // 頂点管理
        this._boundaries = [];    // Boundary のリスト
        this._position   = null;  // 中央付近の GeoPoint
        this._triangles  = null;  // 三角形リスト (Uint32Array)

        // プリミティブの要素
        this._transform  = GeoMath.setIdentity( GeoMath.createMatrix() );
        this._pivot      = GeoMath.createVector3();
        this._bbox       = [GeoMath.createVector3(),
                            GeoMath.createVector3()];
        this._properties = {
            color:    GeoMath.createVector3f( [1.0, 1.0, 1.0] ),
            opacity:  1.0,
            lighting: false
        };

        // プリミティブ
        var primitive = new Primitive( scene.glenv, null, this._getPolygonMaterial(), this._transform );
        primitive.pivot      = this._pivot;
        primitive.bbox       = this._bbox;
        primitive.properties = this._properties;
        this._primitive = primitive;

        // 生成情報から設定
        if ( opts && opts.json ) {
            this._setupByJson( opts.json );
        }
    }


    /**
     * @summary 押し出しモード
     * @type {boolean}
     */
    set extruded( value )
    {
        var prev = this._extruded;

        if ( (prev && !value) || (!prev && value) ) {
            // モードが変化した
            this._extruded            = value;
            this._properties.lighting = value;

            if ( this._status === Status.NORMAL ) {
                this._status = Status.MESH_DIRTY;
            }
        }
    }


    get extruded() { return this._extruded; }


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
            this._triangles = this._createTriangles();
            if ( this._triangles === null ) {
                // 多角形の三角形化に失敗
                this._primitive.mesh = null;
                this._status = Status.INVALID;
                return [];
            }
            this._updatePrimitive();
        }
        else if ( this._status === Status.MESH_DIRTY ) {
            this._updatePrimitive();
        }

        this._status = Status.NORMAL;
        return [this._primitive];
    }


    /**
     * @override
     */
    onChangeAltitudeMode( prev_mode )
    {
        if ( this._status === Status.NORMAL ) {
            this._status = Status.MESH_DIRTY;
        }
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

        this._status    = Status.TRIANGLE_DIRTY;
        this._position  = null;
        this._triangles = null;
        this.needToCreateRegions();
    }


    /**
     * @override
     */
    needsElevation()
    {
        // ABSOLUTE でも押し出しモードのときは高さが必要
        return (this.altitude_mode !== AltitudeMode.ABSOLUTE) || this._extruded;
    }


    /**
     * @override
     */
    createRegions()
    {
        if ( this._status === Status.INVALID ) {
            // 多角形なし、または三角形に変換できなかったとき
            return [];
        }

        // 正常な多角形のとき

        var region = new EntityRegion();

        for ( let boundary of this._boundaries ) {
            region.addPoints( boundary.points, 0, 3, boundary.num_points );
        }

        region.addPoint( this._getPosition() );

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
     * @summary 三角形リストを生成
     *
     * @desc
     * <p>this._boundaries を三角形に変換してリストを返す。ただし変換に失敗したときは null を返す。</p>
     *
     * @return {Uint32Array}  三角形リストまたは null
     *
     * @private
     */
    _createTriangles()
    {
        // 連結座標リストを作成
        let num_points = this._countNumPointsOnBoundaries();

        let coords = new Float64Array( 2 * num_points );
        let di = 0;

        for ( let bo of this._boundaries ) {
            let size   = 3 * bo.num_points;
            let points = bo.points;
            for ( let si = 0; si < size; si += 3 ) {
                coords[di++] = points[si    ];
                coords[di++] = points[si + 1];
            }
        }

        // 境界を登録
        let triangulator = new Triangulator( coords, 0, 2, num_points );
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


    /**
     * @summary すべての境界の頂点数の合計を取得
     */
    _countNumPointsOnBoundaries()
    {
        let num_points = 0;

        for ( let b of this._boundaries ) {
            num_points += b.num_points;
        }

        return num_points;
    }


    /**
     * @summary プリミティブの更新
     *
     * 入力:
     *   this._boundaries
     *   this._triangles
     * 出力:
     *   this._transform
     *   this._pivot
     *   this._bbox
     *   this._primitive.mesh
     *
     * @private
     */
    _updatePrimitive()
    {
        var cb_data = new BoundaryConbiner( this );

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
        var mesh = new Mesh( this.scene.glenv, mesh_data );

        // メッシュ設定
        this._primitive.mesh = mesh;
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

        // json.extruded
        if ( json.extruded !== undefined ) {
            this.extruded = json.extruded;
        }

        // json.color
        //     .opacity
        var props = this._properties;
        if ( json.color !== undefined )   GeoMath.copyVector3( json.color, props.color );
        if ( json.opacity !== undefined ) props.opacity = json.opacity;
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
     * 入力: this._boundaries
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

        let vertices = new Float32Array( s1_num_floats + s2_num_floats );

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

            for ( let bo of this._boundaries ) {
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

        let indices = new Uint32Array( 3 * (num_upper_triangles + num_side_triangles) );

        // 前半に上面のポリゴンを設定
        indices.set( this._triangles );

        // 前半に側面のポリゴンを設定
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

        return indices;
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

        for ( let boundary of this._boundaries ) {
            let count  = boundary.num_points;
            let points = boundary.points;

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
 * <p>pe._extruded == false のときは lower に null を設定する。</p>
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
     *   pe._extruded
     *   pe._bounaries
     * </pre>
     *
     * @param {mapray.PolygonEntity} pe  呼び出し側のポリゴンエンティティ
     */
    constructor( pe )
    {
        let        viewer = pe.scene.viewer;
        let altitude_mode = pe.altitude_mode;

        let src_points = this._getCombinedSourcePoints( pe );
        let num_points = pe._countNumPointsOnBoundaries();

        // 底頂点の GeoPoint 平坦化配列
        let lower_points = null;
        if ( pe._extruded || (altitude_mode !== AltitudeMode.ABSOLUTE) ) {
            lower_points = Float64Array.from( src_points );
            viewer.getExistingElevations( num_points, lower_points, 0, 3, lower_points, 2, 3 );
        }

        // 上頂点の GeoPoint 平坦化配列
        let upper_points = Float64Array.from( src_points );
        if ( altitude_mode === AltitudeMode.RELATIVE ) {
            // ASSERT: lower_points != null
            if ( pe._extruded ) {
                let elevation = viewer.getExistingElevation( pe._getPosition() );
                for ( let i = 0; i < num_points; ++i ) {
                    let ai = 3 * i + 2;
                    upper_points[ai] = elevation + src_points[ai];
                }
            }
            else {
                for ( let i = 0; i < num_points; ++i ) {
                    let ai = 3 * i + 2;
                    upper_points[ai] = lower_points[ai] + src_points[ai];
                }
            }
        }
        // ASSERT: upper_points の高度は絶対高度

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
        if ( pe._extruded ) {
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


    /**
     * @summary 結合された境界点列を取得
     *
     * @param {mapray.PolygonEntity} pe  呼び出し側のポリゴンエンティティ
     *
     * @return {Float64Array}  結合された境界点列
     */
    _getCombinedSourcePoints( pe )
    {
        let points = new Float64Array( 3 * pe._countNumPointsOnBoundaries() );
        let offset = 0;

        for ( let bo of pe._boundaries ) {
            points.set( bo.points, offset );
            offset += 3 * bo.num_points;
        }

        return points;
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
 */
var Status = {

    INVALID:        { id: "INVALID" },
    NORMAL:         { id: "NORMAL" },
    TRIANGLE_DIRTY: { id: "TRIANGLE_DIRTY" },
    MESH_DIRTY:     { id: "MESH_DIRTY" }

};


export default PolygonEntity;
