import Material from "./Material";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import vs_code from "./shader/star.vert";
import fs_code from "./shader/star.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";

/**
 *  恒星表現マテリアル
 * @internal
 */
class StarMaterial extends Material {

    private _matrix: Matrix;


    /**
     * @param  viewer   所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer.glenv, vs_code, fs_code );

        this._matrix = GeoMath.setIdentity( GeoMath.createMatrix() );
    }


    /**
     * パラメータを設定
     *
     * @param  render_stage     呼び出し側オブジェクト
     * @param  gocs_to_clip     gocs_to_clip
     * @param  view_to_gocs     view_to_gocs
     *
     */
    setParameter( render_stage: RenderStage, view_to_clip: Matrix, longitude: number, scale: number )
    {
        const theta = longitude * GeoMath.DEGREE;
        const sin = Math.sin( theta );
        const cos = Math.cos( theta );
        this._matrix[0] = cos;
        this._matrix[1] = sin;
        this._matrix[4] = -sin;
        this._matrix[5] = cos;

        this.setMatrix( "u_gocs_to_clip", view_to_clip );
        this.setMatrix( "u_longitude_matrix", this._matrix );
        this.setFloat( "u_scale", scale );
    }
}


export default StarMaterial;
