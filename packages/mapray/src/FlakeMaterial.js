import Material from "./Material";
import GeoMath from "./GeoMath";


/**
 * @summary 地表断片マテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.Material
 * @private
 */
class FlakeMaterial extends Material {

    /**
     * @param {mapray.Viewer} viewer   所有者である Viewer
     * @param {string}      vs_code  頂点シェーダのソースコード
     * @param {string}      fs_code  フラグメントシェーダのソースコード
     */
    constructor( viewer, vs_code, fs_code )
    {
        super( viewer.glenv, vs_code, fs_code );

        // シェーダ用の事前生成オブジェクト
        this._flake_to_clip = GeoMath.createMatrixf();
    }


    /**
     * @summary 描画回数
     * @return {number}
     * @abstract
     */
    numDrawings()
    {
        return 1;
    }


    /**
     * @summary ワイヤーフレーム表示か？
     * @return {boolean}
     * @abstract
     */
    isWireframe()
    {
        return false;
    }


    /**
     * @summary 地表断片のパラメータを設定
     *
     * @param  {mapray.RenderStage} stage   呼び出し側オブジェクト
     * @param  {mapray.RenderFlake} rflake  描画地表断片
     * @param  {mapray.FlakeMesh}   mesh    地表断片メッシュ
     * @param  {number}             index   描画インデックス
     * @return {boolean}  描画の有無
     *
     * @abstract
     */
    setFlakeParameter( stage, rflake, mesh, index )
    {
        return false;
    }


    /**
     * @summary 地表断片の共通パラメータを設定
     *
     * @param {mapray.RenderStage} stage  呼び出し側オブジェクト
     * @param {mapray.FlakeMesh}   mesh   地表断片メッシュ
     * @protected
     */
    setCommonParameter( stage, mesh )
    {
        mesh.mul_flake_to_gocs( stage._gocs_to_clip, this._flake_to_clip );
        this.setMatrix( "u_obj_to_clip", this._flake_to_clip );
    }

}


export default FlakeMaterial;
