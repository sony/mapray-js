import GLEnv from "./GLEnv";



/**
 * フレームバッファ
 * @internal
 */
class FrameBuffer {

    private _glenv: GLEnv;

    private _width: number;

    private _height: number;

    private _color_container_options: FrameBuffer.ColorContainerOption[];
    private _depth_container_option?: FrameBuffer.DepthContainerOption;

    private _frame_buffer?: WebGLFramebuffer;

    private _color_containers: (WebGLRenderbuffer | WebGLTexture)[];
    private _depth_container?: (WebGLRenderbuffer | WebGLTexture);

    private _initialized: boolean;


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
        this._color_container_options = option.color_containers ?? [];
        this._depth_container_option = option.depth_container;
        this._color_containers = [];
        this._initialized = false;
    }


    /**
     * バッファの生成
     */
    private _initialize(): void
    {
        if ( this._initialized ) {
            return;
        }

        const width = this._width;
        const height = this._height;
        const gl = this._glenv.context;

        const frame_buffer = gl.createFramebuffer();
        if ( !frame_buffer ) {
            throw new Error( "couldn't create Framebuffer" );
        }
        gl.bindFramebuffer( gl.FRAMEBUFFER, frame_buffer );
        this._frame_buffer = frame_buffer;

        const color_containers = ( this._color_container_options ?? [] ).map((color_container, index) => {
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
        this._color_containers = color_containers;

        let depth_container = undefined;
        if ( this._depth_container_option ) {
            const type = this._depth_container_option.type || FrameBuffer.ContainerType.RENDER_BUFFER;
            const d_option = this._depth_container_option.option || {};
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
                gl.framebufferTexture2D(gl.FRAMEBUFFER, this._depth_container_option.attach_type, gl.TEXTURE_2D, depth_container, 0);
            }
        }
        this._depth_container = depth_container;

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("ERROR: " + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this._initialized = true;
    }


    /**
     * リソースを破棄する
     */
    dispose(): void
    {
        if ( !this._initialized ) return;
        if ( active_frame_buffer === this ) {
            throw new Error("Invalid status: cannot dispose active frame buffer");
        }
        const gl = this._glenv.context;
        if ( this._frame_buffer ) {
            gl.deleteFramebuffer( this._frame_buffer );
            this._frame_buffer = undefined;
        }
        if ( this._color_containers.length > 0 ) {
            this._color_containers.forEach( container => {
                this._delete_container( container );
            } );
            this._color_containers = [];
        }
        if ( this._depth_container ) {
            this._delete_container( this._depth_container );
            this._depth_container = undefined;
        }
        this._initialized = false;
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
        this._initialize();
        return this._frame_buffer as WebGLFramebuffer;
    }


    /**
     * カラーデータを取得（0番目を取得）
     */
    get color_container(): WebGLTexture | WebGLRenderbuffer | undefined
    {
        this._initialize();
        return this._color_containers[ 0 ];
    }


    /**
     * カラーデータを取得
     * @param index 番号
     */
    getColorContainer( index: number ): WebGLTexture | WebGLRenderbuffer
    {
        this._initialize();
        return this._color_containers[ index ];
    }


    /**
     * カラーデータ数
     */
    get color_container_length(): number
    {
        return this._color_container_options.length;
    }


    /**
     * 深度データ
     */
    get depth_container(): WebGLTexture | WebGLRenderbuffer | undefined
    {
        this._initialize();
        return this._depth_container;
    }


    /**
     * フレームバッファをバインドする。
     * 呼び出し側がバインド・アンバインドが対応するように使用する。
     */
    bind(): void
    {
        this._initialize();
        if ( active_frame_buffer ) {
            throw new Error("Invalid status: already bound");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer( gl.FRAMEBUFFER, this._frame_buffer as WebGLFramebuffer );
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


    /**
     * フレームバッファのサイズを変更します
     * 
     * この関数がバインド中に呼ばれると例外がスローされます。
     * この関数が呼ばれた時点で現在のリソースは破棄され、次回リソースが取得される時点で再生成されます。
     */
    setSize( width: number, height: number ): void
    {
        this.dispose();

        this._width = width;
        this._height = height;
    }


    /**
     * カラーコンテナオプションを変更します
     * 
     * この関数がバインド中に呼ばれると例外がスローされます。
     * この関数が呼ばれた時点で現在のリソースは破棄され、次回リソースが取得される時点で再生成されます。
     */
    setColorContainerOption( options: FrameBuffer.ColorContainerOption[] ): void
    {
        this.dispose();

        this._color_container_options = options;
    }

    /**
     * 深度コンテナオプションを変更します
     * 
     * この関数がバインド中に呼ばれると例外がスローされます。
     * この関数が呼ばれた時点で現在のリソースは破棄され、次回リソースが取得される時点で再生成されます。
     */
    setDepthContainerOption( option: FrameBuffer.DepthContainerOption ): void
    {
        this.dispose();

        this._depth_container_option = option;
    }
}



namespace FrameBuffer {


export interface ColorContainerOption {
    type: FrameBuffer.ContainerType;
    option: {
        internal_format: GLenum;
        format: GLenum;
        type: GLenum;
    };
}


export interface DepthContainerOption {
    type: FrameBuffer.ContainerType;
    attach_type: GLenum;
    option: {
        internal_format: GLenum;
        format: GLenum;
        type: GLenum;
    }
}


export interface Option {

    /** テクスチャオプションの配列 */
    color_containers?: ColorContainerOption[];

    /** 深度テクスチャオプション */
    depth_container?: DepthContainerOption;
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
