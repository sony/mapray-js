import Scene from "./Scene";
import Viewer from "./Viewer";
import PointCloud from "./PointCloud";
import PointCloudProvider from "./PointCloudProvider";



/**
 * PointCloudを管理するクラス
 * @see Viewer.point_cloud_collection
 */
class PointCloudCollection {

    private _scene: Scene;

    private _items: PointCloud[];


    /**
     * @param scene    所属するシーン
     */
    constructor( scene: Scene ) {
        this._scene = scene;
        this._items = [];
    }


    /**
     * 点群オブジェクト数
     */
    get length(): number { return this._items.length; }


    /**
     * 点群オブジェクトを取得
     *
     * @param index  番号
     */
    get( index: number ): PointCloud
    {
        return this._items[index];
    }


    /**
     * 点群オブジェクトを追加
     *
     * @param item 点群プロバイダ
     * @return 追加された点群
     */
    add( item: PointCloudProvider ): PointCloud
    {
        return this.insert( this.length, item );
    }


    /**
     * 点群オブジェクトを指定した位置に追加
     *
     * @param index  番号
     * @param item 点群プロバイダ
     * @return 追加された点群
     */
    insert( index: number, item: PointCloudProvider ): PointCloud
    {
        const point_cloud = new PointCloud( this._scene, item );
        this._items.splice( index, 0, point_cloud );
        // @ts-ignore
        point_cloud.init();
        return point_cloud;
    }


    /**
     * 指定した位置の点群オブジェクトを削除
     *
     * @param  index  番号
     * @return 削除された点群
     */
    removeByIndex( index: number ): PointCloud
    {
        const removedItem = this._items.splice( index, 1 )[0];
        // @ts-ignore
        removedItem.destroy();
        return removedItem;
    }


    /**
     * 指定した点群オブジェクトを削除
     *
     * @param item 削除する点群
     */
    remove( item: PointCloud ): void
    {
        const index = this._items.indexOf(item);
        if (index === -1) {
            throw new Error("Couldn't find item: " + item);
        }
        this.removeByIndex(index);
    }
}

export default PointCloudCollection
