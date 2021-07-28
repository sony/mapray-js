import Material from "./Material";
import GeoMath, { Vector3, Matrix } from "./GeoMath";
import vs_code from "./shader/atmosphere.vert";
import fs_code from "./shader/atmosphere.frag";

import Viewer from "./Viewer";
import Atmosphere from "./Atmosphere";
import RenderStage from "./RenderStage";



/**
 * 大気表現マテリアル
 * @internal
 */
class AtmosphereMaterial extends Material {

    private _viewer: Viewer;

    /**
     * @param viewer   所有者である Viewer
     * @param options  オプション
     */
    constructor( viewer: Viewer, options: AtmosphereMaterial.Options = {} )
    {
        const preamble = AtmosphereMaterial._getPreamble( options );

        super( viewer.glenv,
               preamble + vs_code,
               preamble + fs_code );

        this._viewer = viewer;
    }


    /**
     * シェーダの前文を取得
     *
     * @param options  オプション
     */
    static _getPreamble( options: AtmosphereMaterial.Options )
    {
        const from_atmosphere = (options.from_atmosphere !== undefined) ? options.from_atmosphere : false;

        const lines = [];

        // UNLIT マクロの定義
        if ( from_atmosphere ) {
            lines.push( "#define SKY_IN_ATMOSPHERE" );
        }

        // lines を文字列にして返す
        return lines.join( "\n" ) + "\n\n";
    }


    /**
     * パラメータを設定
     *
     * @param  stage           呼び出し側オブジェクト
     * @param  gocs_to_clip    変換Matrix
     * @param  camera_position カメラ位置
     * @param  camera_position カメラ高度
     * @param  parameters      大気パラメータ
     *
     */
    setParameter( stage: RenderStage, gocs_to_clip: Matrix, camera_position: Vector3, camera_height: number, parameters: Atmosphere.Parameters )
    {
        this.setMatrix  ( "u_gocs_to_clip",    gocs_to_clip );
        this.setVector3 ( "u_camera_position", camera_position );
        this.setVector3 ( "u_sun_vector",      this._viewer.sun.sun_direction );
        this.setFloat   ( "u_camera_height",   camera_height );
        this.setFloat   ( "u_camera_height2",  camera_height * camera_height );
        this.setFloat   ( "u_kr",              parameters.kr );
        this.setFloat   ( "u_km",              parameters.km );
        this.setFloat   ( "u_scale_depth",     parameters.scale_depth );
        this.setFloat   ( "u_esun",            parameters.esun );
        this.setFloat   ( "u_exposure",        parameters.exposure );
    }

}



namespace AtmosphereMaterial {



export interface Options {
    from_atmosphere?: boolean;
}



} // namespace AtmosphereMaterial



export default AtmosphereMaterial;
