import ContourSurfaceMaterial from "./ContourSurfaceMaterial";
import LayerCollection from "./LayerCollection";
import Layer from "./Layer";
import { Vector4 } from "./GeoMath";


/**
 * 等高線レイヤー
 *
 * 等高線レイヤーを表現するオブジェクトである。
 *
 * @see [[LayerCollection]]
 */
class ContourLayer extends Layer {

    private _interval: number;

    private _line_width: number;

    private _color: Vector4;

    private _material: ContourSurfaceMaterial;

    /**
     * @param owner         レイヤー管理
     * @param init          初期化プロパティ
     */
    constructor( owner: LayerCollection, init: ContourLayer.Option )
    {
        super( owner, init );

        this._interval = init.interval ?? 100;
        const line_width = init.line_width ?? 1;
        this._line_width = line_width > 5 ? 5 : line_width;
        this._color = init.color ?? [ 1, 1, 1, 1 ];

        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.contour_surface_material ) {
            render_cache.contour_surface_material = new ContourSurfaceMaterial( this._viewer );
        }
        this._material = render_cache.contour_surface_material;
    }


    /**
     * 等高線の間隔を取得
     */
    getInterval(): number { return this._interval; }


    /**
     * 等高線の太さを取得
     */
    getLineWidth(): number { return this._line_width; }


    /**
     * 等高線の色を取得
     */
    getColor(): Vector4 { return this._color; }


    /**
     * 等高線の間隔を設定
     *
     * @param interval 等高線の間隔(m)
     */
    setInterval( interval: number )
    {
        this._interval = interval;
    }


    /**
     * 等高線の太さを設定
     *
     * @param line_width 等高線の太さ(Pixel)
     */
    setLineWidth( line_width: number )
    {
        this._line_width = line_width > 5 ? 5 : line_width;
    }


    /**
     * 等高線の色を設定
     *
     * @param color 等高線の色
     */
    setColor( color: Vector4 )
    {
        this._color = color;
    }


    /**
     * マテリアルを取得
     *
     * @return マテリアル
     * @internal
     */
    override getMateral(): ContourSurfaceMaterial
    {
        return this._material;
    }
}



namespace ContourLayer {



export interface Option extends Layer.Option {

    /** レイヤータイプ */
    type: Layer.Type.CONTOUR;

    /** 等高線の間隔 (m) */
    interval?: number;

    /** 等高線の太さ (pixel) */
    line_width?: number;

    /** 等高線の色 */
    color?: Vector4;

}



} // namespace ContourLayer



export default ContourLayer;
