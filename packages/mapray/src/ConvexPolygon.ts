/**
 * 凸多角形
 *
 * @internal
 */
class ConvexPolygon {

    private _vertices: Float64Array;

    private _num_vertices: number;

    /**
     * 3 点またはそれ以上の頂点座標を反時計回りで指定する。
     *
     * @param coords  頂点座標の並び x0, y0, x1, y1, ...
     */
    constructor( coords: number[] )
    {
        this._vertices     = Float64Array.from( coords );
        this._num_vertices = this._vertices.length / 2;
    }


    /**
     * 凸多角形の頂点数
     */
    get num_vertices(): number
    {
        return this._num_vertices;
    }


    /**
     * 凸多角形の頂点座標配列
     *
     * - 反時計回りで格納された頂点座標の配列 [x0, y0, x1, y1, ...] を返す。
     * - 返された配列の内容は this に対して変更操作が行われるまで有効である。
     */
    get vertices(): Float64Array
    {
        return this._vertices;
    }


    /**
     * 矩形から凸多角形を生成
     *
     * @param x_min  x 座標の最小値
     * @param y_min  y 座標の最小値
     * @param x_max  x 座標の最大値
     * @param y_max  y 座標の最大値
     *
     * @return 凸多角形
     */
    static createByRectangle( x_min: number, y_min: number, x_max: number, y_max: number ): ConvexPolygon
    {
        // 入力座標配列
        const coords = [
            x_min, y_min,
            x_max, y_min,
            x_max, y_max,
            x_min, y_max
        ];

        // 凸多角形を生成
        return new ConvexPolygon( coords );
    }


    /**
     * 妥当性を検査
     *
     * this が妥当な凸多角形かどうかを確かめる。
     *
     * @return this が妥当なとき true, それ以外のとき false
     */
    isValid(): boolean
    {
        if ( this._num_vertices < 3 ) {
            // 3 頂点未満の多角形は非対応
            return false;
        }

        // 座標が有効な数値であることをチェック
        for ( let i = 0; i < this._num_vertices; ++i ) {
            let x = this._vertices[2*i    ];
            let y = this._vertices[2*i + 1];
            if ( !Number.isFinite( x ) || !Number.isFinite( y ) ) {
                // 有効な数値ではない座標が含まれる
                return false;
            }
        }

        // 長さ 0 の稜線が無いことをチェック
        for ( let ei = 0; ei < this._num_vertices; ++ei ) {
            let si = (ei != 0) ? ei - 1 : this._num_vertices - 1;

            let sx = this._vertices[2*si    ];
            let sy = this._vertices[2*si + 1];

            let ex = this._vertices[2*ei    ];
            let ey = this._vertices[2*ei + 1];

            if ( sx == ex && sy == ey ) {
                // 同一位置の隣接頂点が含まれる
                return false;
            }
        }

        // 内角が 0 でない、または 180 度より大きくないことをチェック
        for ( let oi = 0; oi < this._num_vertices; ++oi ) {
            let ox = this._vertices[2*oi    ];
            let oy = this._vertices[2*oi + 1];

            // 前方への方向ベクトル
            let fi = (oi == this._num_vertices - 1) ? 0 : oi + 1;
            let fx = this._vertices[2*fi    ] - ox;
            let fy = this._vertices[2*fi + 1] - oy;

            // 後方への方向ベクトル
            let bi = (oi == 0) ? this._num_vertices - 1 : oi - 1;
            let bx = this._vertices[2*bi    ] - ox;
            let by = this._vertices[2*bi + 1] - oy;

            // 面積と内積
            let det = fx * by - bx * fy;
            let dot = fx * bx + fy * by;

            if ( det < 0 || (det == 0 && dot > 0) ) {
                // 内角 θ は 0 < θ <= 180 ではない
                return false;
            }
        }

        return true;
    }


    /**
     * 交差凸多角形を取得
     *
     * - 凸多角形 this と凸多角形 polygon が交差すれば、交差部分の凸多角形を返す。
     * - this と polygon が交差しないときは null を返す。
     * - this が polygon を包含するときは polygon を返す可能性がある。
     *
     * @param polygon  凸多角形
     *
     * @return 交差凸多角形、ただし交差しないときは null
     *
     * @throws Error  凸多角形の切り取りに失敗
     */
    getIntersection( polygon: ConvexPolygon ): ConvexPolygon | null
    {
        try {
            return this._clip_by_polygon( polygon );
        }
        catch ( e ) {
            throw new Error( "ConvexPolygon#getIntersection failed" );
        }
    }


    /**
     * 凸多角形同士に交差があるかどうか？
     *
     * 凸多角形 this と凸多角形 polygon が交差するかどうかを返す。
     *
     * @param polygon  凸多角形
     * @return 交差するとき true, 交差しないとき false
     * @throws Error  交差の確認に失敗
     */
    hasIntersection( polygon: ConvexPolygon ): boolean
    {
        try {
            return this._clip_by_polygon( polygon ) !== null;
        }
        catch ( e ) {
            throw new Error( "ConvexPolygon#hasIntersection failed" );
        }
    }


    /**
     * 凸多角形を包含するか？
     *
     * 凸多角形 this は凸多角形 polygon を包含するかどうかを返す。
     *
     * @param polygon  凸多角形
     * @return this が polygon を包含するとき true, それ以外は false
     */
    includes( polygon: ConvexPolygon ): boolean
    {
        for ( let ei = 0; ei < this._num_vertices; ++ei ) {
            let si = (ei != 0) ? ei - 1 : this._num_vertices - 1;

            // 直線上の 1 点
            let px = this._vertices[2*si    ];
            let py = this._vertices[2*si + 1];

            // 直線の内側方向
            let nx = py - this._vertices[2*ei + 1];
            let ny = this._vertices[2*ei] - px;

            // 判定数値
            let dval = px*nx + py*ny;

            // this の si-ei 稜線の
            for ( let i = 0; i < polygon._num_vertices; ++i ) {
                // polygon の 1 点
                let qx = polygon._vertices[2*i    ];
                let qy = polygon._vertices[2*i + 1];

                if ( qx*nx + qy*ny < dval ) {
                    // polygon の 1 点が this の外側
                    // polygon は this の完全に内側ではない
                    return false;
                }
            }
        }

        // polygon は this の完全に内側である
        return true;
    }


    /**
     * 凸多角形により凸多角形を切り取る
     *
     * - 凸多角形 this により凸多角形 polygon を切り取った凸多角形を返す。
     * - this が polygon を包含するときは polygon を返す。
     * - this と polygon が交差しないときは null を返す。
     *
     * @param polygon  凸多角形
     * @return 凸多角形または null
     * @throws Error  凸多角形の切り取りに失敗
     */
    private _clip_by_polygon( polygon: ConvexPolygon ): ConvexPolygon | null
    {
        let current: ConvexPolygon | null = polygon;

        for ( let ei = 0; ei < this._num_vertices; ++ei ) {
            let si = (ei != 0) ? ei - 1 : this._num_vertices - 1;

            // 直線上の 1 点
            let px = this._vertices[2*si    ];
            let py = this._vertices[2*si + 1];

            // 直線の内側方向
            let nx = py - this._vertices[2*ei + 1];
            let ny = this._vertices[2*ei] - px;

            // 判定数値
            let dval = px*nx + py*ny;

            // 半空間による切り取り
            current = current._clip_by_halfspace( nx, ny, dval );
            if ( current === null ) {
                // this と polygon は交差しない
                break;
            }
        }

        return current;
    }


    /**
     * 半空間により凸多角形を切り取る
     *
     * - 半空間により凸多角形 this を切り取ったり、その凸多角形を返す。
     * - 半空間が this を内包するときは this を返す。
     * - 半空間と this が交差しないときは null を返す。
     *
     * @param nx    半空間の内側方向の x 座標
     * @param ny    半空間の内側方向の y 座標
     * @param dval  判定用数値
     *
     * @return 凸多角形または null
     *
     * @throws Error  半空間による切り取りに失敗
     */
    private _clip_by_halfspace( nx: number, ny: number, dval: number ): ConvexPolygon | null
    {
        // 半空間の境界線からの距離範囲
        let dist_min =  Number.MAX_VALUE;
        let dist_max = -Number.MAX_VALUE;

        for ( let i = 0; i < this._num_vertices; ++i ) {
            // 頂点座標
            let px = this._vertices[2*i    ];
            let py = this._vertices[2*i + 1];

            // dist == 0 半空間の境界線上
            // dist > 0  半空間の内側
            // dist < 0  半空間の外側
            let dist = px*nx + py*ny - dval;

            // 最大最小を更新
            dist_min = Math.min( dist_min, dist );
            dist_max = Math.max( dist_max, dist );
        }

        if ( dist_min >= 0 ) {
            // 半空間は this を内包する
            return this;
        }

        if ( dist_max <= 0 ) {
            // 半空間 と this は交差しない
            return null;
        }

        // ここで dist_min < 0 < dist_max なので、半空間の境界線は凸多角形
        // this の内部を通過している (接していない)

        return this._clip_by_crossed_halfspace( nx, ny, dval );
    }


    /**
     * 半空間により凸多角形を切り取る (一部交差前提)
     *
     * 半空間により凸多角形 this を切り取ったり、その凸多角形を返す。
     *
     * このメソッドは凸多角形 this の境界線と半空間の境界線が異なる
     *    2 点で交差していることが前提になっている。
     *
     * @param nx    半空間の内側方向の x 座標
     * @param ny    半空間の内側方向の y 座標
     * @param dval  判定用数値
     *
     * @return 凸多角形
     *
     * @throws Error  半空間による切り取りに失敗
     */
    private _clip_by_crossed_halfspace( nx: number, ny: number, dval: number ): ConvexPolygon
    {
        let [ce0, ce1] = this._get_cross_edges_by_crossed_halfspace_boundary( nx, ny, dval );

        let polygon = [];

        // 最初の頂点
        polygon.push( ce0.qx );
        polygon.push( ce0.qy );

        // 中間頂点のインデックス
        let first_i = ce0.ei;  // 最初の中間頂点
        let last_i  = ce1.ei;  // 最後の中間頂点の次

        // 中間の頂点
        for ( let i = first_i; i != last_i; i = (i + 1) % this._num_vertices ) {
            polygon.push( this._vertices[2*i    ] );
            polygon.push( this._vertices[2*i + 1] );
        }

        // 最後の頂点
        polygon.push( ce1.qx );
        polygon.push( ce1.qy );

        return new ConvexPolygon( polygon );
    }


    /**
     * 半空間境界線と交差する2稜線のデータを取得 (2点交差前提)
     *
     * - 2要素の配列を返す。
     * - 最初の要素は切り取りにより前方が残される稜線のデータである。
     * - 次の要素は切り取りにより後方が残される稜線のデータである。
     *
     * 配列の各要素のオブジェクトプロパティは次のようになる。
     *
     * | ei | 境界線と交差した稜線の終点インデックス |
     * | qx | 境界線と稜線が交差した位置の x 座標 |
     * | qy | 境界線と稜線が交差した位置の y 座標 |
     *
     *
     * @param nx    半空間の内側方向の x 座標
     * @param ny    半空間の内側方向の y 座標
     * @param dval  判定用数値
     *
     * @return 2稜線の交差データ
     *
     * @throws Error  2点の交差が見つからなかった
     */
    private _get_cross_edges_by_crossed_halfspace_boundary( nx: number, ny: number, dval: number ): CrossEdgesByCrossedHalfspaceBoundary[]
    {
        let cross_edges = new Array( 2 );

        for ( let si = 0, ce_count = 0; ce_count < 2; ++si ) {
            if ( si == this._num_vertices ) {
                // 妥当でない凸多角形、数値計算誤差、非数値の混入などで
                // 2点の交差が見つからず、無限ループになる可能性がある
                // それを避けるため、すべての稜線を調べ終わったら例外で
                // 強制的に終了する
                throw new Error( "cross edges could not be found" );
            }

            let ei = (si + 1) % this._num_vertices;

            // 稜線の始点位置
            let sx = this._vertices[2*si    ];
            let sy = this._vertices[2*si + 1];

            // 稜線の終点位置
            let ex = this._vertices[2*ei    ];
            let ey = this._vertices[2*ei + 1];

            // 境界線からの距離
            let sd = sx*nx + sy*ny - dval;
            let ed = ex*nx + ey*ny - dval;

            // 半空間境界線と si-ei 稜線の交差があればデータを追加
            if ( (sd <= 0 && 0 < ed) || (ed <= 0 && 0 < sd) ) {
                let t  = sd / (sd - ed);
                let qx = sx + (ex - sx) * t;
                let qy = sy + (ey - sy) * t;

                cross_edges[(sd < ed) ? 0 : 1] = { ei, qx, qy };

                ++ce_count;
            }
        }

        return cross_edges;
    }

}


interface CrossEdgesByCrossedHalfspaceBoundary {
    ei: number,
    qx: number,
    qy: number,
}



export default ConvexPolygon;
