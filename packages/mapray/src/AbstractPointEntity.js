import Entity from "./Entity";
import GeoPoint from "./GeoPoint";
import GeoRegion from "./GeoRegion";


/**
 * @summary 点エンティティ
 *
 * @classdesc
 * <p>{@link mapray.ImageIconEntity} と {@link mapray.PinEntity}
 *    と {@link mapray.TextEntity} の共通機能を提供するクラスである。</p>
 *
 * @memberof mapray
 * @extends mapray.Entity
 * @abstract
 * @protected
 */
class AbstractPointEntity extends Entity {

    /**
     * @param {mapray.Scene} scene        所属可能シーン
     * @param {object}       [opts]       オプション集合
     * @param {object}       [opts.json]  生成情報
     * @param {object}       [opts.refs]  参照辞書
     */
    constructor( scene, opts )
    {
        super( scene, opts );

        // 要素管理
        this._entries = [];
    }


    /**
     * @summary すべてのEntryのバウンディングを算出
     *
     * @override
     * @return {mapray.GeoRegion}  バウンディング情報を持ったGeoRegion
     */
    getBounds()
    {
        const region = new GeoRegion();
        for ( let entry of this._entries ) {
            region.addPoint( entry._position );
        }
        return region;
    }


}


export default AbstractPointEntity;
