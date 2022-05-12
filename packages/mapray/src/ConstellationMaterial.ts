import Material from "./Material";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import vs_code from "./shader/constellation.vert";
import fs_code from "./shader/constellation.frag";

import Viewer from "./Viewer";
import RenderStage from "./RenderStage";

/**
 *  星座表現マテリアル
 * @internal
 */
class ConstellationMaterial extends Material {

    private _viewer: Viewer;

    private _matrix: Matrix;

    /**
     * @param  viewer   所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer.glenv, vs_code, fs_code );

        this._viewer = viewer;

        this._matrix = GeoMath.createMatrix();
    }


    /**
     * パラメータを設定
     *
     * @param render_stage     呼び出し側オブジェクト
     * @param view_to_clip     view_to_clip
     * @param longitude        赤経基準角度
     * @param line_color        line color
     *
     */
    setParameter( render_stage: RenderStage, view_to_clip: Matrix, longitude: number, line_color: Vector3 ): void
    {
        const theta = longitude * GeoMath.DEGREE;
        const sin = Math.sin( theta );
        const cos = Math.cos( theta );
        const longitude_mat = GeoMath.setIdentity( this._matrix );
        longitude_mat[0] = cos;
        longitude_mat[1] = sin;
        longitude_mat[4] = -sin;
        longitude_mat[5] = cos;
        const view_to_longitude_mat = GeoMath.mul_GA( view_to_clip, longitude_mat, this._matrix );
        this.setMatrix( "u_longitude_matrix", view_to_longitude_mat );
        this.setVector3( "u_line_color", line_color );
    }
}


export default ConstellationMaterial;
