/**
 * 数学ユーティリティー
 *
 * 数学関連の関数または定数を定義するユーティリティークラスである。
 * このクラスは static メンバーしか持たない。
 */
class GeoMath {

    /**
     * @ignore
     */
    constructor() {}

    /**
     * 行列オブジェクトを作成
     *
     * mat を複製する。ただし mat を省略したときは、すべての要素が 0 の行列を生成する。
     *
     * @param  mat  入力行列
     * @return      新しい行列
     */
    static createMatrix( mat?: Matrix ): Matrix
    {
        return mat ? new Float64Array( mat ) : new Float64Array( 16 );
    }


    /**
     * 行列 (単精度) オブジェクトを作成
     *
     * @param  mat  入力行列
     * @return      新しい行列
     * @hidden
     */
    static createMatrixf( mat?: Matrix ): Matrix
    {
        return mat ? new Float32Array( mat ) : new Float32Array( 16 );
    }


    /**
     * 4 次ベクトルの生成
     *
     * vec を複製して 4 次ベクトルを生成する。ただし vec を省略したときは、すべての要素が 0 のベクトルを生成する。
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     */
    static createVector4( vec?: Vector4 ): Vector4
    {
        return vec ? new Float64Array( vec ) : new Float64Array( 4 );
    }


    /**
     * 4 次ベクトル (単精度) の生成
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     * @hidden
     */
    static createVector4f( vec?: Vector4 ): Vector4
    {
        return vec ? new Float32Array( vec ) : new Float32Array( 4 );
    }


    /**
     * 3 次ベクトルの生成
     * vec を複製して 3 次ベクトルを生成する。ただし vec を省略したときは、すべての要素が 0 のベクトルを生成する。
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     */
    static createVector3( vec?: Vector3 ): Vector3
    {
        return vec ? new Float64Array( vec ) : new Float64Array( 3 );
    }


    /**
     * 3 次ベクトル (単精度) の生成
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     * @hidden
     */
    static createVector3f( vec?: Vector3 ): Vector3
    {
        return vec ? new Float32Array( vec ) : new Float32Array( 3 );
    }


    /**
     * 2 次ベクトルの生成
     * vec を複製して 2 次ベクトルを生成する。ただし vec を省略したときは、すべての要素が 0 のベクトルを生成する。
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     */
    static createVector2( vec?: Vector2 ): Vector2
    {
        return vec ? new Float64Array( vec ) : new Float64Array( 2 );
    }


    /**
     * 2 次ベクトル (単精度) の生成
     * @param  vec  入力ベクトル
     * @return      新しいベクトル
     * @hidden
     */
    static createVector2f( vec?: Vector2 ): Vector2
    {
        return vec ? new Float32Array( vec ) : new Float32Array( 2 );
    }


    /**
     * 行列を代入
     *
     * src を dst に代入する。
     * @param  src  代入元
     * @param  dst  代入先
     * @return      dst
     */
    static copyMatrix( src: Matrix, dst: Matrix ): Matrix
    {
        for ( var i = 0; i < 16; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * 4 次ベクトルを代入
     *
     * src を dst に代入する。
     * @param  src  代入元
     * @param  dst  代入先
     * @return      dst
     */
    static copyVector4( src: Vector4, dst: Vector4 ): Vector4
    {
        for ( var i = 0; i < 4; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * 3 次ベクトルを代入
     *
     * src を dst に代入する。
     * @param  src  代入元
     * @param  dst  代入先
     * @return      dst
     */
    static copyVector3( src: Vector3, dst: Vector3 ): Vector3
    {
        for ( var i = 0; i < 3; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * 2 次ベクトルを代入
     *
     * src を dst に代入する。
     * @param  src  代入元
     * @param  dst  代入先
     * @return      dst
     */
    static copyVector2( src: Vector2, dst: Vector2 ): Vector2
    {
        dst[0] = src[0];
        dst[1] = src[1];
        return dst;
    }


    /**
     * 恒等行列を設定
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    static setIdentity( dst: Matrix ): Matrix
    {
        dst[ 0] = 1;
        dst[ 1] = 0;
        dst[ 2] = 0;
        dst[ 3] = 0;
        dst[ 4] = 0;
        dst[ 5] = 1;
        dst[ 6] = 0;
        dst[ 7] = 0;
        dst[ 8] = 0;
        dst[ 9] = 0;
        dst[10] = 1;
        dst[11] = 0;
        dst[12] = 0;
        dst[13] = 0;
        dst[14] = 0;
        dst[15] = 1;
        return dst;
    }


    /**
     * 3 次ベクトルの内積を計算
     * @param  a  左のベクトル
     * @param  b  右のベクトル
     * @return    a と b の内積
     */
    static dot3( a: Vector3, b: Vector3 ): number
    {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }


    /**
     * 3次ベクトルの外積を計算
     * @param  a    左のベクトル
     * @param  b    右のベクトル
     * @param  dst  a と b の外積を代入するベクトル
     * @return      dst
     */
    static cross3( a: Vector3, b: Vector3, dst: Vector3 ): Vector3
    {
        var x = a[1]*b[2] - a[2]*b[1];
        var y = a[2]*b[0] - a[0]*b[2];
        var z = a[0]*b[1] - a[1]*b[0];
        dst[0] = x;
        dst[1] = y;
        dst[2] = z;
        return dst;
    }


    /**
     * 3次ベクトルの正規化を計算
     * @param   vec  ベクトル
     * @param   dst  正規化された値を代入するベクトル
     * @return       dst
     */
    static normalize3( vec: Vector3, dst: Vector3 ): Vector3
    {
        var x = vec[0];
        var y = vec[1];
        var z = vec[2];
        var ilen = 1 / Math.sqrt( x*x + y*y + z*z );  // 長さの逆数
        dst[0] = vec[0] * ilen;
        dst[1] = vec[1] * ilen;
        dst[2] = vec[2] * ilen;
        return dst;
    }


    /**
     * 3次ベクトルのスカラ倍を計算
     * @param   a    スカラ
     * @param   vec  ベクトル
     * @param   dst  計算結果を代入するベクトル
     * @return       dst
     */
    static scale3( a: number, vec: Vector3, dst: Vector3 ): Vector3
    {
        dst[0] = a * vec[0];
        dst[1] = a * vec[1];
        dst[2] = a * vec[2];
        return dst;
    }


    /**
     * 行列の積を計算 (アフィン変換 x アフィン変換)
     * @param  a    左の行列
     * @param  b    右の行列
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    static mul_AA( a: Matrix, b: Matrix, dst: Matrix ): Matrix
    {
        var a00 = a[ 0], a01 = a[ 4], a02 = a[ 8], a03 = a[12],
            a10 = a[ 1], a11 = a[ 5], a12 = a[ 9], a13 = a[13],
            a20 = a[ 2], a21 = a[ 6], a22 = a[10], a23 = a[14];
        
        var b00 = b[ 0], b01 = b[ 4], b02 = b[ 8], b03 = b[12],
            b10 = b[ 1], b11 = b[ 5], b12 = b[ 9], b13 = b[13],
            b20 = b[ 2], b21 = b[ 6], b22 = b[10], b23 = b[14];
        
        dst[ 0] = a00*b00 + a01*b10 + a02*b20;
        dst[ 1] = a10*b00 + a11*b10 + a12*b20;
        dst[ 2] = a20*b00 + a21*b10 + a22*b20;
        dst[ 3] = 0;

        dst[ 4] = a00*b01 + a01*b11 + a02*b21;
        dst[ 5] = a10*b01 + a11*b11 + a12*b21;
        dst[ 6] = a20*b01 + a21*b11 + a22*b21;
        dst[ 7] = 0;

        dst[ 8] = a00*b02 + a01*b12 + a02*b22;
        dst[ 9] = a10*b02 + a11*b12 + a12*b22;
        dst[10] = a20*b02 + a21*b12 + a22*b22;
        dst[11] = 0;

        dst[12] = a00*b03 + a01*b13 + a02*b23 + a03;
        dst[13] = a10*b03 + a11*b13 + a12*b23 + a13;
        dst[14] = a20*b03 + a21*b13 + a22*b23 + a23;
        dst[15] = 1;
        
        return dst;
    }


    /**
     * 行列の積を計算 (一般変換 x アフィン変換)
     * @param  a    左の行列
     * @param  b    右の行列
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    static mul_GA( a: Matrix, b: Matrix, dst: Matrix ): Matrix
    {
        var a00 = a[ 0], a01 = a[ 4], a02 = a[ 8], a03 = a[12],
            a10 = a[ 1], a11 = a[ 5], a12 = a[ 9], a13 = a[13],
            a20 = a[ 2], a21 = a[ 6], a22 = a[10], a23 = a[14],
            a30 = a[ 3], a31 = a[ 7], a32 = a[11], a33 = a[15];
        
        var b00 = b[ 0], b01 = b[ 4], b02 = b[ 8], b03 = b[12],
            b10 = b[ 1], b11 = b[ 5], b12 = b[ 9], b13 = b[13],
            b20 = b[ 2], b21 = b[ 6], b22 = b[10], b23 = b[14];
        
        dst[ 0] = a00*b00 + a01*b10 + a02*b20;
        dst[ 1] = a10*b00 + a11*b10 + a12*b20;
        dst[ 2] = a20*b00 + a21*b10 + a22*b20;
        dst[ 3] = a30*b00 + a31*b10 + a32*b20;

        dst[ 4] = a00*b01 + a01*b11 + a02*b21;
        dst[ 5] = a10*b01 + a11*b11 + a12*b21;
        dst[ 6] = a20*b01 + a21*b11 + a22*b21;
        dst[ 7] = a30*b01 + a31*b11 + a32*b21;

        dst[ 8] = a00*b02 + a01*b12 + a02*b22;
        dst[ 9] = a10*b02 + a11*b12 + a12*b22;
        dst[10] = a20*b02 + a21*b12 + a22*b22;
        dst[11] = a30*b02 + a31*b12 + a32*b22;

        dst[12] = a00*b03 + a01*b13 + a02*b23 + a03;
        dst[13] = a10*b03 + a11*b13 + a12*b23 + a13;
        dst[14] = a20*b03 + a21*b13 + a22*b23 + a23;
        dst[15] = a30*b03 + a31*b13 + a32*b23 + a33;
        
        return dst;
    }


    /**
     * 行列の積を計算 (投影変換 x アフィン変換)
     * @param  a    左の行列
     * @param  b    右の行列
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    static mul_PzA( a: Matrix, b: Matrix, dst: Matrix ): Matrix
    {
        var a00 = a[ 0],              a02 = a[ 8], a03 = a[12];
        var              a11 = a[ 5], a12 = a[ 9], a13 = a[13];
        var                           a22 = a[10], a23 = a[14];
        var                           a32 = a[11], a33 = a[15];
        
        var b00 = b[ 0], b01 = b[ 4], b02 = b[ 8], b03 = b[12],
            b10 = b[ 1], b11 = b[ 5], b12 = b[ 9], b13 = b[13],
            b20 = b[ 2], b21 = b[ 6], b22 = b[10], b23 = b[14];
        
        dst[ 0] = a00*b00 + a02*b20;
        dst[ 1] = a11*b10 + a12*b20;
        dst[ 2] = a22*b20;
        dst[ 3] = a32*b20;

        dst[ 4] = a00*b01 + a02*b21;
        dst[ 5] = a11*b11 + a12*b21;
        dst[ 6] = a22*b21;
        dst[ 7] = a32*b21;

        dst[ 8] = a00*b02 + a02*b22;
        dst[ 9] = a11*b12 + a12*b22;
        dst[10] = a22*b22;
        dst[11] = a32*b22;

        dst[12] = a00*b03 + a02*b23 + a03;
        dst[13] = a11*b13 + a12*b23 + a13;
        dst[14] = a22*b23 + a23;
        dst[15] = a32*b23 + a33;
        
        return dst;
    }


    /**
     * 逆行列を計算 (アフィン変換)
     * @param  mat  行列
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    static inverse_A( mat: Matrix, dst: Matrix ): Matrix
    {
        var a00 = mat[ 0], a01 = mat[ 4], a02 = mat[ 8], a03 = mat[12],
            a10 = mat[ 1], a11 = mat[ 5], a12 = mat[ 9], a13 = mat[13],
            a20 = mat[ 2], a21 = mat[ 6], a22 = mat[10], a23 = mat[14];

        // cofactors
        var b00 = a11*a22 - a21*a12;
        var b01 = a20*a12 - a10*a22;
        var b02 = a10*a21 - a20*a11;

        var b10 = a21*a02 - a01*a22;
        var b11 = a00*a22 - a20*a02;
        var b12 = a20*a01 - a00*a21;

        var b20 = a01*a12 - a11*a02;
        var b21 = a10*a02 - a00*a12;
        var b22 = a00*a11 - a10*a01;
        
        var b30 = -(a03*b00 + a13*b10 + a23*b20);
        var b31 = -(a03*b01 + a13*b11 + a23*b21);
        var b32 = -(a03*b02 + a13*b12 + a23*b22);

        // 1/det(mat)
        var idet = 1 / (a00*b00 + a01*b01 + a02*b02);
        
        // matの余因子行列 / det(mat)
        dst[ 0] = b00 * idet;
        dst[ 1] = b01 * idet;
        dst[ 2] = b02 * idet;
        dst[ 3] = 0;

        dst[ 4] = b10 * idet;
        dst[ 5] = b11 * idet;
        dst[ 6] = b12 * idet;
        dst[ 7] = 0;

        dst[ 8] = b20 * idet;
        dst[ 9] = b21 * idet;
        dst[10] = b22 * idet;
        dst[11] = 0;

        dst[12] = b30 * idet;
        dst[13] = b31 * idet;
        dst[14] = b32 * idet;
        dst[15] = 1;
        
        return dst;
    }


    /**
     * 平面ベクトルを変換 (アフィン変換)
     * mat には平面ベクトルを変換する行列を指定する。
     * 位置ベクトルを変換する行列が M なら、平面ベクトルを変換する行列は M<sup>-1</sup> を指定する。
     *
     * dst には plane * mat が代入される。
     *
     * @param  mat   変換行列
     * @param  plane 平面ベクトル
     * @param  dst   結果を代入するベクトル
     * @return       dst
     */
    static transformPlane_A( mat: Matrix, plane: Vector4, dst: Vector4 ): Vector4
    {
        var m = mat;
        var x = plane[0];
        var y = plane[1];
        var z = plane[2];
        var w = plane[3];

        dst[0] = x*m[ 0] + y*m[ 1] + z*m[ 2];
        dst[1] = x*m[ 4] + y*m[ 5] + z*m[ 6];
        dst[2] = x*m[ 8] + y*m[ 9] + z*m[10];
        dst[3] = x*m[12] + y*m[13] + z*m[14] + w;

        return dst;
    }


    /**
     * 座標変換行列を計算 (Inou 球面座標系 → 地心直交座標系)
     *
     * 原点が position の直交座標系 (LOCS) から地心直交座標系 (GOCS) に変換する行列を計算する。
     * position.height + GeoMath.EARTH_RADIUS > 0 かつ position.latitude == 0 のとき、LOCS の Z 軸は上方向、Y 軸は北方向、X 軸は東方向となる。
     *
     * @param  position  位置 (Inou 球面座標系)
     * @param  dst       結果を代入する行列
     * @return           dst
     *
     * @deprecated {@link mapray.GeoPoint.getMlocsToGocsMatrix} の使用を推奨
     */
    static iscs_to_gocs_matrix( position:GeoPointData, dst: Matrix ): Matrix
    {
        var    λ = position.longitude * GeoMath.DEGREE;
        var    φ = position.latitude  * GeoMath.DEGREE;
        var sinλ = Math.sin( λ );
        var cosλ = Math.cos( λ );
        var sinφ = Math.sin( φ );
        var cosφ = Math.cos( φ );
        var     r = GeoMath.EARTH_RADIUS + position.height;

        // ∂u/∂λ
        dst[ 0] = -sinλ;
        dst[ 1] = cosλ;
        dst[ 2] = 0;
        dst[ 3] = 0;

        // ∂u/∂φ
        dst[ 4] = -cosλ * sinφ;
        dst[ 5] = -sinλ * sinφ;
        dst[ 6] = cosφ;
        dst[ 7] = 0;

        // u = {x, y, z} / r
        dst[ 8] = cosφ * cosλ;
        dst[ 9] = cosφ * sinλ;
        dst[10] = sinφ;
        dst[11] = 0;

        // {x, y, z}
        dst[12] = r * cosφ * cosλ;
        dst[13] = r * cosφ * sinλ;
        dst[14] = r * sinφ;
        dst[15] = 1;

        return dst;
    }


    /**
     * 地心直交座標を Inou 球面座標に変換
     *
     * @param  src   入力 GOCS 座標 (Meters)
     * @param  dst   出力 ISCS 座標
     * @return       dst
     *
     * @deprecated {@link mapray.GeoPoint.setFromGocs} の使用を推奨
     */
    static gocs_to_iscs( src: Vector3, dst:GeoPointData ):GeoPointData
    {
        var x = src[0];
        var y = src[1];
        var z = src[2];

        var x2 = x * x;
        var y2 = y * y;
        var z2 = z * z;

        // 緯度 φ = ArcTan[z / √(x^2 + y^2)]
        // 経度 λ = ArcTan[x, y]
        if ( x != 0 || y != 0 ) {
            dst.latitude  = Math.atan( z / Math.sqrt( x2 + y2 ) ) / GeoMath.DEGREE;
            dst.longitude = Math.atan2( y, x ) / GeoMath.DEGREE;
        }
        else { // x == 0 && y == 0
            if ( z > 0 )
                dst.latitude = 90;
            else if ( z < 0 )
                dst.latitude = -90;
            else
                dst.latitude = 0;

            dst.longitude = 0;
        }

        // 高度 h = √(x^2 + y^2 + z^2) - R
        dst.height = Math.sqrt( x2 + y2 + z2 ) - GeoMath.EARTH_RADIUS;

        return dst;
    }


    /**
     * 座標変換行列を計算 (視点座標系 → クリップ同次座標系)
     * @param  left
     * @param  right
     * @param  bottom
     * @param  top
     * @param  nearVal
     * @param  farVal
     * @param  dst     結果を代入する行列
     * @return         dst
     *
     * @see https://www.opengl.org/sdk/docs/man2/xhtml/glFrustum.xml
     */
    static frustum_matrix( left: number, right: number, bottom: number, top: number, nearVal: number, farVal: number, dst: Matrix ): Matrix
    {
        dst[ 0] = 2 * nearVal / (right - left);
        dst[ 1] = 0;
        dst[ 2] = 0;
        dst[ 3] = 0;

        dst[ 4] = 0;
        dst[ 5] = 2 * nearVal / (top - bottom);
        dst[ 6] = 0;
        dst[ 7] = 0;

        dst[ 8] = (right + left) / (right - left);
        dst[ 9] = (top + bottom) / (top - bottom);
        dst[10] = (farVal + nearVal) / (nearVal - farVal);
        dst[11] = -1;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = 2 * farVal * nearVal / (nearVal - farVal);
        dst[15] = 0;

        return dst;
    }


    /**
     * 座標変換行列を計算 (右手座標系 → 視点座標系)
     *
     * @param  eye     視点の位置
     * @param  center  注視点の位置
     * @param  up      上方向ベクトル
     * @param  dst     結果を代入する行列
     * @return         dst
     */
    static lookat_matrix( eye: Vector3, center: Vector3, up: Vector3, dst: Matrix ): Matrix
    {
        var xaxis = GeoMath._xaxis;
        var yaxis = GeoMath._yaxis;
        var zaxis = GeoMath._zaxis;

        zaxis[0] = eye[0] - center[0];
        zaxis[1] = eye[1] - center[1];
        zaxis[2] = eye[2] - center[2];
        GeoMath.normalize3( zaxis, zaxis );

        GeoMath.cross3( up, zaxis, xaxis );
        GeoMath.normalize3( xaxis, xaxis );

        GeoMath.cross3( zaxis, xaxis, yaxis );  // 単位ベクトルになっている

        dst[ 0] = xaxis[0];
        dst[ 1] = xaxis[1];
        dst[ 2] = xaxis[2];
        dst[ 3] = 0;

        dst[ 4] = yaxis[0];
        dst[ 5] = yaxis[1];
        dst[ 6] = yaxis[2];
        dst[ 7] = 0;

        dst[ 8] = zaxis[0];
        dst[ 9] = zaxis[1];
        dst[10] = zaxis[2];
        dst[11] = 0;

        dst[12] = eye[0];
        dst[13] = eye[1];
        dst[14] = eye[2];
        dst[15] = 1;

        return dst;
    }


    /**
     * 任意軸回りの回転行列
     *
     * axis を Z 軸方向とすると、X 軸から Y 軸の方向に angle 度回転させる変換行列を返す。
     * @param  axis   回転軸 (単位ベクトル)
     * @param  angle  回転角 (Degrees)
     * @param  dst    結果を代入する行列
     * @return        dst
     */
    static rotation_matrix( axis: Vector3, angle: number, dst: Matrix ): Matrix
    {
        var    θ = angle * GeoMath.DEGREE;
        var sinθ = Math.sin( θ );
        var cosθ = Math.cos( θ );

        var ax = axis[0];
        var ay = axis[1];
        var az = axis[2];

        dst[ 0] = ax * ax * (1 - cosθ) + cosθ;
        dst[ 1] = ax * ay * (1 - cosθ) + az * sinθ;
        dst[ 2] = ax * az * (1 - cosθ) - ay * sinθ;
        dst[ 3] = 0;

        dst[ 4] = ax * ay * (1 - cosθ) - az * sinθ;
        dst[ 5] = ay * ay * (1 - cosθ) + cosθ;
        dst[ 6] = ay * az * (1 - cosθ) + ax * sinθ;
        dst[ 7] = 0;

        dst[ 8] = ax * az * (1 - cosθ) + ay * sinθ;
        dst[ 9] = ay * az * (1 - cosθ) - ax * sinθ;
        dst[10] = az * az * (1 - cosθ) + cosθ;
        dst[11] = 0;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = 0;
        dst[15] = 1;

        return dst;
    }


    /**
     * KML 互換のモデル変換行列
     *
     * 変換は scale -> roll -> tilt -> heading の順に行われる。
     *
     * @param  heading  Z 軸を中心に Y 軸から X 軸の方向の回転角 (Degrees)
     * @param  tilt     X 軸を中心に Z 軸から Y 軸の方向の回転角 (Degrees)
     * @param  roll     Y 軸を中心に X 軸から Z 軸の方向の回転角 (Degrees)
     * @param  scale    スケール
     * @param  dst      結果を代入する行列
     * @return          dst
     *
     * @package
     * @see https://developers.google.com/kml/documentation/kmlreference#model
     *
     * @deprecated [[mapray.Orientation.getTransformMatrix]] の使用を推奨
     */
    static kml_model_matrix( heading: number, tilt: number, roll: number, scale: Vector3, dst: Matrix ): Matrix
    {
        var h = heading * GeoMath.DEGREE;
        var t =    tilt * GeoMath.DEGREE;
        var r =    roll * GeoMath.DEGREE;

        var sinH = Math.sin( h );
        var cosH = Math.cos( h );
        var sinT = Math.sin( t );
        var cosT = Math.cos( t );
        var sinR = Math.sin( r );
        var cosR = Math.cos( r );

        var sx = scale[0];
        var sy = scale[1];
        var sz = scale[2];

        dst[ 0] = sx * (sinH*sinR*sinT + cosH*cosR);
        dst[ 1] = sx * (cosH*sinR*sinT - sinH*cosR);
        dst[ 2] = sx * sinR * cosT;
        dst[ 3] = 0;

        dst[ 4] = sy * sinH * cosT;
        dst[ 5] = sy * cosH * cosT;
        dst[ 6] = -sy * sinT;
        dst[ 7] = 0;

        dst[ 8] = sz * (sinH*cosR*sinT - cosH*sinR);
        dst[ 9] = sz * (cosH*cosR*sinT + sinH*sinR);
        dst[10] = sz * cosR * cosT;
        dst[11] = 0;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = 0;
        dst[15] = 1;

        return dst;
    }


    /**
     * グーデルマン関数
     * @param  x   数値
     * @return     gd( x )
     */
    static gudermannian( x: number ): number
    {
        return 2 * Math.atan( Math.exp( x ) ) - Math.PI / 2;
    }


    /** 
     * 逆グーデルマン関数
     * @param  x   数値
     * @return     gd<sup>-1</sup>( x )
     */
    static invGudermannian( x: number ): number
    {
        return Math.log( Math.tan( x / 2 + Math.PI / 4 ) );
    }


    /**
     * 値を指定区間内に制限
     * @param  x    値
     * @param  min  最小値
     * @param  max  最大値
     * @return      min <= x <= max のとき x, x < min のとき min, x > max のとき max
     */
    static clamp( x: number, min: number, max: number ): number
    {
        return Math.min( Math.max( x, min ), max );
    }


    /**
     * 地球の半径
     *
     * Inou 球面座標系で定義された、地球の半径 (Meters) である。
     */
    static readonly EARTH_RADIUS: number = 6378137;


    /**
     * 1度に対応するラジアンの数値
     *
     * この数値は `π / 180` である。
     * 度数を DEGREE で掛け合せることによってラジアンに変換することができる。
     */
     static readonly DEGREE: number = 0.017453292519943295769;


     /**
      * log2(π)
      */
     static readonly LOG2PI: number = 1.6514961294723187980;


     // GeoMath の内部テンポラリ変数を生成
     private static _xaxis: Vector3 = GeoMath.createVector3();


     // GeoMath の内部テンポラリ変数を生成
     private static _yaxis: Vector3 = GeoMath.createVector3();


     // GeoMath の内部テンポラリ変数を生成
     private static _zaxis: Vector3 = GeoMath.createVector3();

}



/**
 * 地理的位置を表現するJSON形式。
 */
type GeoPointData = {
    longitude: number;
    latitude: number;
    height: number;
};


/**
 * 4行4列の行列を表現
 *
 * このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 16 要素の配列に置き換えることができる。
 * この配列の数値の並びは列優先である。
 */
type Matrix = Float64Array | Float32Array | [
    m00: number, m01: number, m02: number, m03: number,
    m10: number, m11: number, m12: number, m13: number,
    m20: number, m21: number, m22: number, m23: number,
    m30: number, m31: number, m32: number, m33: number,
];


/**
 * 2次ベクトルを表現
 *
 * このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 2 要素の配列に置き換えることができる。
 */
type Vector2 = Float64Array | Float32Array | [ x: number, y: number ];


/**
 * 3次ベクトルを表現
 *
 * このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 3 要素の配列に置き換えることができる。
 */
type Vector3 = Float64Array | Float32Array | [ x: number, y: number, z: number ];


/**
 * 4次ベクトルを表現
 *
 * このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 4 要素の配列に置き換えることができる。
 */
type Vector4 = Float64Array | Float32Array | [ x: number, y: number, z: number, w: number ];



/**
 * 経度、緯度、高度により位置を表現する。
 */
class GeoPoint {

    /**
     *  経度 (Degrees)
     */
    longitude: number;

    /**
     *  緯度 (Degrees)
     */
    latitude: number;

    /**
     *  高度 (Meters)
     */
    altitude: number;

    /**
     * 経度、緯度、高度を与えてインスタンスを生成する。
     *
     * @param longitude 経度 (Degrees)
     * @param latitude  緯度 (Degrees)
     * @param altitude  高度 (Meters)
     */
    constructor( longitude: number = 0, latitude: number = 0, altitude: number = 0 )
    {
        this.longitude = longitude;
        this.latitude = latitude;
        this.altitude = altitude;
    }


    /**
     * インスタンスを複製
     *
     * this の複製を生成して返す。
     *
     * @return this の複製
     */
    clone(): GeoPoint
    {
        return new GeoPoint( this.longitude, this.latitude, this.altitude );
    }


    /**
     * インスタンスを代入
     *
     * src を this に代入する。
     *
     * @param  src  代入元
     * @return      this
     */
    assign( src: GeoPoint ): GeoPoint
    {
        this.longitude = src.longitude;
        this.latitude  = src.latitude;
        this.altitude  = src.altitude;

        return this;
    }


    /**
     * 配列からの設定
     *
     * longitude, latitude, altitude の順序で格納されている配列 position によりプロパティを設定する。
     * position の長さは 2 または 3 で、長さが 2 なら altitude は 0 に設定される。
     *
     * @param  position `[longitude, latitude, altitude]` または `[longitude, latitude]`
     * @return          this
     */
    setFromArray( position: Vector2 | Vector3 ): GeoPoint
    {
        this.longitude = position[0];
        this.latitude  = position[1];
        this.altitude  = (position.length > 2) ? (position as Vector3)[2] : 0;

        return this;
    }


    /**
     * 地心直交座標からの設定
     *
     * 地心直交座標 position を球面座標に変換して this に設定する。
     *
     * @param  position 入力 GOCS 座標 (Meters)
     * @return          this
     */
    setFromGocs( position: Vector3 ): GeoPoint
    {
        var x = position[0];
        var y = position[1];
        var z = position[2];

        var x2 = x * x;
        var y2 = y * y;
        var z2 = z * z;

        // 緯度 φ = ArcTan[z / √(x^2 + y^2)]
        // 経度 λ = ArcTan[x, y]
        if ( x != 0 || y != 0 ) {
            this.latitude  = Math.atan( z / Math.sqrt( x2 + y2 ) ) / GeoMath.DEGREE;
            this.longitude = Math.atan2( y, x ) / GeoMath.DEGREE;
        }
        else { // x == 0 && y == 0
            if ( z > 0 )
                this.latitude = 90;
            else if ( z < 0 )
                this.latitude = -90;
            else
                this.latitude = 0;

            this.longitude = 0;
        }

        // 高度 h = √(x^2 + y^2 + z^2) - R
        this.altitude = Math.sqrt( x2 + y2 + z2 ) - GeoMath.EARTH_RADIUS;

        return this;
    }


    /**
     * 地心直交座標として取得
     *
     * @param  dst 結果を格納するオブジェクト
     * @return     dst
     */
    getAsGocs( dst: Vector3 ): Vector3
    {
        var λ = this.longitude * GeoMath.DEGREE;
        var φ = this.latitude  * GeoMath.DEGREE;
        var r = GeoMath.EARTH_RADIUS + this.altitude;
        var cosφ = Math.cos( φ );

        dst[0] = r * cosφ * Math.cos( λ );
        dst[1] = r * cosφ * Math.sin( λ );
        dst[2] = r * Math.sin( φ );

        return dst;
    }


    /**
     * 座標変換行列を計算 (MLOCS → GOCS)
     * 
     * 原点が this の Mapray ローカル直交座標系 (MLOCS) から地心直交座標系 (GOCS) に変換する行列を計算する。
     *
     * @param  dst  結果を代入する行列
     * @return      dst
     */
    getMlocsToGocsMatrix( dst: Matrix ): Matrix
    {
        var    λ = this.longitude * GeoMath.DEGREE;
        var    φ = this.latitude  * GeoMath.DEGREE;
        var sinλ = Math.sin( λ );
        var cosλ = Math.cos( λ );
        var sinφ = Math.sin( φ );
        var cosφ = Math.cos( φ );
        var     r = GeoMath.EARTH_RADIUS + this.altitude;

        // ∂u/∂λ
        dst[ 0] = -sinλ;
        dst[ 1] = cosλ;
        dst[ 2] = 0;
        dst[ 3] = 0;

        // ∂u/∂φ
        dst[ 4] = -cosλ * sinφ;
        dst[ 5] = -sinλ * sinφ;
        dst[ 6] = cosφ;
        dst[ 7] = 0;

        // u = {x, y, z} / r
        dst[ 8] = cosφ * cosλ;
        dst[ 9] = cosφ * sinλ;
        dst[10] = sinφ;
        dst[11] = 0;

        // {x, y, z}
        dst[12] = r * cosφ * cosλ;
        dst[13] = r * cosφ * sinλ;
        dst[14] = r * sinφ;
        dst[15] = 1;

        return dst;
    }


    /**
     * 鉛直上方向のベクトルを計算
     *
     * @param  dst  結果を代入するオブジェクト
     * @return      dst
     */
    getUpwardVector( dst: Vector3 ): Vector3
    {
      var λ = this.longitude * GeoMath.DEGREE;
      var φ = this.latitude  * GeoMath.DEGREE;
      var cosφ = Math.cos( φ );

      dst[0] = cosφ * Math.cos( λ );
      dst[1] = cosφ * Math.sin( λ );
      dst[2] = Math.sin( φ );
      return dst;
    }


    /**
     * 地表面(高度0)での2地点間の距離を算出
     * 
     * GeoMath.DEGREE を半径とする真球として計算する。
     * @param  to
     * @return arc 距離(m)
     */
    getGeographicalDistance( to: GeoPoint ): number
    {
        var from_vec = this.getAsGocs( GeoMath.createVector3() );
        var   to_vec = to.getAsGocs( GeoMath.createVector3() );
        var cross = GeoMath.cross3( from_vec, to_vec, GeoMath.createVector3() );
        return GeoMath.EARTH_RADIUS * Math.atan2(
            Math.sqrt( cross[0]*cross[0] + cross[1]*cross[1] + cross[2]*cross[2] ),
            GeoMath.dot3( from_vec, to_vec )
        );
    }


    /**
     * 球面座標を地心直交座標に変換
     *
     * @param  points      `[lon_0, lat_0, alt_0, ...]`
     * @param  num_points  点の数
     * @param  dst         `[x0, y0, z0, ...]` (結果を格納する配列)
     * @return dst
     *
     * @see {@link mapray.GeoPoint.getAsGocs}
     */
    static toGocsArray<T extends Float64Array | Float32Array | number[]>( points: Float64Array | Float32Array | number[], num_points: number, dst: T ): T
    {
        var degree = GeoMath.DEGREE;
        var radius = GeoMath.EARTH_RADIUS;

        for ( var i = 0; i < num_points; ++i ) {
            var b = 3*i;

            var λ = points[b]     * degree;
            var φ = points[b + 1] * degree;
            var r = radius + points[b + 2];
            var cosφ = Math.cos( φ );

            dst[b]     = r * cosφ * Math.cos( λ );
            dst[b + 1] = r * cosφ * Math.sin( λ );
            dst[b + 2] = r * Math.sin( φ );
        }

        return dst;
    }

}


/**
 * 方向表現。
 * heading (機首方位)、tilt (前後の傾き)、roll (左右の傾き) により方向を表現する。
 *
 * [KML仕様](https://developers.google.com/kml/documentation/kmlreference#model)
 */
class Orientation {

    /**
     *  機首方位 (Degrees)
     *  @type {number}
     */
    heading: number;

    /**
     *  前後の傾き (Degrees)
     *  @type {number}
     */
    tilt: number;

    /**
     *  左右の傾き (Degrees)
     *  @type {number}
     */
    roll: number;

    /**
     * heading, tilt, roll に角度を与えてインスタンスを生成する。
     *
     * @param heading 機首方位 (Degrees)
     * @param tilt    前後の傾き (Degrees)
     * @param roll    左右の傾き (Degrees)
     */
    constructor( heading: number = 0, tilt: number = 0, roll: number = 0 )
    {
        this.heading = heading;
        this.tilt = tilt;
        this.roll = roll;
    }


    /**
     * インスタンスを複製
     *
     * this の複製を生成して返す。
     *
     * @return this の複製
     */
    clone(): Orientation
    {
        return new Orientation( this.heading, this.tilt, this.roll );
    }


    /**
     * インスタンスを代入
     *
     * src を this に代入する。
     *
     * @param  src  代入元
     * @return      this
     */
    assign( src: Orientation ): Orientation
    {
        this.heading = src.heading;
        this.tilt    = src.tilt;
        this.roll    = src.roll;

        return this;
    }


    /**
     * 変換行列を取得
     *
     * 変換は scale -> roll -> tilt -> heading の順に行われる。
     *
     * @param  scale  スケール
     * @param  dst    結果を代入する行列
     * @return dst
     */
    getTransformMatrix( scale: Vector3, dst: Matrix ): Matrix
    {
        var h = this.heading * GeoMath.DEGREE;
        var t = this.tilt    * GeoMath.DEGREE;
        var r = this.roll    * GeoMath.DEGREE;

        var sinH = Math.sin( h );
        var cosH = Math.cos( h );
        var sinT = Math.sin( t );
        var cosT = Math.cos( t );
        var sinR = Math.sin( r );
        var cosR = Math.cos( r );

        var sx = scale[0];
        var sy = scale[1];
        var sz = scale[2];

        dst[ 0] = sx * (sinH*sinR*sinT + cosH*cosR);
        dst[ 1] = sx * (cosH*sinR*sinT - sinH*cosR);
        dst[ 2] = sx * sinR * cosT;
        dst[ 3] = 0;

        dst[ 4] = sy * sinH * cosT;
        dst[ 5] = sy * cosH * cosT;
        dst[ 6] = -sy * sinT;
        dst[ 7] = 0;

        dst[ 8] = sz * (sinH*cosR*sinT - cosH*sinR);
        dst[ 9] = sz * (cosH*cosR*sinT + sinH*sinR);
        dst[10] = sz * cosR * cosT;
        dst[11] = 0;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = 0;
        dst[15] = 1;

        return dst;
    }

}


export default GeoMath;
export { Vector2, Vector3, Vector4, Matrix, GeoPointData };
export { GeoPoint, Orientation, };  // 下を参照


/*
 * 解説: このファイルで GeoPoint クラスと Orientation クラスを定義している理由
 *
 *   GeoPoint と Orientation のインタフェースは GeoMath に依存しないが、GeoMath
 *   のインタフェースは GeoPoint や Orientation に依存する可能性がある。
 *
 *   一方、GeoPoint と Orientation の内部実装では一部の GeoMath インタフェースを
 *   使用できたほうが都合がよい。
 *
 *   GeoPoint と Orientation を個別のファイルで定義したいが、この場合実装のために
 *   GeoMath をインポートすることになる。
 *
 *   そうすると、GeoMath.js に GeoPoint や Orientation が (循環依存のため)
 *   インポートできなくなってしまう。
 *
 *   そこで GeoMath.js 内で GeoPoint と Orientation を定義する。これで GeoPoint
 *   と Orientation の実装で GeoMath を使用でき、GeoMath のインタフェースと実装で
 *   GeoPoint や Orientation を使用できる。
 *
 *   GeoPoint はまず GeoMath.js から GeoPoint.js にエクスポートし、さらに
 *   GeoPoint.js から GeoPoint を他のファイルにエクスポートする。
 *   Orientation も同様のことを行う。
 *
 *   このようにすることで、他のファイルからは実装の事情は見えなくなる。
 */
