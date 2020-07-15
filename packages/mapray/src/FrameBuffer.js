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
     * @param {object[]}     options.color_buffers   テクスチャオプションの配列
     * @param {object}       [options.depth_buffer]  深度テクスチャオプション
     */
    constructor( glenv, width, height, options = {} ) {
        this._glenv = glenv;
        this._width = width;
        this._height = height;
        this._options = options
        const { buffer, colorTextures, depthTexture } = this._buildBuffers();
        this._buffer = buffer;
        this._colorTextures = colorTextures;
        this._depthTexture = depthTexture;
    }

    /**
     * バッファの生成
     * @private
     */
    _buildBuffers() {
        const ret = {};
        const width = this._width;
        const height = this._height;
        const gl = this._glenv.context;

        const ext = gl.getExtension("WEBGL_depth_texture");

        const buffer = ret.buffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);

        ret.colorTextures = this._options.color_buffers.map(color_buffer => {
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
                return texture;
        });

        if (this._options.depth_buffer) {
            const depthTexture = ret.depthTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            //gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null); // webgl
            //gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null); // webgl2
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null); // webgl2
            //gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null); // webgl2
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return ret;
    }


    /**
     * リソースを破棄する
     */
    dispose() {
        const gl = this._glenv.context;
        gl.deleteFramebuffer(this._buffer);
        this._buffer = null
        this._colorTextures.forEach(colorTexture => {
                gl.bindTexture(gl.TEXTURE_2D, colorTexture);
                gl.deleteTexture(colorTexture);
        });
        this._colorTextures = [];
        gl.bindTexture(gl.TEXTURE_2D, this._depthTexture);
        gl.deleteTexture(this._depthTexture);
        this._depthTexture = null;
        gl.bindTexture(gl.TEXTURE_2D, null);
    }


    /**
     * フレームバッファ
     */
    get buffer() {
        return this._buffer;
    }

    /**
     * テクスチャ（0番目を取得）
     */
    get texture() {
        return this._colorTextures[0];
    }

    /**
     * テクスチャ（0番目を取得）
     */
    getTexture(index) {
        return this._colorTextures[index];
    }

    /**
     * テクスチャ数
     */
    getNumberOfTextures() {
        return this._colorTextures.length;
    }

    /**
     * 深度テクスチャ
     */
    get depthTexture() {
        return this._depthTexture;
    }

    /**
     * フレームバッファをバインドする。
     * バインド・アンバインドが必ず対応するように使用する。
     */
    bind() {
        if (FrameBuffer.active_buffer) {
            throw new Error("Invalid status: already bound");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._buffer);
        FrameBuffer.active_buffer = this;
    }

    /**
     * フレームバッファをアンバインドする
     * バインド・アンバインドが必ず対応するように使用する。
     */
    unbind() {
        if (FrameBuffer.active_buffer !== this) {
            throw new Error("Invalid status");
        }
        const gl = this._glenv.context;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        FrameBuffer.active_buffer = null;
    }

}

FrameBuffer.active_buffer = null;

export default FrameBuffer;
