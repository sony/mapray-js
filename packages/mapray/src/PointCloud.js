import Mesh from "./Mesh";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import PointCloudMaterial, { PointCloudDebugWireMaterial, PointCloudDebugFaceMaterial } from "./PointCloudMaterial";



/**
 * @summary 点群データを表現するクラス
 * @example
 * <caption>インスタンスの生成は下記のように行う。</caption>
 * const provider = new {@link mapray.RawPointCloudProvider}({
 *     resource: {
 *         prefix: "https://..."
 *     }
 * });
 * const point_cloud = viewer.point_cloud_collection.add( provider );
 * point_cloud.setPointShape( {@link mapray.PointCloud.PointShapeType}.GRADIENT_CIRCLE );
 *
 * @see mapray.PointCloudProvider
 * @see mapray.PointCloudCollection
 * @memberof mapray
 */
class PointCloud {

    /**
     * @param {mapray.Scene} scene 所属するシーン
     * @param {mapray.PointCloudProvider} provider プロバイダ
     */
    constructor( scene, provider )
    {
        this._glenv = scene.glenv;
        this._scene = scene;

        this._provider = provider;

        this._root = Box.createRoot( this );

        // properties
        this._points_per_pixel = 0.7;
        this._point_shape = PointCloud.PointShapeType.CIRCLE;
        this._point_size_type = PointCloud.PointSizeType.FLEXIBLE;
        this._point_size = 1;
        this._point_size_limit = 10;

        // hidden properties
        this._dispersion = true;
        this._debug_shader = false;

        this._debug_render_box = false;
        this._debug_render_ellipsoid = false;
        this._debug_render_axis = false;
        this._debug_render_section = false;

        this._checkMaterials();

        PointCloud._instances.push(this);
    }


    static get PointShapeType() { return PointShapeType; }


    static get PointSizeType() { return PointSizeType; }


    /**
     * @summary 初期化
     * mapray.PointCloudBoxCollectorへ追加時に自動的に呼ばれる。
     * @private
     */
    async init() {
        await this._provider.init();
    }

    /**
     * @summary 破棄
     * mapray.PointCloudBoxCollectorから削除時に自動的に呼ばれる。
     * @private
     */
    async destroy() {
        if (this._provider) {
            await this._provider.destroy();
        }
        if (this._root) {
            await this._root.dispose(null);
            this._root = null;
        }
        const index = PointCloud._instances.indexOf( this );
        if ( index !== -1 ) {
            PointCloud._instances.splice( index, 1 );
        }
        this._provider = null;
    }


    /**
     * @summary プロバイダ
     * @type {mapray.PointCloudProvider}
     */
    get provider() { return this._provider; }


    /**
     * @summary ルートBox
     * @type {Box}
     * @private
     */
    get root() { return this._root };


    // Properties

    /**
     * @summary 点群Box読み込みを行う際の解像度[points/pixel]
     * @return {number}
     */
    getPointsPerPixel() { return this._points_per_pixel; }

    /**
     * @summary 点群Box読み込みを行う際の解像度[points/pixel]を設定
     * @param {number} val 設定する値
     */
    setPointsPerPixel( val ) {
        console.assert( val <= 1 );
        this._points_per_pixel = val;
    }

    /**
     * @summary 点を描画する際の形状
     * @return {mapray.PointCloud.PointShapeType}
     */
    getPointShape() { return this._point_shape; }

    /**
     * @summary 点を描画する際の形状を設定
     * @param {mapray.PointCloud.PointShapeType} val 設定する値
     */
    setPointShape( val ) {
        this._point_shape = val;
    }

    /**
     * @summary 点を描画する際のサイズの指定方法
     * @return {mapray.PointCloud.PointSizeType}
     */
    getPointSizeType() { return this._point_size_type; }

    /**
     * @summary 点を描画する際のサイズの指定方法を設定
     * @param {mapray.PointCloud.PointSizeType} val 設定する値
     */
    setPointSizeType( val ) {
        this._point_size_type = val;
    }

    /**
     * @summary 点を描画する際のサイズ
     * point_size_typeにより単位が異なる
     * @see mapray.PointCloud#getPointSizeType
     * @return {number}
     */
    getPointSize() { return this._point_size; }

    /**
     * @summary 点を描画する際のサイズを設定。
     * {@link mapray.PointCloud#setPointSizeType}により指定された値によって解釈される単位が異なる。
     * @param {number} val 設定する値
     */
    setPointSize( val ) {
        console.assert( val > 0 );
        this._point_size = val;
    }

    /**
     * @summary 点を描画する際の最大ピクセルサイズ
     * @return {number}
     */
    getPointSizeLimit() { return this._point_size_limit; }

    /**
     * @summary 点を描画する際の最大ピクセルサイズを設定
     * @param {number} val 設定する値
     */
    setPointSizeLimit( val ) {
        console.assert( val > 0 );
        this._point_size_limit = val;
    }


    // hidden properties

    /**
     * @private
     */
    getDispersion() { return this._dispersion }

    /**
     * @private
     */
    setDispersion( val ) { this._dispersion = val; }

    /**
     * @private
     */
    getDebugShader() { return this._debug_shader; }

    /**
     * @private
     */
    setDebugShader( val ) { this._debug_shader = val; }

    /**
     * @private
     */
    setDebugRenderBox( val ) { this._debug_render_box = val; this._updateDebugMesh(); }

    /**
     * @private
     */
    setDebugRenderEllipsoid( val ) { this._debug_render_ellipsoid = val; this._updateDebugMesh(); }

    /**
     * @private
     */
    setDebugRenderAxis( val ) { this._debug_render_axis = val; this._updateDebugMesh(); }

    /**
     * @private
     */
    setDebugRenderSection( val ) { this._debug_render_section = val; this._updateDebugMesh(); }

    /**
     * @private
     */
    _updateDebugMesh() {
        if ( this._root ) {
            this._root._updateDebugMeshes();
        }
    }

    /**
     * @summary Traverse結果の統計情報を取得。
     * リクエストキューに登録し、{@link mapray.RenderStage}が処理を完了するのを待つ。
     * @return {Promise}
     * @private
     */
    static async requestTraverseSummary() {
        return new Promise(onSuccess => {
                const notifier = statistics => {
                    onSuccess(statistics);
                    const index = PointCloud.getTraverseDataRequestQueue().indexOf(notifier);
                    if (index !== -1) PointCloud.getTraverseDataRequestQueue().splice(index, 1);
                };
                PointCloud.getTraverseDataRequestQueue().push( notifier );
        });
    }

    /**
     * @summary Traverse結果取得用のリクエストキューを取得
     * @return {Array}
     * @private
     */
    static getTraverseDataRequestQueue() {
        return PointCloud._traverseDataRequestQueue || (PointCloud._traverseDataRequestQueue=[]);
    }

    /**
     * @summary 指定された level, x, y, z のURLを生成します
     * @param {number} level
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @return {string}
     * @private
     */
    getURL( level, x, y, z ) {
        return this._urlGenerator( level, x, y, z );
    }


    /**
     * @private
     */
    _checkMaterials() {
        const viewer = this._scene.viewer;
        const render_cache = viewer._render_cache || (viewer._render_cache = {});
        if ( !render_cache.point_cloud_materials ) {
            render_cache.point_cloud_materials = Object.keys(PointShapeType).reduce((map, key) => {
                    const point_shape_type = PointShapeType[key];
                    map[point_shape_type.id] = new PointCloudMaterial( viewer, {
                            point_shape_type,
                    });
                    return map;
            }, {});
        }
        if ( !render_cache.point_cloud_debug_wire_material ) {
            render_cache.point_cloud_debug_wire_material = new PointCloudDebugWireMaterial( viewer );
        }
        if ( !render_cache.point_cloud_debug_face_material ) {
            render_cache.point_cloud_debug_face_material = new PointCloudDebugFaceMaterial( viewer );
        }
    }


    /**
     * @private
     */
    _getMaterial( point_shape ) {
        return this._scene.viewer._render_cache.point_cloud_materials[ point_shape.id ];
    }


    /**
     * @private
     */
    static setStatisticsHandler( statistics_handler ) {
        if (statistics_handler) {
            PointCloud._statistics = {
                statistics_obj: new Statistics(),
                statistics_handler: statistics_handler,
            };
        }
        
    }

    /**
     * @private
     */
    static getStatistics() { return PointCloud._statistics; }

    /**
     * @private
     */
    static getStatisticsHandler() { return PointCloud._statistics_handler; }
}

PointCloud._instances = [];


/**
 * @private
 */
class Statistics {

    constructor() {
        this._now = performance ? () => performance.now() : () => Date.now();
        this.clear();
    };

    start() {
        this._start_time = this._now();
    }

    doneTraverse() {
        this._done_traverse_time = this._now();
        this.traverse_time += this._done_traverse_time - this._start_time;
    }

    done() {
        this._done_time = this._now();
        this.render_time += this._done_time - this._done_traverse_time;
        this.total_time  += this._done_time - this._start_time;
    }

    clear() {
        this.render_point_count = 0;
        this.total_point_count = 0;
        this.render_boxes = 0;
        this.total_boxes = 0;
        this.loading_boxes = 0;
        this.created_boxes = 0;
        this.disposed_boxes = 0;
        this.total_time = 0.0;
        this.traverse_time = 0.0;
        this.render_time = 0.0;
    }
}





/**
 * @summary 点描画の種類
 * @constant
 * @enum {object}
 * @memberof mapray.PointCloud
 */
const PointShapeType = {
    /**
     * 矩形
     */
    RECTANGLE: { id: "RECTANGLE", shader_code: 0 },

    /**
     * 円
     */
    CIRCLE: { id: "CIRCLE", shader_code: 1 },

    /**
     * 境界線付きの円
     */
    CIRCLE_WITH_BORDER: { id: "CIRCLE_WITH_BORDER", shader_code: 2 },

    /**
     * グラデーションで塗り潰した円
     */
    GRADIENT_CIRCLE: { id: "GRADIENT_CIRCLE", shader_code: 3 },
};



/**
 * @summary 点描画のサイズ指定方法の種類
 * @enum {object}
 * @constant
 * @memberof mapray.PointCloud
 */
const PointSizeType = {
    /**
     * setPointSize()により指定された値をピクセルとして解釈する
     */
    PIXEL: { id: "PIXEL" },

    /**
     * setPointSize()により指定された値をmmとして解釈する
     */
    MILLIMETERS: { id: "MILLIMETERS" },

    /**
     * setPointSize()により指定された値を参照せず、表示位置に応じて適切なサイズを自動的に指定する。
     */
    FLEXIBLE: { id: "FLEXIBLE" },
};



/**
 * @summary 点群ツリーを構成するノード。
 * ルート要素(level === 0) は、Box.createRoot()を用いて作成する。
 * @memberof mapray.PointCloud
 * @private
 */
class Box {

    /**
     * @param {Box|null} parent 親Box(level === 0の場合はnull)
     * @param {number} level レベル
     * @param {number} x x
     * @param {number} y y
     * @param {number} z z
     * @private
     */
    constructor( parent, level, x, y, z )
    {
        /**
         * @summary 親Box
         * @type {Box}
         */
        this._parent = parent;

        /**
         * @summary 所属するPointCloud。
         * ルート要素の場合は Box.createRoot() で設定される。
         * @type {mapray.PointCloud}
         */
        this._owner = parent ? parent._owner : null;

        /**
         * @summary レベル
         * @type {number}
         */
        this.level = level;

        /**
         * @summary x
         * @type {number}
         */
        this.x = x;

        /**
         * @summary y
         * @type {number}
         */
        this.y = y;

        /**
         * @summary z
         * @type {number}
         */
        this.z = z;


        /*
        2次元(X,Y)までを下記に図示する。Z軸についても同様。
        ^ Y
        |
        +-------------+-------------M
        | cell (0, 1) | cell (1, 1) |
        |             |             |   c: gocs_center [GOCS]
        |             |             |   m: gocs_min [GOCS]
        |             |             |   M: gocs_max [GOCS]
        |             |             |
        +-------------c-------------+
        | cell (0, 0) | cell (1, 0) |
        |             |             |
        |             |             |
        |             |             |
        |             |             |
        m-------------+-------------+ --> X
                      |<--size[m]-->|
        */

        /**
         * @summary Box一辺の半分の長さ
         * @type {number}
         * @private
         */
        const size = this.size = (
            level ===  0 ? 2147483648: // 2^31
            level  <  31 ? 1 << (31-level):
            Math.pow(0.5, level-31)
        );

        /**
         * @summary 軸方向に投影した際の面積
         * @type {number}
         * @private
         */
        this.proj_area = 4.0 * this.size * this.size;

        /**
         * @summary GOCS座標系でのBoxの中心位置
         * @type {mapray.Vector3}
         * @private
         */
        this.gocs_center = GeoMath.createVector3([
                MIN_INT + (2 * x + 1) * size,
                MIN_INT + (2 * y + 1) * size,
                MIN_INT + (2 * z + 1) * size
        ]);

        /**
         * @summary GOCS座標系でのBoxの最小位置
         * @type {mapray.Vector3}
         * @private
         */
        this.gocs_min = GeoMath.createVector3([
                this.gocs_center[0] - size,
                this.gocs_center[1] - size,
                this.gocs_center[2] - size
        ]);

        /**
         * @summary GOCS座標系でのBoxの最大位置
         * @type {mapray.Vector3}
         * @private
         */
        this.gocs_max = GeoMath.createVector3([
                this.gocs_center[0] + size,
                this.gocs_center[1] + size,
                this.gocs_center[2] + size
        ]);

        /**
         * @type {Box.Status}
         * @private
         */
        this._status = Box.Status.NOT_LOADED;


        // (this._status === Box.Status.LOADED) において有効な値

        /**
         * @summary 子Box、セルに関する情報
         * @type {object}
         * @private
         */
        this._metaInfo = null;

        /**
         * @summary 子Box。
         * <code>(u, v, w)</code>のインデックスは <code>(u | v << 1 | w << 2)</code> によって算出される。
         * @type {mapray.Box[]}
         * @private
         */
        this._children = [ null, null, null, null, null, null, null, null ];

        /**
         * @type {mapray.Vector3}
         * @private
         */
        this.average = null;

        /**
         * @type {mapray.Vector3}
         * @private
         */
        this.eigenVector = null;

        /**
         * @type {mapray.Vector3}
         * @private
         */
        this.eigenVectorLength = null;

        /**
         * @private
         */
        this._vertex_buffer = null;

        /**
         * @private
         */
        this._vertex_length = null;

        /**
         * @private
         */
        this._vertex_attribs = null;

        /**
         * @private
         */
        this.debug1 = null;


        if ( this._owner ) {
            this._updateDebugMesh();
        }
    }

    /**
     * @private
     */
     _updateDebugMeshes() {
        this._updateDebugMesh();
        for (let i=0; i<this._children.length; i++) {
            if ( this._children[i] ) {
                this._children[i]._updateDebugMeshes();
            }
        }
    }

    _updateDebugMesh() {
        const vertices = [];
        const indices  = [];
        const tindices = [];

        if ( this._owner._debug_render_box ) {
            /*
            *         4----------5
            *       .´:        .´|
            *     .´  :      .´  |
            *    0----------1    |
            *    |    6 - - |----7
            *    |  .´      |  .´ 
            *    |.´        |.´   
            *    2----------3     
            */
            for ( let i=0; i<Box.CHILDREN_INDICES.length; i++) {
                vertices.push(
                    this.size * (2 * Box.CHILDREN_INDICES[i][2] - 1),
                    this.size * (2 * Box.CHILDREN_INDICES[i][1] - 1),
                    this.size * (2 * Box.CHILDREN_INDICES[i][0] - 1)
                );
            }

            indices.push(
                0, 1, 1, 3, 3, 2, 2, 0,
                4, 5, 5, 7, 7, 6, 6, 4,
                0, 4, 1, 5, 3, 7, 2, 6,
            );

            //*
            tindices.push(
                0, 2, 1, 1, 2, 3,
                4, 5, 6, 7, 6, 5,
                0, 1, 4, 1, 5, 4,
                1, 3, 5, 3, 7, 5,
                3, 6, 7, 3, 2, 6,
                6, 2, 4, 2, 0, 4,
            );
            //*/
        }

        if ( this.average && !isNaN( this.eigenVector[0][0] ) ) {
            if ( this._owner._debug_render_axis ) { // Render Normal
                let offset = vertices.length / 3;
                for ( let i=0; i<3; i++) {
                    const len = Math.max(0.2, this.eigenVectorLength[i]);
                    const ev = this.eigenVector[i];
                    for ( let j=0; j<3; j++ ) vertices.push( this.average[j] - len * ev[j] );
                    for ( let j=0; j<3; j++ ) vertices.push( this.average[j] + len * ev[j] );
                    indices.push( offset++, offset++ );
                }
            }

            if ( this._owner._debug_render_section ) {
                if ( this.level > 20 && this.getPointsLength() > 5000 && this.eigenVectorLength[0] < this.size * 0.2 ) { // = 10% = (2 * s) / 10
                    this._putSectionShapePoints(vertices, indices, tindices); // Render Cross Section
                }
            }
            if ( this._owner._debug_render_ellipsoid ) {
                this._putVariancePoints(vertices, indices, tindices); // Render Normal Ring
            }
        }

        const meshes = [];
        if (indices.length > 0) {
            const mesh_data = {
                vtype: [
                    { name: "a_position", size: 3 }
                ],
                ptype: "lines",
                vertices: vertices,
                indices: indices
            };
            meshes.push( new Mesh( this._owner._glenv, mesh_data ) );
        }
        if (tindices.length > 0) {
            const mesh_data = {
                vtype: [
                    { name: "a_position", size: 3 }
                ],
                ptype: "triangles",
                vertices: vertices,
                indices: tindices
            };
            meshes.push( new Mesh( this._owner._glenv, mesh_data ) );
        }

        this.debugMesh = meshes;
    }


    /**
     * @private
     */
    _putVariancePoints(vertices, indices, tindices) {
        const offset = vertices.length / 3;
        const [ e1, e2, e3 ]  = this.eigenVector;
        const [ e1l, e2l, e3l ] = this.eigenVectorLength;
        const G = 6;
        const N = 12;
        const cache = PointCloud._variance_points_cache || (() => {
                const c = {
                    cos_ro: [],
                    sin_ro: [],
                    cos_th: [],
                    sin_th: [],
                };
                for ( let j=0; j<=G; ++j ) {
                    const ro = Math.PI * j/G;
                    c.cos_ro[j] = Math.cos(ro);
                    c.sin_ro[j] = Math.sin(ro);
                }
                for ( let i=0; i<=N; ++i ) {
                    const th = 2 * Math.PI * i/N;
                    c.cos_th[i] = Math.cos(th);
                    c.sin_th[i] = Math.sin(th);
                }
                return PointCloud._variance_points_cache = c;
        })();
        const putPoint = (ro, th, vs) => {
            const cos_ro = cache.cos_ro[ro];
            const sin_ro = cache.sin_ro[ro];
            const cos_th = cache.cos_th[th];
            const sin_th = cache.sin_th[th];
            vs.push(
                this.average[0] + sin_ro * (e2l * cos_th * e2[0] + e3l * sin_th * e3[0]) + e1l * cos_ro * e1[0],
                this.average[1] + sin_ro * (e2l * cos_th * e2[1] + e3l * sin_th * e3[1]) + e1l * cos_ro * e1[1],
                this.average[2] + sin_ro * (e2l * cos_th * e2[2] + e3l * sin_th * e3[2]) + e1l * cos_ro * e1[2]
            );
        }
        for ( let j=0; j<=G; ++j ) {
            for ( let i=0; i<=N; ++i ) {
                putPoint(j, i, vertices);
            }
        }
        for ( let j=0; j<G; ++j ) {
            for ( let i=0; i<N; ++i ) {
                const p = offset + j * (N+1) + i;
                indices.push( p, p+1, p, p+N+1 );
                tindices.push( p, p+1, p+N+1, p+N+1, p+1, p+N+2 );
            }
        }
    }


    /**
     * @private
     */
    _putSectionShapePoints( vertices, indices, tindices ) {
        const offset = vertices.length / 3;
        const a = this.average;
        const e = this.eigenVector[0];
        const s = this.size;
        const l = Math.sqrt( e[0] * e[0] + e[1] * e[1] + e[2] * e[2] );
        const ue = [ e[0] / l, e[1] / l, e[2] / l ];
        const ps = [];
        /*
          Compute Intersection(c) of Plane(a, ue) and Line(p, v)
                \             a: average point
                 \   ue      ue: eigenVector (normal vector)
                  a-¯¯        p: point
                   \          v: vector
          p---> . . c         c = p + alpha v
              v      \       
                      \               (a - p) ue 
          |-------->|  \     alpha = ------------
            alpha v     \                v ue    
        */
        const q = []
        for ( let i=0; i<2; ++i ) {
            for ( let j=0; j<2; ++j ) {
                q.push(
                    { p: [i>0?s:-s, j>0?s:-s,        0], v: [0, 0, s] },
                    { p: [j>0?s:-s,        0, i>0?s:-s], v: [0, s, 0] },
                    { p: [       0, i>0?s:-s, j>0?s:-s], v: [s, 0, 0] }
                )
            }
        }

        let n, t;
        for ( let i=0; i<q.length; i++ ) {
            const p = q[i].p;
            const v = q[i].v;
            const alpha = ((a[0]-p[0])*ue[0] + (a[1]-p[1])*ue[1] + (a[2]-p[2])*ue[2]) / (v[0]*ue[0] + v[1]*ue[1] + v[2]*ue[2]);
            if (Math.abs(alpha) <= 1.0) {
                const c  = [p[0]+alpha*v[0], p[1]+alpha*v[1], p[2]+alpha*v[2]];
                const lp = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
                let angle;
                if (n) {
                    angle = Math.atan2(t[0]*lp[0]+t[1]*lp[1]+t[2]*lp[2], n[0]*lp[0]+n[1]*lp[1]+n[2]*lp[2]);
                }
                else {
                    angle = 0;
                    t = [
                        ue[1]*lp[2]-ue[2]*lp[1],
                        ue[2]*lp[0]-ue[0]*lp[2],
                        ue[0]*lp[1]-ue[1]*lp[0]
                    ];
                    n = [
                        t[1]*ue[2]-t[2]*ue[1],
                        t[2]*ue[0]-t[0]*ue[2],
                        t[0]*ue[1]-t[1]*ue[0]
                    ];
                }
                ps.push([...c, angle, lp[0],lp[1],lp[2], n[0]*lp[0]+n[1]*lp[1]+n[2]*lp[2], t[0]*lp[0]+t[1]*lp[1]+t[2]*lp[2]]);
            }
        }
        ps.sort((a, b) => a[3] - b[3]);
        for ( let i=0; i<ps.length; ++i ) {
            vertices.push(ps[i][0], ps[i][1], ps[i][2]);
            indices.push( offset + i );
            if (i==ps.length-1) indices.push( offset );
            else indices.push( offset + i + 1 );
            if (tindices) {
                tindices.push( offset, offset + i );
                if ( i == ps.length - 1 ) tindices.push( offset );
                else tindices.push( offset+i + 1 );
            }
        }
    }


    /**
     * @summary 読み込みステータス
     * @type {mapray.PointCloud.Box.Status}
     */
    get status() {
        return this._status;
    }


    /**
     * @summary 読み込みが完了しているか
     *
     * @type {boolean}
     */
    get is_loaded() {
        return this._status === Box.Status.LOADED;
    }


    /**
     * @summary 親ノード
     *
     * @type {Box}
     */
    get parent() {
        return this._parent;
    }


    /**
     * @summary 子Boxの情報を取得
     * 
     * @param {number} index 番号
     * @return {Box}
     */
    getChildInfo( index ) {
        if (!this._metaInfo) return null;
        return this._metaInfo.children[ index ];
    }


    /**
     * @summary Box領域を8分割した領域ごとに点が存在するかを調べる。
     * 
     * @param {number} index 子Boxと同様の順番
     * @return {boolean} 点が存在する場合に true となる。
     */
    cellPointsAvailable( index ) {
        return (
            this._metaInfo &&
            (index === 0 ?
                this._metaInfo.indices[ index ] > 0:
                this._metaInfo.indices[ index ] > this._metaInfo.indices[ index - 1 ]
            )
        );
    }


    /**
     * @summary Boxに含まれる点の数
     * 
     * @return {number}
     */
    getPointsLength() {
        return this._metaInfo ? this._metaInfo.indices[7] : 0;
    }

    /**
     * @summary 子Boxの番号を返します。
     * @param {Box} child 子Box
     * @return {number}
     */
    indexOf( child ) {
        return this._children.indexOf( child );
    }


    /**
     * @summary カリングするか？
     * @param  {mapray.Vector4[]} clip_planes  クリップ平面配列
     * @return {boolean}                       見えないとき true, 見えるまたは不明のとき false
     */
    isInvisible( clip_planes ) {
        if ( this.level === 0 ) return false;

        const xmin = this.gocs_min[0];
        const xmax = this.gocs_max[0];
        const ymin = this.gocs_min[1];
        const ymax = this.gocs_max[1];
        const zmin = this.gocs_min[2];
        const zmax = this.gocs_max[2];

        for ( let i = 0; i < clip_planes.length; ++i ) {
            const  p = clip_planes[i];
            const px = p[0];
            const py = p[1];
            const pz = p[2];
            const pw = p[3];

            // 以下がすべて成り立つとボックス全体は平面の裏側にある
            //   px*xmin + py*ymin + pz*zmin + pw < 0
            //   px*xmax + py*ymin + pz*zmin + pw < 0
            //   px*xmin + py*ymax + pz*zmin + pw < 0
            //   px*xmax + py*ymax + pz*zmin + pw < 0
            //   px*xmin + py*ymin + pz*zmax + pw < 0
            //   px*xmax + py*ymin + pz*zmax + pw < 0
            //   px*xmin + py*ymax + pz*zmax + pw < 0
            //   px*xmax + py*ymax + pz*zmax + pw < 0

            const c0 =  px*xmin + py*ymin;
            const c1 =  px*xmax + py*ymin;
            const c2 =  px*xmin + py*ymax;
            const c3 =  px*xmax + py*ymax;
            const c4 = -pz*zmin - pw;
            const c5 = -pz*zmax - pw;

            if ( c0 < c4 && c1 < c4 && c2 < c4 && c3 < c4 &&
                 c0 < c5 && c1 < c5 && c2 < c5 && c3 < c5 ) {
                // ボックス全体が平面の裏側にあるので見えない
                return true;
            }
        }

        return false;  // 見えている可能性がある
    }


    /**
     * @summary 点群の読み込み処理
     * 
     * @return {Promise<void>}
     */
    load() {
        if ( this._status !== Box.Status.NOT_LOADED ) throw new Error( "illegal status: " + this._status.id );
        if ( !this._owner._provider.isReady() ) return;
        this._status = Box.Status.LOADING;

        const task = this._owner._provider.load( this.level, this.x, this.y, this.z, true );
        this._loadId = task.id;
        return task.done.then(event => {
                this._metaInfo = {
                    children: [],
                    indices: event.header.indices,
                };

                {
                    let childFlags = event.header.childFlags;
                    for ( let i=7; i>=0; --i ) {
                        this._metaInfo.children[i] = (childFlags & 1) ? {} : null;
                        childFlags = childFlags >> 1;
                    }
                }

                this.average = event.header.average;
                this.eigenVector = event.header.eigenVector;
                this.eigenVectorLength = event.header.eigenVectorLength;
                this.debug1 = event.header.debug1;

                const values = event.body;
                console.assert( values.length > 0 );
                console.assert( values.length / 6 === this._metaInfo.indices[7] );

                ASSERT: {
                    const number_of_points = values.length / 6;
                    for ( let i=0; i<8; ++i ) {
                        if (this._metaInfo.indices[i] > number_of_points) {
                            console.log("warning fix indices");
                            this._metaInfo.indices[i] = number_of_points;
                        }
                    }
                }

                const gl = this._owner._glenv.context;

                this._vertex_buffer = gl.createBuffer();

                this._vertex_length = values.length / 6;
                gl.bindBuffer(gl.ARRAY_BUFFER, this._vertex_buffer);
                gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);

                /*
                 * +------------+------------+----
                 * | a_position | a_color    | ...
                 * +------------+------------+----
                 * 
                 * |<--12 bit-->|<--12 bit-->|
                 */
                this._vertex_attribs = {
                    "a_position": {
                        buffer:         this._vertex_buffer,
                        num_components: 3,
                        component_type: gl.FLOAT,
                        normalized:     false,
                        byte_stride:    24,
                        byte_offset:    0
                    },
                    "a_color": {
                        buffer:         this._vertex_buffer,
                        num_components: 3,
                        component_type: gl.FLOAT,
                        normalized:     false,
                        byte_stride:    24,
                        byte_offset:    12
                    }
                };
                this._status = Box.Status.LOADED;

                this._updateDebugMesh();
        })
        .catch(error =>  {
                const skip_error = (
                    error.message === "cancel" ||
                    error.message === "not loading" ||
                    error.message === "The user aborted a request."
                );
                if ( !skip_error ) {
                    console.log(error);
                    this._status = Box.Status.DESTROYED;
                }
        });
    }


    /**
     * @summary 子Boxを生成。(すでに存在する場合は既存のBoxを返す)
     * LOADED 状態でのみ呼ぶことができる
     * 
     * @param {number} index 番号
     * @param {object} [statistics] 統計情報
     * @return {Box}
     */
    newChild( index, statistics ) {
        const [ u, v, w ] = Box.CHILDREN_INDICES[ index ];
        return this.newChildAt( u, v, w, statistics );
    }


    /**
     * @summary 子Boxを生成。(すでに存在する場合は既存のBoxを返す)
     * LOADED 状態でのみ呼ぶことができる
     * 
     * @param {number} u x方向-側は0、+側は1
     * @param {number} v y方向-側は0、+側は1
     * @param {number} w z方向-側は0、+側は1
     * @param {object} [statistics] 統計情報
     * @return {Box}
     */
    newChildAt( u, v, w, statistics ) {
        console.assert( this._status === Box.Status.LOADED );
        const index = u | v << 1 | w << 2;
        const child = this._children[ index ];
        if ( child ) return child;

        if ( !this.getChildInfo( index ) ) return null;

        if ( statistics ) statistics.created_boxes++;
        return this._children[ index ] = new Box( this,
            this.level + 1,
            this.x << 1 | u,
            this.y << 1 | v,
            this.z << 1 | w
        );
    }

    /**
     * @summary 子Boxを取得。
     * 存在しない場合は null を返却する。
     * 
     * @param {number} index 番号
     * @return {Box}
     */
    getChild( index ) {
        return this._children[ index ];
    }

    /**
     * デバッグメッシュを描画
     * 
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     */
    _drawDebugMesh( render_stage ) {
        if ( !this.debugMesh ) return;

        const gl = render_stage._glenv.context;
        const color = Box.STATUS_COLOR_TABLE[ this._status.id ];

        gl.disable( gl.CULL_FACE );
        for ( let debugMesh of this.debugMesh ) {
            const debug_material = (debugMesh._draw_mode === 1 ?
                this._owner._scene.viewer._render_cache.point_cloud_debug_wire_material:
                this._owner._scene.viewer._render_cache.point_cloud_debug_face_material
            );
            debug_material.bindProgram();
            debug_material.setDebugBoundsParameter( render_stage, this.gocs_center, color );
            debugMesh.draw( debug_material );
        }
        gl.enable( gl.CULL_FACE );
    }


    /**
     * @summary Boxを描画する。
     * Box全体の描画および、Boxの8分割単位での描画に対応。
     * 
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     * @param {number[]|null} target_cells 描画対象の子番号の配列。ただしnullは全体を表す。
     * @param {number[]} points_per_pixels 点の解像度の配列。target_cells同じ順序であり、nullの場合は要素数1となる。
     * @param {object} statistics 統計情報
     */
    draw( render_stage, target_cells, points_per_pixels, statistics )
    {
        if ( this.debugMesh ) {
            this._drawDebugMesh( render_stage );
        }

        if ( this._status !== Box.Status.LOADED ) return;

        const gl = render_stage._glenv.context;

        const point_shape      = this._owner._point_shape;
        const point_size_type  = this._owner._point_size_type;
        const point_size       = this._owner._point_size;
        const point_size_limit = this._owner._point_size_limit;
        const debug_shader     = this._owner._debug_shader;

        if ( this._status === Box.Status.LOADED ) {
            const material = this._owner._getMaterial( point_shape );
            material.bindProgram();
            material.setDebugBoundsParameter( render_stage, this.gocs_center );
            material.bindVertexAttribs(this._vertex_attribs);

            const overlap_scale = 3;
            if ( target_cells === null ) {
                // draw whole points
                const ppp = points_per_pixels[ 0 ];
                material.setPointSize(
                    point_size_type === PointCloud.PointSizeType.PIXEL       ? point_size:
                    point_size_type === PointCloud.PointSizeType.MILLIMETERS ? -0.001 * point_size / render_stage._pixel_step:
                    Math.min( point_size_limit, Math.max( 1.0, overlap_scale / ppp ) )
                );
                material.setDebug( debug_shader ? 0.5 / ppp : -1.0 );
                gl.drawArrays( gl.POINTS, 0, this._vertex_length );
            }
            else {
                // draw only target regions
                for ( let i=0; i<target_cells.length; i++ ) {
                    const ppp = points_per_pixels[ i ];
                    material.setPointSize(
                        point_size_type === PointCloud.PointSizeType.PIXEL       ? point_size:
                        point_size_type === PointCloud.PointSizeType.MILLIMETERS ? -0.001 * point_size / render_stage._pixel_step:
                        Math.min( point_size_limit, Math.max( 1.0, overlap_scale / ppp ) )
                    );
                    material.setDebug( debug_shader ? 0.5 / ppp : -1.0 );
                    const childIndex = target_cells[ i ];
                    const offset = childIndex > 0 ? this._metaInfo.indices[childIndex - 1] : 0;
                    const length = this._metaInfo.indices[childIndex] - offset;
                    if ( length > 0 ) gl.drawArrays( gl.POINTS, offset, length );
                }
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            if ( statistics ) {
                statistics.render_boxes++;
                if ( target_cells && this._metaInfo.indices ) {
                    for ( let childIndex of target_cells ) {
                        const offset = childIndex > 0 ? this._metaInfo.indices[childIndex-1] : 0;
                        const length = this._metaInfo.indices[childIndex] - offset;
                        statistics.render_point_count += length;
                    }
                }
                else {
                    statistics.render_point_count += this._vertex_length;
                }
            }
        }
    }


    /**
     * @summary 子孫Boxを全て削除する。
     * 全ての状態でこの関数を呼ぶことができ、複数回呼ぶことができる。
     * @param {object} [statistics] 統計情報
     */
    disposeChildren( statistics ) {
        for (let i=0; i<this._children.length; i++) {
            if (this._children[i]) {
                this._children[i].dispose( statistics );
                this._children[i] = null;
            }
        }
    }


    /**
     * @summary Boxを破棄します。子孫Boxも全て削除する。
     * 全ての状態でこの関数を呼ぶことができ、複数回呼ぶことができる。
     * @param {object} [statistics] 統計情報
     */
    dispose( statistics ) {
        if ( this._status === Box.Status.LOADING ) {
            if ( this._abort_controller ) {
                this._abort_controller.abort();
            }
            this._owner._provider.cancel( this._loadId );
        }

        this.disposeChildren( statistics );

        if ( this._vertex_buffer ) {
            const gl = this._owner._glenv.context;
            gl.deleteBuffer(this._vertex_buffer);
            this._vertex_buffer = null;
        }

        if ( this.debugMesh ) {
            // this.debugMesh.dispose();
        }

        if ( statistics ) statistics.disposed_boxes++;
        this._status = Box.Status.DESTROYED;
    }


    /**
     * @summary Boxの文字列表現を返します。
     * @return {string}
     */
    toString() {
        return `Box-${this.level}-${this.x}-${this.y}-${this.z}`;
    }


    /**
     * @summary Boxのツリー形式の文字列表現を返します。
     * @param {string} [indent] ルート要素のインデント文字列を指定します。
     * @return {string}
     */
    toTreeString( indent = "" ) {
        return this._children.reduce(
            (text, child) => (
                text +
                (child ? "\n" + child.toTreeString( indent + "  " ) : "")
            ),
            indent + this.toString()
        );
    }


    /**
     * ルートBoxを生成します。
     * @param {mapray.PointCloud} owner
     * @return {Box}
     */
    static createRoot( owner ) {
        const box = new Box( null, 0, 0, 0, 0 );
        box._owner = owner;
        return box;
    }

    static get Status() {
        return Status;
    }
}


Box.CHILDREN_INDICES = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
];



/**
 * @summary Boxの状態。
 * <pre>
 *                                                                      
 *              load()                            dispose()             
 * NOT_LOADED ---------> LOADING -------> LOADED -----------> DESTROYED 
 *                              \                          /            
 *                               `------>-----------------´             
 *                                  error or dispose()                  
 * </pre>
 * @enum {object}
 * @memberof mapray.PointCloud.Box
 * @constant
 * @see mapray.PointCloud.Box#status
 */
const Status = {
    /**
     * 準備中 (初期状態)。
     * load()を呼ぶと LOADING へ遷移し読み込み処理が開始される。
     */
    NOT_LOADED: { id: "NOT_LOADED" },

    /**
     * 読み込み中。
     * 読み込み処理が終了すると、LOADED か DESTROYED のいずれかに遷移する。
     * 正常に処理が完了すると LOADED 、何らかのエラーが発生した場合は DESTROYED となる。
     * また、LOADING 中に dispose() が呼ばれた場合、即座に DESTROYED に遷移する。
     */
    LOADING: { id: "LOADING" },

    /**
     * 読み込み完了(描画可能)。
     * dispose()を呼ぶと DESTROYED に遷移する。
     */
    LOADED: { id: "LOADED" },

    /**
     * 破棄状態
     * 他の状態に遷移することはない。
     */
    DESTROYED: { id: "DESTROYED" }
};



Box.STATUS_COLOR_TABLE = {};
{
    Box.STATUS_COLOR_TABLE[Box.Status.LOADED.id]     = [0.0, 0.8, 1.0, 0.5];
    Box.STATUS_COLOR_TABLE[Box.Status.DESTROYED.id]  = [1.0, 0.0, 0.0];
    Box.STATUS_COLOR_TABLE[Box.Status.LOADING.id]    = [1.0, 1.0, 0.0];
    Box.STATUS_COLOR_TABLE[Box.Status.NOT_LOADED.id] = [0.0, 1.0, 0.0];
};


const MIN_INT = 1 << 31;




export default PointCloud;
export { Box, Statistics };
