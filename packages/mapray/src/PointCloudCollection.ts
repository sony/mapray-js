import PointCloud from "./PointCloud";



/**
 * @summary PointCloudを管理するクラス
 * @see mapray.Viewer#point_cloud_collection
 * 
 * @memberof mapray
 */
class PointCloudCollection {

    /**
     * @param {mapray.Scene} scene    所属するシーン
     */
    constructor( scene ) {
        this._scene = scene;
        this._items = [];
    }


    /**
     * @summary 点群オブジェクト数
     * @type {number}
     * @readonly
     */
    get length() { return this._items.length; }


    /**
     * @summary 点群オブジェクトを取得
     *
     * @param  {number} index  番号
     * @return {mapray.PointCloud}  点群
     */
    get( index ) {
        return this._items[index];
    }


    /**
     * @summary 点群オブジェクトを追加
     *
     * @param  {PointCloudProvider} item 点群プロバイダ
     * @return {mapray.PointCloud}  点群
     */
    add( item ) {
        return this.insert( this.length, item );
    }


    /**
     * @summary 点群オブジェクトを指定した位置に追加
     *
     * @param  {number} index  番号
     * @param  {PointCloudProvider} item 点群プロバイダ
     * @return {mapray.PointCloud}  点群
     */
    insert( index, item )
    {
        const point_cloud = new PointCloud( this._scene, item );
        this._items.splice( index, 0, point_cloud );
        point_cloud.init();
        return point_cloud;
    }


    /**
     * @summary 指定した位置の点群オブジェクトを削除
     *
     * @param  {number} index  番号
     * @return {mapray.PointCloud}  削除された点群
     */
    removeByIndex( index ) {
        const removedItem = this._items.splice( index, 1 )[0];
        removedItem.destroy();
        return removedItem;
    }


    /**
     * @summary 指定した点群オブジェクトを削除
     *
     * @param {mapray.PointCloud} item 削除する点群
     */
    remove( item ) {
        const index = this._items.indexOf(item);
        if (index === -1) {
            throw new Error("Couldn't find item: " + item);
        }
        this.removeByIndex(index);
    }
}

export default PointCloudCollection
