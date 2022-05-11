import Mesh, { MeshData } from "./Mesh";
import GeoMath, { Matrix, Vector3 } from "./GeoMath";
import Resource, { URLResource } from "./Resource";
import StarMaterial from "./StarMaterial";
import ConstellationMaterial from "./ConstellationMaterial";
import MilkyWayMaterial from "./MilkyWayMaterial";

import Viewer from "./Viewer";
import GLEnv from "./GLEnv";
import RenderStage from "./RenderStage";



type Constellation = [ string, number, number, number, number, number[] ];
type Star = [ number, number, number, number, number, number, number, number, string ];



interface StarJSON {
    stars: Star[];
    constellations: Constellation[];
}


interface HipMap {
    [ id: number ]: Star;
}


interface NameMap {
    [ id: string ]: Star;
}


interface ConstellationCodeMap {
    [ id: string ]: Constellation;
}



/**
 * 星、星座、天の川を表現するクラス
 */
class StarVisualizer {

    private _viewer!: Viewer;
    private _glenv!: GLEnv;
    private _mesh!: Mesh;
    private _constellationMesh!: Mesh;  // 星座
    private _milkyWayMesh!: Mesh;       // 天の川
    private _matrix_cache: Matrix;

    private _visibility!: boolean;
    private _constellation_visibility!: boolean;
    private _milkyway_visibility!: boolean;

    private _intensity!: number;

    private _longitude!: number;

    private _line_color!: Vector3;

    private _milkyway_intensity!: number;

    private _stars!: Star[];
    private _starHipMap!: HipMap;        // Hip to star
    private _starNameMap!: NameMap;      // Name to star
    private _constellations!: Constellation[];
    private _constellationCodeMap!: ConstellationCodeMap;      // Code to constellation

    private _json_url: string;
    private _loaded: boolean;

    private _milkyWayImage!: string | URLResource;


    /**
     * constructor
     *
     * @param json_url 星データJSONのURL
     * @param milkyway_image_src 天の川image
     */
    constructor( json_url: string, milkyway_image_src: (string | URLResource) = '' )
    {
        this._json_url = json_url;
        this._loaded = false;

        this._milkyWayImage = milkyway_image_src;

        this._matrix_cache = GeoMath.createMatrix();
    }


    /**
     * 初期化
     * Viewerのコンストラクタで呼び出されます。
     *
     * @param viewer 所属するViewer
     */
    async init( viewer: Viewer )
    {
        this._viewer = viewer;
        this._glenv = viewer.glenv;

        this._visibility = true;
        this._constellation_visibility = false;
        this._milkyway_visibility = true;

        this._intensity = 0.0;

        this._longitude = 0.0;

        this._line_color = GeoMath.createVector3( [ 0, 0.5, 1 ] );

        this._milkyway_intensity = 1.0;

        // load JSON
        const starData = await this._loadJSON( this._json_url );

        this._stars = starData.stars;
        this._constellations = starData.constellations;
        this._starHipMap = {};
        this._starNameMap = {};
        this._constellationCodeMap = {};

        for ( let i = 0; i < this._stars.length; i++ ) {
            const star = this._stars[i];
            const id = star[0];
            const name = star[8];
            this._starHipMap[ id ] = star;
            this._starNameMap[ name ] = star;
        }

        for ( let i = 0; i < this._constellations.length; i++ ) {
            const constellation = this._constellations[ i ];
            const code = constellation[ 0 ];
            this._constellationCodeMap[ code ] = constellation;
        }

        this._createMesh();
        this._createConstellationMesh();
        this._createMilkyWayMesh();

        this._checkMaterials();

        this._loaded = true;
    }


    /**
     * JSONを取得
     * @param url jsonのURL
     * @return json object
     */
    private async _loadJSON( url: string ): Promise<StarJSON>
    {
        const res: Response = await fetch( url );
        if ( !res.ok ) {
            throw new Error("JSON load error");
        }
        return await res.json() as StarJSON;
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
    setVisibility( flag: boolean ): void { this._visibility = flag; }


    /**
     * 可視性フラグを取得
     * @readonly
     */
    get constellationVisibility(): boolean { return this._constellation_visibility; }


    /**
     * 可視性フラグを設定
     *
     * @param visibility  可視性フラグ
     */
    setConstellationVisibility( flag: boolean ): void { this._constellation_visibility = flag; }


    /**
     * 可視性フラグを取得
     * @readonly
     */
    get milkywayVisibility(): boolean { return this._milkyway_visibility; }


    /**
     * 可視性フラグを設定
     *
     * @param visibility  可視性フラグ
     */
    setMilkyWayVisibility( flag: boolean ): void { this._milkyway_visibility = flag; }


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
     * 基準経度を設定
     *
     * @param value  経度
     */
    setLongitude( value: number ): void
    {
        this._longitude = value;
    }


    /**
     * 線色を設定
     *
     * @param value  輝度係数
     */
    setLineColor( color: Vector3 ): void
    {
        this._line_color = color;
    }


    /**
     * 天の川の輝度係数を設定
     *
     * @param value  輝度係数
     */
    setMilkyWayIntensity( value: number ): void
    {
        this._milkyway_intensity = value;
    }


    /**
     * Hip番号から、星名を取得
     *
     * @param hip  hip番号
     * @return 星名
     */
    getStarName( hip: number ): string | undefined
    {
        if ( !this._loaded ) return undefined;

        const star = this._starHipMap[ hip ];
        if ( !star ) return undefined;

        return star[ 8 ];
    }


    /**
     * 星名から、星座標(パーセク単位)を取得
     *
     * @param name  星名
     * @return 星座標(パーセク単位)
     */
    getStarPoint( name: string ): Vector3 | undefined
    {
        if ( !this._loaded ) return undefined;

        const star = this._starNameMap[ name ];
        if ( !star ) return undefined;

        const x = star[ 5 ];
        const y = star[ 6 ];
        const z = star[ 7 ];
        // longitude z軸回転
        const th = this._longitude * GeoMath.DEGREE;
        const cos_th = Math.cos( th );
        const sin_th = Math.sin( th );
        const rx = x *  cos_th + y * sin_th;
        const ry = x * -sin_th + y * cos_th;
        const rz = z;
        return GeoMath.createVector3( [ rx, ry, rz ] );
    }


    /**
     * 星座コードから、星座中心座標へのベクトルを取得
     *
     * @param code  星座コード
     * @return 星座中心座標へのベクトル
     */
    getConstellationPoint( code: string ): Vector3 | undefined
    {
        if ( !this._loaded ) return undefined;

        const constellation = this._constellationCodeMap[ code ];
        if ( !constellation ) return undefined;

        const x = constellation[ 1 ];
        const y = constellation[ 2 ];
        const z = constellation[ 3 ];
        // longitude z軸回転
        const th = this._longitude * GeoMath.DEGREE;
        const cos_th = Math.cos( th );
        const sin_th = Math.cos( th );
        const rx = x *  cos_th + y * sin_th;
        const ry = x * -sin_th + y * cos_th;
        const rz = z; 

        return GeoMath.createVector3( [ rx, ry, rz ] );
    }


    /**
     * 星座コードから、星座の視野の角度を取得(radian)
     *
     * @param code  星座コード
     * @return 星座の視野の角度(radian)
     */
    getConstellationAngle( code: string ): number | undefined
    {
        if ( !this._loaded ) return undefined;

        const constellation = this._constellationCodeMap[ code ];
        if ( !constellation ) return undefined;
        return constellation[ 4 ];
    }


    /**
     * 星座コードから、星座を構成する星のHIP番号を取得
     *
     * @param code  星座コード
     * @return 星座HIPコード配列
     */
    getConstellationStars( code: string ): number[] | undefined
    {
        if ( !this._loaded ) return undefined;

        const constellation = this._constellationCodeMap[ code ];
        if ( !constellation ) return undefined;

        const stars = constellation[ 5 ];
        const set = new Set( stars );
        return Array.from( set );
    }


    /**
     * メッシュを生成
     */
    private _createMesh(): void
    {
        const vertices = [];
        for ( let i = 0; i < this._stars.length; i++ ) {
            const star = this._stars[i];
            vertices.push( star[5] );  // z
            vertices.push( star[6] );  // x
            vertices.push( star[7] );  // y

            const rank = star[1] / 10.0;
            const brightness = rank > 2 ? (( 13.0 - rank ) / 10.0) : 1.0;
            vertices.push( star[2] / 255 * brightness );   // r
            vertices.push( star[3] / 255 * brightness );   // g
            vertices.push( star[4] / 255 * brightness );   // b
            const size = ( 9 - rank ) * 6; // ( ( 3 - rank ) + 6 ) * 6
            vertices.push( GeoMath.clamp( size, 3.0, 30.0 ) );   //rank
        }

        const mesh_data: MeshData = {
            vtype: [
                { name: "a_position", size: 3 },
                { name: "a_color", size: 3 },
                { name: "a_rank", size: 1 },
            ],
            ptype: "points",
            vertices: vertices,
        };

        this._mesh = new Mesh( this._glenv, mesh_data );
    }


    /**
     * 星座メッシュを生成
     */
    private _createConstellationMesh(): void
    {
        const vertices: Array<number> = [];
        const indices: Array<number> = [];

        // make data
        const indexMap = new Array();

        for ( let i = 0; i < this._constellations.length; i++ ) {
            const constellation = this._constellations[ i ];
            const constellationHip: number[] = constellation[ 5 ];
            for ( let j = 0; j < constellationHip.length; j += 2 ) {
                const h1 = constellationHip[ j ];
                const h2 = constellationHip[ j + 1 ];

                let i1 = indexMap.indexOf( h1 );
                let i2 = indexMap.indexOf( h2 );

                if ( i1 === -1 ) {
                    i1 = indexMap.length;
                    indexMap.push( h1 );
                }
                if ( i2 === -1 ) {
                    i2 = indexMap.length;
                    indexMap.push( h2 );
                }

                indices.push( i1 );
                indices.push( i2 );
            }
        }

        // make vertices
        for ( let i = 0; i < indexMap.length; i++ ) {
            const star = this._starHipMap[ indexMap[ i ] ];
            vertices.push( star[ 5 ] ); // x
            vertices.push( star[ 6 ] ); // y
            vertices.push( star[ 7 ] ); // z
        }

        const mesh_data: MeshData = {
            vtype: [
                { name: "a_position", size: 3 },
            ],
            ptype: "lines",
            vertices: vertices,
            indices:  indices,
        };

        this._constellationMesh = new Mesh( this._glenv, mesh_data );
    }


    /**
     * メッシュを生成
     */
    private _createMilkyWayMesh(): void
    {
        const SPHERE_DIV = 32;
        const radius = 1.0;

        // Vertices
        const vertices = [], indices = [];
        for ( let j = 0; j <= SPHERE_DIV; j++ ) {
            const angle_j = j * Math.PI / SPHERE_DIV;
            const sin_j = Math.sin( angle_j );
            const cos_j = Math.cos( angle_j );
            for ( let i = 0; i <= SPHERE_DIV; i++ ) {
                const angle_i = i * 2 * Math.PI / SPHERE_DIV;
                const sin_i = Math.sin( angle_i );
                const cos_i = Math.cos( angle_i );

                vertices.push( cos_i * sin_j * radius );
                vertices.push( sin_i * sin_j * radius );
                vertices.push( cos_j * radius );

                vertices.push( i / SPHERE_DIV + 0.5 );
                vertices.push( 1 - j / SPHERE_DIV );
            }
        }

        // Indices
        for ( let j = 0; j < SPHERE_DIV; j++ ) {
            for ( let i = 0; i < SPHERE_DIV; i++ ) {
                const p1 = j * ( SPHERE_DIV + 1 ) + i;
                const p2 = p1 + ( SPHERE_DIV + 1 );

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
            indices:  indices,
        };

        this._milkyWayMesh = new Mesh( this._glenv, mesh_data );
    }


    /**
     * マテリアルを確認してCacheにセット
     */
    private _checkMaterials(): void
    {
        // @ts-ignore
        const render_cache = this._viewer._render_cache || (this._viewer._render_cache = {});
        if ( !render_cache.star_material ) {
            render_cache.star_material = new StarMaterial( this._viewer );
            render_cache.constellation_material = new ConstellationMaterial( this._viewer );
            render_cache.milkyway_material = new MilkyWayMaterial( this._viewer, this._milkyWayImage );
        }
    }


    /**
     * マテリアルを削除
     */
    private _deleteMaterials(): void
    {
        // @ts-ignore
        const render_cache = this._viewer._render_cache;
        if ( render_cache ) {
            if ( render_cache.star_material ) {
                render_cache.star_material.dispose();
            }
            if ( render_cache.constellation_material ) {
                render_cache.constellation_material.dispose();
            }
            if ( render_cache.milkyway_material ) {
                render_cache.milkyway_material.dispose();
            }
        }
    }


    /**
     * 星、星座を描画
     *
     * @param render_stage レンダーステージ
     * @param width        canvasのwidth
     * @param height       canvasのheight 
     * @param gocs_to_view gocs_to_view
     */
    draw( render_stage: RenderStage, width: number, height: number, gocs_to_view: Matrix ): void
    {
        if ( !this._loaded ) {
            return;
        }

        const parsec_ratio = 3085677581000000;
        const near = 0.5 * parsec_ratio;
        const far = 55000 * parsec_ratio;

        // キャンバスの横幅に対する高さの比
        const aspect = height / width;

        // fov を対角線画角と解釈して単位サイズを求める
        // (単位空間の水平方向 1 に対する近接平面上での寸法)
        const hfov = render_stage.viewer.camera.fov * GeoMath.DEGREE / 2;  // 半画角 (radians)
        const unit = near * Math.tan( hfov ) / Math.sqrt( 1 + aspect * aspect );

        // 近接平面上での平面位置
        const   left = -unit;
        const  right = +unit;
        const bottom = -unit * aspect;
        const    top = +unit * aspect;

        const view_to_clip = GeoMath.frustum_matrix( left, right, bottom, top, near, far, this._matrix_cache );

        const gocs_to_clip_parsec = GeoMath.mul_PzA( view_to_clip, gocs_to_view, this._matrix_cache );

        const scale = Math.sqrt( width * width + height * height ) / render_stage.viewer.camera.fov / ( 48.0 - this._intensity * 40.0 );

        const gl = render_stage.glenv.context;

        if ( this._milkyway_visibility ) {
            // @ts-ignore
            const milkyWayMaterial = this._viewer._render_cache.milkyway_material;
            milkyWayMaterial.bindProgram();
            milkyWayMaterial.setParameter( render_stage, gocs_to_clip_parsec, this._longitude, this._milkyway_intensity );
            gl.frontFace( gl.CW );
            this._milkyWayMesh.draw( milkyWayMaterial );
            gl.frontFace( gl.CCW );
        }

        gl.blendFuncSeparate( gl.ONE_MINUS_DST_COLOR, gl.ONE, gl.ZERO, gl.ONE );  // 比較(明)

        if ( this._constellation_visibility ) {
            // @ts-ignore
            const constellationMaterial = this._viewer._render_cache.constellation_material;
            constellationMaterial.bindProgram();
            constellationMaterial.setParameter( render_stage, gocs_to_clip_parsec, this._longitude, this._line_color );
            this._constellationMesh.draw( constellationMaterial );
        }

        if ( this._visibility ) {
            // @ts-ignore
            const  material = this._viewer._render_cache.star_material;
            material.bindProgram();
            material.setParameter( render_stage, gocs_to_clip_parsec, this._longitude, scale );
            this._mesh.draw( material );
        }

        gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE );  // FB のα値は変えない
    }
}



export default StarVisualizer;
