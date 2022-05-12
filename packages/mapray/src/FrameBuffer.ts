import GLEnv from "./GLEnv";



/**
 * フレームバッファ
 * @internal
 */
class FrameBuffer {

    private _glenv: GLEnv;

    private _width: number;

    private _height: number;

    private _option: FrameBuffer.Option;

    private _frame_buffer: WebGLFramebuffer;

    private _color_containers: (WebGLRenderbuffer | WebGLTexture)[];

    private _depth_container?: (WebGLRenderbuffer | WebGLTexture);


    /**
     * @param glenv     WebGL 環境
     * @param width     幅
     * @param height    高さ
     * @param options   オプション
     */
    constructor( glenv: GLEnv, width: number, height: number, option: FrameBuffer.Option ) {
        this._glenv = glenv;
        this._width = width;
        this._height = height;
        this._option = option;
        const { frame_buffer, color_containers, depth_container } = this._buildBuffers( option );
        this._frame_buffer = frame_buffer;
        this._color_containers = color_containers;
        this._depth_container = depth_container;
    }


    /**
     * バッファの生成
     */
    private _buildBuffers( option: FrameBuffer.Option ): { frame_buffer: WebGLFramebuffer, color_containers: (WebGLRenderbuffer | WebGLTexture)[], depth_container?: (WebGLRenderbuffer | WebGLTexture) }
    {
        const width = this._width;
        const height = this._height;
        const gl = this._glenv.context;

        const frame_buffer = gl.createFramebuffer();
        if ( !frame_buffer ) {
            throw new Error( "couldn't create Framebuffer" );
        }
        gl.bindFramebuffer( gl.FRAMEBUFFER, frame_buffer );

        const color_containers = option.color_containers.map((color_container, index) => {
                const type = color_container.type || FrameBuffer.ContainerType.RENDER_BUFFER;
                const c_option = color_container.option || {};
                if ( type === FrameBuffer.ContainerType.RENDER_BUFFER ) {
                    const buffer = gl.createRenderbuffer();
                    gl.bindRenderbuffer( gl.RENDERBUFFER, buffer );
                    gl.renderbufferStorage( gl.RENDERBUFFER, c_option.internal_format, width, height );
                    gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.RENDERBUFFER, buffer );
                    return buffer as WebGLRenderbuffer;
                }
                else { // type === FrameBuffer.ContainerType.TEXTURE
                    const texture = gl.createTexture();
                    gl.bindTexture( gl.TEXTURE_2D, texture );
                    gl.texImage2D( gl.TEXTURE_2D, 0, c_option.internal_format, width, height, 0, c_option.format, c_option.type, null );
                    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
                    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
                    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0 );
                    return texture as WebGLTexture;
                }
        });

        let depth_container = undefined;
        if ( option.depth_container ) {
            const type = option.depth_container.type || FrameBuffer.ContainerType.RENDER_BUFFER;
            const d_option = option.depth_container.option || {};
            if ( type === FrameBuffer.ContainerType.RENDER_BUFFER ) {
                const buffer = gl.createRenderbuffer();
                if ( !buffer ) throw new Error( "couldn't create render buffer" );
                depth_container = buffer;
                gl.bindRenderbuffer( gl.RENDERBUFFER, depth_container );
                gl.renderbufferStorage( gl.RENDERBUFFER, d_option.internal_format, width, height );
                gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth_container );
            }
            else { // type === FrameBuffer.ContainerType.TEXTURE
                const texture = gl.createTexture();
                if ( !texture ) throw new Error( "couldn't create texture" );
                depth_container = texture;
                gl.bindTexture(gl.TEXTURE_2D, depth_container);
                gl.texImage2D(gl.TEXTURE_2D, 0, d_option.internal_format, width, height, 0, d_option.format, d_option.type, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, option.depth_container.attach_type, gl.TEXTURE_2D, depth_container, 0);
            }
        }

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("ERROR: " + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { frame_buffer, color_containers, depth_container };
    }


    /**
     * リソースを破棄する
     */
    dispose(): void
    {
        const gl = this._glenv.context;
        gl.deleteFramebuffer( this._frame_buffer );
        // @ts-ignore
        this._frame_buffer = undefined;
        this._color_containers.forEach(container => {
                this._delete_container(container);
        });
        this._color_containers = [];
        this._delete_container( this._depth_container );
        // @ts-ignore
        this._depth_container = undefined;
    }


    /**
     * バッファを破棄します。
     */
    private _delete_container( container?: (WebGLRenderbuffer | WebGLTexture) ): void
    {
        const gl = this._glenv.context;
        if ( container instanceof WebGLTexture ) {
            gl.deleteTexture( container );
        }
        else if ( container instanceof WebGLRenderbuffer ) {
            gl.deleteRenderbuffer( container );
        }
    }


    /**
     * フレームバッファ
     */
    get frame_buffer(): WebGLFramebuffer
    {
        return this._frame_buffer;
    }


    /**
     * カラーデータを取得（0番目を取得）
     */
    get color_container(): WebGLTexture | WebGLRenderbuffer
    {
        return this._color_containers[ 0 ];
    }


    /**
     * カラーデータを取得
     * @param index 番号
     */
    getColorContainer( index: number ): WebGLTexture | WebGLRenderbuffer
    {
        return this._color_containers[ index ];
    }


    /**
     * カラーデータ数
     */
    get color_container_length(): number
    {
        return this._color_containers.length;
    }


    /**
     * 深度データ
     */
    get depth_container(): WebGLTexture | WebGLRenderbuffer | undefined
    {
        return this._depth_container;
    }


    /**
     * フレームバッファをバインドする。
     * 呼び出し側がバインド・アンバインドが対応するように使用する。
     */
    bind(): void
    {
        if ( active_frame_buffer ) {
            throw new Error("Invalid status: already bound");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer( gl.FRAMEBUFFER, this._frame_buffer );
        active_frame_buffer = this;
    }


    /**
     * フレームバッファをアンバインドする。
     * 呼び出し側がバインド・アンバインドが対応するように使用する。
     */
    unbind(): void
    {
        if ( active_frame_buffer !== this ) {
            throw new Error("Invalid status");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        active_frame_buffer = undefined;
    }
}



namespace FrameBuffer {



export interface Option {

    /** テクスチャオプションの配列 */
    color_containers: {
        type: FrameBuffer.ContainerType;
        option: {
            internal_format: GLenum;
            format: GLenum;
            type: GLenum;
        };
    }[];

    /** 深度テクスチャオプション */
    depth_container?: {
        type: FrameBuffer.ContainerType;
        attach_type: GLenum;
        option: {
            internal_format: GLenum;
            format: GLenum;
            type: GLenum;
        }
    };
}



/**
 * 要素型の列挙型
 */
export const enum ContainerType {
    RENDER_BUFFER = "@@_FrameBuffer.ContainerType.RENDER_BUFFER",
    TEXTURE       = "@@_FrameBuffer.ContainerType.TEXTURE",
}



} // FrameBuffer



let active_frame_buffer: FrameBuffer | undefined;



export default FrameBuffer;
