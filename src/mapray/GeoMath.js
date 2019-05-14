/**
 * @summary 数学ユーティリティー
 *
 * @classdesc
 * <p>数学関連の関数または定数を定義するユーティリティークラスである。</p>
 * <p>このクラスは static メンバーしか持たない。</p>
 *
 * @hideconstructor
 * @memberof mapray
 * @see mapray.Matrix
 */
class GeoMath {

    /**
     * @summary 行列オブジェクトを作成
     * @desc
     * <p>mat を複製する。ただし mat を省略したときは、すべての要素が 0 の行列を生成する。</p>
     *
     * @param  {mapray.Matrix} [mat]  入力行列
     * @return {mapray.Matrix}        新しい行列
     */
    static createMatrix( mat )
    {
        return new Float64Array( mat || 16 );
    }


    /**
     * @summary 行列 (単精度) オブジェクトを作成
     * @param  {mapray.Matrix} [mat]  入力行列
     * @return {mapray.Matrix}        新しい行列
     * @package
     */
    static createMatrixf( mat )
    {
        return new Float32Array( mat || 16 );
    }


    /**
     * @summary 4 次ベクトルの生成
     * @desc
     * <p>vec を複製して 4 次ベクトルを生成する。ただし vec を省略したときは、すべての要素が 0 のベクトルを生成する。</p>
     * @param  {mapray.Vector4} [vec]  入力ベクトル
     * @return {mapray.Vector4}        新しいベクトル
     */
    static createVector4( vec )
    {
        return new Float64Array( vec || 4 );
    }


    /**
     * @summary 4 次ベクトル (単精度) の生成
     * @param  {mapray.Vector4} [vec]  入力ベクトル
     * @return {mapray.Vector4}        新しいベクトル
     * @package
     */
    static createVector4f( vec )
    {
        return new Float32Array( vec || 4 );
    }


    /**
     * @summary 3 次ベクトルの生成
     * <p>vec を複製して 3 次ベクトルを生成する。ただし vec を省略したときは、すべての要素が 0 のベクトルを生成する。</p>
     * @param  {mapray.Vector3} [vec]  入力ベクトル
     * @return {mapray.Vector3}        新しいベクトル
     */
    static createVector3( vec )
    {
        return new Float64Array( vec || 3 );
    }


    /**
     * @summary 3 次ベクトル (単精度) の生成
     * @param  {mapray.Vector3} [vec]  入力ベクトル
     * @return {mapray.Vector3}        新しいベクトル
     * @package
     */
    static createVector3f( vec )
    {
        return new Float32Array( vec || 3 );
    }


    /**
     * @summary 2 次ベクトル (単精度) の生成
     * @param  {mapray.Vector2} [vec]  入力ベクトル
     * @return {mapray.Vector2}        新しいベクトル
     * @package
     */
    static createVector2f( vec )
    {
        return new Float32Array( vec || 2 );
    }


    /**
     * @summary 行列を代入
     * @desc
     * <p>src を dst に代入する。</p>
     * @param  {mapray.Matrix} src  代入元
     * @param  {mapray.Matrix} dst  代入先
     * @return {mapray.Matrix}      dst
     */
    static copyMatrix( src, dst )
    {
        for ( var i = 0; i < 16; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * @summary 4 次ベクトルを代入
     * @desc
     * <p>src を dst に代入する。</p>
     * @param  {mapray.Vector4} src  代入元
     * @param  {mapray.Vector4} dst  代入先
     * @return {mapray.Vector4}      dst
     */
    static copyVector4( src, dst )
    {
        for ( var i = 0; i < 4; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * @summary 3 次ベクトルを代入
     * @desc
     * <p>src を dst に代入する。</p>
     * @param  {mapray.Vector3} src  代入元
     * @param  {mapray.Vector3} dst  代入先
     * @return {mapray.Vector3}      dst
     */
    static copyVector3( src, dst )
    {
        for ( var i = 0; i < 3; ++i ) {
            dst[i] = src[i];
        }
        return dst;
    }


    /**
     * @summary 恒等行列を設定
     * @param  {mapray.Matrix} dst  結果を代入する行列
     * @return {mapray.Matrix}      dst
     */
    static setIdentity( dst )
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
     * @summary 3 次ベクトルの内積を計算
     * @param  {mapray.Vector3} a  左のベクトル
     * @param  {mapray.Vector3} b  右のベクトル
     * @return {number}            a と b の内積
     */
    static dot3( a, b )
    {
        return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    }


    /**
     * @summary 3次ベクトルの外積を計算
     * @param  {mapray.Vector3} a    左のベクトル
     * @param  {mapray.Vector3} b    右のベクトル
     * @param  {mapray.Vector3} dst  a と b の外積を代入するベクトル
     * @return {mapray.Vector3}      dst
     */
    static cross3( a, b, dst )
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
     * @summary 3次ベクトルの正規化を計算
     * @param  {mapray.Vector3} vec  ベクトル
     * @param  {mapray.Vector3} dst  正規化された値を代入するベクトル
     * @return {mapray.Vector3}      dst
     */
    static normalize3( vec, dst )
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
     * @summary 行列の積を計算 (アフィン変換 x アフィン変換)
     * @param  {mapray.Matrix}  a    左の行列
     * @param  {mapray.Matrix}  b    右の行列
     * @param  {mapray.Matrix}  dst  結果を代入する行列
     * @return {mapray.Matrix}       dst
     */
    static mul_AA( a, b, dst )
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
     * @summary 行列の積を計算 (一般変換 x アフィン変換)
     * @param  {mapray.Matrix}  a    左の行列
     * @param  {mapray.Matrix}  b    右の行列
     * @param  {mapray.Matrix}  dst  結果を代入する行列
     * @return {mapray.Matrix}       dst
     */
    static mul_GA( a, b, dst )
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
     * @summary 行列の積を計算 (投影変換 x アフィン変換)
     * @param  {mapray.Matrix}  a    左の行列
     * @param  {mapray.Matrix}  b    右の行列
     * @param  {mapray.Matrix}  dst  結果を代入する行列
     * @return {mapray.Matrix}       dst
     */
    static mul_PzA( a, b, dst )
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
     * @summary 逆行列を計算 (アフィン変換)
     * @param  {mapray.Matrix}  mat  行列
     * @param  {mapray.Matrix}  dst  結果を代入する行列
     * @return {mapray.Matrix}       dst
     */
    static inverse_A( mat, dst )
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
     * @summary 平面ベクトルを変換 (アフィン変換)
     * @desc
     * <p>mat には平面ベクトルを変換する行列を指定する。
     * 位置ベクトルを変換する行列が M なら、平面ベクトルを変換する行列は M<sup>-1</sup> を指定する。</p>
     *
     * <p>dst には plane * mat が代入される。</p>
     *
     * @param  mat   {mapray.Matrix}   変換行列
     * @param  plane {mapray.Vector4}  平面ベクトル
     * @param  dst   {mapray.Vector4}  結果を代入するベクトル
     * @return       {mapray.Vector4}  dst
     */
    static transformPlane_A( mat, plane, dst )
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
     * @summary 座標変換行列を計算 (Inou 球面座標系 → 地心直交座標系)
     * @desc
     * <p>原点が position の直交座標系 (LOCS) から地心直交座標系 (GOCS) に変換する行列を計算する。</p>
     * <p>position.height + GeoMath.EARTH_RADIUS > 0 かつ position.latitude == 0 のとき、LOCS の Z 軸は上方向、Y 軸は北方向、X 軸は東方向となる。</p>
     *
     * @param  {object}         position             位置 (Inou 球面座標系)
     * @param  {number}         position.latitude    緯度 (Degrees)
     * @param  {number}         position.longitude   経度 (Degrees)
     * @param  {number}         position.height      高度 (Meters)
     * @param  {mapray.Matrix}  dst                  結果を代入する行列
     * @return {mapray.Matrix}                       dst
     */
    static iscs_to_gocs_matrix( position, dst )
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
     * @summary 地心直交座標を Inou 球面座標に変換
     *
     * @param  {mapray.Vector3} src            入力 GOCS 座標 (Meters)
     * @param  {object}         dst            出力 ISCS 座標
     * @param  {number}         dst.latitude   緯度 (Degrees)
     * @param  {number}         dst.longitude  経度 (Degrees)
     * @param  {number}         dst.height     高度 (Meters)
     * @return {object}                        dst
     */
    static gocs_to_iscs( src, dst )
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
     * @summary 座標変換行列を計算 (視点座標系 → クリップ同次座標系)
     * @param  {number}        left
     * @param  {number}        right
     * @param  {number}        bottom
     * @param  {number}        top
     * @param  {number}        nearVal
     * @param  {number}        farVal
     * @param  {mapray.Matrix} dst     結果を代入する行列
     * @return {mapray.Matrix}         dst
     *
     * @see https://www.opengl.org/sdk/docs/man2/xhtml/glFrustum.xml
     */
    static frustum_matrix( left, right, bottom, top, nearVal, farVal, dst )
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
     * @summary 座標変換行列を計算 (右手座標系 → 視点座標系)
     *
     * @param  {mapray.Vector3}  eye     視点の位置
     * @param  {mapray.Vector3}  center  注視点の位置
     * @param  {mapray.Vector3}  up      上方向ベクトル
     * @param  {mapray.Matrix}   dst     結果を代入する行列
     * @return {mapray.Matrix}           dst
     */
    static lookat_matrix( eye, center, up, dst )
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
     * @summary 任意軸回りの回転行列
     * @desc
     * <p>axis を Z 軸方向とすると、X 軸から Y 軸の方向に angle 度回転させる変換行列を返す。</p>
     * @param  {mapray.Vector3} axis   回転軸 (単位ベクトル)
     * @param  {number}         angle  回転角 (Degrees)
     * @param  {mapray.Matrix}  dst    結果を代入する行列
     * @return {mapray.Matrix}         dst
     */
    static rotation_matrix( axis, angle, dst )
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
     * @summary KML 互換のモデル変換行列
     *
     * @desc
     * <p>変換は scale -> roll -> tilt -> heading の順に行われる。</p>
     *
     * @param  {number}         heading  Z 軸を中心に Y 軸から X 軸の方向の回転角 (Degrees)
     * @param  {number}         tilt     X 軸を中心に Z 軸から Y 軸の方向の回転角 (Degrees)
     * @param  {number}         roll     Y 軸を中心に X 軸から Z 軸の方向の回転角 (Degrees)
     * @param  {mapray.Vector3} scale    スケール
     * @param  {mapray.Matrix}  dst      結果を代入する行列
     * @return {mapray.Matrix}           dst
     *
     * @package
     * @see https://developers.google.com/kml/documentation/kmlreference#model
     */
    static kml_model_matrix( heading, tilt, roll, scale, dst )
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
     * @summary グーデルマン関数
     * @param  {number}  x   数値
     * @return {number}      gd( x )
     */
    static gudermannian( x )
    {
        return 2 * Math.atan( Math.exp( x ) ) - Math.PI / 2;
    }


    /** 
     * @summary 逆グーデルマン関数
     * @param  {number}  x   数値
     * @return {number}      gd<sup>-1</sup>( x )
     */
    static invGudermannian( x )
    {
        return Math.log( Math.tan( x / 2 + Math.PI / 4 ) );
    }


    /**
     * @summary 値を指定区間内に制限
     * @param  {number}  x    値
     * @param  {number}  min  最小値
     * @param  {number}  max  最大値
     * @return {number}       min <= x <= max のとき x, x < min のとき min, x > max のとき max
     */
    static clamp( x, min, max )
    {
        return Math.min( Math.max( x, min ), max );
    }

}


/**
 * @summary 地球の半径
 * @desc
 * <p>Inou 球面座標系で定義された、地球の半径 (Meters) である。</p>
 * @type {number}
 * @constant
 */
GeoMath.EARTH_RADIUS = 6378137;


/**
 * @summary 1度に対応するラジアンの数値
 * @desc
 * <p>この数値は π / 180 である。</p>
 * <p>度数を DEGREE で掛け合せることによってラジアンに変換することができる。</p>
 * @type {number}
 * @constant
 */
GeoMath.DEGREE = 0.017453292519943295769;


/**
 * @summary log2(π)
 * @type {number}
 * @constant
 */
GeoMath.LOG2PI = 1.6514961294723187980;


/**
 * @summary 4行4列の行列を表現
 * @desc
 * <p>このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 16 要素の配列に置き換えることができる。
 * この配列の数値の並びは列優先である。</p>
 *
 * @class mapray.Matrix
 * @see mapray.GeoMath
 */


/**
 * @summary 2次ベクトルを表現
 * @desc
 * <p>このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 2 要素の配列に置き換えることができる。</p>
 *
 * @class mapray.Vector2
 * @see mapray.GeoMath
 */


/**
 * @summary 3次ベクトルを表現
 * @desc
 * <p>このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 3 要素の配列に置き換えることができる。</p>
 *
 * @class mapray.Vector3
 * @see mapray.GeoMath
 */


/**
 * @summary 4次ベクトルを表現
 * @desc
 * <p>このクラスは実在しない便宜的なものであり、Array や TypedArray 等の 4 要素の配列に置き換えることができる。</p>
 *
 * @class mapray.Vector4
 * @see mapray.GeoMath
 */


// GeoMath の内部テンポラリ変数を生成
{
    GeoMath._xaxis = GeoMath.createVector3();
    GeoMath._yaxis = GeoMath.createVector3();
    GeoMath._zaxis = GeoMath.createVector3();
}


export default GeoMath;
