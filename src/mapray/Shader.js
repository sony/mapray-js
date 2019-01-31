/**
 * @summary WebGL シェーダラッパー
 * @desc
 * 頂点シェーダとフラグメントシェーダのセットである。
 * @memberof mapray
 * @private
 */
class Shader {

    /**
     * @param {mapray.GLEnv} glenv    WebGL 環境
     * @param {string}     vs_code  頂点シェーダのソースコード
     * @param {string}     fs_code  フラグメントシェーダのソースコード
     * @exception {Error}           コンパイルエラー
     */
    constructor( glenv, vs_code, fs_code )
    {
        this._glenv = glenv;

        try {
            /**
             * @summary 頂点シェーダオブジェクト
             * @member mapray.Shader#vs_object
             * @type {WebGLShader}
             * @readonly
             */
            this.vs_object = this._compile_shader( 'VERTEX_SHADER',   vs_code );

            /**
             * @summary フラグメントシェーダオブジェクト
             * @member mapray.Shader#fs_object
             * @type {WebGLShader}
             * @readonly
             */
            this.fs_object = this._compile_shader( 'FRAGMENT_SHADER', fs_code );
        }
        catch ( e ) {
            var gl = glenv.context;
            if ( this.vs_object )
                gl.deleteShader( this.vs_object );
            if ( this.fs_object )
                gl.deleteShader( this.fs_object );
            throw e;
        }
    }


    /**
     * @summary シェーダを破棄
     */
    dispose()
    {
        var gl = this._glenv.context;
        if ( this.vs_object ) {
            gl.deleteShader( this.vs_object );
            this.vs_object = null;
        }
        if ( this.fs_object ) {
            gl.deleteShader( this.fs_object );
            this.fs_object = null;
        }
    }


    /**
     * @summary シェーダをコンパイル
     * @param  {string}      type    'VERTEX_SHADER' or 'FRAGMENT_SHADER'
     * @param  {string}      source  ソースコード文字列
     * @return {WebGLShader}         コンパイルされたシェーダオブジェクト
     * @exception {Error}            コンパイルエラー
     * @private
     */
    _compile_shader( type, source )
    {
        var gl     = this._glenv.context;
        var shader = gl.createShader( gl[type] );
        if ( !shader ) {
            throw new Error( type + " オブジェクトの生成に失敗しました" );
        }
        try {
            gl.shaderSource( shader, source );
            gl.compileShader( shader );
            if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
                // コンパイルエラー
                var log = gl.getShaderInfoLog( shader );
                throw new Error( type + " のコンパイルに失敗: " + log );
            }
        }
        catch ( e ) {
            gl.deleteShader( shader );
            throw e;
        }
        return shader;
    }

}


export default Shader;
