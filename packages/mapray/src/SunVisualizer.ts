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
    constructor( divide: number = 32 )
    {
        if ( divide < 3 ) throw new Error( "divide must be greater than 2" );
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
        const circle_layer = 15;

        // Vertices
        const vertices = [], indices = [];

        // center
        vertices.push( 0.0, 0.0, 0.0 );
        vertices.push( 1.0 );

        for ( let j = 0; j < circle_layer; j++ ) {
          const layer_radius = LAYER_RADIUS_TABLE[j];
          const layer_color = LAYER_COLOR_TABLE[j];
          for ( let i = 0; i < SPHERE_DIV; i++ ) {
            const th = i * 2.0 * Math.PI / SPHERE_DIV;
            vertices.push(
              Math.sin( th ) * layer_radius,
              Math.cos( th ) * layer_radius,
              0.0
            );
            vertices.push( layer_color / 255.0 );
          }
        }

        for ( let i = 0; i < SPHERE_DIV; i++ ) {
            indices.push(
              0,
              1 + (i + 1) % SPHERE_DIV,
              1 + i
            );
        }

        //    |                //
        //  -21---____     /   //
        //    |       """-22_  //
        //    |          /     //
        //    |         /      //
        //    |        /       //
        //  -11--__   /        //
        //    |    ""12-_      //
        //    |     /          //
        //    |    /           //
        //    |   /            //

        let r2 = 1;
        let th2 = 0;
        for ( let j = 0; j < circle_layer - 1; j++ ) {
          const r1 = r2;
          r2 += SPHERE_DIV;
          for ( let i = 0; i < SPHERE_DIV; i++ ) {
            const th1 = th2;
            th2 = (th2 + 1) % SPHERE_DIV;
            const idx11 = r1 + th1;
            const idx12 = r1 + th2;
            const idx21 = r2 + th1;
            const idx22 = r2 + th2;
            indices.push( idx11, idx12, idx22 );
            indices.push( idx11, idx22, idx21 );
          }
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
        if ( render_cache && render_cache.sun_material ) {
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



const LAYER_RADIUS_TABLE = [
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

const LAYER_COLOR_TABLE = [
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



namespace SunVisualizer {



export interface Parameters {
    kr: number,
    km: number,
    scale_depth: number,
    esun: number,
}



} // namespace SunVisualizer



export default SunVisualizer;
