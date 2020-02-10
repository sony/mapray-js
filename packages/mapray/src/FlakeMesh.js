import GeoMath from "./GeoMath";
import AreaUtil from "./AreaUtil";


/**
 * @summary 地表断片メッシュ
 * @memberof mapray
 * @private
 */
class FlakeMesh {

    /**
     * @param {mapray.GLEnv}     glenv  WebGL 環境
     * @param {mapray.Area}      area   地表断片の領域
     * @param {number[]}         dpows  地表断片の分割指数
     * @param {mapray.DemBinary} dem    DEM バイナリ
     */
    constructor( glenv, area, dpows, dem )
    {
        var gl = glenv.context;

        // オブジェクト座標系の中心位置 (GOCS)
        this._center = this._createCenter( area );

        // 頂点バッファ
        this._vertices = null;

        // 頂点数
        this._num_vertices = 0;

        // 頂点属性辞書
        this._vertex_attribs = {};

        // XY グリッドサイズ
        this._num_quads_x = 0;
        this._num_quads_y = 0;

        // 頂点データを生成
        this._createVertices( gl, area, dpows, dem );

        // 頂点属性辞書を設定
        this._setupVertexAttribs( gl );

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
     * @summary 中心位置を生成
     *
     * @param {mapray.Area} area  地表断片の領域
     *
     * @return {mapray.Vector3}  中心位置 (GOCS)
     *
     * @private
     */
    _createCenter( area )
    {
        return AreaUtil.getCenter( area, GeoMath.createVector3() );
    }


    _createVertices( gl, area, dpows, dem )
    {
        var target = gl.ARRAY_BUFFER;
        var    vbo = gl.createBuffer();
        var   data = this._createVerticesData( area, dpows, dem );

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, data.array, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        this._vertices     = vbo;
        this._num_vertices = data.num_vertices;
        this._num_quads_x  = data.num_quads_x;
        this._num_quads_y  = data.num_quads_y;
    }


    _createVerticesData( area, dpows, dem )
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

        var    center  = this._center;
        var demSampler = dem.newSampler( area );

        var num_vertices = (u_count + 1) * (v_count + 1);
        var        array = new Float32Array( FlakeMesh.VERTEX_SIZE * num_vertices );
        var        index = 0;

        for ( var iv = 0, my = my_min; iv < v_count + 1; ++iv, my += my_step ) {
            var ey    = Math.exp( my );
            var ey2   = ey * ey;
            var sinφ = (ey2 - 1) / (ey2 + 1);
            var cosφ =   2 * ey  / (ey2 + 1);
            for ( var iu = 0, mx = mx_min; iu < u_count + 1; ++iu, mx += mx_step ) {
                var sinλ = Math.sin( mx );
                var cosλ = Math.cos( mx );

                var height = demSampler.sample( mx, my );
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
                array[index++] = nx;              // nx
                array[index++] = ny;              // ny
                array[index++] = nz;              // nz
                array[index++] = iu * u_step;     // mu
                array[index++] = iv * v_step;     // mv
            }
        }

        return {
            array:        array,
            num_vertices: num_vertices,
            num_quads_x:  u_count,
            num_quads_y:  v_count
        };
    }


    /**
     * @summary 頂点属性の辞書を設定
     * @desc
     * <p>this._vertex_attribs に Mesh.AttribData の辞書を設定する。</p>
     *
     * @param {WebGLRenderingContext} gl
     * @private
     */
    _setupVertexAttribs( gl )
    {
        var   type = gl.FLOAT;
        var stride = FlakeMesh.VERTEX_BYTES;

        // Mesh.AttribData の辞書
        this._vertex_attribs = {

            "a_position": {
                buffer:         this._vertices,
                num_components: 3,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_P
            },

            "a_normal": {
                buffer:         this._vertices,
                num_components: 3,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_N
            },

            "a_uv": {
                buffer:         this._vertices,
                num_components: 2,
                component_type: type,
                normalized:     false,
                byte_stride:    stride,
                byte_offset:    FlakeMesh.OFFSET_UV
            }

        };
    }


    _createIndices()
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


    _createWireIndices()
    {
        var gl = this._gl;

        var  typedArray = (this._index_type === gl.UNSIGNED_INT) ? Int32Array : Int16Array;
        var num_indices = 2 * (2 * this._num_quads_x * this._num_quads_y + this._num_quads_x + this._num_quads_y);

        var array = new typedArray( num_indices );
        var index = 0;

        // 水平線
        for ( var y = 0; y < this._num_quads_y + 1; ++y ) {
            for ( var x = 0; x < this._num_quads_x; ++x ) {
                var i00 = (this._num_quads_x + 1) * y + x;  // 左下頂点
                var i10 = i00 + 1;                          // 右下頂点
                // 下水平線
                array[index++] = i00;
                array[index++] = i10;
            }
        }

        // 垂直線
        for ( x = 0; x < this._num_quads_x + 1; ++x ) {
            for ( y = 0; y < this._num_quads_y; ++y ) {
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
     *  @summary 頂点数
     *  @type {number}
     *  @readonly
     */
    get num_vertices()
    {
        return this._num_vertices;
    }

    /**
     *  @summary インデックス (GL_TRIANGLES)
     *  @type {WebGLBuffer}
     *  @readonly
     */
    get indices()
    {
        if ( this._indices === null ) {
            this._createIndices();
        }
        return this._indices;
    }


    /**
     *  @summary インデックス数 (GL_TRIANGLES)
     *  @type {number}
     *  @readonly
     */
    get num_indices()
    {
        if ( this._indices === null ) {
            this._createIndices();
        }
        return this._num_indices;
    }


    /**
     *  @summary インデックス (GL_LINES)
     *  @type {WebGLBuffer}
     *  @readonly
     */
    get wire_indices()
    {
        if ( this._wire_indices === null ) {
            this._createWireIndices();
        }
        return this._wire_indices;
    }


    /**
     *  @summary インデックス数 (GL_LINES)
     *  @type {number}
     *  @readonly
     */
    get num_wire_indices()
    {
        if ( this._wire_indices === null ) {
            this._createWireIndices();
        }
        return this._num_wire_indices;
    }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        var gl = this._gl;

        this._vertex_attribs = {};

        gl.deleteBuffer( this._vertices );
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
     * @summary 変換行列を計算
     * @desc
     * mat に地表断片座標系から GOCS への変換行列を掛ける。
     * @param  {mapray.Matrix} mat  行列
     * @param  {mapray.Matrix} dst  結果
     * @return {mapray.Matrix}      dst
     */
    mul_flake_to_gocs( mat, dst )
    {
        var m00 = mat[ 0], m01 = mat[ 4], m02 = mat[ 8], m03 = mat[12],
            m10 = mat[ 1], m11 = mat[ 5], m12 = mat[ 9], m13 = mat[13],
            m20 = mat[ 2], m21 = mat[ 6], m22 = mat[10], m23 = mat[14],
            m30 = mat[ 3], m31 = mat[ 7], m32 = mat[11], m33 = mat[15];

        var t03 = this._center[0],
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
     * @summary メッシュを描画
     * @desc
     * <p>事前に material.bindProgram() すること。</p>
     * @param  {mapray.RenderStage.FlakeMaterial} material  マテリアル
     */
    draw( material )
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

}


// クラス定数の定義
{
    FlakeMesh.VERTEX_SIZE  = 8;  // 1頂点の float 数


    /**
     * @summary 1頂点のバイト数
     * @member mapray.FlakeMesh.VERTEX_BYTES
     * @type {number}
     * @static
     * @constant
     */
    FlakeMesh.VERTEX_BYTES = 4 * FlakeMesh.VERTEX_SIZE;


    /**
     * @summary 位置座標のオフセット
     * @member mapray.FlakeMesh.OFFSET_P
     * @type {number}
     * @static
     * @constant
     */
    FlakeMesh.OFFSET_P = 0;


    /**
     * @summary 法線座標のオフセット
     * @member mapray.FlakeMesh.OFFSET_N
     * @type {number}
     * @static
     * @constant
     */
    FlakeMesh.OFFSET_N = 12;


    /**
     * @summary UV 座標のオフセット
     * @member mapray.FlakeMesh.OFFSET_UV
     * @type {number}
     * @static
     * @constant
     */
    FlakeMesh.OFFSET_UV = 24;
}


export default FlakeMesh;
