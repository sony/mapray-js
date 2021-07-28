import Mesh from "./Mesh";
import GeoMath, { Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import SunMaterial from "./SunMaterial";

import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import RenderStage from "./RenderStage";


/**
 * 太陽を表現するクラス
 */
class SunVisualizer {

    private _divide: number;
    private _viewer!: Viewer;
    private _glenv!: GLEnv;
    private _mesh!: Mesh;

    private _visibility!: boolean;

    private _radius!: number;
    private _intensity!: number;

    private _parameters!: SunVisualizer.Parameters;

    /**
     * constructor
     *
     * @param divide 円分割数 (3以上)
     */
    constructor( divide: number )
    {
        if ( divide < 3 ) { divide = 3; }
        this._divide = divide;
    }


    /**
     * 初期化
     * Viewerのコンストラクタで呼び出されます。
     *
     * @param {mapray.Viewer} viewer 所属するViewer
     */
    init( viewer: Viewer )
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;

        this._visibility = true;

        this._radius = 1.0;
        this._intensity = 1.0;

        this._parameters = {
            kr: 0.0025, km: 0.001, scale_depth: 0.25, esun: 20.0
        };

        this._createMesh();
        this._checkMaterials();
    }


    /**
     * 破棄
     */
    destroy( )
    {
        this._deleteMaterials();
        if (this._mesh) this._mesh.dispose();
    }


    /**
     * 可視性フラグを取得
     * @readonly
     */
    get visibility(): Boolean { return this._visibility; }


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
    setRadius( value: number ) {
        if ( value < 0 ) { value = 0.1; }
        this._radius = value;
    }


    /**
     * 輝度係数を設定
     *
     * @param value  輝度係数
     */
    setIntensity( value: number ) {
        this._intensity = value;
    }



    /**
     * レイリー係数を設定
     *
     * @param value  レイリー係数
     */
    setRayleigh( value: number )
    {
        this._parameters.kr = value;
    }


    /**
     * ミー係数を設定
     *
     * @param value  ミー係数
     */
    setMie( value: number )
    {
        this._parameters.km = value;
    }


    /**
     * 大気スケール係数を設定
     *
     * @param value  大気スケール係数
     */
    setScaleDepth( value: number )
    {
        this._parameters.scale_depth = value;
    }


    /**
     * 大気太陽係数を設定
     *
     * @param value  大気太陽係数
     */
    setSunRate( value: number )
    {
        this._parameters.esun = value;
    }


    /**
     * メッシュを生成
     * 
     * @internal
     */
    _createMesh() {

        const SPHERE_DIV = this._divide;
        let i, ai, si, ci;
        let j;
        let layer_radius;
        let layer_color;

        const radius = 1.0;
        const circle_layer = 15;

        const layer_radius_table = [
          0.0128,
          0.0176,
          0.0264,
          0.0312,
          0.0344,
          0.0408,
          0.0456,
          0.052,
          0.064,
          0.0792,
          0.1,
          0.1176,
          0.148,
          0.18,
          1
        ];

        const layer_color_table = [
          255,
          247,
          200,
          172,
          157,
          131,
          115,
          99,
          76,
          58,
          43,
          35,
          26,
          20,
          0
        ];

        // Vertices
        let vertices = [], indices = [];

        // center
        vertices.push(0.0);
        vertices.push(0.0);
        vertices.push(0.0);
        vertices.push(1.0);

        for (j = 0; j < circle_layer; j++) {
          layer_radius = layer_radius_table[j];
          layer_color = layer_color_table[j];
          for (i = 0; i < SPHERE_DIV; i++) {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            vertices.push(si * layer_radius);
            vertices.push(ci * layer_radius);
            vertices.push(0.0);

            vertices.push(layer_color/255);
          }
        }

        for (i = 1; i < SPHERE_DIV; i++) {
            indices.push(0);
            indices.push(i+1);
            indices.push(i);
        }
        indices.push(0);
        indices.push(1);
        indices.push(SPHERE_DIV);

        for (j = 1; j < circle_layer; j++) {
          for (i = SPHERE_DIV * j; i < SPHERE_DIV*(j+1)-1; i++) {
            indices.push(i - SPHERE_DIV + 1);
            indices.push(i + 2);
            indices.push(i + 1);

            indices.push(i - SPHERE_DIV + 1);
            indices.push(i - SPHERE_DIV + 2);
            indices.push(i + 2);
          }
          i = SPHERE_DIV*(j+1) - 1;
          indices.push(i - SPHERE_DIV + 1);
          indices.push(i - SPHERE_DIV + 2);
          indices.push(i + 1);

          indices.push(i - SPHERE_DIV + 1);
          indices.push(i + 2 - SPHERE_DIV*2);
          indices.push(i - SPHERE_DIV + 2);
        }

        const mesh_data = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_glow",     size: 1 },
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
        if ( !render_cache.sun_material ) {
            render_cache.sun_material = new SunMaterial( this._viewer );
        }
    }


    /**
     * マテリアルを削除
     */
    private _deleteMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache;
        if (render_cache && render_cache.sun_material ) {
            render_cache.sun_material.dispose();
        }
    }


    /**
     * 太陽を描画する。
     *
     * @param render_stage レンダリングステージ
     * @param gocs_to_clip gocs_to_clip
     * @param view_to_gocs view_to_gocs
     */
    draw( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix )
    {
        // @ts-ignore
        const  material = this._viewer._render_cache.sun_material;

        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs,
          this._viewer.sun, this._radius, this._intensity, this._parameters );

        if( need_draw ) {
            this._mesh.draw( material );
        }
    }


}

namespace SunVisualizer {


    export interface Parameters {
        kr: number,
        km: number,
        scale_depth: number,
        esun: number,
    }
    
} // namespace SunVisualizer

export default SunVisualizer;
