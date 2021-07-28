import Mesh from "./Mesh";
import GeoMath from "./GeoMath";
import GeoPoint from "./GeoPoint";
import TextureSunMaterial from "./TextureSunMaterial";


/**
 * @summary テクスチャで太陽を表現するクラス
 * @memberof mapray
 */
class TextureSunVisualizer {

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

        this._parameters = {
            kr: 0.0025, km: 0.001, scale_depth: 0.25, esun: 20.0
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
        this._mesh.dispose;
        this._viewer = null;
        this._glenv = null;
    }


    /**
     * @summary 可視性フラグを取得
     * @type {boolean}
     * @readonly
     */
    get visibility() { return this._visibility; }


    /**
     * @summary 可視性フラグを設定
     *
     * @param {boolean} visibility  可視性フラグ
     */
    setVisibility( flag ) { this._visibility = flag; }


    /**
     * @summary 半径係数を設定
     *
     * @param {number} value  半径係数
     */
    setRadius( value ) {
        if ( value < 0 ) { value = 0.1; }
        this._radius = value;
    }


    /**
     * @summary 輝度係数を設定
     *
     * @param {number} value  輝度係数
     */
    setIntensity( value ) {
        this._intensity = value;
    }



    /**
     * @summary レイリー係数を設定
     *
     * @param {number} value  レイリー係数
     */
    setRayleigh( value )
    {
        this._parameters.kr = value;
    }


    /**
     * @summary ミー係数を設定
     *
     * @param {number} value  ミー係数
     */
    setMie( value )
    {
        this._parameters.km = value;
    }


    /**
     * @summary 大気スケール係数を設定
     *
     * @param {number} value  大気スケール係数
     */
    setScaleDepth( value )
    {
        this._parameters.scale_depth = value;
    }


    /**
     * @summary 大気太陽係数を設定
     *
     * @param {number} value  大気太陽係数
     */
    setSunRate( value )
    {
        this._parameters.esun = value;
    }


    /**
     * @private
     */
    _createMesh() {

      const vertices = [
          -1.0,  1.0,  0.0,  0.0, 1.0, // top left
          -1.0, -1.0,  0.0,  0.0, 0.0, // bottom left
           1.0,  1.0,  0.0,  1.0, 1.0, // top right
           1.0, -1.0,  0.0,  1.0, 0.0, // bottom right
      ];

      const indices = [
          0, 1, 2, 1, 3, 2
      ];

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
        if ( !render_cache.sun_material ) {
            render_cache.sun_material = new TextureSunMaterial( this._viewer, this._image );
        }
    }


    /**
     * @private
     */
    _deleteMaterials() {
        if (this._viewer._render_cache && render_cache.sun_material ) {
            render_cache.sun_material.dispose();
        }
    }


    /**
     * @summary 太陽を描画する。
     *
     * @param {mapray.RenderStage} render_stage レンダリングステージ
     * @param {mapray.Matrix} gocs_to_clip gocs_to_clip
     * @param {mapray.Matrix} view_to_gocs view_to_gocs
     */
    draw( render_stage, gocs_to_clip, view_to_gocs )
    {
        const  material = this._viewer._render_cache.sun_material;

        material.bindProgram();
        const need_draw = material.setParameter( render_stage, gocs_to_clip, view_to_gocs,
          this._viewer.sun, this._radius, this._intensity, this._parameters );

        if( need_draw ) {
            this._mesh.draw( material );
        }
    }


}
export default TextureSunVisualizer;
