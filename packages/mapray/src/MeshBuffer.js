/**
 * @summary メッシュ用のバッファ
 * @memberof mapray
 * @package
 */
class MeshBuffer {

    /**
     * <p>注意: ARRAY_BUFFER へのバインドは null に設定される。</p>
     *
     * @param {mapray.GLEnv}                glenv
     * @param {ArrayBuffer|ArrayBufferView} src    元データ
     * @param {object}                      [options]                          オプション
     * @param {mapray.MeshBuffer.Target}    [options.target=Target.ATTRIBUTE]  使用目的
     */
    constructor( glenv, src, options )
    {
        this._glenv = glenv;
        var opts = options || {};

        // VBO を生成
        var     gl = glenv.context;
        var target = MeshBuffer._getBindingPoint( gl, opts.target );
        var    vbo = gl.createBuffer();
        gl.bindBuffer( target, vbo );
        gl.bufferData( target, src, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        this._handle = vbo;
    }


    /**
     * @summary バッファのハンドル
     * @type {WebGLBuffer}
     * @readonly
     */
    get handle() { return this._handle; }


    /**
     * @summary リソースを破棄
     */
    dispose()
    {
        var gl = this._glenv.context;
        gl.deleteBuffer( this._handle );
        this._handle = null;
    }


    /**
     * @private
     */
    static
    _getBindingPoint( gl, target )
    {
        switch ( target ) {
        default:
        case Target.ATTRIBUTE: return gl.ARRAY_BUFFER;
        case Target.INDEX:     return gl.ELEMENT_ARRAY_BUFFER;
        }
    }

}


/**
 * @summary バッファの使用目的
 *
 * @enum {object}
 * @memberof mapray.MeshBuffer
 * @constant
 */
var Target = {

    /**
     * 頂点属性
     */
    ATTRIBUTE: { id: "ATTRIBUTE" },

    /**
     * インデックス
     */
    INDEX: { id: "INDEX" }

};


MeshBuffer.Target = Target;


export default MeshBuffer;
