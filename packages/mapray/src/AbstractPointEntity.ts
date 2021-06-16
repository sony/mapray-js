import Scene from "./Scene";
import Entity from "./Entity";
import GeoPoint from "./GeoPoint";
import GeoRegion from "./GeoRegion";
import BindingBlock from "./animation/BindingBlock";
import EasyBindingBlock from "./animation/EasyBindingBlock";


/**
 * 点エンティティ
 *
 * {@link mapray.ImageIconEntity} と {@link mapray.PinEntity}
 * と {@link mapray.TextEntity} の共通機能を提供するクラスである。
 */
abstract class AbstractPointEntity<T extends AbstractPointEntity.Entry> extends Entity {

    /** 要素管理 */
    protected _entries: T[];

    /**
     * @param scene   所属可能シーン
     * @param opts    オプション集合
     */
    constructor( scene: Scene, opts?: Entity.Option )
    {
        super( scene, opts );
        this._entries = [];
    }


    /**
     * すべてのEntryのバウンディングを算出
     *
     * @override
     * @return バウンディング情報を持ったGeoRegion
     */
    getBounds(): GeoRegion
    {
        const region = new GeoRegion();
        for ( let entry of this._entries ) {
            region.addPoint( entry.position );
        }
        return region;
    }


    /**
     * Entry配列を取得
     * @internal
     */
    get entries(): T[] {
        return this._entries;
    }
}



namespace AbstractPointEntity {


export abstract class Entry {
    /** id */
    abstract get id(): string;

    /** 基準となる位置 */
    abstract get position(): GeoPoint;

    /** アニメーションパラメータ設定 */
    abstract get animation(): BindingBlock;
}


} // namespace AbstractPointEntity



export default AbstractPointEntity;
