import GeoMath, { Vector3, Matrix } from "./GeoMath";
import AreaUtil, { Area } from "./AreaUtil";
import type GLEnv from "./GLEnv";
import type Globe from "./Globe";
import type DemBinary from "./DemBinary";
import type FlakeMaterial from "./FlakeMaterial";
import type { AttributeBindInfoDict } from "./Material";
import { cfa_assert } from "./util/assertion";


/**
 * 地表断片メッシュ
 * @internal
 */
class FlakeMesh {

    /**
     * @param glenv - WebGL 環境
     * @param flake - 地表断片
     * @param dpows - 地表断片の分割指数
     * @param dem   - DEM バイナリ
     */
    constructor( glenv: GLEnv,
                 flake: Globe.Flake,
                 dpows: [number, number],
                 dem:   DemBinary )
    {
        const gl = glenv.context;

        this._flake = flake;

        // オブジェクト座標系の中心位置 (GOCS)
        this._center = this._createCenter( flake );

        // 頂点データを生成
        const vdata = this._createVertices( gl, flake, dpows, dem );
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

                const is_skirt = iv === 0 || iv === v_step_count ||
                                 iu === 0 || iu === u_step_count;
                const is_underground_boundary_band =
                    iv <= 1 || iv >= v_step_count - 1 ||
                    iu <= 1 || iu >= u_step_count - 1;
                const ground_height = demSampler.sample( mx, my );
                var height = is_skirt ? ground_height - edge_depth : ground_height;

                var radius = GeoMath.EARTH_RADIUS + height;
                var surface_radius = GeoMath.EARTH_RADIUS + ground_height;

                // 法線 (GOCS)
                var nx = cosφ * cosλ;
                var ny = cosφ * sinλ;
                var nz = sinφ;

                var sinλ_surface = Math.sin( mx );
                var cosλ_surface = Math.cos( mx );
                var ey_surface   = Math.exp( my );
                var ey2_surface  = ey_surface * ey_surface;
                var sinφ_surface = (ey2_surface - 1) / (ey2_surface + 1);
                var cosφ_surface =   2 * ey_surface  / (ey2_surface + 1);

                // 地表面の法線 (GOCS)
                var surface_nx = cosφ_surface * cosλ_surface;
                var surface_ny = cosφ_surface * sinλ_surface;
                var surface_nz = sinφ_surface;

                // 位置 (GOCS)
                var gx = radius * nx;
                var gy = radius * ny;
                var gz = radius * nz;

                // 地下表示用の地表位置 (GOCS)
                var surface_gx = surface_radius * surface_nx;
                var surface_gy = surface_radius * surface_ny;
                var surface_gz = surface_radius * surface_nz;

                array[index++] = gx - center[0];  // x
                array[index++] = gy - center[1];  // y
                array[index++] = gz - center[2];  // z
                array[index++] = surface_gx - center[0];  // surface x
                array[index++] = surface_gy - center[1];  // surface y
                array[index++] = surface_gz - center[2];  // surface z
                array[index++] = iu < 1 ? 0.0:
                                 iu > u_step_count - 1 ? 1.0:
                                 ( iu - 1 ) * u_step; // mu
                array[index++] = iv < 1 ? 0.0:
                                 iv > v_step_count - 1 ? 1.0:
                                 ( iv - 1 ) * v_step; // mv
                array[index++] = ground_height;                 // height
                array[index++] = is_skirt ? 1.0 : 0.0;         // skirt flag
                array[index++] = is_underground_boundary_band ? 1.0 : 0.0;  // underground boundary band flag
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

            "a_surface_position": {
                buffer:         this._vertices,
                num_components: 3,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_SURFACE_P
            },

            "a_height": {
                buffer:         this._vertices,
                num_components: 1,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_HEIGHT
            },

            "a_skirt": {
                buffer:         this._vertices,
                num_components: 1,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_SKIRT
            },

            "a_underground_boundary_band": {
                buffer:         this._vertices,
                num_components: 1,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_UNDERGROUND_BOUNDARY_BAND
            },
        };
    }


    static getCache( globe: Globe, size: number, no_skirt: boolean = false )
    {
      const key = ( no_skirt ? "FLAKE_MESH_NOSKIRT_" : "FLAKE_MESH_" ) + size;
      // @ts-ignore
      return globe.cache[key] ?? (globe.cache[key] = {}) as { [key: string] : WebGLBuffer };
    }


    static disposeCache( globe: Globe, glenv: GLEnv ): void
    {
      const gl = glenv.context;
      for ( const no_skirt of [false, true] ) {
        for ( const size of [16, 32] ) {
          // @ts-ignore
          const cache = FlakeMesh.getCache( globe, size, no_skirt );
          for ( const key of Object.keys( cache ) ) {
            gl.deleteBuffer( cache[key] );
            delete cache[key];
          }
        }
      }
    }


    /**
     * 頂点情報が他のFlakeMeshと共有されているかを意味する。
     */
    private _indices_shared: boolean = false;

    /**
     * skirt なしインデックスが他の FlakeMesh と共有されているか。
     */
    private _indices_without_skirt_shared: boolean = false;

    /**
     * `GL_TRIANGLES` 用のインデックス配列を生成
     *
     * `_indices` と `_num_indices` を設定する。
     */
    private _createIndices( no_skirt: boolean = false ): void
    {
        const gl = this._gl;
        const border_x = no_skirt ? Math.min( FlakeMesh.UNDERGROUND_TRIM_QUADS, Math.floor( ( this._num_quads_x - 1 ) / 2 ) ) : 0;
        const border_y = no_skirt ? Math.min( FlakeMesh.UNDERGROUND_TRIM_QUADS, Math.floor( ( this._num_quads_y - 1 ) / 2 ) ) : 0;
        const min_x = border_x;
        const min_y = border_y;
        const max_x = this._num_quads_x - border_x;
        const max_y = this._num_quads_y - border_y;
        const num_quads = Math.max( 0, max_x - min_x ) * Math.max( 0, max_y - min_y );
        const num_indices = num_quads * 6;

        if ( no_skirt ) {
            this._num_indices_without_skirt = num_indices;
        }
        else {
            this._num_indices = num_indices;
        }

        const cache = FlakeMesh.getCache( this._flake.belt.globe, this._index_type === gl.UNSIGNED_INT ? 32 : 16, no_skirt );
        const cache_key = no_skirt ? `${this._num_quads_x}_noskirt` : `${this._num_quads_x}`;

        if ( this._num_quads_x === this._num_quads_y ) {
            const c = cache[cache_key];
            if ( c ) {
                if ( no_skirt ) {
                    this._indices_without_skirt = c;
                    this._indices_without_skirt_shared = true;
                }
                else {
                    this._indices = c;
                    this._indices_shared = true;
                }
                return;
            }
        }

        const array = (this._index_type === gl.UNSIGNED_INT) ? new Int32Array( num_indices ) : new Int16Array( num_indices );
        let index = 0;

        const addQuad = ( x: number, y: number, index: number ) => {
            const i00 = ( this._num_quads_x + 1 ) * y + x;  // 左下頂点
            const i10 = i00 + 1;                            // 右下頂点
            const i01 = i00 + this._num_quads_x + 1;        // 左上頂点
            const i11 = i01 + 1;                            // 右上頂点

            // 左下三角形
            array[index++] = i00;
            array[index++] = i10;
            array[index++] = i01;

            // 右上三角形
            array[index++] = i01;
            array[index++] = i10;
            array[index++] = i11;
            return index;
        };

        for ( let y = min_y; y < max_y; ++y ) {
            for ( let x = min_x; x < max_x; ++x ) {
                index = addQuad( x, y, index );
            }
        }

        const target = gl.ELEMENT_ARRAY_BUFFER;
        const    vbo = gl.createBuffer();

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        if ( no_skirt ) {
            this._indices_without_skirt = vbo;
            if ( vbo && ( this._num_quads_x === this._num_quads_y ) ) {
                cache[cache_key] = vbo;
                this._indices_without_skirt_shared = true;
            }
        }
        else {
            this._indices = vbo;
            if ( vbo && ( this._num_quads_x === this._num_quads_y ) ) {
                cache[cache_key] = vbo;
                this._indices_shared = true;
            }
        }
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
     * インデックス (GL_TRIANGLES, skirt なし)
     */
    get indices_without_skirt(): WebGLBuffer
    {
        if ( this._indices_without_skirt === null ) {
            this._createIndices( true );
            cfa_assert( this._indices_without_skirt !== null );
        }
        return this._indices_without_skirt;
    }


    /**
     * インデックス数 (`GL_TRIANGLES`, skirt なし)
     */
    get num_indices_without_skirt(): number
    {
        if ( this._indices_without_skirt === null ) {
            this._createIndices( true );
        }
        return this._num_indices_without_skirt;
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
            if ( !this._indices_shared ) {
                gl.deleteBuffer( this._indices );
            }
            this._indices = null;
        }

        if ( this._indices_without_skirt ) {
            if ( !this._indices_without_skirt_shared ) {
                gl.deleteBuffer( this._indices_without_skirt );
            }
            this._indices_without_skirt = null;
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
    draw( material: FlakeMaterial, options?: { no_skirt?: boolean } ): void
    {
        var     gl = this._gl;
        var isWire = material.isWireframe();
        var no_skirt = options?.no_skirt === true && !isWire;

        // 頂点属性のバインド
        material.bindVertexAttribs( this._vertex_attribs );

        // インデックスのバインド
        var indices = isWire ? this.wire_indices :
                      no_skirt ? this.indices_without_skirt :
                      this.indices;
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indices );

        // 描画処理
        var mode        = isWire ? gl.LINES              : gl.TRIANGLES;
        var num_indices = isWire ? this.num_wire_indices :
                          no_skirt ? this.num_indices_without_skirt :
                          this.num_indices;
        gl.drawElements( mode, num_indices, this._index_type, 0 );
    }


    /** 中心位置 (GOCS) */
    private readonly _center: Vector3;

    /** 地表断片 */
    private readonly _flake: Globe.Flake;

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

    // GL_TRIANGLES 用のインデックス配列 (skirt なし)
    private _indices_without_skirt: WebGLBuffer | null = null;
    private _num_indices_without_skirt: number = 0;

    // GL_LINES 用のインデックス配列
    private _wire_indices: WebGLBuffer | null;
    private _num_wire_indices: number;

    /** WebGL コンテキスト */
    private readonly _gl: WebGL2RenderingContext;


    /**
     * 1 頂点の float 数
     */
    private static readonly VERTEX_SIZE = 11;

    /**
     * 1 頂点のバイト数
     */
    private static readonly VERTEX_BYTES = 4 * FlakeMesh.VERTEX_SIZE;

    /**
     * 位置座標のオフセット
     */
    private static readonly OFFSET_P = 0;

    /**
     * 地下表示用の地表位置座標のオフセット
     */
    private static readonly OFFSET_SURFACE_P = 12;

    /**
     * UV 座標のオフセット
     */
    private static readonly OFFSET_UV = 24;

    /**
     * 高さ座標のオフセット
     */
    private static readonly OFFSET_HEIGHT = 32;

    /**
     * スカート頂点フラグのオフセット
     */
    private static readonly OFFSET_SKIRT = 36;

    /**
     * 地下表示時に落とす外周 2 リングフラグのオフセット
     */
    private static readonly OFFSET_UNDERGROUND_BOUNDARY_BAND = 40;

    /**
     * 地下表示時に切り落とす外周クアッド数。
     *
     * edge bending とタイル境界の複製帯をまとめて避けるため、skirt だけでなく
     * その内側も保守的に外す。
     */
    private static readonly UNDERGROUND_TRIM_QUADS = 1;

}


export default FlakeMesh;
