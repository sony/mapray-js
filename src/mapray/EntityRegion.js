import GeoMath from "./GeoMath";


/**
 * @summary エンティティ領域
 *
 * @classdesc
 * <p>標高の変化に伴い、エンティティの更新を行うためのクラスである。</p>
 *
 * @memberof mapray
 * @private
 * @see mapray.UpdatedTileArea
 */
class EntityRegion {

    /**
     */
    constructor()
    {
        this._is_compiled = false;

        this._point_array = new Float64Array( 0 );
        this._num_points  = 0;

        this._node_array = new Uint32Array( 0 );
        this._next_node  = 0;
    }


    /**
     * @summary 位置を追加
     *
     * @desc
     * <p>point.altitude は無視される。</p>
     *
     * @param {mapray.GeoPoint} point  位置
     */
    addPoint( point )
    {
        this._checkNotCompiled();
        this._ensurePointArrayCapacity( 2 );

        var index = 2 * this._num_points;

        this._point_array[index]     = point.longitude;
        this._point_array[index + 1] = point.latitude;

        this._num_points += 1;
    }


    /**
     * @summary 複数の位置を追加
     *
     * @param {number[]} points      頂点配列 (経度, 緯度, ...)
     * @param {number}   offset      先頭インデックス
     * @param {number}   stride      ストライド
     * @param {number}   num_points  頂点数
     */
    addPoints( points, offset, stride, num_points )
    {
        this._checkNotCompiled();
        this._ensurePointArrayCapacity( 2 * num_points );

        var src_index = offset;
        var dst_index = 2 * this._num_points;
        var dst_array = this._point_array;

        for ( var i = 0; i < num_points; ++i ) {
            dst_array[dst_index]     = points[src_index];
            dst_array[dst_index + 1] = points[src_index + 1];
            src_index += stride;
            dst_index += 2;
        }

        this._num_points += num_points;
    }


    /**
     * @summary 比較処理用に翻訳
     *
     * @package
     */
    compile()
    {
        if ( this._is_compiled ) {
            // すでに翻訳済み
            return;
        }

        this._buildCollisionQuadTree();

        // this._node_array から使っていない最後の領域を削除
        if ( this._node_array.length > this._next_node ) {
            this._node_array = new Uint32Array( this._node_array.slice( 0, this._next_node ) );
        }

        this._point_array = null;  // 翻訳後は使わないので捨てる
        this._is_compiled = true;  // 翻訳済みにする
    }


    /**
     * @summary this と area は交差するか？
     *
     * @param {mapray.UpdatedTileArea} area  判定する領域
     *
     * @return {boolean}  交差するとき true, それ以外のとき false
     *
     * @package
     */
    intersectsWith( area )
    {
        if ( this._node_array.length == 0 ) {
            // this は空領域
            return false;
        }

        var area_list = area.getFlatAreaList();

        for ( var i = 0; i < area_list.length; ++i ) {
            if ( this._intersectsWith( area_list[i] ) ) {
                // ある領域が交差した
                return true;
            }
        }

        // すべての領域が交差しなかった
        return false;
    }


    /**
     * @summary this と area は交差するか？ (単一領域)
     *
     * @param  {Uint8Array} area  判定する領域
     *
     * @return {boolean}  交差するとき true, それ以外のとき false
     *
     * @private
     */
    _intersectsWith( area )
    {
        // assert this._node_array.length > 0

        var node       = 0;
        var node_array = this._node_array;

        for ( var i = 0; i < area.length; ++i ) {
            node = node_array[node + area[i]];

            if ( node == FULL_INDEX ) {
                // 交差する (area は全域ノードの内側)
                return true;
            }
            else if ( node == EMPTY_INDEX ) {
                // 交差しない (area は空ノードの内側)
                return false;
            }
        }

        // 交差する
        //   area.length == 0 (全球領域) または area の最後が this 階層の途中
        return true;
    }


    /**
     * @summary すでに翻訳されてるときエラー
     *
     * @private
     */
    _checkNotCompiled()
    {
        if ( this._is_compiled ) {
            throw new Error( "EitityRegion is already compiled." );
        }
    }


    /**
     * @summary this._point_array の容量を十分にする
     *
     * @param {number} added_size  追加サイズ
     *
     * @private
     */
    _ensurePointArrayCapacity( added_size )
    {
        var old_size        = 2 * this._num_points;
        var needed_capacity = old_size + added_size;
        var old_capacity    = this._point_array.length;

        if ( needed_capacity > old_capacity ) {
            // 配列を拡張する
            var new_capacity    = Math.max( needed_capacity, Math.floor( 1.5 * old_capacity ) );
            var new_point_array = new Float64Array( new_capacity );
            new_point_array.set( this._point_array.slice( 0, old_size ) );
            this._point_array = new_point_array;
        }
    }


    /**
     * @summary 領域判定四分木を構築
     *
     * @private
     */
    _buildCollisionQuadTree()
    {
        var dPI = 2 * Math.PI;

        var point_array = this._point_array;
        var num_floats  = 2 * this._num_points;

        for ( var i = 0; i < num_floats; ) {
            // 経緯度 (Degrees)
            var lon = point_array[i++];
            var lat = point_array[i++];

            // 正規化経緯度 (Degrees)
            var _lon = lon + 180 * Math.floor( (90 - lat) / 360 + Math.floor( (90 + lat) / 360 ) );
            var nlon = _lon - 360 - 360 * Math.floor( (_lon - 180) / 360 );               // 正規化経度 [-180,180)
            var nlat = 90 - Math.abs( 90 - lat + 360 * Math.floor( (90 + lat) / 360 ) );  // 正規化緯度 [-90,90]

            // 単位球メルカトル座標
            var xm = nlon * GeoMath.DEGREE;
            var ym = GeoMath.invGudermannian( nlat * GeoMath.DEGREE );

            // 基底タイル座標 (左上(0, 0)、右下(1, 1))
            var xt = xm / dPI + 0.5;
            var yt = 0.5 - ym / dPI;

            // ノードを追加
            this._addCollisionQuadTreeNode( xt, yt );
        }

        // 全域ノードを設定
        if ( this._next_node > 0 ) {
            this._setFullNodeRecur( 0 );
            this._reduceNodeRecur( 0 );
        }
    }


    /**
     * @summary 領域判定四分木のノードを追加
     *
     * @param {number} xt  基底タイル座標 X
     * @param {number} yt  基底タイル座標 Y
     *
     * @private
     */
    _addCollisionQuadTreeNode( xt, yt )
    {
        if ( yt < 0 || yt > 1 ) {
            // 緯度が範囲外 (極に近い)
            return;
        }

        var  size = 1 << MAX_LEVEL;
        var ubits = GeoMath.clamp( Math.floor( xt * size ), 0, size - 1 );
        var vbits = Math.min( Math.floor( yt * size ), size - 1 );  // >= 0
        var  node = this._findRootNode();

        for ( var mask = size >> 1; mask != 0; mask >>= 1 ) {
            var u = ((ubits & mask) == 0) ? 0 : 1;
            var v = ((vbits & mask) == 0) ? 0 : 2;
            node = this._findChildNode( node, u + v );
        }
    }


    /**
     * @summary 最上位ノードを検索
     *
     * @return {number}  最上位ノード
     *
     * @private
     */
    _findRootNode()
    {
        if ( this._next_node == 0 ) {
            // まだ最上位ノードが存在しない
            // 最上位ノードを生成する
            this._ensureNodeArrayCapacity();

            for ( var i = 0; i < 4; ++i ) {
                this._node_array[i] = EMPTY_INDEX;
            }
            this._next_node = 4;
        }

        return 0;
    }


    /**
     * @summary 子ノードを検索
     *
     * @param  {number} parent  親ノード
     * @param  {number} ichild  子ノード序列 (0-3)
     * @return {number}         子ノード
     *
     * @private
     */
    _findChildNode( parent, ichild )
    {
        var child = this._node_array[parent + ichild];

        if ( child == 0 ) {
            // まだ子ノードが存在しない
            // 子ノードを生成する
            this._ensureNodeArrayCapacity();

            child = this._next_node;
            for ( var i = 0; i < 4; ++i ) {
                this._node_array[child + i] = EMPTY_INDEX;
            }
            this._next_node += 4;

            // 親ノードに生成した子ノードを取り付ける
            this._node_array[parent + ichild] = child;
        }

        return child;
    }


    /**
     * @summary 全域ノードを再帰的に設定
     *
     * @desc
     * <p>末端ノードの子ノードを FULL_INDEX に設定する。</p>
     *
     * @param {number} node  ノードの索引
     *
     * @private
     */
    _setFullNodeRecur( node )
    {
        var node_array = this._node_array;
        var is_leaf    = true;

        for ( var i = 0; i < 4; ++i ) {
            var child = node_array[node + i];
            if ( child != EMPTY_INDEX ) {
                this._setFullNodeRecur( child );
                is_leaf = false;
            }
        }

        // 末端なら子ノードを FULL_INDEX
        if ( is_leaf ) {
            for ( i = 0; i < 4; ++i ) {
                node_array[node + i] = FULL_INDEX;
            }
        }
    }


    /**
     * @summary 全域ノードを再帰的に設定
     *
     * @param  {number} node  ノードの索引
     * @return {boolean}      全域ノードなら true, その他なら false
     *
     * @private
     */
    _reduceNodeRecur( node )
    {
        var node_array = this._node_array;
        var num_fulls  = 0;

        for ( var i = 0; i < 4; ++i ) {
            var child = node_array[node + i];
            if ( child == FULL_INDEX ) {
                ++num_fulls;
            }
            else if ( child != EMPTY_INDEX ) {
                if ( this._reduceNodeRecur( child ) ) {
                    node_array[node + i] = FULL_INDEX;
                    ++num_fulls;
                }
            }
        }

        return (num_fulls == 4);
    }


    /**
     * @summary this._node_array の容量を十分にする
     *
     * @private
     */
    _ensureNodeArrayCapacity()
    {
        var old_size        = this._next_node;
        var needed_capacity = old_size + 4;
        var old_capacity    = this._node_array.length;

        if ( needed_capacity > old_capacity ) {
            // 配列を拡張する
            var new_capacity    = Math.max( needed_capacity, Math.floor( 1.5 * old_capacity ) );
            var new_node_array = new Uint32Array( new_capacity );
            new_node_array.set( this._node_array.slice( 0, old_size ) );
            this._node_array = new_node_array;
        }
    }

}


var MAX_LEVEL   = 20;          // 整数: 0～30
var EMPTY_INDEX = 0;           // 空ノードの索引
var FULL_INDEX  = 4294967295;  // 全域ノードの索引 = 2^32 - 1


export default EntityRegion;
