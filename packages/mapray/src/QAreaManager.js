import Entity from "./Entity";


/**
 * @summary 4分木ベースの領域管理
 *
 * <p>Entity.FlakePrimitiveProducer の getAreaStatus() と createMesh()
 *    メソッドを補助するためのクラスである。</p>
 *
 * @memberof mapray
 * @private
 * @see mapray.Entity.FlakePrimitiveProducer
 */
class QAreaManager {

    /**
     */
    constructor()
    {
        this._tree_root = null;  // QAreaNode | AreaStatus.EMPTY | AreaStatus.FULL
    }


    /**
     * @summary 領域状態を取得
     *
     * @desc
     * <p>area が示す領域の状態を取得する。</p>
     *
     * @param {mapray.Area} area  確認する領域
     *
     * @return {mapray.Entity.AreaStatus}  領域の状態
     */
    getAreaStatus( area )
    {
        let node = this._get_area_node( area );

        if ( node === Entity.AreaStatus.EMPTY || node === Entity.AreaStatus.FULL ) {
            // Entity.AreaStatus のとき
            return node;
        }
        else {
            // QAreaNode のとき
            return Entity.AreaStatus.PARTIAL;
        }
    }


    /**
     * @summary 内容データを取得
     *
     * @param {mapray.Area} area  対象領域
     *
     * @return {object|mapray.Entity.AreaStatus}  area に対応する内容データ | AreaStatus.EMPTY | AreaStatus.FULL
     */
    getAreaContent( area )
    {
        let node = this._get_area_node( area );

        if ( node === Entity.AreaStatus.EMPTY || node === Entity.AreaStatus.FULL ) {
            // Entity.AreaStatus のとき
            return node;
        }
        else {
            // QAreaNode のとき
            return node.content;
        }
    }


    /**
     * @summary 初めの内容データを取得
     *
     * @desc
     * <p>最上位領域の内容データを生成するための内容データを取得する。</p>
     * <p>FlakePrimitiveProducer の実装者がこのメソッドを実装する。</p>
     *
     * @return {object}  内容データ
     *
     * @abstract
     */
    getInitialContent()
    {
        return null;
    }


    /**
     * @summary 領域の内容データを生成
     *
     * @desc
     * <p>領域と parent_content から内容データを生成する。</p>
     * <p>パラメータの座標系は正規化メルカトル座標系である。</p>
     * <p>FlakePrimitiveProducer の実装者がこのメソッドを実装する。</p>
     *
     * @param {number} min_x           領域の最小 x 座標
     * @param {number} min_y           領域の最小 y 座標
     * @param {number} msize           領域の寸法
     * @param {object} parent_content  親領域の内容データ
     *
     * @return {object|mapray.Entity.AreaStatus}  内容データ | AreaStatus.EMPTY | AreaStatus.FULL
     *
     * @abstract
     */
    createAreaContent( min_x, min_y, msize, parent_content )
    {
        return Entity.AreaStatus.EMPTY;
    }


    /**
     * @summary 内容データが更新されたこと通知
     *
     * @desc
     * <p>内容データが更新されときに FlakePrimitiveProducer の実装者がこのメソッドを呼び出す。</p>
     */
    notifyForUpdateContent()
    {
        this._tree_root = null;
    }


    /**
     * @summary 領域のノードを生成
     *
     * @param {number} min_x           領域の最小 x 座標
     * @param {number} max_y           領域の最大 y 座標
     * @param {number} msize           領域の寸法
     * @param {object} parent_content  親領域の内容データ
     *
     * @return {QAreaNode|mapray.Entity.AreaStatus}  ノード | AreaStatus.EMPTY | AreaStatus.FULL
     *
     * @private
     */
    _create_area_node( min_x, max_y, msize, parent_content )
    {
        let content = this.createAreaContent( min_x, max_y - msize, msize, parent_content );

        if ( content === Entity.AreaStatus.EMPTY || content === Entity.AreaStatus.FULL ) {
            return content;
        }
        else {
            return new QAreaNode( content );
        }
    }


    /**
     * @summary 領域のノードを取得
     *
     * @desc
     * <p>area に対応するノードを取得する。</p>
     *
     * @param {mapray.Area} area  領域
     *
     * @return {QAreaNode|mapray.Entity.AreaStatus}  area に対応するノード | AreaStatus.EMPTY | AreaStatus.FULL
     *
     * @private
     */
    _get_area_node( area )
    {
        let msize = 2;
        let min_x = -1;
        let max_y = 1;

        if ( this._tree_root === null ) {
            let content = this.getInitialContent();
            this._tree_root = this._create_area_node( min_x, max_y, msize, content );
        }

        let node = this._tree_root;

        let tsize = Math.round( Math.pow( 2, area.z ) );  // 現行レベルでの縦横タイル数
        let rx    = area.x;                               // 現行レベルでのタイル x 座標
        let ry    = area.y;                               // 現行レベルでのタイル y 座標

        while ( tsize != 1 && node !== Entity.AreaStatus.EMPTY && node !== Entity.AreaStatus.FULL ) {

            tsize /= 2;

            let u = (rx >= tsize) ? 1 : 0;
            let v = (ry >= tsize) ? 1 : 0;

            msize /= 2;
            min_x += u * msize;
            max_y -= v * msize;

            let index = u + 2*v;
            let child = node.children[index];

            if ( child === null ) {
                // 子ノードを生成して node に設定
                child = this._create_area_node( min_x, max_y, msize, node.content );
                node.children[index] = child;
            }

            rx -= u * tsize;
            ry -= v * tsize;
            node = child;
        }

        return node;
    }

}


/**
 * @summary QAreaManager が管理するノード
 *
 * @memberof mapray.QAreaManager
 * @private
 */
class QAreaNode {

    /**
     * @param {object} content  内容データ
     */
    constructor( content )
    {
        this.children = [null, null, null, null];  // QAreaNode | AreaStatus.EMPTY | AreaStatus.FULL
        this.content  = content;
    }

}


export default QAreaManager;
