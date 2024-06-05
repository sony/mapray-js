import GeoMath, { Matrix, Vector2, Vector4 } from "./GeoMath";
import Ray from "./Ray";
import Viewer from "./Viewer";


/**
 * 視点を表現するカメラ
 *
 * 視点を表現するカメラである。
 * インスタンスは {@link Viewer.camera} から得ることができる。
 *
 */
class Camera {

    /**
     * レンダリング先のサイズ
     * @internal
     */
    private _canvas_size: Camera.SizeObject;

    /**
     *  カメラの画角 (Degrees)
     *  @defaultValue 46
     */
    fov: number;


    /**
     *  近接平面距離 (Meters)
     *  @defaultValue 1
     */
    near: number;

    /**
     *  遠方平面距離 (Meters)
     *  @defaultValue 1000
     */
    far: number;

    /**
     *  視点空間から GOCS への変換行列
     *  @defaultValue 恒等行列
     */
    view_to_gocs: Matrix;


    /**
     * Cameraオブジェクトを生成
     *
     * canvas_sizeには、width, heightプロパティを持つオブジェクトを指定する。
     * createRenderInfo()が呼ばれる度にwidth, height値が参照される。
     * canvas要素が指定される他、オフスクリーンレンダリング時にはwidth, height値を持ったオブジェクトが指定されます。
     *
     * @param canvas_size  レンダリング先サイズ
     *
     * @internal
     */
    constructor( canvas_size: Camera.SizeObject )
    {
        this._canvas_size = canvas_size;

        this.fov  = 46;

        this.near = 1;

        this.far  = 1000;

        this.view_to_gocs = GeoMath.setIdentity( GeoMath.createMatrix() );
    }


    /**
     * カメラの姿勢や視体積に関するパラメータをコピーします。
     * キャンバスサイズはコピーされません。
     * @internal
     */
    copyViewParameters( camera: Camera ) {
        this.fov = camera.fov;
        this.near = camera.near;
        this.far  = camera.far;
        GeoMath.copyMatrix( camera.view_to_gocs, this.view_to_gocs );
    }


    /**
     * 変換行列 canvas_to_view を取得
     *
     * キャンバス座標系から視点座標系へ座標を変換するための変換行列を取得する。
     *
     * 結果は omat に設定するが、omat を省略した場合は新規に生成した行列オブジェクトを使用する。
     *
     * キャンバスの幅または高さが 0 のときは結果は不定値となる。
     *
     * @param  omat  結果を設定する行列オブジェクト
     * @return omat または新規に生成した行列
     */
    getCanvasToView( omat?: Matrix ): Matrix
    {
        var dst = omat || GeoMath.createMatrix();

        // キャンバス画素数 -> sx, sy
        var sx = this._canvas_size.width;
        var sy = this._canvas_size.height;

        // 近接遠方平面距離 -> n, f
        var n = this.near;
        var f = this.far;

        // n 勾配 (対角線画角を想定) -> gx, gy
        var hfov = this.fov * GeoMath.DEGREE / 2;
        var aspect = sy / sx;
        var gx = n * Math.tan( hfov ) / Math.sqrt( 1 + aspect * aspect );
        var gy = gx * aspect;

        // 行列の要素を設定
        dst[ 0] = 2 * gx / (n * sx);
        dst[ 1] = 0;
        dst[ 2] = 0;
        dst[ 3] = 0;

        dst[ 4] = 0;
        dst[ 5] = -2 * gy / (n * sy);
        dst[ 6] = 0;
        dst[ 7] = 0;

        dst[ 8] = 0;
        dst[ 9] = 0;
        dst[10] = 0;
        dst[11] = (n - f) / (n * f);

        dst[12] = -gx / n;
        dst[13] =  gy / n;
        dst[14] = -1;
        dst[15] =  1 / n;

        return dst;
    }


    /**
     * 変換行列 canvas_to_gocs を取得
     * キャンバス座標系から地心座標系 (GOCS) へ座標を変換するための変換行列を取得する。
     *
     * 結果は omat に設定するが、omat を省略した場合は新規に生成した行列オブジェクトを使用する。
     *
     * キャンバスの幅または高さが 0 のときは結果は不定値となる。
     *
     * @param  omat  結果を設定する行列オブジェクト
     * @return omat または新規に生成した行列
     */
    getCanvasToGocs( omat?: Matrix ): Matrix
    {
        /*==  canvas_to_view  ==*/
        var nMat = this.getCanvasToView( omat );

        var n00 = nMat[ 0];
        //  n10 = 0
        //  n20 = 0
        //  n30 = 0

        //  n01 = 0
        var n11 = nMat[ 5];
        //  n21 = 0
        //  n31 = 0

        //  n03 = 0
        //  n13 = 0
        //  n23 = 0
        var n32 = nMat[11];

        var n03 = nMat[12];
        var n13 = nMat[13];
        //  n23 = -1
        var n33 = nMat[15];

        /*==  view_to_gocs  ==*/
        var mMat = this.view_to_gocs;

        var m00 = mMat[ 0];
        var m10 = mMat[ 1];
        var m20 = mMat[ 2];
        //  m30 = 0

        var m01 = mMat[ 4];
        var m11 = mMat[ 5];
        var m21 = mMat[ 6];
        //  m31 = 0

        var m02 = mMat[ 8];
        var m12 = mMat[ 9];
        var m22 = mMat[10];
        //  m32 = 0

        var m03 = mMat[12];
        var m13 = mMat[13];
        var m23 = mMat[14];
        //  m33 = 1

        /*==  dst = view_to_gocs * canvas_to_view  ==*/
        var dst = nMat;

        dst[ 0] = m00 * n00;
        dst[ 1] = m10 * n00;
        dst[ 2] = m20 * n00;
        // dst[ 3] = 0

        dst[ 4] = m01 * n11;
        dst[ 5] = m11 * n11;
        dst[ 6] = m21 * n11;
        // dst[ 7] = 0

        dst[ 8] = m03 * n32;
        dst[ 9] = m13 * n32;
        dst[10] = m23 * n32;
        // dst[ 11] = n32

        dst[12] = m00 * n03 + m01 * n13 - m02 + m03 * n33;
        dst[13] = m10 * n03 + m11 * n13 - m12 + m13 * n33;
        dst[14] = m20 * n03 + m21 * n13 - m22 + m23 * n33;
        // dst[ 12] = n33

        return dst;
    }


    /**
     * 変換行列 view_to_canvas を取得
     *
     * 視点座標系からキャンバス座標系へ座標を変換するための変換行列を取得する。
     * 結果は omat に設定するが、omat を省略した場合は新規に生成した行列オブジェクトを使用する。
     * キャンバスの幅または高さが 0 のときは結果は不定値となる。
     *
     * @param  omat  結果を設定する行列オブジェクト
     * @return omat または新規に生成した行列
     */
    getViewToCanvas( omat: Matrix ): Matrix
    {
        var dst = omat || GeoMath.createMatrix();

        // キャンバス画素数 -> sx, sy
        var sx = this._canvas_size.width;
        var sy = this._canvas_size.height;

        // 近接遠方平面距離 -> n, f
        var n = this.near;
        var f = this.far;

        // n 勾配 (対角線画角を想定) -> gx, gy
        var hfov = this.fov * GeoMath.DEGREE / 2;
        var aspect = sy / sx;
        var gx = n * Math.tan( hfov ) / Math.sqrt( 1 + aspect * aspect );
        var gy = gx * aspect;

        // 行列の要素を設定
        dst[ 0] = n * sx / (2 * gx);
        dst[ 1] = 0;
        dst[ 2] = 0;
        dst[ 3] = 0;

        dst[ 4] = 0;
        dst[ 5] = -n * sy / (2 * gy);
        dst[ 6] = 0;
        dst[ 7] = 0;

        dst[ 8] = -sx / 2;
        dst[ 9] = -sy / 2;
        dst[10] = f / (n - f);
        dst[11] = -1;

        dst[12] = 0;
        dst[13] = 0;
        dst[14] = n * f / (n - f);
        dst[15] = 0;

        return dst;
    }


    /**
     * キャンバス座標に対応するレイを取得
     *
     * キャンバス上の cpos で示した点に対応するレイを取得する。
     * 始点は近接平面上に置き、方向は長さ 1 に正規化される。
     * 返されるレイの座標系は GOCS である。
     *
     * @param  cpos  キャンバス上の位置
     * @param  oray  結果を設定する Ray オブジェクト
     * @return oray または新規に生成した Ray
     */
    getCanvasRay( cpos: Vector2, oray?: Ray ): Ray
    {
        var x = cpos[0];
        var y = cpos[1];
        var dst = oray || new Ray();

        // Q = Mr (x, y, 0, 1)^t
        var mr = this.getCanvasToGocs( Camera._temp_mat );
        var qx = x * mr[0] + y * mr[4] + mr[12];
        var qy = x * mr[1] + y * mr[5] + mr[13];
        var qz = x * mr[2] + y * mr[6] + mr[14];
        var qw = x * mr[3] + y * mr[7] + mr[15];

        // Q を通常の座標に変換
        var pos = dst.position;
        pos[0] = qx / qw;
        pos[1] = qy / qw;
        pos[2] = qz / qw;

        // Vr = pos - Mg (0, 0, 0)^t
        var mg = this.view_to_gocs;
        var dir = dst.direction;
        dir[0] = pos[0] - mg[12];
        dir[1] = pos[1] - mg[13];
        dir[2] = pos[2] - mg[14];
        GeoMath.normalize3( dir, dir );

        return dst;
    }


    /**
     * レンダリング先のサイズ
     * @internal
     */
    get canvas_size(): Camera.SizeObject {
        return this._canvas_size;
    }


    /**
     * レンダリング情報を生成します。
     *
     * ビューポート内で実際にレンダリングを行う領域を指定します。（レンダリング領域が指定されなかった場合はビューポート全体にレンダリングを行います）
     * @param  sx レンダリング領域のx位置
     * @param  sy レンダリング領域のy位置
     * @param  swidth レンダリング領域の幅
     * @param  sheight レンダリング領域の高さ
     * @internal
     */
    createRenderInfo( sx?: number, sy?: number, swidth?: number, sheight?: number ): Camera.RenderInfo
    {
        const canvas_size = this._canvas_size;
        return new Camera.RenderInfo( this, canvas_size.width, canvas_size.height, sx, sy, swidth, sheight );
    }


    private static readonly _temp_mat = GeoMath.createMatrix();

}


namespace Camera {


/**
 * @internal
 */
export interface SizeObject {

    /**
     * 幅
     */
    width: number;

    /**
     * 高さ
     */
    height: number;
}



/**
 * カメラから得るレンダリング情報
 *
 * @internal
 */
export class RenderInfo {

    private _view_to_clip: Matrix;

    private _volume_planes: Vector4[];

    private _pixel_step: number;


    /**
     * @param camera  対象カメラ
     * @param width   ビューポートの幅
     * @param height  ビューポートの高さ
     * @param sx      レンダリング領域のx位置(ビューポート中央を0, 右方向を正とする)
     * @param sy      レンダリング領域のy位置(ビューポート中央を0, 上方向を正とする)
     * @param swidth  レンダリング領域の幅
     * @param sheight レンダリング領域の高さ
     */
    constructor( camera: Camera, width: number, height: number, sx?: number, sy?: number, swidth?: number, sheight?: number )
    {
        /*
        *                  y    swidth                  
        *  Viewport        |   |<--->|                  
        *   +--------------+--------------+  -----------
        *   |              |              |           ^ 
        *   |              |   +-----+    |  --       | 
        *   |            sy+---|  +  |    |  sheight  | 
        *   |              |   +-----+    |  --       | 
        *   |              |      |       |           | 
        * --+--------------+------+-------+--x        | 
        *   |              |      sx      |           | 
        *   |              |              |       height
        *   |              |              |           | 
        *   |              |              |           | 
        *   |              |              |           V 
        *   +--------------+--------------+  -----------
        *                                               
        *   |<---------- width ---------->|             
        */
        // オブジェクトを生成
        this._view_to_clip = GeoMath.createMatrix();
        this._volume_planes = [] as Vector4[];
        for ( var i = 0; i < 6; ++i ) {
            this._volume_planes.push( GeoMath.createVector4() );
        }
        this._pixel_step = 0;

        // オブジェクトを設定
        this._setup_view_to_clip( camera, width, height, sx, sy, swidth, sheight );
        this._setup_volume_planes();
        this._setup_pixel_step( width, height );
    }


    /**
     * @summary 視点空間からクリップ同次空間への変換行列
     * @type {mapray.Matrix}
     * @readonly
     */
    get view_to_clip() { return this._view_to_clip; }


    /**
     * @summary 視体積の平面ベクトル配列
     * @desc
     * <p>以下の順序で 6 枚の平面ベクトルが格納されている。</p>
     *
     * <pre>
     * [near, far, left, right, bottom, top]
     * </pre>
     *
     * <p>各平面の x, y, z は長さ 1 に正規化されている。</p>
     *
     * @type {mapray.Vector4[]}
     * @readonly
     */
    get volume_planes() { return this._volume_planes; }


    /**
     * @summary 視点空間での画素の変化量
     * @desc
     * <p>ビューポートの画素に対応する視点空間の Z = -1 平面での変化量を返す。</p>
     *
     * @type {number}
     * @readonly
     */
    get pixel_step() { return this._pixel_step; }


    /**
     */
    private _setup_view_to_clip( camera: Camera, width: number, height: number, sx: number = 0, sy: number = 0, swidth: number = width, sheight: number = height )
    {
        // 矩形の中心位置 (単位空間)
        const cx = 2 * sx / width;
        const cy = 2 * sy / height;

        // 矩形の半サイズ (単位空間)
        const dx = swidth  / width;
        const dy = sheight / height;

        // キャンバスの横幅に対する高さの比
        const aspect = height / width;

        // fov を対角線画角と解釈して単位サイズを求める
        // (単位空間の水平方向 1 に対する近接平面上での寸法)
        const hfov = camera.fov * GeoMath.DEGREE / 2;  // 半画角 (radians)
        const unit = camera.near * Math.tan( hfov ) / Math.sqrt( 1 + aspect * aspect );

        // 近接平面上での平面位置
        const   left = (cx - dx) * unit;
        const  right = (cx + dx) * unit;
        const bottom = (cy - dy) * unit * aspect;
        const    top = (cy + dy) * unit * aspect;

        GeoMath.frustum_matrix( left, right, bottom, top, camera.near, camera.far,
                                this._view_to_clip );
    }


    /**
     */
    private _setup_volume_planes()
    {
        var matrix = this._view_to_clip;
        var  plane = this._volume_planes;

        // 視体積の内側を向いた平面を取得
        // これらの式は任意の射影行列に対して有効
        this._add_matrix_rows( matrix, 3, 2, plane[0] );  //   near = m3 + m2
        this._sub_matrix_rows( matrix, 3, 2, plane[1] );  //    far = m3 - m2
        this._add_matrix_rows( matrix, 3, 0, plane[2] );  //   left = m3 + m0
        this._sub_matrix_rows( matrix, 3, 0, plane[3] );  //  right = m3 - m0
        this._add_matrix_rows( matrix, 3, 1, plane[4] );  // bottom = m3 + m1
        this._sub_matrix_rows( matrix, 3, 1, plane[5] );  //    top = m3 - m1

        // 法線を正規化
        for ( var i = 0; i < 6; ++i ) {
            var p = plane[i];
            var x = p[0];
            var y = p[1];
            var z = p[2];
            var ilen = 1 / Math.sqrt( x*x + y*y + z*z );  // 長さの逆数
            p[0] *= ilen;
            p[1] *= ilen;
            p[2] *= ilen;
            p[3] *= ilen;
        }
    }


    /**
     */
    private _setup_pixel_step( width: number, height: number )
    {
        // mIJ は view_to_clip の I 行 J 列の成分
        //
        //         2 (m33 - m32)
        //   dx = ---------------
        //           m00 width
        //
        //         2 (m33 - m32)
        //   dy = ---------------
        //          m11 height

        var mat = this._view_to_clip;
        var m00 = mat[ 0];
        var m11 = mat[ 5];
        var m32 = mat[11];
        var m33 = mat[15];

        var  n = 2 * (m33 - m32);
        var dx = n / (m00 * width);
        var dy = n / (m11 * height);

        this._pixel_step = Math.sqrt( dx*dx + dy*dy ) * Math.SQRT1_2;
    }


    /**
     */
    private _add_matrix_rows( mat: Matrix, row1: number, row2: number , dst: Vector4 )
    {
        dst[0] = mat[row1]      + mat[row2];
        dst[1] = mat[row1 +  4] + mat[row2 +  4];
        dst[2] = mat[row1 +  8] + mat[row2 +  8];
        dst[3] = mat[row1 + 12] + mat[row2 + 12];
        return dst;
    }


    /**
     */
    private _sub_matrix_rows( mat: Matrix, row1: number, row2: number, dst: Vector4 )
    {
        dst[0] = mat[row1]      - mat[row2];
        dst[1] = mat[row1 +  4] - mat[row2 +  4];
        dst[2] = mat[row1 +  8] - mat[row2 +  8];
        dst[3] = mat[row1 + 12] - mat[row2 + 12];
        return dst;
    }

}



} // namespace Camera



export default Camera;
