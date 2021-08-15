// 辞書は二分探索木により実現している
// 二分探索木の挿入・削除操作は2色木で実装している
// 2色木のアルゴリズムは近代科学社の「アルゴリズムイントロダクション第3版」(以降 IA3) を参考にした


/**
 * @summary 2色木の番兵 (T.nil)
 *
 * @desc
 * <p>根の親、葉の子、または空辞書の root を表現する。</p>
 *
 * @see IA3/13.1 2色木の性質
 *
 * @private
 */
let T_nil: Item<any, any>;



type Item<Key, Value> = OrderedMap.Item<Key, Value>;



/**
 * @summary 順序あり辞書
 *
 * @classdesc
 * <p>キーの値により順序付けされる辞書である。</p>
 * <p>等価 (equivalent) キーを持つ複数のアイテムは存在できない。</p>
 * <p>this はキーと値の参照を保有している。保有しているキーのインスタンスを変更すると動作は保証されない。</p>
 *
 * @memberof mapray
 * @private
 */
class OrderedMap<Key, Value> {

    private _compare: any;

    private _root: any;

    private _size: number;


    /**
     * @param compare  キー比較関数
     */
    constructor( compare: OrderedMap.Compare<Key> )
    {
        this._compare = compare;
        this._root    = T_nil;
        this._size    = 0;
    }


    /**
     * @summary 要素数
     *
     * @type {number}
     * @readonly
     */
    get size() { return this._size; }


    /**
     * @summary インスタンスを複製
     *
     * @desc
     * <p>キー比較関数、キー、値はシャローコピーされる。<p>
     *
     * <p>計算量: 要素数 n に対して O(n)</p>
     *
     * @return {mapray.OrderedMap}  this の複製
     */
    clone()
    {
        let cloned = new OrderedMap<Key, Value>( this._compare );

        if ( this._root !== T_nil ) {
            cloned._root = this._root._clone( T_nil );
        }

        cloned._size = this._size;

        return cloned;
    }


    /**
     * @summary 要素は存在しないか？
     *
     * <p>計算量: 要素数 n に対して O(1)</p>
     *
     * @return {boolean}  要素が存在しないとき true, そうでないとき false
     */
    isEmpty()
    {
        return this._root === T_nil;
    }


    /**
     * 先頭要素を検索
     *
     * 順序が最初の要素を検索する。
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @return 検索されたアイテム (this が空なら null)
     */
    findFirst(): Item<Key, Value> | null
    {
        if ( this._root !== T_nil ) {
            return this._root._findMinimum();
        }
        else {
            return null;
        }
    }


    /**
     * 末尾要素を検索
     *
     * 順序が最後の要素を検索する。
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @return 検索されたアイテム (this が空なら null)
     */
    findLast(): Item<Key, Value> | null
    {
        if ( this._root !== T_nil ) {
            return this._root._findMaximum();
        }
        else {
            return null;
        }
    }


    /**
     * 下限要素を検索
     *
     * bound と同じまたは後になるキーが存在すれば、その中で最初の要素を返す。
     *
     * そのような要素が存在しない場合は null を返す。
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @param bound  境界キー
     *
     * @return 検索された要素、存在しなければ null
     */
    findLower( bound: Key ): Item<Key, Value> | null
    {
        return this._root._findLowerBound( bound, this._compare );
    }


    /**
     * 上限要素を検索
     *
     * bound より後になるキーが存在すれば、その中で最初の要素を返す。
     *
     * そのような要素が存在しない場合は null を返す。
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @param bound  境界キー
     *
     * @return 検索された要素、存在しなければ null
     */
    findUpper( bound: Key ): Item<Key, Value> | null
    {
        return this._root._findUpperBound( bound, this._compare );
    }


    /**
     * 要素を検索
     *
     * key と同じキーの要素が存在すれば返す。
     *
     * そのような要素が存在しない場合は null を返す。
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @param key  キー
     *
     * @return 検索された要素、存在しなければ null
     */
    findEqual( key: Key ): Item<Key, Value> | null
    {
        return this._root._findEqual( key, this._compare );
    }


    /**
     * @summary すべての要素を削除
     *
     * @desc
     * <p>計算量: 要素数 n に対して O(1)</p>
     */
    clear()
    {
        this._root = T_nil;
        this._size = 0;
    }


    /**
     * 要素を挿入
     *
     * キーを key として value を挿入し、そのアイテムを返す。</p>
     *
     * 計算量: 要素数 n に対して O(log n)
     *
     * @param key    キー
     * @param value  値
     *
     * @return 挿入された要素
     */
    insert( key: Key, value: Value ): Item<Key, Value>
    {
        // 参照: IA3/13.3 挿入

        let  trail = this._root;
        let parent = T_nil;
        const comp = this._compare;

        while ( trail !== T_nil ) {
            parent = trail;
            if ( comp( key, trail.key ) ) {
                // 左へ下る
                trail = trail._child_L;
            }
            else if ( comp( trail.key, key ) ) {
                // 右へ下る
                trail = trail._child_R;
            }
            else {
                // キーが一致したアイテムの値を更新して返す
                trail._value = value;
                return trail;
            }
        }

        // 新しいアイテムを追加
        const item = new OrderedMap.Item<Key, Value>( parent, key, value );
        item._is_red = true;  // 黒 → 赤

        if ( parent === T_nil ) {
            this._root = item;
        }
        else if ( comp( key, parent.key ) ) {
            parent._child_L = item;
        }
        else {
            parent._child_R = item;
        }

        // 要素数を増加
        ++this._size;

        // 2色木条件の回復
        this._insert_fixup( item );
        return item;
    }


    /**
     * 挿入後に2色木条件を満たすように木を修正
     *
     * 計算量: 要素数 n に対して最悪 O(log n)
     *
     * @param item  挿入されたアイテム
     *
     * @see IA3/13.3 挿入
     */
    private _insert_fixup( item: Item<Key, Value> )
    {
        let trail = item;

        while ( trail._parent._is_red /* 赤 */ ) {
            // ここでは、常に不変式 a, b, c を満たす
            if ( trail._parent === trail._parent._parent._child_L ) {
                // trail の親が祖父の左側
                let uncle = trail._parent._parent._child_R;
                if ( uncle._is_red /* 赤 */ ) {
                    // 場合 1
                    trail._parent._is_red = false; // 黒
                    uncle._is_red         = false; // 黒
                    trail._parent._parent._is_red = true; // 赤
                    trail = trail._parent._parent;
                }
                else {
                    if ( trail === trail._parent._child_R ) {
                        // 場合 2
                        trail = trail._parent;
                        this._rotate_L( trail );
                    }

                    // 場合 2,3
                    trail._parent._is_red         = false; // 黒
                    trail._parent._parent._is_red = true;  // 赤
                    this._rotate_R( trail._parent._parent );
                }
            }
            else {
                // trail の親が祖父の右側
                let uncle = trail._parent._parent._child_L;
                if ( uncle._is_red /* 赤 */ ) {
                    // 場合 1
                    trail._parent._is_red = false; // 黒
                    uncle._is_red         = false; // 黒
                    trail._parent._parent._is_red = true; // 赤
                    trail = trail._parent._parent;
                }
                else {
                    if ( trail === trail._parent._child_L ) {
                        // 場合 2
                        trail = trail._parent;
                        this._rotate_R( trail );
                    }

                    // 場合 2,3
                    trail._parent._is_red         = false; // 黒
                    trail._parent._parent._is_red = true;  // 赤
                    this._rotate_L( trail._parent._parent );
                }
            }
        }
        
        this._root._is_red = false; // 黒
        // ここで2色木条件を完全に満たす
    }


    /**
     * 要素を削除
     *
     * last を省略したときは first を削除して、first の後続を返す。このとき first に null
     *    を指定することはできない。
     *
     * last を指定したときは first から last の前までの要素を削除して last を返す。last は
     *    first と同じか後の要素でなければならない。
     *
     * null は this の末尾要素の次の要素を表す。
     *
     * 計算量: 1 要素の削除の場合、要素数 n に対して O(log n)
     *
     * todo: 複数要素の削除の計算量を分析
     *
     * @param first 削除する先頭の要素
     * @param last  削除する最後の要素の次
     *
     * @return 削除された要素の次の要素
     */
    remove( first: Item<Key, Value>, last?: Item<Key, Value> ): Item<Key, Value> | null
    {
        if ( last === undefined ) {
            return this._remove( first );
        }
        else {
            for ( let item = first; item != last; ) {
                item = this._remove( item ) as Item<Key, Value>; // null にならない
            }
            return last;
        }
    }


    /**
     * アイテムを削除
     *
     * 計算量: 全体ツリーのアイテム数 n に対して最悪 O(log n)</p>
     *
     * @param item  削除対象
     *
     * @return item の後続、存在しなければ null
     *
     * @see IA3/13.4 削除
     */
    private _remove( item: Item<Key, Value> ): Item<Key, Value> | null
    {
        // item の後続 (無ければ null)
        const succ = item.findSuccessor();

        let orgY_is_red;
        let x_item;

        if ( item._child_L === T_nil ) {
            // (a) 左側なし
            orgY_is_red = item._is_red;
            x_item      = item._child_R;
            this._replace( item._child_R, item );
        }
        else if ( item._child_R === T_nil ) {
            // (b) 右側なし (左側あり)
            orgY_is_red = item._is_red;
            x_item      = item._child_L;
            this._replace( item._child_L, item );
        }
        else {
            // 左右あり (succ は null ではない)
            const _succ = succ as Item<Key, Value>;
            orgY_is_red = _succ._is_red;
            x_item      = _succ._child_R;

            if ( _succ._parent === item ) {
                // (c) item の後続が item の右の子
                // x_item が T_nil であっても親を設定
                x_item._parent = _succ;
            }
            else {
                // (d) item の後続が item の右の子の左側
                this._replace( _succ._child_R, _succ );
                _succ._child_R         = item._child_R;
                _succ._child_R._parent = _succ;
            }

            // (c), (d)
            this._replace( _succ, item );
            _succ._child_L         = item._child_L;
            _succ._child_L._parent = _succ;
            _succ._is_red          = item._is_red;
        }
        
        // 要素数を減少
        --this._size;

        if ( !orgY_is_red /* 黒 */ ) {
            // 2色木条件の回復
            this._remove_fixup( x_item );
        }

        return succ;
    }


    /**
     * 削除後に2色木条件を満たすように木を修正
     *
     * @param x_item
     *
     * @see IA3/13.4 削除
     */
    private _remove_fixup( x_item: Item<Key, Value> )
    {
        let trail = x_item;

        while ( trail !== this._root && !trail._is_red /* 黒 */ ) {
            if ( trail === trail._parent._child_L ) {
                // trail は親の左側
                let sibling = trail._parent._child_R;

                if ( sibling._is_red /* 赤 */ ) {
                    // 場合 1
                    sibling._is_red       = false; // 黒
                    trail._parent._is_red = true;  // 赤
                    this._rotate_L( trail._parent );
                    sibling = trail._parent._child_R;
                }

                if ( !sibling._child_L._is_red /* 黒 */ &&
                     !sibling._child_R._is_red /* 黒 */ ) {
                    // 場合 2
                    sibling._is_red = true; // 赤
                    trail = trail._parent;
                }
                else {
                    if ( !sibling._child_R._is_red /* 黒 */ ) {
                        // 場合 3
                        sibling._child_L._is_red = false; // 黒
                        sibling._is_red          = true;  // 赤
                        this._rotate_R( sibling );
                        sibling = trail._parent._child_R;
                    }

                    // 場合 3,4
                    sibling._is_red = trail._parent._is_red;
                    trail._parent._is_red    = false; // 黒
                    sibling._child_R._is_red = false; // 黒
                    this._rotate_L( trail._parent );
                    trail = this._root;
                }
            }
            else {
                // trail は親の右側
                let sibling = trail._parent._child_L;

                if ( sibling._is_red /* 赤 */ ) {
                    // 場合 1
                    sibling._is_red       = false; // 黒
                    trail._parent._is_red = true;  // 赤
                    this._rotate_R( trail._parent );
                    sibling = trail._parent._child_L;
                }

                if ( !sibling._child_R._is_red /* 黒 */ &&
                     !sibling._child_L._is_red /* 黒 */ ) {
                    // 場合 2
                    sibling._is_red = true; // 赤
                    trail = trail._parent;
                }
                else {
                    if ( !sibling._child_L._is_red /* 黒 */ ) {
                        // 場合 3
                        sibling._child_R._is_red = false; // 黒
                        sibling._is_red          = true;  // 赤
                        this._rotate_L( sibling );
                        sibling = trail._parent._child_L;
                    }

                    // 場合 3,4
                    sibling._is_red = trail._parent._is_red;
                    trail._parent._is_red    = false; // 黒
                    sibling._child_L._is_red = false; // 黒
                    this._rotate_R( trail._parent );
                    trail = this._root;
                }
            }
        }

        trail._is_red = false;  // 黒
    }


    /**
     * アイテムの置き換え
     *
     * dst の場所を src アイテムで置き換える。src が T_nil のときは dst の場所は葉になる。
     *
     * dst の親の左または右の子供 (または this._root) と src._parent は変更されるが、dst
     *    自身の内容は変更されない。
     *
     * @param {Item} src
     * @param {Item} dst
     */
    private _replace( src: Item<Key, Value>, dst: Item<Key, Value> )
    {
        let dp = dst._parent;

        if ( dp !== T_nil ) {
            if ( dp._child_L === dst ) {
                // dst は dp の左側
                dp._child_L = src;
            }
            else {
                // dst は dp の右側
                dp._child_R = src;
            }
        }
        else {
            // dst は最上位
            this._root = src;
        }

        // src の親を変更
        src._parent = dp;
    }


    /**
     * アイテムを左回転
     *
     * 計算量: O(1)
     *
     * @see IA3/13.2 回転
     *
     * @param pivot  回転中心のアイテム
     */
    private _rotate_L( pivot: Item<Key, Value> )
    {
        // next は回転後に pivot の位置になる
        let next = pivot._child_R;

        // pivot の右側を next の左側に設定
        pivot._child_R = next._child_L;

        if ( next._child_L !== T_nil ) {
            next._child_L._parent = pivot;
        }

        // next の親を pivot の元の親に設定
        next._parent = pivot._parent;

        if ( pivot._parent === T_nil ) {
            this._root = next;
        }
        else if ( pivot === pivot._parent._child_L ) {
            pivot._parent._child_L = next;
        }
        else {
            pivot._parent._child_R = next;
        }

        // next の左側を pivot に設定
        next._child_L = pivot;
        pivot._parent = next;
    }


    /**
     * アイテムを右回転
     *
     * 計算量: O(1)
     *
     * @see IA3/13.2 回転
     *
     * @param pivot  回転中心のアイテム
     */
    private _rotate_R( pivot: Item<Key, Value> )
    {
        // next は回転後に pivot の位置になる
        let next = pivot._child_L;

        // pivot の左側を next の右側に設定
        pivot._child_L = next._child_R;

        if ( next._child_R !== T_nil ) {
            next._child_R._parent = pivot;
        }

        // next の親を pivot の元の親に設定
        next._parent = pivot._parent;

        if ( pivot._parent === T_nil ) {
            this._root = next;
        }
        else if ( pivot === pivot._parent._child_R ) {
            pivot._parent._child_R = next;
        }
        else {
            pivot._parent._child_L = next;
        }

        // next の右側を pivot に設定
        next._child_R = pivot;
        pivot._parent = next;
    }

}



namespace OrderedMap {



/**
 * OrderedMap のアイテム
 *
 * すべての this._child_L のアイテム L に対して Compare( L._key, this._key ) が成り立つ。
 *
 * すべての this._child_R のアイテム R に対して Compare( this._key, R._key ) が成り立つ。
 *
 * @internal
 */
export class Item<Key, Value> {

    _parent: Item<Key, Value>;

    // 左側ツリー
    _child_L: Item<Key, Value>;

    // 右側ツリー
    _child_R: Item<Key, Value>;

    // 色: 黒=false, 赤=true
    _is_red: boolean;

    private _key: Key;

    private _value: Value;


    /**
     * 色は黒に設定される。
     *
     * @param parent  親アイテム
     * @param key     アイテムのキー
     * @param value   アイテムの値
     */
    constructor( parent: Item<Key, Value>, key: Key, value: Value )
    {
        this._parent  = parent;
        this._child_L = T_nil;
        this._child_R = T_nil;
        this._is_red  = false;

        this._key   = key;
        this._value = value;
    }


    /** キー */
    get key(): Key { return this._key; }


    /** 値 */
    get value(): Value { return this._value; }


    /**
     * インスタンスを複製
     *
     * キー、値はシャローコピーされる。
     *
     * @param parant  親アイテム (this が根のときは T_nil)
     *
     * @return this の複製
     */
    private _clone( parent: Item<Key, Value> ): Item<Key, Value>
    {
        // 子孫と色以外を複製
        let cloned = new Item( parent, this._key, this._value );

        // 左側子孫を複製
        if ( this._child_L !== T_nil ) {
            cloned._child_L = this._child_L._clone( cloned );
        }

        // 右側子孫を複製
        if ( this._child_R !== T_nil ) {
            cloned._child_R = this._child_R._clone( cloned );
        }

        // 色を複製
        cloned._is_red = this._is_red;

        return cloned;
    }


    /**
     * @summary 先頭アイテムの検索
     *
     * @desc
     * <p>this ツリーの中で最も先の順序のアイテムを検索する。</p>
     *
     * <p>計算量: this ツリーのアイテム数 n に対して O(log n)</p>
     *
     * @return {mapray.OrderedMap.Item}  検索されたアイテム
     *
     * @private
     */
    _findMinimum()
    {
        let item: Item<Key, Value> = this;  // 追跡ポインタ

        while ( item._child_L !== T_nil ) {
            item = item._child_L;
        }

        return item;
    }


    /**
     * @summary 後尾アイテムの検索
     *
     * @desc
     * <p>this ツリーの中で最も後の順序のアイテムを検索する。</p>
     *
     * <p>計算量: this ツリーのアイテム数 n に対して O(log n)</p>
     *
     * @return {mapray.OrderedMap.Item}  検索されたアイテム
     *
     * @private
     */
    _findMaximum()
    {
        let item: Item<Key, Value> = this;  // 追跡ポインタ

        while ( item._child_R !== T_nil ) {
            item = item._child_R;
        }

        return item;
    }


    /**
     * @summary 前のアイテムの検索
     *
     * @desc
     * <p>root ツリーから this の前の順序のアイテムを検索する。this が先頭なら null を返す。</p>
     *
     * <p>計算量: 辞書の要素数 n に対して最悪 O(log n)</p>
     * <p>todo: 平均計算量を分析する</p>
     *
     * @return {?mapray.OrderedMap.Item}  検索されたアイテム、存在しなければ null
     */
    findPredecessor()
    {
        // 左側子孫がいれば、左側子孫の後尾
        if ( this._child_L !== T_nil ) {
            return this._child_L._findMaximum();
        }

        // 左側子孫がいなければ、this を右側子孫として持つ最も近い祖先
        // それがなければ this は全体ツリーの先頭なので検索失敗
        let item:Item<Key, Value> = this;
        let parent = item._parent;

        while ( parent !== T_nil && item === parent._child_L ) {
            item   = parent;
            parent = item._parent;
        }

        return (parent !== T_nil) ? parent : null;
    }


    /**
     * @summary 次のアイテムの検索
     *
     * @desc
     * <p>root ツリーから this の次の順序のアイテムを検索する。this が後尾なら null を返す。</p>
     *
     * <p>計算量: 辞書の要素数 n に対して最悪 O(log n)</p>
     * <p>todo: 平均計算量を分析する</p>
     *
     * @return {?mapray.OrderedMap.Item}  検索されたアイテム、存在しなければ null
     */
    findSuccessor()
    {
        // 右側子孫がいれば、右側子孫の先頭
        if ( this._child_R !== T_nil ) {
            return this._child_R._findMinimum();
        }

        // 右側子孫がいなければ、this を左側子孫として持つ最も近い祖先
        // それがなければ this は全体ツリーの後尾なので検索失敗
        let item: Item<Key, Value> = this;
        let parent = item._parent;

        while ( parent !== T_nil && item === parent._child_R ) {
            item   = parent;
            parent = item._parent;
        }

        return (parent !== T_nil) ? parent : null;
    }


    /**
     * 下限アイテムを検索
     *
     * this ツリーの中で !comp(item.key, bkey) となる最初のアイテムを検索する。
     *
     * つまり bkey と同じまたは後になるキーが this ツリーに存在すれば、その中で最初のアイテムを返す。
     *
     * そのようなアイテムが存在しない場合は null を返す。
     *
     * this が T_nil の場合は null を返す。
     *
     * 計算量: this ツリーのアイテム数 n に対して最悪 O(log n)
     *
     * @param bkey  境界キー
     * @param comp  キー比較関数
     *
     * @return 検索されたアイテム、存在しなければ null
     */
    private _findLowerBound( bkey: Key, comp: OrderedMap.Compare<Key> ): Item<Key, Value> | null
    {
        let item: Item<Key, Value> = this;

        while ( item !== T_nil ) {
            if ( comp( bkey, item._key ) ) {
                // bkey < item.key
                if ( item._child_L !== T_nil ) {
                    let found = item._child_L._findLowerBound( bkey, comp );
                    if ( found !== null ) return found;
                }
                return item;
            }
            else if ( comp( item._key, bkey ) ) {
                // bkey > item.key
                item = item._child_R;
            }
            else {
                // bkey == item.key (等価)
                return item;
            }
        }

        return null;
    }


    /**
     * 上限アイテムを検索
     *
     * this ツリーの中で comp(bkey, item.key) となる最初のアイテムを検索する。
     *
     * つまり bkey より後になるキーが this ツリーに存在すれば、その中で最初のアイテムを返す。
     *
     * そのようなアイテムが存在しない場合は null を返す。
     *
     * this が T_nil の場合は null を返す。
     *
     * 計算量: this ツリーのアイテム数 n に対して最悪 O(log n)
     *
     * @param bkey  境界キー
     * @param comp  キー比較関数
     *
     * @return 検索されたアイテム、存在しなければ null
     */
    private _findUpperBound( bkey: Key, comp: OrderedMap.Compare<Key> ): Item<Key, Value> | null
    {
        let item: Item<Key, Value> = this;

        while ( item !== T_nil ) {
            if ( comp( bkey, item._key ) ) {
                // bkey < item.key
                if ( item._child_L !== T_nil ) {
                    let found = item._child_L._findUpperBound( bkey, comp );
                    if ( found !== null ) return found;
                }
                return item;
            }
            else {
                // bkey >= item.key
                item = item._child_R;
            }
        }

        return null;
    }


    /**
     * @summary 等価キーのアイテムを検索
     *
     * @desc
     * <p>this ツリーの中で !comp(key, item.key) かつ !comp(item.key, key) となるアイテムを検索する。</p>
     * <p>そのようなアイテムが存在しない場合は null を返す。</p>
     * <p>this == T_nil の場合は null を返す。</p>
     *
     * <p>計算量: this ツリーのアイテム数 n に対して最悪 O(log n)</p>
     *
     * @param {mapray.OrderedMap.Key}     key   キー
     * @param {mapray.OrderedMap.Compare} comp  キー比較関数
     *
     * @return {?mapray.OrderedMap.Item}  検索されたアイテム、存在しなければ null
     *
     * @private
     */
    _findEqual( key: Key, comp: OrderedMap.Compare<Key> )
    {
        let item: Item<Key, Value> = this;

        while ( item !== T_nil ) {
            if ( comp( key, item._key ) ) {
                // key < item.key
                item = item._child_L;
            }
            else if ( comp( item._key, key ) ) {
                // bkey > item.key
                item = item._child_R;
            }
            else {
                // bkey == item.key (等価)
                return item;
            }
        }

        return null;
    }


    /**
     * @summary 下限アイテムを検索 (検討中)
     *
     * @desc
     * <p>root ツリーの中で !comp(item.key, bkey) となる最初のアイテムを検索する。</p>
     * <p>つまり bkey と同じまたは後になるキーが root ツリーに存在すれば、その中で最初のアイテムを返す。</p>
     * <p>そのようなアイテムが存在しない場合は null を返す。</p>
     *
     * <p>計算量: root ツリーのアイテム数 n に対して最悪 O(log^2 n)</p>
     *
     * @param {mapray.OrderedMap.Key}     bkey  境界キー
     * @param {mapray.OrderedMap.Compare} comp  キー比較関数
     *
     * @return {?mapray.OrderedMap.Item}  検索されたアイテム、存在しなければ null
     *
     * @private
     */
    _findLowerBoundR( bkey: Key, comp: OrderedMap.Compare<Key> )
    {
        let item: Item<Key, Value> = this;

        if ( item._parent !== T_nil ) {
            // item == root
            return item._findLowerBound( bkey, comp );
        }

        let imin = item._findMinimum();
        let imax = item._findMaximum();

        do {
            if ( !comp( bkey, imin._key ) && !comp( imax._key, bkey ) ) {
                // imin <= bkey <= imax なので
                // item._findLowerBound() で必ず見つかる
                break;
            }

            if ( item._parent._child_L === item ) {
                // item は parent の左側なので、登ると imax のみが変化
                imax = item._findMaximum();
            }
            else {
                // item は parent の右側なので、登ると imin のみが変化
                imin = item._findMinimum();
            }

            // item は登る
            item = item._parent;

        } while ( item._parent !== T_nil );
        // item == root

        return item._findLowerBound( bkey, comp );
    }

}



// @ts-ignore
T_nil = new Item<any, any>();



/**
 * @summary キー比較関数
 *
 * @desc
 * <p>a が b より順序が先なら true を返す。そうでないなら false を返す。</p>
 * <p>すべての x について !Compare(x, x) であること。</p>
 * <p>Compare(x, y) && Compare(y, z) なら Compare(x, z) であること。</p>
 * <p>equiv(a, b) を !Compare(a, b) && !Compare(b, a) と定義するとき、
 *    equiv(x, y) && equiv(y, z) なら equiv(x, z) であること。</p>
 *
 * @param a  キー値 a
 * @param b  キー値 b
 *
 * @return a が b より順序が先なら true, そうでないなら false
 * @internal
 */
export type Compare<Key> = (a: Key, b: Key) => boolean;



} // namespace OrderedMap



export default OrderedMap;
