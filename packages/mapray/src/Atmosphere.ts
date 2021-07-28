import Mesh from "./Mesh";
import GeoMath, { Matrix } from "./GeoMath";
import GeoPoint from "./GeoPoint";
import AtmosphereMaterial from "./AtmosphereMaterial";

import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import RenderStage from "./RenderStage";


/**
 * @summary 大気層を表現するクラス
 * @memberof mapray
 */
class Atmosphere {

    private _viewer!: Viewer;

    private _glenv!: GLEnv;

    private _mesh!: Mesh;

    private _visibility!: {
        sky: boolean;
        ground: boolean;
    };

    private _parameters!: Atmosphere.Parameters;


    /**
     * 初期化
     *
     * @param viewer 所属するViewer
     */
    init( viewer: Viewer )
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;

        this._visibility = { sky: true, ground: true };

        this._parameters = {
            kr: 0.01, km: 0.001, scale_depth: 0.13, esun: 17.5, exposure: -1.4,
            g_kr: 0.0025, g_km: 0.001, g_scale_depth: 0.25, g_esun: 16.0, g_exposure: -2.0
        };

        this._createMesh();
        this._checkMaterials();
    }


    /**
     * @summary 破棄
     */
    destroy( )
    {
        this._deleteMaterials();
        if (this._mesh) this._mesh.dispose();
    }


    /**
     * @summary 可視性フラグを取得
     * @type {boolean}
     * @readonly
     */
    get visibility() { return this._visibility; }


    /**
     * @summary 大気層可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     */
    setSkyVisibility( flag: boolean ) { this._visibility.sky = flag; }


    /**
     * @summary 地表大気表現可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     */
    setGroundVisibility( flag: boolean ) { this._visibility.ground = flag; }


    /**
     * @summary 大気パラメータを取得
     * @type {object}
     * @readonly
     */
    get parameters() { return this._parameters; }


    /**
     * @summary レイリー係数を設定
     *
     * @param {number} value  レイリー係数
     */
    setRayleigh( value: number )
    {
        this._parameters.kr = value;
    }


    /**
     * @summary ミー係数を設定
     *
     * @param {number} value  ミー係数
     */
    setMie( value: number )
    {
        this._parameters.km = value;
    }


    /**
     * @summary 大気スケール係数を設定
     *
     * @param {number} value  大気スケール係数
     */
    setScaleDepth( value: number )
    {
        this._parameters.scale_depth = value;
    }


    /**
     * @summary 大気太陽係数を設定
     *
     * @param {number} value  大気太陽係数
     */
    setSunRate( value: number )
    {
        this._parameters.esun = value;
    }


    /**
     * @summary 大気露光係数を設定
     *
     * @param {number} value  大気露光係数
     */
    setExposure( value: number )
    {
        this._parameters.exposure = value;
    }



    /**
     * @summary 地表レイリー係数を設定
     *
     * @param {number} value  地表レイリー係数
     */
    setGroundRayleigh( value: number )
    {
        this._parameters.g_kr = value;
    }


    /**
     * @summary 地表ミー係数を設定
     *
     * @param {number} value  地表ミー係数
     */
    setGroundMie( value: number )
    {
        this._parameters.g_km = value;
    }


    /**
     * @summary 地表大気スケール係数を設定
     *
     * @param {number} value  地表大気スケール係数
     */
    setGroundScaleDepth( value: number )
    {
        this._parameters.g_scale_depth = value;
    }


    /**
     * @summary 地表大気露光係数を設定
     *
     * @param {number} value  地表大気露光係数
     */
    setGroundSunRate( value: number )
    {
        this._parameters.g_esun = value;
    }


    /**
     * @summary 地表大気露光係数を設定
     *
     * @param {number} value  地表大気露光係数
     */
    setGroundExposure( value: number )
    {
        this._parameters.g_exposure = value;
    }


    /**
     * @private
     */
    _createMesh() {
        const SPHERE_DIV = 320;
        // const SPHERE_DIV = 180;
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


    /**
     */
    private _checkMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.sky_space_material ) {
            render_cache.sky_space_material = new AtmosphereMaterial( this._viewer );
            render_cache.sky_atmosphere_material = new AtmosphereMaterial( this._viewer, { from_atmosphere: true } );
        }
    }

    /**
     */
    private _deleteMaterials() {
        // @ts-ignore
        const render_cache = this._viewer._render_cache;
        if ( render_cache && render_cache.sky_space_material ) {
            render_cache.sky_space_material.dispose();
            render_cache.sky_atmosphere_material.dispose();
            render_cache.sky_space_material = undefined;
            render_cache.sky_atmosphere_material = undefined;
        }
    }


    /**
     * 大気層を描画する。
     *
     * @param render_stage レンダリングステージ
     * @param gocs_to_clip gocs_to_clip
     * @param view_to_gocs view_to_gocs
     */
    draw( render_stage: RenderStage, gocs_to_clip: Matrix, view_to_gocs: Matrix )
    {
        // @ts-ignore
        const gl = render_stage._glenv.context;

        const adjusted_radius = GeoMath.EARTH_RADIUS * 0.1;
        const cx = view_to_gocs[12] / adjusted_radius;
        const cy = view_to_gocs[13] / adjusted_radius;
        const cz = view_to_gocs[14] / adjusted_radius;
        const camera_position = [ cx, cy, cz ];
        const camera_height = Math.sqrt( cx*cx + cy*cy + cz*cz );

        let material = null;
        if( camera_height >= 10.25 ) {
          // space
          // @ts-ignore
          material = this._viewer._render_cache.sky_space_material;
        } else {
          // atmosphere
          // @ts-ignore
          material = this._viewer._render_cache.sky_atmosphere_material;
        }

        material.bindProgram();
        material.setParameter( render_stage, gocs_to_clip, camera_position, camera_height, this._parameters );

        gl.frontFace( gl.CW );
        this._mesh.draw( material );
        gl.frontFace( gl.CCW );
    }


    /**
     * @summary カメラ高度から、Ground用シェーダを選択する。
     *
     * @param view_to_gocs view_to_gocs
     */
    selectGroundShader( view_to_gocs: Matrix )
    {
        const camera_height = Math.sqrt(
            view_to_gocs[12] * view_to_gocs[12] +
            view_to_gocs[13] * view_to_gocs[13] +
            view_to_gocs[14] * view_to_gocs[14] );

        if ( camera_height >= GeoMath.EARTH_RADIUS * 1.025 ) {
            // space
            // @ts-ignore
            return this._viewer._render_cache.surface_ground_space_material;
        } else {
            // atmosphere
            // @ts-ignore
            return this._viewer._render_cache.surface_ground_atmosphere_material;
        }
    }

}



namespace Atmosphere {


export interface Parameters {
    kr: number,
    km: number,
    scale_depth: number,
    esun: number,
    exposure: number,
    g_kr: number,
    g_km: number,
    g_scale_depth: number,
    g_esun: number,
    g_exposure: number,
}


} // namespace Atmosphere


export default Atmosphere;
