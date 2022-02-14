import Mesh from "./Mesh";
import GeoMath, { Matrix } from "./GeoMath";
import MoonMaterial from "./MoonMaterial";
import Resource, { URLResource } from "./Resource";

import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import RenderStage from "./RenderStage";


/**
 * 月を表現するクラス
 */
class MoonVisualizer {

    private _image!: (string | URLResource);
    private _viewer!: Viewer;
    private _glenv!: GLEnv;
    private _mesh!: Mesh;

    private _visibility!: boolean;

    private _radius!: number;
    private _intensity!: number;

    /**
     * constructor
     *
     * @param {string|URLResource} image_src image source
     */
    constructor( image_src: (string | URLResource) )
    {
        this._image = image_src;
    }


    /**
     * 初期化
     * Viewerのコンストラクタで呼び出されます。
     *
     * @param viewer 所属するViewer
     */
    init( viewer: Viewer ): void
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;

        this._visibility = true;

        this._radius = 1.0;
        this._intensity = 1.0;

        this._createMesh();
        this._checkMaterials();
    }


    /**
     * 破棄
     */
    destroy(): void
    {
        this._deleteMaterials();
        if ( this._mesh ) this._mesh.dispose();
    }


    /**
     * 可視性フラグを取得
     * @readonly
     */
     get visibility(): boolean { return this._visibility; }


     /**
      * 可視性フラグを設定
      *
      * @param visibility  可視性フラグ
      */
     setVisibility( flag: boolean ) { this._visibility = flag; }

     
    /**
     * 半径係数を設定
     *
     * @param value  半径係数
     */
    setRadius( value: number ): void
    {
        if ( value < 0 ) { value = 0.1; }
        this._radius = value;
    }


    /**
     * 輝度係数を設定
     *
     * @param value  輝度係数
     */
    setIntensity( value: number ): void
    {
        this._intensity = value;
    }


    /**
     * メッシュを生成
     */
    private _createMesh(): void
    {
        const SPHERE_DIV = 32;
        let ai, si, ci;
        let aj, sj, cj;
        let p1, p2;

        const radius = 10.25;

        // Vertices
        const vertices = [], indices = [];
        for ( let j = 0; j <= SPHERE_DIV; j++ ) {
            aj = j * Math.PI / SPHERE_DIV;
            sj = Math.sin( aj );
            cj = Math.cos( aj );
            for ( let i = 0; i <= SPHERE_DIV; i++ ) {
                ai = i * 2 * Math.PI / SPHERE_DIV;
                si = Math.sin( ai );
                ci = Math.cos( ai );

                vertices.push( ci * sj * radius );
                vertices.push( si * sj * radius );
                vertices.push( cj * radius );

                vertices.push( i / SPHERE_DIV + 0.5 );
                vertices.push( 1 - j / SPHERE_DIV );
            }
        }

        // Indices
        for ( let j = 0; j < SPHERE_DIV; j++ ) {
            for ( let i = 0; i < SPHERE_DIV; i++ ) {
                p1 = j * (SPHERE_DIV + 1) + i;
                p2 = p1 + (SPHERE_DIV + 1);

                indices.push( p1 );
                indices.push( p2 );
                indices.push( p1 + 1 );

                indices.push( p1 + 1 );
                indices.push( p2 );
                indices.push( p2 + 1 );
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
     * マテリアルを確認してCacheにセット
     */
    private _checkMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.moon_material ) {
            render_cache.moon_material = new MoonMaterial( this._viewer, this._image );
            render_cache.moon_mask_material = new MoonMaterial( this._viewer, this._image, { mask: true } );
        }
    }


    /**
     * マテリアルを削除
     */
    private _deleteMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache;
        if ( render_cache._render_cache && render_cache.moon_material ) {
            render_cache.moon_material.dispose();
            render_cache.moon_mask_material.dispose();
        }
    }


    /**
     * 月を描画
     *
     * @param render_stage レンダリングステージ
     * @param gocs_to_clip gocs_to_clip
     * @param view_to_gocs view_to_gocs
     */
    draw( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix )
    {
        // @ts-ignore
        const  material = this._viewer._render_cache.moon_material;
        this._draw( render_stage, gocs_to_clip, view_to_gocs, material );
    }


    /**
     * 月マスクを描画
     *
     * @param render_stage レンダリングステージ
     * @param gocs_to_clip gocs_to_clip
     * @param view_to_gocs view_to_gocs
     */
    drawMask( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix )
    {
        // @ts-ignore
        const material = this._viewer._render_cache.moon_mask_material;
        this._draw( render_stage, gocs_to_clip, view_to_gocs, material );
    }


    private _draw( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix, material: MoonMaterial )
    {
        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs, this._viewer.sun, this._viewer.moon, this._radius, this._intensity );

        if ( need_draw ) {
            this._mesh.draw( material );
        }
    }

}
export default MoonVisualizer;
