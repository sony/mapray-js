import FlakeMaterial from "./FlakeMaterial";
import type Viewer from "./Viewer";
import type RenderStage from "./RenderStage";
import type RenderFlake from "./RenderFlake";
import type FlakeMesh from "./FlakeMesh";
import wireframe_vs_code from "./shader/wireframe.vert";
import wireframe_fs_code from "./shader/wireframe.frag";


/**
 * 地表ワイヤーフレームマテリアル
 */
class WireframeMaterial extends FlakeMaterial {

    /**
     * @internal
     */
    static inner_grid_visibility: boolean = true;

    /**
     * @param viewer - 所有者 Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer, wireframe_vs_code, wireframe_fs_code );
    }


    // from FlakeMaterial
    override isWireframe(): boolean
    {
        return true;
    }


    // from FlakeMaterial
    override setFlakeParameter( stage:  RenderStage,
                                _rflake: RenderFlake,
                                mesh:   FlakeMesh,
                                _index: number ): boolean
    {
        this.setCommonParameter( stage, mesh );
        this.setBoolean( "u_inner_grid_visibility", WireframeMaterial.inner_grid_visibility );
        return true;
    }

}


export default WireframeMaterial;
