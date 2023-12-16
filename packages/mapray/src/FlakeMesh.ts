import GeoMath, { Vector3, Matrix } from "./GeoMath";
import AreaUtil, { Area } from "./AreaUtil";
import type GLEnv from "./GLEnv";
import type DemBinary from "./DemBinary";
import type FlakeMaterial from "./FlakeMaterial";
import type { AttributeBindInfoDict } from "./Material";
import { cfa_assert } from "./util/assertion";


/**
 * 地表断片メッシュ
 */
class FlakeMesh {

    /**
     * @param glenv - WebGL 環境
     * @param area  - 地表断片の領域
     * @param dpows - 地表断片の分割指数
     * @param dem   - DEM バイナリ
     */
    constructor( glenv: GLEnv,
                 area:  Area,
                 dpows: [number, number],
                 dem:   DemBinary )
    {
        const gl = glenv.context;

        // オブジェクト座標系の中心位置 (GOCS)
        this._center = this._createCenter( area );

        // 頂点データを生成
        const vdata = this._createVertices( gl, area, dpows, dem );
        this._vertices     = vdata.vertices;
        this._num_vertices = vdata.num_vertices;
        this._num_quads_x  = vdata.num_quads_x;
        this._num_quads_y  = vdata.num_quads_y;

        // 頂点属性辞書
        this._vertex_attribs = this._getVertexAttribs( gl );

        // インデックス型
        this._index_type = (this._num_vertices < 65536) ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;

        // インデックス (GL_TRIANGLES)
        this._indices     = null;
        this._num_indices = 0;

        // インデックス (GL_LINES)
        this._wire_indices     = null;
        this._num_wire_indices = 0;

        this._gl = gl;
    }


    /**
     * 中心位置を生成
     *
     * @param area - 地表断片の領域
     *
     * @return 中心位置 (GOCS)
     */
    private _createCenter( area: Area ): Vector3
    {
        return AreaUtil.getCenter( area, GeoMath.createVector3() );
    }


    get center() { return this._center; }


    /**
     *  頂点データとその情報を作成
     */
    private _createVertices( gl: WebGL2RenderingContext,
                             area: Area,
                             dpows: [number, number],
                             dem: DemBinary ) /* auto-type */
    {
        const target = gl.ARRAY_BUFFER;
        const    vbo = gl.createBuffer();
        const   data = this._createVerticesData( area, dpows, dem );

        if ( vbo === null ) {
            throw new Error( "failed to gl.createBuffer" );
        }

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, data.array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        return {
            vertices:     vbo,
            num_vertices: data.num_vertices,
            num_quads_x:  data.num_quads_x,
            num_quads_y:  data.num_quads_y,
        };
    }


    /**
     * 頂点データを作成
     */
    private _createVerticesData( area: Area,
                                 dpows: [number, number],
                                 dem: DemBinary ) /* auto-type */
    {
        // 開始位置 (単位球メルカトル座標系)
        var  msize = Math.pow( 2, 1 - area.z ) * Math.PI;
        var mx_min = area.x * msize - Math.PI;
        var my_min = Math.PI - (area.y + 1) * msize;

        // 分割数
        var u_count = 1 << dpows[0];
        var v_count = 1 << dpows[1];

        // 刻み幅
        var u_step  = 1 / u_count;
        var v_step  = 1 / v_count;
        var mx_step = msize / u_count;
        var my_step = msize / v_count;

        const u_step_count = u_count + 2;   // for edge bending
        const v_step_count = v_count + 2;   // for edge bending

        var    center  = this._center;
        var demSampler = dem.newSampler( area );

        var num_vertices = (u_step_count + 1) * (v_step_count + 1);
        var        array = new Float32Array( FlakeMesh.VERTEX_SIZE * num_vertices );
        var        index = 0;

        const edge_depth = (GeoMath.EARTH_RADIUS * 0.1) / ((area.z + 1) * (area.z + 1));
        const angle = 2.0 * GeoMath.DEGREE;
        const angle_unit = Math.PI / (GeoMath.EARTH_RADIUS * Math.PI);
        const edge_length = edge_depth * angle * angle_unit;

        for ( var iv = 0, my = my_min; iv < v_step_count + 1; ++iv, my += (iv == 1 || iv == v_step_count ? 0 : my_step) ) {
            let my_edge = my;
            if ( iv === 0 ) { my_edge -= edge_length; };
            if ( iv === v_step_count ) { my_edge += edge_length; };

            var ey    = Math.exp( my_edge );
            var ey2   = ey * ey;
            var sinφ = (ey2 - 1) / (ey2 + 1);
            var cosφ =   2 * ey  / (ey2 + 1);
            for ( var iu = 0, mx = mx_min; iu < u_step_count + 1; ++iu, mx += (iu == 1 || iu == u_step_count ? 0 : mx_step) ) {

                let mx_edge = mx;
                if ( iu === 0 ) { mx_edge -= edge_length; };
                if ( iu === u_step_count ) { mx_edge += edge_length; };

                var sinλ = Math.sin( mx_edge );
                var cosλ = Math.cos( mx_edge );

                var height = iv === 0 || iv === v_step_count ||
                             iu === 0 || iu === u_step_count ? demSampler.sample( mx, my ) - edge_depth :
                             demSampler.sample( mx, my );

                var radius = GeoMath.EARTH_RADIUS + height;

                // 法線 (GOCS)
                var nx = cosφ * cosλ;
                var ny = cosφ * sinλ;
                var nz = sinφ;

                // 位置 (GOCS)
                var gx = radius * nx;
                var gy = radius * ny;
                var gz = radius * nz;

                array[index++] = gx - center[0];  // x
                array[index++] = gy - center[1];  // y
                array[index++] = gz - center[2];  // z
                array[index++] = iu < 1 ? 0.0:
                                 iu > u_step_count - 1 ? 1.0:
                                 ( iu - 1 ) * u_step; // mu
                array[index++] = iv < 1 ? 0.0:
                                 iv > v_step_count - 1 ? 1.0:
                                 ( iv - 1 ) * v_step; // mv
                array[index++] = demSampler.sample( mx, my );   // height
            }
        }

        return {
            array:        array,
            num_vertices: num_vertices,
            num_quads_x:  u_step_count,
            num_quads_y:  v_step_count
        };
    }


    /**
     * 頂点属性の辞書を取得
     */
    private _getVertexAttribs( gl: WebGL2RenderingContext ): AttributeBindInfoDict
    {
        const   type = gl.FLOAT;
        const stride = FlakeMesh.VERTEX_BYTES;

        // Mesh.AttribData の辞書
        return {

            "a_position": {
                buffer:         this._vertices,
                num_components: 3,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_P
            },

            "a_uv": {
                buffer:         this._vertices,
                num_components: 2,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_UV
            },

            "a_height": {
                buffer:         this._vertices,
                num_components: 1,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_HEIGHT
            },
        };
    }


    /**
     * `GL_TRIANGLES` 用のインデックス配列を生成
     *
     * `_indices` と `_num_indices` を設定する。
     */
    private _createIndices(): void
    {
        var gl = this._gl;

        var num_quads   = this._num_quads_x * this._num_quads_y;
        var num_indices = 6 * num_quads;

        var typedArray = (this._index_type === gl.UNSIGNED_INT) ? Int32Array : Int16Array;

        var array = new typedArray( num_indices );
        var index = 0;

        for ( var y = 0; y < this._num_quads_y; ++y ) {
            for ( var x = 0; x < this._num_quads_x; ++x ) {
                var i00 = (this._num_quads_x + 1) * y + x;  // 左下頂点
                var i10 = i00 + 1;                          // 右下頂点
                var i01 = i00 + this._num_quads_x + 1;      // 左上頂点
                var i11 = i01 + 1;                          // 右上頂点

                // 左下三角形
                array[index++] = i00;
                array[index++] = i10;
                array[index++] = i01;

                // 右上三角形
                array[index++] = i01;
                array[index++] = i10;
                array[index++] = i11;
            }
        }

        var target = gl.ELEMENT_ARRAY_BUFFER;
        var    vbo = gl.createBuffer();

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        this._indices     = vbo;
        this._num_indices = num_indices;
    }


    /**
     * `GL_LINES` 用のインデックス配列を生成
     *
     * `_wire_indices` と `_num_wire_indices` を設定する。
     */
    private _createWireIndices(): void
    {
        var gl = this._gl;

        var  typedArray = (this._index_type === gl.UNSIGNED_INT) ? Int32Array : Int16Array;
        var num_indices = 2 * (2 * this._num_quads_x * this._num_quads_y + this._num_quads_x + this._num_quads_y);

        var array = new typedArray( num_indices );
        var index = 0;

        // 水平線
        for ( var y = 1; y < this._num_quads_y; ++y ) {
            for ( var x = 1; x < this._num_quads_x - 1; ++x ) {
                var i00 = (this._num_quads_x + 1) * y + x;  // 左下頂点
                var i10 = i00 + 1;                          // 右下頂点
                // 下水平線
                array[index++] = i00;
                array[index++] = i10;
            }
        }

        // 垂直線
        for ( x = 1; x < this._num_quads_x; ++x ) {
            for ( y = 1; y < this._num_quads_y - 1; ++y ) {
                var j00 = (this._num_quads_x + 1) * y + x;  // 左下頂点
                var j01 = j00 + this._num_quads_x + 1;      // 左上頂点
                // 左垂直線
                array[index++] = j00;
                array[index++] = j01;
            }
        }

        var target = gl.ELEMENT_ARRAY_BUFFER;
        var    vbo = gl.createBuffer();

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        this._wire_indices     = vbo;
        this._num_wire_indices = num_indices;
    }

    /**
     * 頂点数
     */
    get num_vertices(): number
    {
        return this._num_vertices;
    }

    /**
     * インデックス (GL_TRIANGLES)
     */
    get indices(): WebGLBuffer
    {
        if ( this._indices === null ) {
            this._createIndices();
            cfa_assert( this._indices !== null );
        }
        return this._indices;
    }


    /**
     * インデックス数 (`GL_TRIANGLES`)
     */
    get num_indices(): number
    {
        if ( this._indices === null ) {
            this._createIndices();
        }
        return this._num_indices;
    }


    /**
     * インデックス (`GL_LINES`)
     */
    get wire_indices(): WebGLBuffer
    {
        if ( this._wire_indices === null ) {
            this._createWireIndices();
            cfa_assert( this._wire_indices !== null );
        }
        return this._wire_indices;
    }


    /**
     * インデックス数 (`GL_LINES`)
     */
    get num_wire_indices(): number
    {
        if ( this._wire_indices === null ) {
            this._createWireIndices();
        }
        return this._num_wire_indices;
    }


    /**
     * リソースを破棄
     */
    dispose(): void
    {
        var gl = this._gl;

        // @ts-ignore  - 以降、this のメソッドは呼び出されない約束なので OK
        this._vertex_attribs = {};

        gl.deleteBuffer( this._vertices );
        // @ts-ignore  - 同上
        this._vertices = null;

        if ( this._indices ) {
            gl.deleteBuffer( this._indices );
            this._indices = null;
        }

        if ( this._wire_indices ) {
            gl.deleteBuffer( this._wire_indices );
            this._wire_indices = null;
        }
    }


    /**
     * 変換行列を計算
     *
     * `mat` に地表断片座標系から GOCS への変換行列を掛ける。
     *
     * @param mat - 行列
     * @param dst - 結果
     *
     * @return `dst`
     */
    mul_flake_to_gocs<DT extends Matrix>( mat: Matrix,
                                          dst: DT ): DT
    {
        const m00 = mat[ 0], m01 = mat[ 4], m02 = mat[ 8], m03 = mat[12],
              m10 = mat[ 1], m11 = mat[ 5], m12 = mat[ 9], m13 = mat[13],
              m20 = mat[ 2], m21 = mat[ 6], m22 = mat[10], m23 = mat[14],
              m30 = mat[ 3], m31 = mat[ 7], m32 = mat[11], m33 = mat[15];

        const t03 = this._center[0],
              t13 = this._center[1],
              t23 = this._center[2];

        dst[ 0] = m00;
        dst[ 1] = m10;
        dst[ 2] = m20;
        dst[ 3] = m30;

        dst[ 4] = m01;
        dst[ 5] = m11;
        dst[ 6] = m21;
        dst[ 7] = m31;

        dst[ 8] = m02;
        dst[ 9] = m12;
        dst[10] = m22;
        dst[11] = m32;

        dst[12] = m00*t03 + m01*t13 + m02*t23 + m03;
        dst[13] = m10*t03 + m11*t13 + m12*t23 + m13;
        dst[14] = m20*t03 + m21*t13 + m22*t23 + m23;
        dst[15] = m30*t03 + m31*t13 + m32*t23 + m33;

        return dst;
    }


    /**
     * メッシュを描画
     *
     * @param material - マテリアル
     *
     * @remarks
     * 事前に `material.bindProgram()` すること。
     */
    draw( material: FlakeMaterial ): void
    {
        var     gl = this._gl;
        var isWire = material.isWireframe();

        // 頂点属性のバインド
        material.bindVertexAttribs( this._vertex_attribs );

        // インデックスのバインド
        var indices = isWire ? this.wire_indices : this.indices;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indices );

        // 描画処理
        var mode        = isWire ? gl.LINES              : gl.TRIANGLES;
        var num_indices = isWire ? this.num_wire_indices : this.num_indices;
        gl.drawElements( mode, num_indices, this._index_type, 0 );
    }


    /** 中心位置 (GOCS) */
    private readonly _center: Vector3;

    /** 頂点バッファ */
    private readonly _vertices: WebGLBuffer;

    /** 頂点数 */
    private readonly _num_vertices: number;

    /** X グリッド数 */
    private readonly _num_quads_x: number;

    /** Y グリッド数 */
    private readonly _num_quads_y: number;

    /** 頂点属性情報 */
    private readonly _vertex_attribs: AttributeBindInfoDict;

    /** インデックス型 */
    private readonly _index_type: number;

    // GL_TRIANGLES 用のインデックス配列
    private _indices: WebGLBuffer | null;
    private _num_indices: number;

    // GL_LINES 用のインデックス配列
    private _wire_indices: WebGLBuffer | null;
    private _num_wire_indices: number;

    /** WebGL コンテキスト */
    private readonly _gl: WebGL2RenderingContext;


    /**
     * 1 頂点の float 数
     */
    private static readonly VERTEX_SIZE = 6;

    /**
     * 1 頂点のバイト数
     */
    private static readonly VERTEX_BYTES = 4 * FlakeMesh.VERTEX_SIZE;

    /**
     * 位置座標のオフセット
     */
    private static readonly OFFSET_P = 0;

    /**
     * UV 座標のオフセット
     */
    private static readonly OFFSET_UV = 12;

    /**
     * 高さ座標のオフセット
     */
    private static readonly OFFSET_HEIGHT = 20;

}


export default FlakeMesh;
