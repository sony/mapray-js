import { cfa_assert } from "./util/assertion";
import Shader from "./Shader";
import GLEnv from "./GLEnv";
import GeoMath, { Vector2, Vector3, Vector4, Matrix } from "./GeoMath";


/**
 * マテリアル
 */
class Material {

    /**
     * @param glenv   - WebGL 環境
     * @param vs_code - 頂点シェーダのソースコード
     * @param fs_code - フラグメントシェーダのソースコード
     */
    constructor( glenv:   GLEnv,
                 vs_code: string,
                 fs_code: string )
    {
        const shader  = new Shader( glenv, vs_code, fs_code );
        this._gl      = glenv.context;
        this._program = this._link_shaders( shader.vs_object, shader.fs_object );
        this._vertex_attribs   = this._create_vertex_attribs();
        this._uniform_location = this._create_uniform_location();

        shader.dispose();
    }


    /**
     * シェーダをリンク
     *
     * @param vs - 頂点シェーダ
     * @param fs - フラグメントシェーダ
     *
     * @return リンクされたプログラムオブジェクト
     *
     * @throws {Error} リンクエラー
     */
    private _link_shaders( vs: WebGLShader,
                           fs: WebGLShader ): WebGLProgram
    {
        const gl = this._gl;
        const program = gl.createProgram();
        if ( !program ) {
            throw new Error( "Failed to create a program object" );
        }

        try {
            gl.attachShader( program, vs );
            gl.attachShader( program, fs );
            gl.linkProgram( program );
            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
                // リンクエラー
                const log = gl.getProgramInfoLog( program );
                gl.detachShader( program, fs );
                gl.detachShader( program, vs );
                throw new Error( "Failed to link shader objects: " + log );
            }
        }
        catch ( e ) {
            gl.deleteProgram( program );
            throw e;
        }

        return program;
    }


    /**
     * 頂点属性情報を作成
     *
     * @return 頂点属性名前とロケーションの配列
     */
    private _create_vertex_attribs(): VertexAttributeEntry[]
    {
        const      gl = this._gl;
        const program = this._program;
        const attribs = [];

        const num_items = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );
        cfa_assert( typeof num_items === 'number' );  // このパラメータは整数を返す

        for ( let i = 0; i < num_items; ++i ) {
            const info = gl.getActiveAttrib( program, i );
            cfa_assert( info !== null );  // 個数範囲内なら存在すると仮定

            const attrib = {
                name:     info.name,
                location: gl.getAttribLocation( program, info.name ),
            };

            attribs.push( attrib );
        }

        return attribs;
    }


    /**
     * uniform 変数のロケーション辞書を作成
     *
     * @return ロケーション辞書
     */
    private _create_uniform_location(): UniformLocationDict
    {
        const gl      = this._gl;
        const program = this._program;
        const dict: UniformLocationDict = {};

        // Uniform 変数のロケーション
        const num_items = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );
        cfa_assert( typeof num_items === 'number' );  // このパラメータは整数を返す

        for ( let i = 0; i < num_items; ++i ) {
            const info = gl.getActiveUniform( program, i );
            cfa_assert( info !== null );  // 個数範囲内なら存在すると仮定

            const location = gl.getUniformLocation( program, info.name );
            cfa_assert( location !== null );  // 取得した情報から得た名前なら存在すると仮定

            dict[info.name] = location;
        }

        return dict;
    }


    /**
     * リソースを破棄
     */
    dispose(): void
    {
        const gl = this._gl;
        gl.deleteProgram( this._program );
        // これ以降 this にはアクセスされないので null でも構わない
        // @ts-ignore
        this._program = null;
    }


    /**
     * プログラムを束縛
     */
    bindProgram(): void
    {
        const gl = this._gl;
        gl.useProgram( this._program );
    }


    /**
     * 真偽値パラメータを設定
     *
     * @param name  - 変数名
     * @param value - 真偽値
     */
    setBoolean( name:  string,
                value: boolean ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            gl.uniform1i( location, value ? 1 : 0 );
        }
    }


    /**
     * 整数パラメータを設定
     *
     * @param name  - 変数名
     * @param value - 整数値
     */
    setInteger( name:  string,
                value: number ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            gl.uniform1i( location, value );
        }
    }

    /**
     * 整数ベクトルパラメータを設定
     *
     * @param name  - 変数名
     * @param value - 整数配列
     */
    setIVector3( name:  string,
                 value: Int32List ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            gl.uniform3iv( location, value );
        }
    }


    /**
     * float パラメータを設定
     *
     * @param name   変数名
     * @param value  float 値
     */
    setFloat( name:  string,
              value: number ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            gl.uniform1f( location, value );
        }
    }


    /**
     * 2次ベクトルパラメータを設定
     *
     * @param name  - 変数名
     * @param value - 2次ベクトル
     */
    setVector2( name:  string,
                value: Vector2 ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            if ( value instanceof Float64Array ) {
                GeoMath.copyVector2( value, temp_vector2 );
                gl.uniform2fv( location, temp_vector2 );
            }
            else {
                gl.uniform2fv( location, value );
            }
        }
    }


    /**
     * 3次ベクトルパラメータを設定
     *
     * @param name  - 変数名
     * @param value - 3次ベクトル
     */
    setVector3( name:  string,
                value: Vector3 ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            if ( value instanceof Float64Array ) {
                GeoMath.copyVector3( value, temp_vector3 );
                gl.uniform3fv( location, temp_vector3 );
            }
            else {
                gl.uniform3fv( location, value );
            }
        }
    }


    /**
     * 4次ベクトルパラメータを設定
     *
     * @param name  - 変数名
     * @param value - 4次ベクトル
     */
    setVector4( name:  string,
                value: Vector4 ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            if ( value instanceof Float64Array ) {
                GeoMath.copyVector4( value, temp_vector4 );
                gl.uniform4fv( location, temp_vector4 );
            }
            else {
                gl.uniform4fv( location, value );
            }
        }
    }


    /**
     * 行列パラメータを設定
     *
     * @param name  - 変数名
     * @param value - 行列
     */
    setMatrix( name:  string,
               value: Matrix ): void
    {
        const location = this._uniform_location[name];
        if ( location !== undefined ) {
            const gl = this._gl;
            if ( value instanceof Float64Array ) {
                GeoMath.copyMatrix( value, temp_matrix );
                gl.uniformMatrix4fv( location, false, temp_matrix );
            }
            else {
                gl.uniformMatrix4fv( location, false, value );
            }
        }
    }


    /**
     * 頂点属性データを束縛
     *
     * @param mesh_attribs - メッシュ側の頂点属性データ
     */
    bindVertexAttribs( mesh_attribs: AttributeBindInfoDict ): void
    {
        const gl = this._gl;
        const mtl_attribs = this._vertex_attribs;  // マテリアル側の頂点属性データ配列
        const num_attribs = mtl_attribs.length;

        for ( let i = 0; i < num_attribs; ++i ) {
            const mtl_attrib  = mtl_attribs[i];
            const mesh_attrib = mesh_attribs[mtl_attrib.name];
            const location    = mtl_attrib.location;

            if ( mesh_attrib !== undefined ) {
                // 頂点属性データを束縛
                gl.bindBuffer( gl.ARRAY_BUFFER, mesh_attrib.buffer );
                gl.enableVertexAttribArray( location );
                gl.vertexAttribPointer( location,
                                        mesh_attrib.num_components,
                                        mesh_attrib.component_type,
                                        mesh_attrib.normalized,
                                        mesh_attrib.byte_stride,
                                        mesh_attrib.byte_offset );
            }
            else {
                // メッシュ側に必要な頂点属性がないとき
                gl.disableVertexAttribArray( location );
            }
        }
    }


    /**
     * テクスチャをバインド
     *
     * 注意: 現行テクスチャ (Active Texture) も変更される。
     *
     * @param unit    - テクスチャユニット番号
     * @param texture - テクスチャオブジェクト
     */
    bindTexture2D( unit:    number,
                   texture: WebGLTexture )
    {
        const gl = this._gl;
        gl.activeTexture( gl.TEXTURE0 + unit );
        gl.bindTexture( gl.TEXTURE_2D, texture );
    }


    private readonly _gl:               WebGLRenderingContext;
    private readonly _program:          WebGLProgram;
    private readonly _vertex_attribs:   VertexAttributeEntry[];
    private readonly _uniform_location: UniformLocationDict;

}


/**
 * [[Material._vertex_attribs]] のエントリー
 */
interface VertexAttributeEntry {

    /**
     * 頂点属性の名前
     */
    name: string;


    /**
     * 頂点属性の配置
     */
    location: number;

}


const temp_vector2 = new Float32Array( 2 );
const temp_vector3 = new Float32Array( 3 );
const temp_vector4 = new Float32Array( 4 );
const temp_matrix  = new Float32Array( 16 );


/**
 * 辞書: uniform 変数名 -> ロケーション
 */
interface UniformLocationDict {

    [name: string]: WebGLUniformLocation | undefined;

}


/**
 * 頂点属性の束縛情報
 *
 * @see [[AttribDataDict]], [[Material.bindVertexAttribs]]
 */
export interface AttributeBindInfo {

    buffer: WebGLBuffer;

    num_components: number;

    component_type: GLenum;

    normalized: boolean;

    byte_stride: number;

    byte_offset: number;

}


/**
 * 辞書: 頂点属性名 -> 頂点属性の束縛情報
 *
 * @see [[Material.bindVertexAttribs]]
 */
export interface AttributeBindInfoDict {

    [name: string]: AttributeBindInfo | undefined;

}


export default Material;
