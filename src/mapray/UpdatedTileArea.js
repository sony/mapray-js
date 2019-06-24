/**
 * @summary 更新されたタイル領域
 *
 * @memberof mapray
 * @private
 */
class UpdatedTileArea {

    /**
     */
    constructor()
    {
        this._area_list      = [];
        this._flat_area_list = null;
    }


    /**
     * @summary 更新された領域は空か？
     *
     * @return {boolean}  更新領域が存在するとき false, それ以外のとき true
     */
    isEmpty()
    {
        return (this._area_list.length == 0);
    }


    /**
     * @summary 更新領域を空にする
     */
    clear()
    {
        this._area_list.length = 0;
        this._flat_area_list = null;
    }


    /**
     * @summary 更新領域を追加
     *
     * @param {object} area    領域
     * @param {number} area.z  レベル
     * @param {number} area.x  X タイル座標
     * @param {number} area.y  Y タイル座標
     */
    addTileArea( area )
    {
        this._area_list.push( { z: area.z, x: area.x, y: area.y } );
        this._flat_area_list = null;
    }


    /**
     * @summary フラット領域配列を取得
     *
     * @desc
     * <p>フラット領域配列の各領域は、同じ配列内に祖先領域を含まない。</p>
     * <p>各領域は子領域の索引の配列として表す。</p>
     *
     * @return {Uint8Array[]}
     */
    getFlatAreaList()
    {
        if ( this._flat_area_list === null ) {
            this._flat_area_list = this._createFlatAreaList();
        }

        return this._flat_area_list;
    }


    /**
     * @summary フラット領域配列を生成
     *
     * @return {Uint8Array[]}
     *
     * @private
     */
    _createFlatAreaList()
    {
        var root_node = new Node();

        for ( var i = 0; i < this._area_list.length; ++i ) {
            var area = this._area_list[i];
            root_node.addDescendant( area.z, area.x, area.y );
        }

        root_node.reduceTree();

        return root_node.collectFlatAreas( 0, new Uint8Array( 64 ), [] );
    }

}


/**
 * @summary UpdatedTileArea のノード
 *
 * @memberof mapray.UpdatedTileArea
 */
class Node {

    /**
     */
    constructor()
    {
        this.present  = false;
        this.children = new Array( 4 ).fill( null );
    }


    /**
     * @summary 子孫ノード (自身可) を追加
     *
     * @param {number} z
     * @param {number} x
     * @param {number} y
     */
    addDescendant( z, x, y )
    {
        if ( this.present === true ) {
            // this はすでに決定しているので子孫は追加しない
            return;
        }

        if ( z == 0 ) {
            this.present = true;
            this.children.fill( null );  // すでに存在する子孫を取り消す
        }
        else { // z >= 1
            var p = Math.round( Math.pow( 2, z - 1 ) );  // 2^(z - 1)
            var u = Math.floor( x / p );
            var v = Math.floor( y / p );

            var i = u + 2*v;
            if ( this.children[i] === null ) {
                this.children[i] = new Node();
            }

            this.children[i].addDescendant( z - 1, x % p, y % p );
        }
    }


    /**
     * @summary ツリーを最適化
     *
     * @return {number}  this が末端なら 1, それ以外なら 0
     */
    reduceTree()
    {
        if ( this.present === true ) {
            return 1;
        }

        // 末端の子供の数
        var count = 0;
        for ( var i = 0; i < 4; ++i ) {
            var child = this.children[i];
            if ( child !== null ) {
                count += child.reduceTree();
            }
        }

        if ( count == 4 ) {
            // すべての子供が存在し、それらがすべて末端なら this を末端化
            this.present = true;
            this.children.fill( null );
            return 1;
        }
        else {
            // this を末端化しない
            return 0;
        }
    }


    /**
     * @summary 末端ノードを収集
     *
     * @param  {number}       z        レベル
     * @param  {Uint8Array}   indices  領域を表す索引配列
     * @param  {Uint8Array[]} olist    収集結果を格納する配列
     * @return {Uint8Array[]}          olist
     */
    collectFlatAreas( z, indices, olist )
    {
        if ( this.present === true ) {
            olist.push( new Uint8Array( indices.slice( 0, z ) ) );
        }
        else {
            for ( var i = 0; i < 4; ++i ) {
                var child = this.children[i];
                if ( child !== null ) {
                    indices[z] = i;
                    child.collectFlatAreas( z + 1, indices, olist );
                }
            }
        }

        return olist;
    }

}


export default UpdatedTileArea;
