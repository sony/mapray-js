import Material from "./Material";
import GeoMath from "./GeoMath";
import type { Matrix } from "./GeoMath";
import type Viewer from "./Viewer";
import type RenderStage from "./RenderStage";
import type RenderFlake from "./RenderFlake";
import type FlakeMesh from "./FlakeMesh";


/**
 * 地表断片マテリアル
 */
class FlakeMaterial extends Material {

    /**
     * @param viewer  - 所有者である Viewer
     * @param vs_code - 頂点シェーダのソースコード
     * @param fs_code - フラグメントシェーダのソースコード
     */
    protected constructor( viewer:  Viewer,
                           vs_code: string,
                           fs_code: string )
    {
        super( viewer.glenv, vs_code, fs_code );

        // シェーダ用の事前生成オブジェクト
        this._flake_to_clip = GeoMath.createMatrixf();
    }


    /**
     * 描画回数
     *
     * @virtual
     */
    numDrawings(): number
    {
        return 1;
    }


    /**
     * ワイヤーフレーム表示か？
     *
     * @virtual
     */
    isWireframe(): boolean
    {
        return false;
    }


    /**
     * 地表断片のパラメータを設定
     *
     * @param stage  - 呼び出し側オブジェクト
     * @param rflake - 描画地表断片
     * @param mesh   - 地表断片メッシュ
     * @param index  - 描画インデックス
     *
     * @return 描画の有無
     *
     * @virtual
     */
    setFlakeParameter( stage:  RenderStage,
                       rflake: RenderFlake,
                       mesh:   FlakeMesh,
                       index:  number ): boolean
    {
        return false;
    }


    /**
     * 地表断片の共通パラメータを設定
     *
     * @param stage - 呼び出し側オブジェクト
     * @param mesh  - 地表断片メッシュ
     */
    protected setCommonParameter( stage: RenderStage,
                                  mesh:  FlakeMesh ): void
    {
        mesh.mul_flake_to_gocs( stage.gocs_to_clip, this._flake_to_clip );
        this.setMatrix( "u_obj_to_clip", this._flake_to_clip );
    }


    private readonly _flake_to_clip: Matrix;

}


export default FlakeMaterial;
