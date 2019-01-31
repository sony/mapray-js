import Shader from "./Shader";


/**
 * @summary マテリアル
 * @memberof mapray
 * @private
 */
class Material {

    /**
     * @param {mapray.GLEnv} glenv    WebGL 環境
     * @param {string}     vs_code  頂点シェーダのソースコード
     * @param {string}     fs_code  フラグメントシェーダのソースコード
     */
    constructor( glenv, vs_code, fs_code )
    {
        var shader     = new Shader( glenv, vs_code, fs_code );
        this._gl       = glenv.context;
        this._program  = this._link_shaders( shader.vs_object, shader.fs_object );
        this._attrib_location  = this._create_attrib_location();
        this._uniform_location = this._create_uniform_location();
        this._attrib_names     = Object.keys( this._attrib_location );

        shader.dispose();
    }


    /**
     * @summary シェーダをリンク
     * @param  {WebGLShader}  vs  頂点シェーダ
     * @param  {WebGLShader}  fs  フラグメントシェーダ
     * @return {WebGLProgram}     リンクされたプログラムオブジェクト
     * @exception {Error}         リンクエラー
     * @private
     */
    _link_shaders( vs, fs )
    {
        var gl = this._gl;
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


    /**
     * @summary 頂点属性のロケーション辞書を作成
     *
     * @return {object}  ロケーション辞書
     * @private
     */
    _create_attrib_location()
    {
        var       gl = this._gl;
        var  program = this._program;
        var location = {};

        var num_items = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );
        for ( var i = 0; i < num_items; ++i ) {
            var info = gl.getActiveAttrib( program, i );
            location[info.name] = gl.getAttribLocation( program, info.name );
        }

        return location;
    }


    /**
     * @summary uniform 変数のロケーション辞書を作成
     *
     * @return {object}  ロケーション辞書
     * @private
     */
    _create_uniform_location()
    {
        var       gl = this._gl;
        var  program = this._program;
        var location = {};

        // Uniform 変数のロケーション
        var num_items = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );
        for ( var i = 0; i < num_items; ++i ) {
            var info = gl.getActiveUniform( program, i );
            location[info.name] = gl.getUniformLocation( program, info.name );
        }

        return location;
    }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        var gl = this._gl;
        gl.deleteProgram( this._program );
        this._program = null;
    }


    /**
     * @summary 頂点属性の名前の配列を取得
     * @return {Array.<string>}  頂点属性の名前の配列
     */
    getAttribNames()
    {
        return this._attrib_names;
    }


    /**
     * @summary プログラムを束縛
     */
    bindProgram()
    {
        var gl = this._gl;
        gl.useProgram( this._program );
    }


    /**
     * @summary 整数パラメータを設定
     * @param {string} name   変数名
     * @param {number} value  整数値
     */
    setInteger( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniform1i( location, value );
        }
    }


    /**
     * @summary float パラメータを設定
     * @param {string} name   変数名
     * @param {number} value  float 値
     */
    setFloat( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniform1f( location, value );
        }
    }


    /**
     * @summary 2次ベクトルパラメータを設定
     * @param {string}         name   変数名
     * @param {mapray.Vector2} value  2次ベクトル
     */
    setVector2( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniform2fv( location, value );
        }
    }


    /**
     * @summary 3次ベクトルパラメータを設定
     * @param {string}         name   変数名
     * @param {mapray.Vector3} value  3次ベクトル
     */
    setVector3( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniform3fv( location, value );
        }
    }


    /**
     * @summary 4次ベクトルパラメータを設定
     * @param {string}         name   変数名
     * @param {mapray.Vector4} value  4次ベクトル
     */
    setVector4( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniform4fv( location, value );
        }
    }


    /**
     * @summary 行列パラメータを設定
     * @param {string}        name   変数名
     * @param {mapray.Matrix} value  行列
     */
    setMatrix( name, value )
    {
        var location = this._uniform_location[name];
        if ( location ) {
            var gl = this._gl;
            gl.uniformMatrix4fv( location, false, value );
        }
    }


    /**
     * @summary 頂点データを束縛
     * @param {string} name     変数名
     * @param {number} size     要素数
     * @param {number} stride   頂点バイト数
     * @param {number} offst    開始バイト数
     */
    bindVertexAttrib( name, size, stride, offset )
    {
        var location = this._attrib_location[name];
        if ( location >= 0 ) {
            var gl = this._gl;
            gl.enableVertexAttribArray( location );
            gl.vertexAttribPointer( location, size, gl.FLOAT, false, stride, offset );
        }
    }


    /**
     * @summary テクスチャをバインド
     * @desc
     * <p>注意: 現行テクスチャ (Active Texture) も変更される。</p>
     * @param {number}       unit     テクスチャユニット番号
     * @param {WebGLTexture} texture  テクスチャオブジェクト
     */
    bindTexture2D( unit, texture )
    {
        var gl = this._gl;
        gl.activeTexture( gl.TEXTURE0 + unit );
        gl.bindTexture( gl.TEXTURE_2D, texture );
    }

}


export default Material;
