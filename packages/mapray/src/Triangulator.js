/**
 * @summary 多角形を三角形に分割
 *
 * @classdesc
 * <p>入力した多角形を三角形に分割して結果を返す。</p>
 * <p>構築子と addBoundary() でで多角形を入力して、run() メソッドでそれを三角形に分割して返す。</p>
 *
 * <p>実装のアルゴリズムと用語は基本的にコンピュータ・ジオメトリ (近代科学社) の第３章「多角形の三角形分割」を参考にしている。</p>
 *
 * @memberof mapray
 * @private
 */
class Triangulator {

    /**
     * @desc
     * <p>points は多角形の頂点の xy 座標の配列である。</p>
     * <p>座標系は x 軸が右方向、y 軸が上方向を想定している。</p>
     *
     * @param {number[]|Float64Array} points  頂点配列
     * @param {number}   offset  最初の頂点のインデックス (>= 0)
     * @param {number}   stride  頂点の間隔 (>= 2)
     * @param {number}   count   頂点数
     */
    constructor( points, offset, stride, count )
    {
        this._points   = new Float64Array( 2 * count );
        this._polygons = new Set();

        // 頂点座標を複製
        let src = offset;
        let dst = 0;
        for ( let i = 0; i < count; ++i ) {
            this._points[dst    ] = points[src    ];
            this._points[dst + 1] = points[src + 1];
            src += stride;
            dst += 2;
        }
    }


    /**
     * @summary 多角形の境界を追加
     *
     * @desc
     * <p>インデックスの順序は外側境界のときは反時計回り、内側境界のときは時計回りでなければならない。</p>
     * <p>内側境界を追加するときは、その外側の境界も追加しなければならない。追加の順序はどちらが先でも良い。</p>
     * <p>境界内または複数の境界間でエッジが交差してはならない。同じように頂点が他の頂点またはエッジの上に乗ってはならない。</p>
     *
     * @param {number[]} indices  多角形の境界を表す 3 個以上の頂点インデックス
     */
    addBoundary( indices )
    {
        this._polygons.add( Polygon.create( this._points, indices ) );
    }


    /**
     * @summary 多角形を三角形に分割して結果を取得
     *
     * @desc
     * <p>各々の三角形は 3 つの整数インデックスが反時計回りに並べて表現される。
     * すべての三角形に対して、その表現を連結した配列を出力する。</p>
     * <p>インデックスは入力頂点の最初の頂点を 0 とする。</p>
     *
     * @throws Error  想定外の多角形
     *
     * @return {Uint32Array}  三角形の頂点インデックスの配列
     */
    run()
    {
        // 多角形を y 単調多角形に分割
        this._makeYMonotonePolygons();

        let triangles = new Uint32Array( 3 * this._numTriangles() );
        let    offset = 0;

        // 各 y 単調多角形を三角形に分割
        for ( let polygon of this._polygons ) {
            let temp = this._makeTriangleArray( polygon );
            triangles.set( temp, offset );
            offset += temp.length;
        };

        return triangles;
    }


    /**
     * @summary 三角形の数を取得
     *
     * @return {number} 三角形の数
     *
     * @private
     */
    _numTriangles()
    {
        let count = 0;

        for ( let polygon of this._polygons ) {
            count += polygon.numVertices() - 2;
        };

        return count;
    }


    /**
     * @summary 多角形を y 単調多角形に分割
     *
     * @desc
     * <p>this._polygons を y 軸単調な部分多角形に分割する。</p>
     *
     * @private
     */
    _makeYMonotonePolygons()
    {
        let vertices = this._getYOrderedVertices();
        let edge_mgr = new EdgeManager();
        let diag_mgr = new DiagonalManager( this._polygons );

        for ( let i = 0; i < vertices.length; ++i ) {
            let vertex = vertices[i];

            switch ( vertex.getVertexType() ) {
            case "start": {
                let ledge = vertex.getFrontEdge();
                edge_mgr.addEdge( ledge, vertex );
            } break;

            case "end": {
                let ledge = vertex.getBackEdge();
                let lhelp = edge_mgr.getHelper( ledge );
                if ( lhelp.getVertexType() == "merge" ) {
                    diag_mgr.addDiagonal( vertex, lhelp );
                }
                edge_mgr.removeEdge( ledge );
            } break;

            case "split": {
                let nedge = edge_mgr.findNearestLeftEdge( vertex );
                diag_mgr.addDiagonal( vertex, edge_mgr.getHelper( nedge ) );
                edge_mgr.setHelper( nedge, vertex );

                let redge = vertex.getFrontEdge();
                edge_mgr.addEdge( redge, vertex );
            } break;

            case "merge": {
                let redge = vertex.getBackEdge();
                let rhelp = edge_mgr.getHelper( redge );
                if ( rhelp.getVertexType() == "merge" ) {
                    diag_mgr.addDiagonal( vertex, rhelp );
                }
                edge_mgr.removeEdge( redge );

                let nedge = edge_mgr.findNearestLeftEdge( vertex );
                let nhelp = edge_mgr.getHelper( nedge );
                if ( nhelp.getVertexType() == "merge" ) {
                    diag_mgr.addDiagonal( vertex, nhelp );
                }
                edge_mgr.setHelper( nedge, vertex );
            } break;

            default: { // "regular"
                if ( vertex.isRightInner() ) {
                    // vertex の局所右は多角形の内側
                    let uedge = vertex.getBackEdge();
                    let uhelp = edge_mgr.getHelper( uedge );
                    if ( uhelp.getVertexType() == "merge" ) {
                        diag_mgr.addDiagonal( vertex, uhelp );
                    }
                    edge_mgr.removeEdge( uedge );

                    let dedge = vertex.getFrontEdge();
                    edge_mgr.addEdge( dedge, vertex );
                }
                else {
                    // vertex の局所右は多角形の外側
                    let nedge = edge_mgr.findNearestLeftEdge( vertex );
                    let nhelp = edge_mgr.getHelper( nedge );
                    if ( nhelp.getVertexType() == "merge" ) {
                        diag_mgr.addDiagonal( vertex, nhelp );
                    }
                    edge_mgr.setHelper( nedge, vertex );
                }
            } break;
            }
        }

        // this._polygons を対角線により分割
        diag_mgr.splitPolygons();
    }


    /**
     * @summary 上から順の頂点配列を取得
     *
     * @return {Vertex[]}  Y 位置降順の頂点配列
     *
     * @private
     */
    _getYOrderedVertices()
    {
        let vertices = [];

        for ( let polygon of this._polygons ) {
            Array.prototype.push.apply( vertices, polygon.getVertices() );
        };

        return vertices.sort( (a, b) => Vertex.comparePositionY( b, a ) );
    }


    /**
     * @summary 多角形を三角形に分割
     *
     * @desc
     * <p>y 単調多角形 polygon を 1 つ以上の三角形に分割して返す。</p>
     * <p>1 つの三角形は 3 つの整数インデックスで表現され、三角形数の3倍の長さの整数配列を返す。
     * このインデックスは入力頂点配列に対するもので、3 頂点は反時計回りで格納される。</p>
     *
     * @param {Polygon} polygon  y 単調多角形
     *
     * @return {Uint32Array}  三角形の配列
     *
     * @private
     */
    _makeTriangleArray( polygon )
    {
        let ti = 0;
        let triangles = new Uint32Array( 3 * (polygon.numVertices() - 2) );

        let stack = new Stack();

        let vi = 0;
        let vertices = polygon.getVertices().sort( (a, b) => Vertex.comparePositionY( b, a ) );
        let is_right = (vertices[0].prev === vertices[1]);  // スタックのチェインが右側か？

        stack.push( vertices[vi++] );
        stack.push( vertices[vi++] );

        while ( vi < vertices.length - 1 ) {
            let vertex = vertices[vi];

            let is_same_chain = is_right ? (vertex === stack.top.prev) : (vertex === stack.top.next);

            if ( is_same_chain ) {
                let v2 = stack.pop();
                while ( stack.size > 0 ) {
                    let v3 = stack.top;
                    let [a, b] = is_right ? [v2, v3] : [v3, v2];
                    if ( Vertex.isCCW( vertex, a, b ) ) {
                        // 対角線が多角形の内部 -> 三角形を取り出す
                        triangles[ti++] = vertex.id;
                        triangles[ti++] = a.id;
                        triangles[ti++] = b.id;
                        v2 = stack.pop();
                    }
                    else {
                        break;
                    }
                }
                stack.push( v2 );  // 最後にポップした頂点をスタックに戻す
                stack.push( vertex );
            }
            else {
                // すべての頂点をスタックからポップ
                let v2 = stack.pop();
                while ( stack.size > 0 ) {
                    // 三角形を取り出す
                    let v3 = stack.pop();
                    let [a, b] = is_right ? [v2, v3] : [v3, v2];
                    triangles[ti++] = vertex.id;
                    triangles[ti++] = a.id;
                    triangles[ti++] = b.id;
                    v2 = v3;
                }
                stack.push( vertices[vi - 1] );
                stack.push( vertex );

                // スタックのチェインが左右反転
                is_right = !is_right;
            }

            ++vi;
        }

        // スタックの最初と最後の頂点を除いて、最下点から
        // スタック上のすべての頂点への対角線を加える
        let vertex = vertices[vi];
        let v2     = stack.pop();

        while ( stack.size > 0 ) {
            // 三角形を取り出す
            let v3 = stack.pop();
            let [a, b] = is_right ? [v2, v3] : [v3, v2];
            triangles[ti++] = vertex.id;
            triangles[ti++] = a.id;
            triangles[ti++] = b.id;
            v2 = v3;
        }

        return triangles;
    }

}


/**
 * @summary 多角形の頂点
 *
 * @private
 */
class Vertex {

    /**
     * @param {number} id  頂点 ID
     * @param {number} x   x 座標
     * @param {number} y   y 座標
     */
    constructor( id, x, y )
    {
        this.id      = id;
        this.x       = x;
        this.y       = y;
        this.polygon = null;
        this.next    = null;
        this.prev    = null;
    }


    /**
     * @summary 複製
     *
     * @desc
     * <p>ただし this.polygon, this.next, this.prev には null が設定される。</p>
     *
     * @return {Vertex}  this の複製
     */
    clone()
    {
        return new Vertex( this.id, this.x, this.y );
    }


    /**
     * @summary 頂点タイプを取得
     *
     * @desc
     * 以下のタイプの何れかを返す。
     * <pre>
     *   "start"    出発点 (□)
     *   "end"      最終点 (■)
     *   "split"    分離点 (▲)
     *   "merge"    統合点 (▼)
     *   "regular"  普通点 (●)
     * </pre>
     *
     * @return {string}  頂点タイプ
     */
    getVertexType()
    {
        let  prev = this.prev;
        let  next = this.next;
        let cprev = Vertex.comparePositionY( prev, this );
        let cnext = Vertex.comparePositionY( next, this );

        if ( (cprev > 0 && cnext > 0) || (cprev < 0 && cnext < 0) ) {
            // 両側の点が上、または両側の点が下にある

            // r: (prev -> this) ベクトルに対して左 (反時計回り) に直角なベクトル
            let rx = prev.y - this.y;
            let ry = this.x - prev.x;

            // v: (this -> next) ベクトル
            let vx = next.x - this.x;
            let vy = next.y - this.y;

            // dot( r, v ): 負数なら内角が 180 度より大きい
            let dot = rx*vx + ry*vy;

            if ( cprev > 0 && cnext > 0 ) {
                // 両側の点が上にある
                return (dot < 0) ? "merge" : "end";
            }
            else {
                // 両側の点が下にある
                return (dot < 0) ? "split" : "start";
            }
        }
        else {
            // 片方の点が上で片方の点が下
            return "regular";
        }
    }


    /**
     * @summary 前方エッジ
     *
     * @return {Vertex}  前方エッジの始点
     */
    getFrontEdge()
    {
        return this;
    }


    /**
     * @summary 後方エッジ
     *
     * @return {Vertex}  後方エッジの始点
     */
    getBackEdge()
    {
        return this.prev;
    }


    /**
     * @summary 頂点の局所右は多角形の内側か？
     *
     * @desc
     * <p>頂点の局所的な右側は多角形の内側かどうかを返す。</p>
     * <p>this は regular タイプの頂点でなければならない。</p>
     *
     * @return {boolean}  内側のとき true, そうでなければ false
     */
    isRightInner()
    {
        // 次の点のほうが下のとき、vertex の右が内側
        return Vertex.comparePositionY( this.next, this ) < 0;
    }


    /**
     * @summary 点の高さを比較
     *
     * @desc
     * <p>v1 の点が v2 の点より低いとき -1, v1 の点が v2 の点より高いとき +1, 高さが同じとき 0 を返す。</p>
     *
     * @param {Vertex} v1  頂点 1
     * @param {Vertex} v2  頂点 2
     *
     * @return {number} 比較結果
     */
    static
    comparePositionY( v1, v2 )
    {
        if ( v1.y < v2.y || (v1.y == v2.y && v1.x > v2.x) ) {
            // v1 (<) v2
            return -1;
        }
        else if ( v1.y > v2.y || (v1.y == v2.y && v1.x < v2.x) ) {
            // v1 (>) v2
            return 1;
        }
        else {
            // v1 (=) v2
            return 0;
        }
    }


    /**
     * @summary 3 点は反時計回りか？
     *
     * @param {Vertex} v1  頂点 1
     * @param {Vertex} v2  頂点 2
     * @param {Vertex} v3  頂点 3
     *
     * @return {boolean}  反時計回りのとき true, そうでなければ false
     */
    static
    isCCW( v1, v2, v3 )
    {
        // a = v2 - v1
        let ax = v2.x - v1.x;
        let ay = v2.y - v1.y;

        // b = v3 - v1
        let bx = v3.x - v1.x;
        let by = v3.y - v1.y;

        // det( |a b| ) > 0
        return ax * by - ay * bx > 0;
    }

}


/**
 * @summary 多角形
 *
 * @private
 */
class Polygon {

    constructor()
    {
        this._first = null;
    }


    /**
     * @summary 多角形を生成
     *
     * @desc
     * <p>coords は多角形の頂点の xy 座標の配列である。</p>
     * <p>座標系は x 軸が右方向、y 軸が上方向を想定している。</p>
     * <p>indices での頂点の順序は反時計回りである。<p>
     *
     * @param {number[]} coords   座標配列
     * @param {number[]} indices  多角形の頂点インデックス配列 (indices.length >= 3)
     *
     * @return {Polygon}  Polygon インスタンス
     */
    static
    create( coords, indices )
    {
        let poly = new Polygon();

        let id     = indices[0];
        let base   = 2*id;
        let vertex = new Vertex( id, coords[base], coords[base + 1] );

        poly._first = vertex;

        for ( let i = 1; i < indices.length; ++i ) {
            let before = vertex;

            id     = indices[i];
            base   = 2*id;
            vertex = new Vertex( id, coords[base], coords[base + 1] );

            before.next = vertex;
            vertex.prev = before;
        }

        // ここで vertex は最後の頂点
        poly._first.prev = vertex;
        vertex.next = poly._first;

        poly._updateVertices();
        return poly;
    }


    /**
     * @summary 多角形を生成
     *
     * @param {Vertex} first  最初の頂点
     *
     * @return {Polygon}  Polygon インスタンス
     */
    static
    createByVertex( first )
    {
        let poly = new Polygon();

        poly._first = first;

        poly._updateVertices();
        return poly;
    }


    /**
     * @summary 頂点数を取得
     *
     * @return {number}  頂点数
     */
    numVertices()
    {
        let count = 0;

        let vertex = this._first;
        ++count;

        let end = this._first;
        for ( vertex = vertex.next; vertex !== end; vertex = vertex.next ) {
            ++count;
        }

        return count;
    }


    /**
     * @summary すべての頂点の配列を取得
     *
     * @return {Vertex[]}  すべての頂点の配列
     */
    getVertices()
    {
        let array = [];

        let vertex = this._first;
        array.push( vertex );

        let end = this._first;
        for ( vertex = vertex.next; vertex !== end; vertex = vertex.next ) {
            array.push( vertex );
        }

        return array;
    }


    /**
     * @summary 頂点を更新
     *
     * @private
     */
    _updateVertices()
    {
        let vertex = this._first;
        vertex.polygon = this;

        let end = this._first;
        for ( vertex = vertex.next; vertex !== end; vertex = vertex.next ) {
            vertex.polygon = this;
        }
    }

}


/**
 * @summary 単調多角形に分割するためのエッジ管理
 *
 * @classdesc
 * <p>追加されるエッジの局所右は常に多角形の内側になる。</p>
 *
 * @private
 */
class EdgeManager {

    /**
     */
    constructor()
    {
        this._edges = new Map();
    }


    /**
     * @summary エッジを追加
     *
     * @param {Vertex} edge    追加するエッジ
     * @param {Vertex} helper  初期ヘルパー頂点
     */
    addEdge( edge, helper )
    {
        this._edges.set( edge, { helper: helper } );
    }


    /**
     * @summary エッジを削除
     *
     * @param {Vertex} edge  削除するエッジ
     */
    removeEdge( edge )
    {
        this._edges.delete( edge );
    }


    /**
     * @summary エッジにヘルパーを設定
     *
     * @param {Vertex} edge    対象エッジ
     * @param {Vertex} helper  ヘルパー頂点
     */
    setHelper( edge, helper )
    {
        this._edges.get( edge ).helper = helper;
    }


    /**
     * @summary エッジのヘルパーを取得
     *
     * @param {Vertex} edge  対象エッジ
     *
     * @return {Vertex}  ヘルパー頂点
     */
    getHelper( edge )
    {
        return this._edges.get( edge ).helper;
    }


    /**
     * @summary 頂点の左側で最も近いエッジを検索
     *
     * @desc
     * <p>vertex を左に (多角形の内側を) 移動しながら最初に突き当たるエッジを取得する。
     *    そのようなエッジが常に存在することが前提になっている。</p>
     *
     * <p>vertex の局所左は常に多角形の内側になる。</p>
     *
     * @param {Vertex} vertex  対象頂点
     *
     * @return {Vertex}  エッジ
     */
    findNearestLeftEdge( vertex )
    {
        // このメソッドが呼び出された時点での前提状態:
        //   - どちらかの端点が vertex のエッジは存在しない
        //   - 両端の y 座標が同じエッジは存在しない
        //   - すべてのエッジは vertex を通る水平線と交差する

        // TODO:
        //   このメソッドは多角形の頂点数 n に対して計算量は最悪 O(n), 平均は不明
        //   最悪の場合、ポリゴン分割全体の計算量が O(n^2) になってしまう
        //   そのため、このめメソッド単体で最悪 O(log n) または平均 O(log n) 以下にしたい

        let nearest_edge;
        let min_distance = Number.MAX_VALUE;

        let vx = vertex.x;
        let vy = vertex.y;

        for ( let [edge,] of this._edges ) {
            // エッジ始点 p
            let px = edge.x;
            let py = edge.y;

            // エッジ終点 q
            let qx = edge.next.x;
            let qy = edge.next.y;

            // エッジの x 座標勾配
            let gx = (qx - px) / (qy - py);

            // 水平線とエッジの交点の x 座標
            let rx = px + (vy - py) * gx;

            // vertex と交点 r との符号付き距離 (正のとき r は vertex の左側)
            let distance = vx - rx;

            if ( distance > 0 ) {
                if ( distance < min_distance ) {
                    // 近いエッジを更新
                    min_distance = distance;
                    nearest_edge = edge;
                }
            }
        }

        if ( nearest_edge === undefined ) {
            // 想定に反して左のエッジが見つからなかった
            throw new Error( "Probably a degenerate polygon" );
        }

        return nearest_edge;
    }

}


/**
 * @summary 対角線
 *
 * @private
 */
class Diagonal {

    /**
     * @param {Vertex} v1  対角線の端点1
     * @param {Vertex} v2  対角線の端点2
     */
    constructor( v1, v2 )
    {
        this.v1 = v1;
        this.v2 = v2;
    }

}


/**
 * @summary 対角線管理
 *
 * @private
 */
class DiagonalManager {

    /**
     * @param {Set.<Polygon>} polygons  多角形集合
     */
    constructor( polygons )
    {
        this._polygons  = polygons;
        this._diagonals = [];
        this._dmap      = new DiagonalMap();
    }


    /**
     * @brief 対角線を追加
     *
     * @param {Vertex} v1  対角線の端点1
     * @param {Vertex} v2  対角線の端点2
     */
    addDiagonal( v1, v2 )
    {
        let diagonal = new Diagonal( v1, v2 );

        this._diagonals.push( diagonal );
        this._dmap.addDiagonal( diagonal );
    }


    /**
     * @brief すべての多角形を対角線で分割
     */
    splitPolygons()
    {
        // 対角線の順序をランダムにして、分割方向が偏らないようにする
        // これにより頂点数 n に対して計算量 O(n log n) が期待できる
        this._shuffleArray( this._diagonals );

        // 個々の対角線で多角形を分割
        while ( this._diagonals.length > 0 ) {
            let diagonal = this._diagonals.pop();
            this._dmap.removeDiagonal( diagonal );

            let v1 = diagonal.v1;
            let v2 = diagonal.v2;
            let [v1a, v2a] = this._splitPolygonHalf( v1, v2 );
            let [v2b, v1b] = this._splitPolygonHalf( v2, v1 );

            let p1 = v1.polygon;
            let p2 = v2.polygon;

            if ( p1 === p2 ) {
                // diagonal は多角形 p1 内の対角線
                this._polygons.delete( p1 );
                this._polygons.add( Polygon.createByVertex( v1a ) );
                this._polygons.add( Polygon.createByVertex( v1b ) );
            }
            else {
                // diagonal は多角形 p1, p2 間の対角線
                this._polygons.delete( p1 );
                this._polygons.delete( p2 );
                this._polygons.add( Polygon.createByVertex( v1a ) );
            }

            // 対角線の端点を新しく生成された端点に置き換える
            this._replaceVertexInDiagonals( v1, v1a, v1b );
            this._replaceVertexInDiagonals( v2, v2a, v2b );
        }
    }


    /**
     * @summary 多角形分割の半分の処理
     *
     * @param {Vertex} sv  開始点
     * @param {Vertex} ev  終了点
     *
     * @return {Vertex[]}  [新 sv, 新 ev]
     *
     * @private
     */
    _splitPolygonHalf( sv, ev )
    {
        let sc = sv.clone();
        let ec = ev.clone();

        sc.prev = sv.prev;
        sc.next = ec;
        sv.prev.next = sc;

        ec.prev = sc;
        ec.next = ev.next;
        ev.next.prev = ec;

        return [sc, ec];
    }


    /**
     * @summary 対角線の端点の置き換え
     *
     * @desc
     * <p>端点の1つが vo の対角線のその端点を va または vb に置き換える。</p>
     * <p>候補端点 va, vb のうち、置き換えると対角線が多角形の内側になる方を選ぶ。</p>
     * <p>一方が内側で、一方が外側になるはず。</p>
     *
     * @param {Vertex} vo  元の端点
     * @param {Vertex} va  候補端点 a
     * @param {Vertex} vb  候補端点 b
     *
     * @private
     */
    _replaceVertexInDiagonals( vo, va, vb )
    {
        // 一旦 this._dmap から対角線を抜き取って、端点を書き換えてから戻す
        for ( let diagonal of this._dmap.removeDiagonals( vo ) ) {
            // vo の反対側の端点
            let vo_oppo = (diagonal.v1 === vo) ? diagonal.v2 : diagonal.v1;
            // 対角線の端点の書き換え
            diagonal.v1 = this._testDiagonal( va, vo_oppo ) ? va : vb;
            diagonal.v2 = vo_oppo;
            // 対角線を戻す
            this._dmap.addDiagonal( diagonal );
        }
    }


    /**
     * @summary 対角線テスト
     *
     * <p>端点が v1, v2 の線分は多角形の (v1 の) 内側に入るか？</p>
     *
     * @param {Vertex} v1  端点1
     * @param {Vertex} v2  端点2
     *
     * @return {boolean}  内側に入るとき true, それ以外のとき false
     *
     * @private
     */
    _testDiagonal( v1, v2 )
    {
        // a: v1 から順方向のベクトル
        let ax = v1.next.x - v1.x;
        let ay = v1.next.y - v1.y;

        // b: v1 から逆方向のベクトル
        let bx = v1.prev.x - v1.x;
        let by = v1.prev.y - v1.y;

        // c: v1 から v2 のベクトル
        let cx = v2.x - v1.x;
        let cy = v2.y - v1.y;

        // cross(a) . c > 0
        let aflag = (ax*cy - cx*ay > 0);

        // cross(b) . c < 0
        let bflag = (bx*cy - cx*by < 0);

        // |ax bx|
        // |ay by|
        let det = ax*by - bx*ay;

        return (det >= 0) ? (aflag && bflag) : (aflag || bflag);
    }


    /**
     * @summary 配列の並びをランダム化
     *
     * @param {array} array  処理対象の配列
     *
     * @private
     */
    _shuffleArray( array )
    {
        // Fisher-Yates のシャッフル
        // TODO: 用途上、再現性のある乱数を使ってもよいし、そのほうが何かあった時に原因をつかみやすい

        for ( let i = array.length - 1; i > 0; --i ) {
            let j = Math.floor( Math.random() * (i + 1) );  // 0 <= j <= i

            // array[i] と array[j] を交換
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

}


/**
 * @summary 辞書: 対角線頂点 → 対角線リスト
 *
 * @classdesc
 * <p>対角線の頂点から、その頂点を端点とする対角線の配列を取得する。</p>
 * <p>1 つの頂点に対して対角線は最大 3 本なので、追加、削除、検索の計算量は多角形の頂点数 n に対して O(1) である。</p>
 *
 * @memberof DiagonalManager
 * @private
 */
class DiagonalMap {

    constructor()
    {
        // 辞書を生成
        // key:   Vertex
        // value: Diagonal[]
        this._map = new Map();
    }


    /**
     * @summary 対角線を登録
     *
     * @param {Diagonal} diagonal  追加する対角線
     */
    addDiagonal( diagonal )
    {
        this._addDiagonalByVertex( diagonal.v1, diagonal );
        this._addDiagonalByVertex( diagonal.v2, diagonal );
    }


    /**
     * @summary 対角線の登録を解除
     *
     * @param {Diagonal} diagonal  削除する対角線
     */
    removeDiagonal( diagonal )
    {
        this._removeDiagonalByVertex( diagonal.v1, diagonal );
        this._removeDiagonalByVertex( diagonal.v2, diagonal );
    }


    /**
     * @summary vertex を端点とする、すべの対角線の登録を解除
     *
     * @param {Vertex} vertex  対角線の端点
     *
     * @return {Diagonal[]}  登録を解除された対角線の配列
     */
    removeDiagonals( vertex )
    {
        let diagonals = this._map.get( vertex );

        if ( diagonals !== undefined ) {
            // 辞書から対角線を削除
            let cloned = diagonals.slice();
            for ( let diag of cloned ) {
                this.removeDiagonal( diag );
            }
            return cloned;
        }
        else {
            // 存在しなかった
            return [];
        }
    }


    /**
     * @summary 対角線を登録
     *
     * @param {Vertex}   vertex    どちらかの端点
     * @param {Diagonal} diagonal  追加する対角線
     *
     * @private
     */
    _addDiagonalByVertex( vertex, diagonal )
    {
        let array = this._map.get( vertex );

        if ( array === undefined ) {
            // vertex に対する最初の対角線
            this._map.set( vertex, [diagonal] );
        }
        else {
            // vertex に対する2つ目以降の対角線

            if ( array.indexOf( diagonal ) != -1 ) {
                // 対角線は二重登録されないはずが...
                throw new Error( "Unexpected" );
            }
            if ( array.length < 1 || array.length > 2 ) {
                // 同一頂点の対角線は最大3本のはずが...
                throw new Error( "Unexpected" );
            }

            array.push( diagonal );
        }
    }


    /**
     * @summary 対角線を削除
     *
     * @param {Vertex}   vertex    どちらかの端点
     * @param {Diagonal} diagonal  削除する対角線
     *
     * @private
     */
    _removeDiagonalByVertex( vertex, diagonal )
    {
        let array = this._map.get( vertex );
        if ( array === undefined ) {
            // 存在するはずが...
            throw new Error( "Unexpected" );
        }

        let index = array.indexOf( diagonal );
        if ( index == -1 ) {
            // 存在するはずが...
            throw new Error( "Unexpected" );
        }

        // 配列から diagonal を削除
        array.splice( index, 1 );

        // 配列が空になったら配列を削除
        if ( array.length == 0 ) {
            this._map.delete( vertex );
        }
    }

}


/**
 * @summary スタック
 *
 * @private
 */
class Stack {

    constructor()
    {
        this._array = new Array();
    }

    get size() { return this._array.length; }

    push( item )
    {
        this._array.push( item );
    }

    pop()
    {
        return this._array.pop();
    }

    get top()
    {
        let a = this._array;
        return (a.length > 0) ? a[a.length - 1] : null;
    }

}


export default Triangulator;
