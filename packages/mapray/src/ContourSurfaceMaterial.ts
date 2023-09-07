import FlakeMaterial from "./FlakeMaterial";
import type Viewer from "./Viewer";
import type RenderStage from "./RenderStage";
import type RenderFlake from "./RenderFlake";
import type FlakeMesh from "./FlakeMesh";
import contour_surface_vs_code from "./shader/contour_surface.vert";
import contour_surface_fs_code from "./shader/contour_surface.frag";
import ContourLayer from "./ContourLayer";


/**
 * 等高線の地表面マテリアル
 */
class ContourSurfaceMaterial extends FlakeMaterial {

    private readonly _viewer: Viewer;

    /**
     * @param viewer  - 所有者である Viewer
     */
    constructor( viewer: Viewer )
    {
        super( viewer, contour_surface_vs_code, contour_surface_fs_code );

        this.bindProgram();
        this._viewer = viewer;
    }


    // from FlakeMaterial
    override numDrawings(): number
    {
        return 1 + this._viewer.layers.num_drawing_layers;
    }


    // from FlakeMaterial
    override setFlakeParameter( stage:  RenderStage,
                                rflake: RenderFlake,
                                mesh:   FlakeMesh,
                                index:  number ): boolean
    {
        this.setCommonParameter( stage, mesh );

        const layer = this._viewer.layers.getDrawingLayer( index - 1 ) as ContourLayer;

        this.setFloat( "u_opacity", layer.getOpacity() );
        this.setFloat( "u_interval", layer.getInterval() );
        this.setFloat( "u_width", layer.getLineWidth() );
        this.setVector4( "u_color", layer.getColor() );

        return true;
    }

}



export default ContourSurfaceMaterial;
