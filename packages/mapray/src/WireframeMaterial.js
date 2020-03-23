import FlakeMaterial from "./FlakeMaterial";
import wireframe_vs_code from "./shader/wireframe.vert";
import wireframe_fs_code from "./shader/wireframe.frag";


/**
 * @summary 地表ワイヤーフレームマテリアル
 * @memberof mapray.RenderStage
 * @extends mapray.RenderStage.FlakeMaterial
 * @private
 */
class WireframeMaterial extends FlakeMaterial {

    /**
     * @param {mapray.Viewer} viewer   所有者 Viewer
     */
    constructor( viewer )
    {
        super( viewer, wireframe_vs_code, wireframe_fs_code );
    }


    /**
     * @override
     */
    isWireframe()
    {
        return true;
    }


    /**
     * @override
     */
    setFlakeParameter( stage, rflake, mesh, index )
    {
        this.setCommonParameter( stage, mesh );

        return true;
    }

}


export default WireframeMaterial;
