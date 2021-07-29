import Mesh from "./Mesh";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import MoonMaterial from "./MoonMaterial";



/**
 * @summary 太陽を表現するクラス
 * @memberof mapray
 */
class MoonVisualizer {

    /**
     * @summary constructor
     *
     * @param {string|URLResource} image_src image source
     */
    constructor( image_src )
    {
        this._image = image_src;
    }


    /**
     * @summary 初期化
     *
     * @param {mapray.Viewer} viewer 所属するViewer
     */
    init( viewer )
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;
        this._mesh = null;

        this._visibility = true;

        this._radius = 1.0;
        this._intensity = 1.0;

        this._createMesh();
        this._checkMaterials();
    }


    /**
     * @summary 破棄
     */
    destroy( )
    {
        this._deleteMaterials();
        this._mesh.dispose;
        this._viewer = null;
        this._glenv = null;
    }


    get visibility() { return this._visibility; }
    
    setVisibility( flag ) { this._visibility = flag; }

    setRadius( value ) {
        this._radius = value;
    }

    setIntensity( value ) {
        this._intensity = value;
    }


    /**
     * @private
     */
     _createMeshM() {
       const SPHERE_DIV = 180;
       let i, ai, si, ci;
       let j, aj, sj, cj;
       let p1, p2;

       const radius = 10.25;

       // Vertices
       let vertices = [], indices = [];
       for (j = 0; j <= SPHERE_DIV; j++) {
         aj = j * Math.PI / SPHERE_DIV;
         sj = Math.sin(aj);
         cj = Math.cos(aj);
         for (i = 0; i <= SPHERE_DIV; i++) {
           ai = i * 2 * Math.PI / SPHERE_DIV;
           si = Math.sin(ai);
           ci = Math.cos(ai);

           vertices.push(si * sj * radius);
           vertices.push(cj * radius);
           vertices.push(ci * sj * radius);
         }
       }

       // Indices
       for (j = 0; j < SPHERE_DIV; j++) {
         for (i = 0; i < SPHERE_DIV; i++) {
           p1 = j * (SPHERE_DIV+1) + i;
           p2 = p1 + (SPHERE_DIV+1);

           indices.push(p1);
           indices.push(p2);
           indices.push(p1 + 1);

           indices.push(p1 + 1);
           indices.push(p2);
           indices.push(p2 + 1);
         }
       }

       const mesh_data = {
           vtype: [
               { name: "a_position", size: 3 },
           ],
           vertices: vertices,
           indices:  indices
       };

       this._mesh = new Mesh( this._glenv, mesh_data );
     }

     _createMesh() {
       // const SPHERE_DIV = 64;
       const SPHERE_DIV = 32;
       let i, ai, si, ci;
       let j, aj, sj, cj;
       let p1, p2;

       const radius = 10.25;

       // Vertices
       let vertices = [], indices = [];
       for (j = 0; j <= SPHERE_DIV; j++) {
         aj = j * Math.PI / SPHERE_DIV;
         sj = Math.sin(aj);
         cj = Math.cos(aj);
         for (i = 0; i <= SPHERE_DIV; i++) {
           ai = i * 2 * Math.PI / SPHERE_DIV;
           si = Math.sin(ai);
           ci = Math.cos(ai);

           vertices.push(ci * sj * radius);
           vertices.push(si * sj * radius);
           vertices.push(cj * radius);

           vertices.push(i/SPHERE_DIV + 0.5);
           vertices.push(1-j/SPHERE_DIV);

         }
       }

       // Indices
       for (j = 0; j < SPHERE_DIV; j++) {
         for (i = 0; i < SPHERE_DIV; i++) {
           p1 = j * (SPHERE_DIV+1) + i;
           p2 = p1 + (SPHERE_DIV+1);

           indices.push(p1);
           indices.push(p2);
           indices.push(p1 + 1);

           indices.push(p1 + 1);
           indices.push(p2);
           indices.push(p2 + 1);
         }
       }

       const mesh_data = {
           vtype: [
               { name: "a_position", size: 3 },
               { name: "a_texcoord", size: 2 },
           ],
           vertices: vertices,
           indices:  indices
       };

       this._mesh = new Mesh( this._glenv, mesh_data );
     }

    /**
     * @private
     */
    _checkMaterials() {
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.moon_material ) {
            render_cache.moon_material = new MoonMaterial( this._viewer, this._image );
            render_cache.moon_mask_material = new MoonMaterial( this._viewer, this._image, { mask: true } );
        }
    }


    /**
     * @private
     */
    _deleteMaterials() {
        if (this._viewer._render_cache && render_cache.moon_material ) {
            render_cache.moon_material.dispose();
            render_cache.moon_mask_material.dispose();
        }
    }


    /**
     * @summary 大気層を描画する。
     *
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     */
    draw( render_stage, gocs_to_clip, view_to_gocs )
    {
        const  material = this._viewer._render_cache.moon_material;

        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs, this._viewer.sun, this._viewer.moon, this._radius, this._intensity );

        if( need_draw ) {
            this._mesh.draw( material );
        }
    }



    /**
     * @summary 大気層を描画する。
     *
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     */
    drawMask( render_stage, gocs_to_clip, view_to_gocs )
    {
        const  material = this._viewer._render_cache.moon_mask_material;

        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs, this._viewer.sun, this._viewer.moon, this._radius, this._intensity );

        if( need_draw ) {
            this._mesh.draw( material );
        }
    }

}
export default MoonVisualizer;
