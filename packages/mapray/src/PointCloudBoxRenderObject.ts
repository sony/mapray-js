import Primitive from "./Primitive";
import RenderStage from "./RenderStage";
import GeoMath from "./GeoMath";
import PointCloud from "./PointCloud";


/**
 * Boxをレンダリングするためのオブジェクト
 * @internal
 */
class PointCloudBoxRenderObject {

    private _box: PointCloud.Box;

    private _distance: number;

    private _target_children?: number[];

    private _points_per_pixel: number[];

    private _parent_points_per_pixel: number;


    /**
     * @param box 描画対象
     * @param distance 視点からBoxまでの距離
     * @param parent_points_per_pixel 親Boxの点の細かさ
     */
    constructor( box: PointCloud.Box, distance: number, parent_points_per_pixel: number )
    {
        this._box = box;
        this._distance = distance;
        this._target_children = [];
        this._points_per_pixel = [];
        this._parent_points_per_pixel = parent_points_per_pixel;
    }


    /**
     * 描画対象
     */
    get box(): PointCloud.Box
    {
        return this._box;
    }


    /**
     * カメラからの距離
     */
    get distance(): number
    {
        return this._distance;
    }


    /**
     * 親Boxの点の解像度
     */
    get parent_points_per_pixel(): number
    {
        return this._parent_points_per_pixel;
    }


    /**
     * 描画対象領域を追加する
     * @param child 領域
     * @param points_per_pixel 描画する点の細かさ
     */
    pushRegion( child: number, points_per_pixel: number ): void
    {
        if ( this._target_children ) {
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
     * 描画対象を全領域にする
     * @param points_per_pixel 描画する点の細かさ
     */
    setWholeRegion( points_per_pixel: number ): void
    {
        this._target_children = undefined;
        this._points_per_pixel = [ points_per_pixel ];
    }


    /**
     * 描画
     * @param render_stage レンダリングステージ
     * @param statistics 統計情報
     */
    draw( render_stage: RenderStage, statistics: PointCloud.Statistics ): void
    {
        this._box.draw( render_stage, this._target_children, this._points_per_pixel, statistics );
    }
}


export default PointCloudBoxRenderObject;
