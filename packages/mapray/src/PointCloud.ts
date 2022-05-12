import GLEnv from "./GLEnv";
import Scene from "./Scene";
import Mesh from "./Mesh";
import RenderStage from "./RenderStage";
import GeoMath, { Vector3, Vector4 } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import PointCloudMaterial, { PointCloudDebugWireMaterial, PointCloudDebugFaceMaterial, PointCloudPickMaterial } from "./PointCloudMaterial";
import PointCloudProvider from "./PointCloudProvider";
import PointCloudBoxCollector from "./PointCloudBoxCollector";



/**
 * 点群データを表現するクラス
 *
 * ```typescript
 * const provider = new mapray.RawPointCloudProvider({
 *     resource: {
 *         prefix: "https://..."
 *     }
 * });
 * const point_cloud = viewer.point_cloud_collection.add( provider );
 * point_cloud.setPointShape( mapray.PointCloud.PointShapeType.GRADIENT_CIRCLE );
 * ```
 *
 * @see [[PointCloudProvider]]
 */
class PointCloud {

    private _glenv: GLEnv;

    private _scene: Scene;

    private _provider: PointCloudProvider;

    private _root: PointCloud.Box;

    private _points_per_pixel: number;

    private _point_shape: PointCloud.PointShapeType;

    private _point_size_type: PointCloud.PointSizeType;

    private _point_size: number;

    private _point_size_limit: number;

    private _dispersion: boolean;

    private _rid?: number;

    // for debug

    private _debug_shader: boolean;

    private _debug_render_box: boolean;

    private _debug_render_ellipsoid: boolean;

    private _debug_render_axis: boolean;

    private _debug_render_section: boolean;


    /**
     * @param scene 所属するシーン
     * @param provider プロバイダ
     */
    constructor( scene: Scene, provider: PointCloudProvider )
    {
        this._glenv = scene.glenv;
        this._scene = scene;

        this._provider = provider;

        this._root = PointCloud.Box.createRoot( this );

        // properties
        this._points_per_pixel = 0.7;
        this._point_shape = PointCloud.PointShapeType.CIRCLE;
        this._point_size_type = PointCloud.PointSizeType.FLEXIBLE;
        this._point_size = 1;
        this._point_size_limit = 10;

        // hidden properties
        this._dispersion = true;
        this._debug_shader = false;

        // for debug
        this._debug_render_box = false;
        this._debug_render_ellipsoid = false;
        this._debug_render_axis = false;
        this._debug_render_section = false;

        this._checkMaterials();

        PointCloud._instances.push(this);
    }


    /**
     * 初期化
     * [[PointCloudBoxCollector]]へ追加時に自動的に呼ばれる。
     * @internal
     */
    async init() {
        await this._provider.init();
    }

    /**
     * 破棄
     * [[PointCloudBoxCollector]]から削除時に自動的に呼ばれる。
     * @internal
     */
    async destroy() {
        if (this._provider) {
            await this._provider.destroy();
        }
        if (this._root) {
            await this._root.dispose();
        }
        const index = PointCloud._instances.indexOf( this );
        if ( index !== -1 ) {
            PointCloud._instances.splice( index, 1 );
        }
    }


    /**
     * @internal
     */
    get glenv() { return this._glenv }


    /**
     * @internal
     */
    get scene() { return this._scene }


    /**
     * プロバイダ
     * @internal
     */
    get provider() { return this._provider; }


    /**
     * ルートBox
     * @internal
     */
    get root() { return this._root };


    // Properties

    /**
     * 点群Box読み込みを行う際の解像度[points/pixel]
     */
    getPointsPerPixel(): number { return this._points_per_pixel; }

    /**
     * 点群Box読み込みを行う際の解像度[points/pixel]を設定
     * @param val 設定する値
     */
    setPointsPerPixel( val: number ) {
        console.assert( val <= 1 );
        this._points_per_pixel = val;
    }

    /**
     * 点を描画する際の形状
     * @return [[PointCloud.PointShapeType]]
     */
    getPointShape() { return this._point_shape; }

    /**
     * 点を描画する際の形状を設定
     * @param {PointCloud.PointShapeType} val 設定する値
     */
    setPointShape( val: PointCloud.PointShapeType ) {
        this._point_shape = val;
    }

    /**
     * 点を描画する際のサイズの指定方法
     * @return {PointCloud.PointSizeType}
     */
    getPointSizeType() { return this._point_size_type; }

    /**
     * 点を描画する際のサイズの指定方法を設定
     * @param val 設定する値
     */
    setPointSizeType( val: PointCloud.PointSizeType ) {
        this._point_size_type = val;
    }

    /**
     * 点を描画する際のサイズ
     * point_size_typeにより単位が異なる
     * @see [[PointCloud.getPointSizeType]]
     */
    getPointSize(): number { return this._point_size; }

    /**
     * 点を描画する際のサイズを設定。
     * [[PointCloud.setPointSizeType]]により指定された値によって解釈される単位が異なる。
     * @param val 設定する値
     */
    setPointSize( val: number ) {
        console.assert( val > 0 );
        this._point_size = val;
    }

    /**
     * 点を描画する際の最大ピクセルサイズ
     */
    getPointSizeLimit(): number { return this._point_size_limit; }

    /**
     * 点を描画する際の最大ピクセルサイズを設定
     * @param val 設定する値
     */
    setPointSizeLimit( val: number ) {
        console.assert( val > 0 );
        this._point_size_limit = val;
    }

    /**
     * Render ID をセットする
     * @param id render id
     * @internal
     */
    setRenderId( id: number ): void {
        this._rid = id;
    }

    /**
     * Render IDを取得する
     * @returns render ID
     * @internal
     */
    getRenderId(): number | undefined {
        return this._rid;
    }


    // hidden properties

    /** @internal */
    getDispersion() { return this._dispersion }

    /** @internal */
    setDispersion( val: boolean ) { this._dispersion = val; }


    // for debug

    /** @internal */
    getDebugShader() { return this._debug_shader; }

    /** @internal */
    setDebugShader( val: boolean ) { this._debug_shader = val; }

    /** @internal */
    getDebugRenderBox() { return this._debug_render_box; }

    /** @internal */
    setDebugRenderBox( val: boolean ) { this._debug_render_box = val; this._updateDebugMesh(); }

    /** @internal */
    getDebugRenderEllipsoid() { return this._debug_render_ellipsoid }

    /** @internal */
    setDebugRenderEllipsoid( val: boolean ) { this._debug_render_ellipsoid = val; this._updateDebugMesh(); }

    /** @internal */
    getDebugRenderAxis() { return this._debug_render_axis; }

    /** @internal */
    setDebugRenderAxis( val: boolean ) { this._debug_render_axis = val; this._updateDebugMesh(); }

    /** @internal */
    getDebugRenderSection() { return this._debug_render_section; }

    /** @internal */
    setDebugRenderSection( val: boolean ) { this._debug_render_section = val; this._updateDebugMesh(); }

    /** @internal */
    _updateDebugMesh() {
        if ( this._root ) {
            this._root._updateDebugMeshes();
        }
    }

    /**
     * Traverse結果の統計情報を取得。
     * リクエストキューに登録し、[[RenderStage]]が処理を完了するのを待つ。
     * @return {Promise<PointCloud.Statistics>}
     * @internal
     */
    private static async requestTraverseSummary(): Promise<PointCloud.Statistics> {
        return new Promise(onSuccess => {
                const notifier = (statistics: PointCloud.Statistics) => {
                    onSuccess(statistics);
                    const index = PointCloud.getTraverseDataRequestQueue().indexOf(notifier);
                    if (index !== -1) PointCloud.getTraverseDataRequestQueue().splice(index, 1);
                };
                PointCloud.getTraverseDataRequestQueue().push( notifier );
        });
    }

    /**
     * Traverse結果取得用のリクエストキューを取得
     * @internal
     */
    private static getTraverseDataRequestQueue() {
        return PointCloud._traverseDataRequestQueue || (PointCloud._traverseDataRequestQueue=[]);
    }

    /* *
     * 指定された level, x, y, z のURLを生成します
     * @param level
     * @param x
     * @param y
     * @param z
     * /
    private getURL( level: number, x: number, y: number, z: number ): string
    {
        return this._urlGenerator( level, x, y, z );
    }
    */


    /**
     */
    private _checkMaterials() {
        const viewer = this._scene.viewer;
        const render_cache: RenderCacheType = viewer._render_cache as RenderCacheType || ( viewer._render_cache = {} );
        if ( !render_cache.point_cloud_materials ) {
            const map = new Map<PointCloud.PointShapeType, PointCloudMaterial>();
            PointCloud.ListOfPointShapeTypes.forEach( point_shape_type => {
                    map.set( point_shape_type, new PointCloudMaterial( viewer, { point_shape_type } ) );
            } );
            render_cache.point_cloud_materials = map;
        }
        if ( !render_cache.point_cloud_pick_materials ) {
            const map = new Map<PointCloud.PointShapeType, PointCloudPickMaterial>();
            PointCloud.ListOfPointShapeTypes.forEach( point_shape_type => {
                map.set( point_shape_type, new PointCloudPickMaterial( viewer, { point_shape_type } ) );
            } );
            render_cache.point_cloud_pick_materials = map;
        }
        if ( !render_cache.point_cloud_debug_wire_material ) {
            render_cache.point_cloud_debug_wire_material = new PointCloudDebugWireMaterial( viewer );
        }
        if ( !render_cache.point_cloud_debug_face_material ) {
            render_cache.point_cloud_debug_face_material = new PointCloudDebugFaceMaterial( viewer );
        }
    }


    /**
     * @internal
     */
    getMaterial( point_shape: PointCloud.PointShapeType, renderTarget: RenderStage.RenderTarget ): PointCloudMaterial {
        const viewer = this._scene.viewer;
        const render_cache: RenderCacheType = viewer._render_cache as RenderCacheType || ( viewer._render_cache = {} );
        const materials = (
            renderTarget === RenderStage.RenderTarget.SCENE ? render_cache.point_cloud_materials :
            render_cache.point_cloud_pick_materials
        );
        const material = materials.get( point_shape );

        if ( !material ) {
            throw new Error( 'pointcloud material not initialized' );
        }
        return material;
    }


    /**
     * @internal
     */
    static setStatisticsHandler( statistics_handler: PointCloud.StatisticsHandler ) {
        if (statistics_handler) {
            PointCloud._statistics = {
                statistics_obj: new PointCloud.Statistics(),
                statistics_handler: statistics_handler,
            };
        }

    }

    /** @internal */
    private static getStatistics() { return PointCloud._statistics; }

    /** @internal */
    private static getStatisticsHandler() { return PointCloud._statistics.statistics_handler; }

    /** @internal */
    private static _statistics: {
        statistics_obj: PointCloud.Statistics,
        statistics_handler: PointCloud.StatisticsHandler,
    };

    /** @internal */
    private static _instances: PointCloud[] = [];

    /** @internal */
    private static _traverseDataRequestQueue: any[] = [];
}

type RenderCacheType = {
    point_cloud_materials: Map<PointCloud.PointShapeType, PointCloudMaterial>;
    point_cloud_debug_wire_material: PointCloudDebugWireMaterial;
    point_cloud_debug_face_material: PointCloudDebugFaceMaterial;
    point_cloud_pick_materials: Map<PointCloud.PointShapeType, PointCloudPickMaterial>;
}



namespace PointCloud {



/**
 * @internal
 */
export class Statistics {

    render_point_count: number;

    total_point_count: number;

    render_boxes: number;

    total_boxes: number;

    loading_boxes: number;

    created_boxes: number;

    disposed_boxes: number;

    total_time: number;

    traverse_time: number;

    render_time: number;

    private _start_time: number;

    private _done_time: number;

    private _done_traverse_time: number;

    _now: () => number;


    constructor() {
        this._now = performance ? () => performance.now() : () => Date.now();
        this.clear();

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

        this._start_time = -1;
        this._done_time = -1;
        this._done_traverse_time = -1;
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

        this._start_time = -1;
        this._done_time = -1;
        this._done_traverse_time = -1;
    }
}



export type StatisticsHandler = (statistics_obj: PointCloud.Statistics) => void;





/**
 * 点描画の種類
 */
export enum PointShapeType {
    /**
     * 矩形
     */
    RECTANGLE,

    /**
     * 円
     */
    CIRCLE,

    /**
     * 境界線付きの円
     */
    CIRCLE_WITH_BORDER,

    /**
     * グラデーションで塗り潰した円
     */
    GRADIENT_CIRCLE,
};



export const ListOfPointShapeTypes = [
    PointShapeType.RECTANGLE,
    PointShapeType.CIRCLE,
    PointShapeType.CIRCLE_WITH_BORDER,
    PointShapeType.GRADIENT_CIRCLE,
];



/**
 * 点描画のサイズ指定方法の種類
 */
export enum PointSizeType {
    /**
     * setPointSize()により指定された値をピクセルとして解釈する
     */
    PIXEL,

    /**
     * setPointSize()により指定された値をmmとして解釈する
     */
    MILLIMETERS,

    /**
     * setPointSize()により指定された値を参照せず、表示位置に応じて適切なサイズを自動的に指定する。
     */
    FLEXIBLE,
};



/**
 * 点群ツリーを構成するノード。
 * ルート要素(level === 0) は、Box.createRoot()を用いて作成する。
 * @internal
 */
export class Box {

    /**
     * 親Box
     */
    private _parent?: Box;

    /**
     * 所属するPointCloud。
     * ルート要素の場合は [[Box.createRoot]] で設定される。
     */
    private _owner!: PointCloud;

    /** レベル */
    level: number;

    /** x */
    x: number;

    /** y */
    y: number;

    /** z */
    z: number;

    /**
     * Box一辺の半分の長さ
     * @internal
     */
    size: number;

    /**
     * 軸方向に投影した際の面積
     * @internal
     */
    proj_area: number;


    /**
     * GOCS座標系でのBoxの中心位置
     * @internal
     */
    gocs_center: Vector3;

    /**
     * GOCS座標系でのBoxの最小位置
     * @internal
     */
    gocs_min: Vector3;

    /**
     * GOCS座標系でのBoxの最大位置
     * @internal
     */
    gocs_max: Vector3;

    /**
     * 
     * @internal
     */
    private _status: PointCloud.Status;

    /**
     * 子Box、セルに関する情報
     */
    private _metaInfo!: PointCloud.BoxInfo;

    /**
     * 子Box。
     * `(u, v, w)` のインデックスは `(u | v << 1 | w << 2)` によって算出される。
     * @internal
     */
    private _children: [ Box?, Box?, Box?, Box?, Box?, Box?, Box?, Box? ];

    /**
     * @internal
     */
    average!: Vector3;

    /**
     * @internal
     */
    eigenVector!: [ Vector3, Vector3, Vector3 ];

    /**
     * @internal
     */
    eigenVectorLength!: [ number, number, number ];

    /**
     * @internal
     */
    private _vertex_buffer!: WebGLBuffer;

    /**
     * @internal
     */
    private _vertex_length!: number;

    /**
     * @internal
     */
    private _vertex_attribs!: object;

    /**
     * @internal
     */
    private debug1!: number;

    /**
     * @internal
     */
    private _loadId?: number;

    private _abort_controller!: AbortController; // @ToDo: 必要性を確認

    private _debugMesh?: Mesh[];


    /**
     * @param parent 親Box(level === 0の場合はnull)
     * @param level レベル
     * @param x x
     * @param y y
     * @param z z
     */
    constructor( parent: Box | undefined, level: number, x: number, y: number, z: number )
    {
        this._parent = parent;

        if (parent) {
            this._owner = parent._owner;
        }

        this.level = level;

        this.x = x;

        this.y = y;

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

        const size = this.size = (
            level ===  0 ? 2147483648: // 2^31
            level  <  31 ? 1 << (31-level):
            Math.pow(0.5, level-31)
        );

        this.proj_area = 4.0 * size * size;

        this.gocs_center = GeoMath.createVector3([
                MIN_INT + (2 * x + 1) * size,
                MIN_INT + (2 * y + 1) * size,
                MIN_INT + (2 * z + 1) * size
        ]);

        this.gocs_min = GeoMath.createVector3([
                this.gocs_center[0] - size,
                this.gocs_center[1] - size,
                this.gocs_center[2] - size
        ]);

        this.gocs_max = GeoMath.createVector3([
                this.gocs_center[0] + size,
                this.gocs_center[1] + size,
                this.gocs_center[2] + size
        ]);

        this._status = Box.Status.NOT_LOADED;

        this._children = [
            undefined, undefined, undefined, undefined,
            undefined, undefined, undefined, undefined,
        ];

        if ( this._owner ) {
            this._updateDebugMesh();
        }
    }

    /**
     * 読み込み済みの `Box` を引数として、指定されたコールバック関数を呼び出します。
     * 読み込み済みとは、`Box.status == PointCloud.Status.LOADED` を満たす `Box` を指します。
     * @param callback コールバック関数
     */
    forEach( callback: ( box: PointCloud.Box ) => void ) {
        for (let i=0; i<this._children.length; i++) {
            const child = this._children[i];
            if ( child && child.status === Box.Status.LOADED ) {
                child.forEach( callback );
            }
        }
        callback( this );
    }


    /**
     * デバッグ表示用のメッシュを生成します。
     * @internal
     */
    _updateDebugMeshes() {
        this._updateDebugMesh();
        for (let i=0; i<this._children.length; i++) {
            const child = this._children[i];
            if ( child ) {
                child._updateDebugMeshes();
            }
        }
    }


    /**
     * デバッグ表示用のメッシュを生成します。
     * @internal
     */
    _updateDebugMesh() {
        const vertices = [];
        const indices  = [];
        const tindices = [];

        if ( this._owner.getDebugRenderBox() ) {
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
            for ( let i=0; i<PointCloud.CHILDREN_INDICES.length; i++) {
                vertices.push(
                    this.size * (2 * PointCloud.CHILDREN_INDICES[i][2] - 1),
                    this.size * (2 * PointCloud.CHILDREN_INDICES[i][1] - 1),
                    this.size * (2 * PointCloud.CHILDREN_INDICES[i][0] - 1)
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
            if ( this._owner.getDebugRenderAxis() ) { // Render Normal
                let offset = vertices.length / 3;
                for ( let i=0; i<3; i++) {
                    const len = Math.max(0.2, this.eigenVectorLength[i]);
                    const ev = this.eigenVector[i];
                    for ( let j=0; j<3; j++ ) vertices.push( this.average[j] - len * ev[j] );
                    for ( let j=0; j<3; j++ ) vertices.push( this.average[j] + len * ev[j] );
                    indices.push( offset++, offset++ );
                }
            }

            if ( this._owner.getDebugRenderSection() ) {
                if ( this.level > 20 && this.vertex_length > 5000 && this.eigenVectorLength[0] < this.size * 0.2 ) { // = 10% = (2 * s) / 10
                    this._putSectionShapePoints(vertices, indices, tindices); // Render Cross Section
                }
            }
            if ( this._owner.getDebugRenderEllipsoid() ) {
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
            meshes.push( new Mesh( this._owner.glenv, mesh_data ) );
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
            meshes.push( new Mesh( this._owner.glenv, mesh_data ) );
        }

        this._debugMesh = meshes;
    }


    /**
     * @internal
     */
    private _putVariancePoints( vertices: number[], indices: number[], tindices: number[] ) {
        const offset = vertices.length / 3;
        const [ e1, e2, e3 ]  = this.eigenVector;
        const [ e1l, e2l, e3l ] = this.eigenVectorLength;
        const cache = PointCloud._variance_points_cache;
        const G = cache.G;
        const N = cache.N;
        const putPoint = (ro: number, th: number, vs: number[]) => {
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
     * @internal
     */
    private _putSectionShapePoints( vertices: number[], indices: number[], tindices: number[] ) {
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

        let isFirst = true;
        const n = [0, 0, 0];
        const t = [0, 0, 0];
        for ( let i=0; i<q.length; i++ ) {
            const p = q[i].p;
            const v = q[i].v;
            const alpha = ((a[0]-p[0])*ue[0] + (a[1]-p[1])*ue[1] + (a[2]-p[2])*ue[2]) / (v[0]*ue[0] + v[1]*ue[1] + v[2]*ue[2]);
            if (Math.abs(alpha) <= 1.0) {
                const c  = [p[0]+alpha*v[0], p[1]+alpha*v[1], p[2]+alpha*v[2]];
                const lp = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
                let angle;
                if ( isFirst ) {
                    angle = 0;
                    t[0] = ue[1]*lp[2]-ue[2]*lp[1];
                    t[1] = ue[2]*lp[0]-ue[0]*lp[2];
                    t[2] = ue[0]*lp[1]-ue[1]*lp[0];
                    n[0] = t[1]*ue[2]-t[2]*ue[1];
                    n[1] = t[2]*ue[0]-t[0]*ue[2];
                    n[2] = t[0]*ue[1]-t[1]*ue[0];
                    isFirst = false;
                }
                else {
                    angle = Math.atan2(t[0]*lp[0]+t[1]*lp[1]+t[2]*lp[2], n[0]*lp[0]+n[1]*lp[1]+n[2]*lp[2]);
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
     * 読み込みステータス
     */
    get status() {
        return this._status;
    }


    /**
     * 読み込みが完了しているか
     */
    get is_loaded() {
        return this._status === Box.Status.LOADED;
    }


    /**
     * 親ノード
     */
    get parent(): Box | undefined {
        return this._parent;
    }


    /**
     * Boxに含まれる点の数
     */
    get vertex_length(): number
    {
        return this._metaInfo?.indices[7] || 0;
    }


    /**
     * 子Boxの情報を取得
     * 
     * @param index 番号
     */
    getChildInfo( index: number ): PointCloud.ChildInfo | undefined
    {
        if (!this._metaInfo) return undefined;
        return this._metaInfo.children[ index ];
    }


    /**
     * Box領域を8分割した領域ごとに点が存在するかを調べる。
     * 
     * @param index 子Boxと同様の順番
     * @return 点が存在する場合に `true` となる。
     */
    cellPointsAvailable( index: number ): boolean
    {
        return (
            this._metaInfo &&
            (index === 0 ?
                this._metaInfo.indices[ index ] > 0:
                this._metaInfo.indices[ index ] > this._metaInfo.indices[ index - 1 ]
            )
        );
    }


    /**
     * 子Boxの番号を返します。
     * @param child 子Box
     */
    indexOf( child: Box ): number
    {
        return this._children.indexOf( child );
    }


    /**
     * カリングするか？
     * @param  clip_planes  クリップ平面配列
     * @return 見えないとき `true`, 見えるまたは不明のとき `false`
     */
    isInvisible( clip_planes: Vector4[] ): boolean
    {
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
     * 点群の読み込み処理
     */
    async load(): Promise<void> {
        if ( this._status !== PointCloud.Status.NOT_LOADED ) throw new Error( "illegal status: " + this._status );
        if ( !this._owner.provider.isReady() ) return;
        this._status = Box.Status.LOADING;

        const task = this._owner.provider.load( this.level, this.x, this.y, this.z );
        this._loadId = task.id;
        return task.done.then(event => {
                if ( this._status === PointCloud.Status.DESTROYED ) {
                    return;
                }
                const children = [];
                {
                    let childFlags = event.header.childFlags;
                    for ( let i=7; i>=0; --i ) {
                        if (childFlags & 1) {
                            children[i] = {};
                        }
                        childFlags = childFlags >> 1;
                    }
                }
                this._metaInfo = {
                    children: children,
                    indices: event.header.indices,
                };

                this.average = event.header.average;
                this.eigenVector = event.header.eigenVector;
                this.eigenVectorLength = event.header.eigenVectorLength;
                this.debug1 = event.header.debug1;

                const values = event.body;
                // console.assert( values.length > 0 );
                // console.assert( values.length / 6 === this._metaInfo.indices[7] );

                ASSERT: {
                    const number_of_points = values.length / 6;
                    for ( let i=0; i<8; ++i ) {
                        if (this._metaInfo.indices[i] > number_of_points) {
                            console.log("warning fix indices");
                            this._metaInfo.indices[i] = number_of_points;
                        }
                    }
                }

                const gl = this._owner.glenv.context;

                const buffer = gl.createBuffer();
                if ( !buffer ) throw new Error("failed to create buffer");
                this._vertex_buffer = buffer;

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
                    error.message === "The user aborted a request." ||
                    error.is_aborted
                );
                if ( !skip_error ) {
                    console.log(error);
                    this._status = Box.Status.DESTROYED;
                }
        });
    }


    /**
     * 子Boxを生成。(すでに存在する場合は既存のBoxを返す)
     * LOADED 状態でのみ呼ぶことができる
     * 
     * @param index 番号
     * @param statistics 統計情報
     */
    newChild( index: number, statistics?: PointCloud.Statistics ): Box | undefined
    {
        const [ u, v, w ] = PointCloud.CHILDREN_INDICES[ index ];
        return this.newChildAt( u, v, w, statistics );
    }


    /**
     * 子Boxを生成。(すでに存在する場合は既存のBoxを返す)
     * LOADED 状態でのみ呼ぶことができる
     * 
     * @param u x方向-側は0、+側は1
     * @param v y方向-側は0、+側は1
     * @param w z方向-側は0、+側は1
     * @param statistics 統計情報
     */
    newChildAt( u: number, v: number, w: number, statistics?: PointCloud.Statistics ): Box | undefined
    {
        console.assert( this._status === Box.Status.LOADED );
        const index = u | v << 1 | w << 2;
        const child = this._children[ index ];
        if ( child ) return child;

        if ( !this.getChildInfo( index ) ) return undefined;

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
    getChild( index: number ) {
        return this._children[ index ];
    }

    /**
     * デバッグメッシュを描画
     * 
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     */
    _drawDebugMesh( render_stage: RenderStage ) {
        if ( !this._debugMesh ) return;

        const gl = render_stage.glenv.context;
        const color = PointCloud.STATUS_COLOR_TABLE.get( this._status );
        const viewer = this._owner.scene.viewer;
        const render_cache = viewer._render_cache;

        gl.disable( gl.CULL_FACE );
        for ( let debugMesh of this._debugMesh ) {
            const debug_material = (debugMesh._draw_mode === 1 ?
                render_cache.point_cloud_debug_wire_material:
                render_cache.point_cloud_debug_face_material
            );
            debug_material.bindProgram();
            debug_material.setDebugBoundsParameter( render_stage, this.gocs_center, color );
            debugMesh.draw( debug_material );
        }
        gl.enable( gl.CULL_FACE );
    }


    /**
     * Boxを描画する。
     * Box全体の描画および、Boxの8分割単位での描画に対応。
     * 
     * @param render_stage レンダリングステージ
     * @param target_cells 描画対象の子番号の配列。ただしnullは全体を表す。
     * @param points_per_pixels 点の解像度の配列。target_cells同じ順序であり、nullの場合は要素数1となる。
     * @param statistics 統計情報
     */
    draw( render_stage: RenderStage, target_cells: number[] | undefined, points_per_pixels: number[], statistics?: PointCloud.Statistics )
    {
        if ( this._debugMesh ) {
            this._drawDebugMesh( render_stage );
        }

        if ( this._status !== Box.Status.LOADED ) return;

        const gl = render_stage.glenv.context;

        const point_shape      = this._owner.getPointShape();
        const point_size_type  = this._owner.getPointSizeType();
        const point_size       = this._owner.getPointSize();
        const point_size_limit = this._owner.getPointSizeLimit();
        const debug_shader     = this._owner.getDebugShader();

        if ( this._status === Box.Status.LOADED ) {
            const material = this._owner.getMaterial( point_shape, render_stage.getRenderTarget() );
            material.bindProgram();
            material.setDebugBoundsParameter( render_stage, this.gocs_center );
            material.bindVertexAttribs( this._vertex_attribs );
            const rid = this._owner.getRenderId();
            if ( rid !== undefined ) {
                material.setRenderId( rid );
            }


            const overlap_scale = 3;
            if ( !target_cells ) {
                // draw whole points
                const ppp = points_per_pixels[ 0 ];
                material.setPointSize(
                    point_size_type === PointCloud.PointSizeType.PIXEL       ? point_size:
                    point_size_type === PointCloud.PointSizeType.MILLIMETERS ? -0.001 * point_size / render_stage.pixel_step:
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
                        point_size_type === PointCloud.PointSizeType.MILLIMETERS ? -0.001 * point_size / render_stage.pixel_step:
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
     * 子孫Boxを全て削除する。
     * 全ての状態でこの関数を呼ぶことができ、複数回呼ぶことができる。
     * @param statistics 統計情報
     */
    disposeChildren( statistics?: PointCloud.Statistics ) {
        for (let i=0; i<this._children.length; i++) {
            const child = this._children[i];
            if ( child ) {
                child.dispose( statistics );
                this._children[i] = undefined;
            }
        }
    }


    /**
     * Boxを破棄します。子孫Boxも全て削除する。
     * 全ての状態でこの関数を呼ぶことができ、複数回呼ぶことができる。
     * @param statistics 統計情報
     */
    dispose( statistics?: PointCloud.Statistics ) {
        if ( this._status === Box.Status.LOADING ) {
            if ( this._abort_controller ) {
                this._abort_controller.abort();
            }
            if ( this._loadId !== undefined ) {
                this._owner.provider.cancel( this._loadId );
            }
        }

        this.disposeChildren( statistics );

        if ( this._vertex_buffer ) {
            const gl = this._owner.glenv.context;
            gl.deleteBuffer(this._vertex_buffer);
        }

        if ( this._debugMesh ) {
            // this.debugMesh.dispose();
        }

        if ( statistics ) statistics.disposed_boxes++;
        this._status = Box.Status.DESTROYED;
    }


    /**
     * Boxの文字列表現を返します。
     */
    toString() {
        return `Box-${this.level}-${this.x}-${this.y}-${this.z}`;
    }


    /**
     * Boxのツリー形式の文字列表現を返します。
     * @param indent ルート要素のインデント文字列を指定します。
     */
    toTreeString( indent = "" ): string
    {
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
     * @param owner
     */
    static createRoot( owner: PointCloud ): Box
    {
        const box = new Box( undefined, 0, 0, 0, 0 );
        box._owner = owner;
        return box;
    }

    static get Status() {
        return Status;
    }
}


export type ChildInfo = object;


export interface BoxInfo {
    children: (ChildInfo | undefined)[];
    indices: Int32Array;
}



export const CHILDREN_INDICES = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
];



export interface VariancePoints {
    cos_ro: number[];
    sin_ro: number[];
    cos_th: number[];
    sin_th: number[];
    G: number;
    N: number;
};


export const _variance_points_cache: VariancePoints = (() => {
        const G = 6;
        const N = 12;
        const cos_ro = [];
        const sin_ro = [];
        const cos_th = [];
        const sin_th = [];
        for ( let j=0; j<=G; ++j ) {
            const ro = Math.PI * j / G;
            cos_ro[j] = Math.cos(ro);
            sin_ro[j] = Math.sin(ro);
        }
        for ( let i=0; i<=N; ++i ) {
            const th = 2 * Math.PI * i/N;
            cos_th[i] = Math.cos(th);
            sin_th[i] = Math.sin(th);
        }
        return {
            cos_ro, sin_ro,
            cos_th, sin_th,
            G, N,
        };
})();



/**
 * Boxの状態。
 *
 * ```text
 * NOT_LOADED ---------> LOADING ---------> LOADED -----------> DESTROYED 
 *              load()            (async)            dispose()      ^     
 *                |                                                 |     
 *                `-------------------------------------------------'     
 *                                      error                             
 * ```
 *
 * @see Box.status
 */
export enum Status {
    /**
     * 準備中 (初期状態)。
     * load()を呼ぶと LOADING へ遷移し読み込み処理が開始される。
     */
    NOT_LOADED,

    /**
     * 読み込み中。
     * 読み込み処理が終了すると、LOADED か DESTROYED のいずれかに遷移する。
     * 正常に処理が完了すると LOADED 、何らかのエラーが発生した場合は DESTROYED となる。
     * また、LOADING 中に dispose() が呼ばれた場合、即座に DESTROYED に遷移する。
     */
    LOADING,

    /**
     * 読み込み完了(描画可能)。
     * dispose()を呼ぶと DESTROYED に遷移する。
     */
    LOADED,

    /**
     * 破棄状態
     * 他の状態に遷移することはない。
     */
    DESTROYED,
};



export const STATUS_COLOR_TABLE = new Map<Status, [number, number, number] | [number, number, number, number]>();
{
    PointCloud.STATUS_COLOR_TABLE.set(Status.LOADED,     [0.0, 0.8, 1.0, 0.5]);
    PointCloud.STATUS_COLOR_TABLE.set(Status.DESTROYED,  [1.0, 0.0, 0.0]);
    PointCloud.STATUS_COLOR_TABLE.set(Status.LOADING,    [1.0, 1.0, 0.0]);
    PointCloud.STATUS_COLOR_TABLE.set(Status.NOT_LOADED, [0.0, 1.0, 0.0]);
};


export const MIN_INT = 1 << 31;



} // namespace PointCloud



export default PointCloud;
