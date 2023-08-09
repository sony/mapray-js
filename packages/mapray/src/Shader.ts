import type GLEnv from "./GLEnv";


/**
 * WebGL シェーダラッパー
 *
 * 頂点シェーダとフラグメントシェーダのセットである。
 */
class Shader {

    /**
     * 頂点シェーダオブジェクト
     */
    readonly vs_object: WebGLShader;


    /**
     * フラグメントシェーダオブジェクト
     */
    readonly fs_object: WebGLShader;


    /**
     * @param glenv   - WebGL 環境
     * @param vs_code - 頂点シェーダのソースコード
     * @param fs_code - フラグメントシェーダのソースコード
     *
     * @throws Error
     * コンパイルエラー
     */
    constructor( glenv:   GLEnv,
                 vs_code: string,
                 fs_code: string )
    {
        this._glenv = glenv;

        this.vs_object = this._compile_shader( 'VERTEX_SHADER', vs_code );

        try {
            this.fs_object = this._compile_shader( 'FRAGMENT_SHADER', fs_code );
        }
        catch ( e ) {
            const gl = glenv.context;
            gl.deleteShader( this.vs_object );
            throw e;
        }
    }


    /**
     * シェーダを破棄
     */
    dispose(): void
    {
        const gl = this._glenv.context;

        gl.deleteShader( this.vs_object );
        gl.deleteShader( this.fs_object );

        // @ts-ignore
        this.vs_object = null;
        // @ts-ignore
        this.fs_object = null;
    }


    /**
     * シェーダをコンパイル
     *
     * @param type   - 'VERTEX_SHADER' or 'FRAGMENT_SHADER'
     * @param source - ソースコード文字列
     *
     * @returns コンパイルされたシェーダオブジェクト
     *
     * @throws Error
     * コンパイルエラー
     */
    private _compile_shader( type:   'VERTEX_SHADER' | 'FRAGMENT_SHADER',
                             source: string ): WebGLShader
    {
        const gl     = this._glenv.context;
        const shader = gl.createShader( gl[type] );
        if ( !shader ) {
            throw new Error( `Failed to create ${type} object` );
        }
        try {
            gl.shaderSource( shader, source );
            gl.compileShader( shader );
            if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
                // コンパイルエラー
                const log = gl.getShaderInfoLog( shader );
                throw new Error( `${type} compilation failed: ${log ?? "unknown error"}` );
            }
        }
        catch ( e ) {
            gl.deleteShader( shader );
            throw e;
        }
        return shader;
    }


    private readonly _glenv: GLEnv;

}


export default Shader;
