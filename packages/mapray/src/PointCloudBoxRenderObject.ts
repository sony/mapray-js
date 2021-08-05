import Primitive from "./Primitive";
import GeoMath from "./GeoMath";
import AreaUtil from "./AreaUtil";


/**
 * @summary Boxをレンダリングするためのオブジェクト
 *
 * @memberof mapray
 * @private
 */
class PointCloudBoxRenderObject {


    /**
     * @param {mapray.PointCloud.Box} box 描画対象
     * @param {number} distance 視点からBoxまでの距離
     * @param {number} parent_points_per_pixel 親Boxの点の細かさ
     */
    constructor( box, distance, parent_points_per_pixel )
    {
        this._box = box;
        this._distance = distance;
        this._target_children = [];
        this._points_per_pixel = [];
        this._parent_points_per_pixel = parent_points_per_pixel;
    }


    /**
     * @summary 描画対象
     * @type {mapray.PointCloud.Box}
     */
    get box()
    {
        return this._box;
    }


    /**
     * @summary カメラからの距離
     * @type {number}
     */
    get distance()
    {
        return this._distance;
    }


    /**
     * @summary 親Boxの点の解像度
     * @type {number}
     */
    get parent_points_per_pixel()
    {
        return this._parent_points_per_pixel;
    }


    /**
     * @summary 描画対象領域を追加する
     * @param {number} child 領域
     * @param {number} points_per_pixel 描画する点の細かさ
     */
    pushRegion( child, points_per_pixel )
    {
        if ( this._target_children !== null ) {
            const index = this._target_children.indexOf( child );
            if ( index === -1) {
                this._target_children.push( child );
                this._points_per_pixel.push( points_per_pixel );
            }
            else {
                this._target_children[ index ] = child;
                this._points_per_pixel[ index ] = points_per_pixel;
            }
        }
    }


    /**
     * @summary 描画対象を全領域にする
     * @param {number} points_per_pixel 描画する点の細かさ
     */
    setWholeRegion( points_per_pixel )
    {
        this._target_children = null;
        this._points_per_pixel = [ points_per_pixel ];
    }


    /**
     * @summary 描画
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     * @param {object} statistics 統計情報
     */
    draw( render_stage, statistics )
    {
        this._box.draw( render_stage, this._target_children, this._points_per_pixel, statistics );
    }
}


export default PointCloudBoxRenderObject;
