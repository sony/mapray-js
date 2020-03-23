var GeoMath = mapray.GeoMath;


/**
 * @summary カメラのドラッグ移動ヘルパー
 */
class DragMoveHelper {

    /**
     * @param {mapray.Viewer}  viewer
     * @param {mapray.Vector2} cpos    ドラッグの開始点 (キャンバス座標系)
     */
    constructor( viewer, cpos )
    {
        var camera = viewer.camera;
        var ray = camera.getCanvasRay( cpos );
        this._position = viewer.getRayIntersection( ray );  // 参照点 P
        this._camera   = camera;                            // view_to_canvas 取得用

        this._height    = 0;  // カメラの高度 h
        this._yaw       = 0;  // カメラの方位角 θx
        this._pitch     = 0;  // カメラの仰俯角 θy

        this._longitude = 0;  // カメラの経度 λ
        this._latitude  = 0;  // カメラの緯度 ϕ

        this._mat_N  = GeoMath.createMatrix();
    }


    /**
     * @summary カメラの経度
     * @type {number}
     * @readonly
     */
    get longitude() { return this._longitude; }


    /**
     * @summary カメラの緯度
     * @type {number}
     * @readonly
     */
    get latitude() { return this._latitude; }


    /**
     * @summary カメラの高度と方角を設定
     * @param {number} height  カメラの高度
     * @param {number} yaw     カメラの方位角
     * @param {number} pitch   カメラの仰俯角
     */
    setHeightDirection( height, yaw, pitch )
    {
        this._height = height;
        this._yaw    = yaw;
        this._pitch  = pitch;
    }


    /**
     * @summary カメラの経緯度を設定
     * @param {number} lon  カメラの経度
     * @param {number} lat  カメラの緯度
     */
    setPosition( lon, lat )
    {
        this._longitude = lon;
        this._latitude  = lat;
    }


    /**
     * @summary カメラの経緯度を探す
     * @desc
     * <p>現在の経緯度を基準に参照点を目標点に投影する経緯度を探し、経緯度をその結果で更新する。</p>
     * @param  {mapray.Vector2} cpos  目標点 (キャンバス座標系)
     * @return {DragMoveHelper}       this
     */
    findPosition( cpos )
    {
        if ( this._position === null ) {
            // 参照点がないので経緯度は変化させない
            return this;
        }

        this._setup_mat_N();

        var λ_i = this._longitude * GeoMath.DEGREE;
        var φ_i = this._latitude  * GeoMath.DEGREE;

        var fcalc = this._fcalc( λ_i, φ_i );
        if ( fcalc === null ) {
            // Q_0 に対応する参照点が視点の前方にない
            return this;
        }

        var qx = cpos[0];
        var qy = cpos[1];

        for (;;) {
            // Q_i − Q
            var qi = fcalc.f;  // Q_i
            var di_x = qi[0] - qx;
            var di_y = qi[1] - qy;

            // d_i = ||Q_i − Q||
            var di = Math.sqrt( di_x * di_x + di_y * di_y );
            if ( di < DragMoveHelper.ε_dist ) {
                this._putLonLat( λ_i, φ_i );
                break;
            }

            // ∇d_i
            var   dq = fcalc.df();
            var λqi = dq[0];
            var φqi = dq[1];
            var λdi = (di_x * λqi[0] + di_y * λqi[1]) / di;
            var φdi = (di_x * φqi[0] + di_y * φqi[1]) / di;

            // ||∇d_i||^2
            var norm = λdi * λdi + φdi * φdi;
            if ( norm < DragMoveHelper.ε_norm ) {
                this._putLonLat( λ_i, φ_i );
                break;
            }

            var λ_n;  // λ_i+1
            var φ_n;  // φ_i+1
            var dn;    // d_i+1

            for ( var α = 1 ;; ) {
                var k = α * di / norm;
                λ_n = λ_i - k * λdi;  // λ_i+1
                φ_n = φ_i - k * φdi;  // φ_i+1

                var fcalc_n = this._fcalc( λ_n, φ_n );
                if ( fcalc_n === null ) {
                    // Q_i+1 に対応する参照点が視点の前方でなくなった
                    α /= 2;
                    if ( α < DragMoveHelper.εa ) {
                        this._putLonLat( λ_i, φ_i );
                        return this;
                    }
                    else continue;
                }

                // Q_i+1 − Q
                var qn = fcalc_n.f;  // Q_i+1
                var dn_x = qn[0] - qx;
                var dn_y = qn[1] - qy;

                // d_n = ||Q_i+1 − Q||
                dn = Math.sqrt( dn_x * dn_x + dn_y * dn_y );
                if ( dn >= di ) {
                    // 逆に離れてしまった
                    α /= 2;
                    if ( α < DragMoveHelper.εa ) {
                        this._putLonLat( λ_i, φ_i );
                        return this;
                    }
                    else continue;
                }

                break;
            }

            if ( di - dn < DragMoveHelper.εd ) {
                this._putLonLat( λ_n, φ_n );
                break;
            }

            λ_i = λ_n;
            φ_i = φ_n;
            fcalc = this._fcalc( λ_i, φ_i );
        }

        return this;
    }


    /**
     * @summary 変換行列 N を設定
     * @private
     * in:
     *   this._yaw
     *   this._pitch
     *   this._height
     *   this._camera
     * out:
     *   this._mat_N
     */
    _setup_mat_N()
    {
        var θx = this._yaw   * GeoMath.DEGREE;  // 方位角
        var θy = this._pitch * GeoMath.DEGREE;  // 仰俯角

        var cosθx = Math.cos( θx );
        var cosθy = Math.cos( θy );
        var sinθx = Math.sin( θx );
        var sinθy = Math.sin( θy );
        var rh     = GeoMath.EARTH_RADIUS + this._height;

        var mat_Mv = DragMoveHelper._temp_mat1;

        mat_Mv[ 0] = cosθx;
        mat_Mv[ 1] = -sinθx * sinθy;
        mat_Mv[ 2] = -cosθy * sinθx;
        mat_Mv[ 3] = 0;

        mat_Mv[ 4] = 0;
        mat_Mv[ 5] =  cosθy;
        mat_Mv[ 6] = -sinθy;
        mat_Mv[ 7] = 0;

        mat_Mv[ 8] = sinθx;
        mat_Mv[ 9] = cosθx * sinθy;
        mat_Mv[10] = cosθx * cosθy;
        mat_Mv[11] = 0;

        mat_Mv[12] = 0;
        mat_Mv[13] = -rh * cosθy;
        mat_Mv[14] =  rh * sinθy;
        mat_Mv[15] = 1;

        // Ms Mp
        var view_to_canvas = this._camera.getViewToCanvas( DragMoveHelper._temp_mat2 );

        // N = Ms Mp Mv
        GeoMath.mul_PzA( view_to_canvas, mat_Mv, this._mat_N );

        return this._mat_N;
    }


    /**
     * @summary 関数 f とその偏微分
     * @desc
     * <p>参照点 P をキャンバス座標に変換する関数 f を計算する。</p>
     * <p>f の計算結果と偏微分を計算する関数を持つオブジェクトを返す。ただし参照点 P は視点の前にないときは null を返す。</p>
     * <p>返されたオブジェクトを o とすると o.f は f の計算結果で、 o.df はその偏微分 [∂f/∂λ, ∂f/∂φ] を計算する関数である。</p>
     * @param  {number} λ  経度 (Radians)
     * @param  {number} ϕ  緯度 (Radians)
     * @return {?object}    結果オブジェクトまたは null
     * @private
     * in:
     *   this._position
     *   this._mat_N
     */
    _fcalc( λ, ϕ )
    {
        var cosλ = Math.cos( λ );
        var sinλ = Math.sin( λ );
        var cosϕ = Math.cos( ϕ );
        var sinϕ = Math.sin( ϕ );

        var pos = this._position;
        var px  = pos[0];
        var py  = pos[1];
        var pz  = pos[2];

        var mat = this._mat_N;
        var n30 = mat[ 3];
        var n31 = mat[ 7];
        var n32 = mat[11];
        var n33 = mat[15];

        var kw = n31 * cosϕ + n32 * sinϕ;
        var iw = kw * px + n30 * py;
        var jw = kw * py - n30 * px;

        var fw = iw * cosλ + jw * sinλ - (n32 * cosϕ - n31 * sinϕ) * pz + n33;
        if ( fw <= 0 ) {
            // 参照点 P は視点の前にない (z >= 0)
            return null;
        }

        var n00 = mat[ 0];
        var n10 = mat[ 1];
        var n01 = mat[ 4];
        var n11 = mat[ 5];
        var n02 = mat[ 8];
        var n12 = mat[ 9];
        var n03 = mat[12];
        var n13 = mat[13];

        var kx = n01 * cosϕ + n02 * sinϕ;
        var ky = n11 * cosϕ + n12 * sinϕ;
        var ix = kx * px + n00 * py;
        var jx = kx * py - n00 * px;
        var iy = ky * px + n10 * py;
        var jy = ky * py - n10 * px;

        // f(λ, ϕ) の値
        var fx = ix * cosλ + jx * sinλ - (n02 * cosϕ - n01 * sinϕ) * pz + n03;
        var fy = iy * cosλ + jy * sinλ - (n12 * cosϕ - n11 * sinϕ) * pz + n13;
        var val_f = [fx / fw, fy / fw];

        // [∂/∂λ f(λ, ϕ), ∂/∂ϕ f(λ, ϕ)] を返す関数
        var fn_df = function() {
            var fw2 = fw * fw;  // fw^2

            // ∂f/∂λ
            var λfx = jx * cosλ - ix * sinλ;
            var λfy = jy * cosλ - iy * sinλ;
            var λfw = jw * cosλ - iw * sinλ;
            var λf = [(fw * λfx - fx * λfw) / fw2, (fw * λfy - fy * λfw) / fw2];

            // ∂f/∂ϕ
            var ka = px * cosλ + py * sinλ;
            var ϕfx = (n02 * ka + n01 * pz) * cosϕ - (n01 * ka - n02 * pz) * sinϕ;
            var ϕfy = (n12 * ka + n11 * pz) * cosϕ - (n11 * ka - n12 * pz) * sinϕ;
            var ϕfw = (n32 * ka + n31 * pz) * cosϕ - (n31 * ka - n32 * pz) * sinϕ;
            var ϕf = [(fw * ϕfx - fx * ϕfw) / fw2, (fw * ϕfy - fy * ϕfw) / fw2];

            return [λf, ϕf];
        };

        return {
            f:  val_f,
            df: fn_df
        };
    }


    /**
     * @summary 経緯度を書き戻す
     * @private
     */
    _putLonLat( λ, φ )
    {
        this._longitude = λ / GeoMath.DEGREE;
        this._latitude  = φ / GeoMath.DEGREE;
    }

}


DragMoveHelper._temp_mat1 = GeoMath.createMatrix();
DragMoveHelper._temp_mat2 = GeoMath.createMatrix();

DragMoveHelper.ε_dist = 1e-5;
DragMoveHelper.ε_norm = 1e-15;
DragMoveHelper.εa = 1e-7;
DragMoveHelper.εd = 1e-8;


export default DragMoveHelper;
