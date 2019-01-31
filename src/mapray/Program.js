/**
 * @summary WebGL プログラムラッパー
 * @memberof mapray
 * @private
 */
class Program {

    /**
     * @param {mapray.GLEnv}  glenv   WebGL 環境
     * @param {mapray.Shader} shader  WebGL シェーダラッパー
     * @exception {Error}           リンクエラー
     */
    constructor( glenv, shader )
    {
        this._glenv = glenv;

        /**
         * @summary WebGL プログラムオブジェクト
         * @member mapray.Program#handle
         * @type {WebGLProgram}
         * @readonly
         */
        this.handle = this._link_shaders( shader.vs_object, shader.fs_object );
    }


    /**
     * @summary プログラムを破棄
     */
    dispose()
    {
        var gl = this._glenv.context;
        gl.deleteProgram( this.handle );
        this.handle = null;
    }


    /** シェーダをリンク
     *
     *  @param  {WebGLShader}  vs  頂点シェーダ
     *  @param  {WebGLShader}  fs  フラグメントシェーダ
     *  @return {WebGLProgram}     リンクされたプログラムオブジェクト
     *  @exception {Error}         リンクエラー
     *  @private
     */
    _link_shaders( vs, fs )
    {
        var gl      = this._glenv.context;
        var program = gl.createProgram();
        if ( !program ) {
            throw new Error( "プログラムオブジェクトの生成に失敗しました" );
        }
        try {
            gl.attachShader( program, vs );
            gl.attachShader( program, fs );
            gl.linkProgram( program );
            if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
                // リンクエラー
                var log = gl.getProgramInfoLog( program );
                gl.detachShader( program, fs );
                gl.detachShader( program, vs );
                throw new Error( "シェーダのリンクに失敗: " + log );
            }
        }
        catch ( e ) {
            gl.deleteProgram( program );
            throw e;
        }
        return program;
    }

}


export default Program;
