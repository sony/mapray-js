/**
 * @summary フレームバッファ
 *
 * @memberof mapray
 * @private
 */
class FrameBuffer {

    /**
     * @param {mapray.GLEnv} glenv     WebGL 環境
     * @param {number}       width     幅
     * @param {number}       height    高さ
     * @param {object}       options   オプション
     * @param {object[]}     options.color_containers   テクスチャオプションの配列
     * @param {object}       [options.depth_containers]  深度テクスチャオプション
     */
    constructor( glenv, width, height, options = {} ) {
        this._glenv = glenv;
        this._width = width;
        this._height = height;
        this._options = options
        const { frame_buffer, color_containers, depth_container } = this._buildBuffers( options );
        this._frame_buffer = frame_buffer;
        this._color_containers = color_containers;
        this._depth_container = depth_container;
    }

    /**
     * @summary バッファの生成
     * @private
     */
    _buildBuffers( options ) {
        const ret = {};
        const width = this._width;
        const height = this._height;
        const gl = this._glenv.context;

        const frame_buffer = ret.frame_buffer = gl.createFramebuffer();
        gl.bindFramebuffer( gl.FRAMEBUFFER, frame_buffer );

        ret.color_containers = options.color_containers.map((color_container, index) => {
                const type = color_container.type || FrameBuffer.ContainerType.RENDER_BUFFER;
                const c_options = color_container.options || {};
                if ( type === FrameBuffer.ContainerType.RENDER_BUFFER ) {
                    const buffer = gl.createRenderbuffer();
                    gl.bindRenderbuffer( gl.RENDERBUFFER, buffer );
                    gl.renderbufferStorage( gl.RENDERBUFFER, c_options.internal_format, width, height );
                    gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.RENDERBUFFER, buffer );
                    return buffer;
                }
                else { // type === FrameBuffer.ContainerType.TEXTURE
                    const texture = gl.createTexture();
                    gl.bindTexture( gl.TEXTURE_2D, texture );
                    gl.texImage2D( gl.TEXTURE_2D, 0, c_options.internal_format, width, height, 0, c_options.format, c_options.type, null );
                    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
                    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
                    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0 );
                    return texture;
                }
        });

        if ( options.depth_container ) {
            const type = options.depth_container.type || FrameBuffer.ContainerType.RENDER_BUFFER;
            const d_options = options.depth_container.options || {};
            if ( type === FrameBuffer.ContainerType.RENDER_BUFFER ) {
                const buffer = ret.depth_container = gl.createRenderbuffer();
                gl.bindRenderbuffer( gl.RENDERBUFFER, buffer );
                gl.renderbufferStorage( gl.RENDERBUFFER, d_options.internal_format, width, height );
                gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, buffer );
            }
            else { // type === FrameBuffer.ContainerType.TEXTURE
                const depth_container = ret.depth_container = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, depth_container);
                gl.texImage2D(gl.TEXTURE_2D, 0, d_options.internal_format, width, height, 0, d_options.format, d_options.type, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, options.depth_container.attach_type, gl.TEXTURE_2D, depth_container, 0);
            }
        }

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error("ERROR: " + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return ret;
    }


    /**
     * @summary リソースを破棄する
     */
    dispose() {
        const gl = this._glenv.context;
        gl.deleteFramebuffer(this._frame_buffer);
        this._frame_buffer = null
        this._color_containers.forEach(container => {
                this._delete_container(container);
        });
        this._color_containers = [];
        this._delete_container( container, this._depth_container );
        this._depth_container = null;
    }

    /**
     * @private
     */
     _delete_container( container ) {
         const gl = this._glenv.context;
         if ( container instanceof WebGLTexture ) {
             gl.deleteTexture( container );
         }
         else if ( container instanceof WebGLRenderbuffer ) {
             gl.deleteRenderbuffer( container );
         }
     }


    /**
     * @summary フレームバッファ
     * @type {WebGLFramebuffer}
     */
    get frame_buffer() {
        return this._frame_buffer;
    }

    /**
     * @summary カラーデータを取得（0番目を取得）
     * @type {WebGLTexture|WebGLRenderbuffer}
     */
    get color_container() {
        return this._color_containers[ 0 ];
    }

    /**
     * @summary カラーデータを取得
     * @param {number} index
     * @type {WebGLTexture|WebGLRenderbuffer}
     */
    getColorContainer( index ) {
        return this._color_containers[ index ];
    }

    /**
     * @summary カラーデータ数
     * @type {number}
     */
    get color_container_length() {
        return this._color_containers.length;
    }

    /**
     * @summary 深度データ
     * @type {WebGLTexture|WebGLRenderbuffer}
     */
    get depth_container() {
        return this._depth_container;
    }

    /**
     * @summary フレームバッファをバインドする。
     * 呼び出し側がバインド・アンバインドが対応するように使用する。
     */
    bind() {
        if (FrameBuffer.active_frame_buffer) {
            throw new Error("Invalid status: already bound");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._frame_buffer);
        FrameBuffer.active_frame_buffer = this;
    }

    /**
     * @summary フレームバッファをアンバインドする。
     * 呼び出し側がバインド・アンバインドが対応するように使用する。
     */
    unbind() {
        if (FrameBuffer.active_frame_buffer !== this) {
            throw new Error("Invalid status");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        FrameBuffer.active_frame_buffer = null;
    }
}


FrameBuffer.active_frame_buffer = null;



/**
 * @summary 要素型の列挙型
 * @enum {object}
 * @memberof mapray.ContainerType
 * @constant
 */
const ContainerType = {

    /**
     * Render Buffer
     */
    RENDER_BUFFER: { id: "RENDER_BUFFER" },

    /**
     * Texture
     */
    TEXTURE: { id: "TEXTURE" },
};


FrameBuffer.ContainerType = ContainerType;


export default FrameBuffer;
