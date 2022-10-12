import GLEnv from "./GLEnv";


/**
 * メッシュ用のバッファ
 */
class MeshBuffer {

    /**
     * 注意: `ARRAY_BUFFER` へのバインドは `null` に設定される。
     *
     * @param glenv   - WebGL 環境
     * @param src     - 元データ
     * @param options - オプション
     */
    constructor( glenv:    GLEnv,
                 src:      ArrayBuffer | ArrayBufferView,
                 options?: Option )
    {
        this._glenv = glenv;

        // VBO を生成
        const     gl = glenv.context;
        const target = MeshBuffer._getBindingPoint( gl, options?.target );
        const    vbo = gl.createBuffer();

        if ( vbo === null ) {
            throw new Error( "Failed to create buffer" );
        }

        gl.bindBuffer( target, vbo );
        gl.bufferData( target, src, gl.STATIC_DRAW );
        gl.bindBuffer( target, null );

        this._handle = vbo;
    }


    /**
     * バッファのハンドル
     */
    get handle(): WebGLBuffer { return this._handle; }


    /**
     * リソースを破棄
     */
    dispose(): void
    {
        const gl = this._glenv.context;
        gl.deleteBuffer( this._handle );

        // this へのアクセスは最後なので問題なし
        // @ts-ignore
        this._handle = null;
    }


    private static _getBindingPoint( gl:     WebGLRenderingContext,
                                     target: MeshBuffer.Target = MeshBuffer.Target.ATTRIBUTE ): GLenum
    {
        switch ( target ) {
        case MeshBuffer.Target.ATTRIBUTE: return gl.ARRAY_BUFFER;
        case MeshBuffer.Target.INDEX:     return gl.ELEMENT_ARRAY_BUFFER;
        }
    }


    private readonly _glenv:  GLEnv;
    private readonly _handle: WebGLBuffer;

}


/**
 * [[MeshBuffer.constructor]] に与えるオプションの型
 */
export interface Option {

    /**
     * バッファの使用目的
     *
     * @defaultValue [[Target.ATTRIBUTE]]
     */
    target?: MeshBuffer.Target;

}


namespace MeshBuffer {

/**
 * バッファの使用目的の型
 */
export const enum Target {

    /**
     * 頂点属性
     */
    ATTRIBUTE = "@@_Target.ATTRIBUTE",

    /**
     * インデックス
     */
    INDEX = "@@_Target.INDEX",

}

} // namespace MeshBuffer


export default MeshBuffer;
