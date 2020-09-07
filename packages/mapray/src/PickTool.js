import FrameBuffer from "./FrameBuffer";
import Material from "./Material";
import Camera from "./Camera";
import GeoMath from "./GeoMath";

import depth_vs_code from "./shader/depth.vert";
import depth_fs_code from "./shader/depth.frag";


/**
 * @summary マウスピック処理に関連する処理を行う
 *
 * @memberof mapray
 * @private
 */
class PickTool {

    /**
     * @param {mapray.GLEnv} glenv     WebGL 環境
     */
    constructor( glenv ) {
        this._glenv = glenv;
        const gl = this._glenv.context;

        this._camera = new Camera({ width: 1, height: 1 });

        this._frame_buffer = new FrameBuffer( this._glenv, 1, 1, {
                color_containers: [{
                        type: FrameBuffer.ContainerType.RENDER_BUFFER,
                        options: {
                            internal_format: gl.RGBA4,
                        }
                }],
                depth_container: {
                    type: FrameBuffer.ContainerType.TEXTURE,
                    attach_type: gl.DEPTH_STENCIL_ATTACHMENT,
                    options: {
                        internal_format: gl.DEPTH_STENCIL,
                        format: gl.DEPTH_STENCIL,
                        type: glenv.WEBGL_depth_texture.UNSIGNED_INT_24_8_WEBGL,
                    }
                },
        });

        this._depth_to_color_frame_buffer = new FrameBuffer( this._glenv, 1, 1, {
                color_containers: [{
                        type: FrameBuffer.ContainerType.RENDER_BUFFER,
                        options: {
                            internal_format: gl.RGBA4,
                        }
                }],
        });

        this._depth_to_color_materials = [
            new Material( this._glenv, depth_vs_code, define_PASS_BASE_0 + "\n\n" + depth_fs_code ),
            new Material( this._glenv, depth_vs_code, define_PASS_BASE_1 + "\n\n" + depth_fs_code ),
        ];

        {
            const vertex_buf = gl.createBuffer();
            {
                const vertices = [ -1.0, 1.0,  -1.0, -1.0,  1.0, -1.0,  1.0, +1.0 ];
                gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            const texcoord_buf = gl.createBuffer();
            {
                const texcoord = [ 0, 1,  0, 0,  1, 0,  1, 1 ];
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoord_buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoord), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            {
                const indices = [ 0, 1, 2,  0, 2, 3 ];
                this._indices_length = indices.length;
                this._index_buf = gl.createBuffer()
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._index_buf);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }

            this._vertex_attribs = {
                "a_position": {
                    buffer:         vertex_buf,
                    num_components: 2,
                    component_type: gl.FLOAT,
                    normalized:     false,
                    byte_stride:    0,
                    byte_offset:    0
                },
                "a_texcoord": {
                    buffer:         texcoord_buf,
                    num_components: 2,
                    component_type: gl.FLOAT,
                    normalized:     false,
                    byte_stride:    0,
                    byte_offset:    0
                }
            };
        }

        this._rid_value   = new Uint8Array( 4 );
        this._depth_value = new Uint8Array( 4 );
    }

    /**
     * @summary ピック用カメラを返却する。同じインスタンスが返却される。
     * @param {mapray.Camera}  viewer_camera  Viewreのカメラ
     */
    pickCamera( viewer_camera ) {
        const cw = viewer_camera.canvas_size.width;
        const ch = viewer_camera.canvas_size.height;
        this._camera.copyViewParameters( viewer_camera );
        const hfov_rad = viewer_camera.fov * GeoMath.DEGREE / 2;
        const hfov_rad2 = Math.atan( Math.sqrt( 2 ) * Math.tan( hfov_rad ) / Math.sqrt( cw*cw + ch*ch ) );
        this._camera.fov  = 2 * hfov_rad2 / GeoMath.DEGREE;
        return this._camera;
    }

    /**
     * @summary Scene描画処理直前に呼ばれる
     */
    beforeRender() {
        this._frame_buffer.bind();
    }

    /**
     * @summary Scene描画処理直後に呼ばれる
     */
    afterRender() {
        this._frame_buffer.unbind();
    }

    /**
     * @summary Scene描画処理がキャンセルされたときに呼ばれる
     */
    renderCanceled() {
        this._frame_buffer.unbind();
    }

    /**
     * @summary ridを、描画済みテクスチャから読む（1ステップ前の値が返却される）
     * @return {number}
     */
    readRid() {
        const gl = this._glenv.context;
        const startRid = Date.now();
        this._frame_buffer.bind();

        let startRidRead, endRidRead;

        startRidRead = Date.now();

        gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._rid_value );
        endRidRead = Date.now();
        // 4bit x4 の値が 8bit x4 に格納されている。
        /*
        const rid = Math.round(
            this._rid_value[0] / 17 << 12 |
            this._rid_value[1] / 17 <<  8 |
            this._rid_value[2] / 17 <<  4 |
            this._rid_value[3] / 17
        );
        */
        const rid = Math.round(
            COEFFICIENTS_RID[ 0 ] * Math.round(this._rid_value[ 0 ] / 17.0) +
            COEFFICIENTS_RID[ 1 ] * Math.round(this._rid_value[ 1 ] / 17.0) +
            COEFFICIENTS_RID[ 2 ] * Math.round(this._rid_value[ 2 ] / 17.0) +
            COEFFICIENTS_RID[ 3 ] * Math.round(this._rid_value[ 3 ] / 17.0)
        );

        this._frame_buffer.unbind();

        const endRid = Date.now();
        if ( endRid - startRid > 7 ) {
            console.log("Render and Read Index: " + (endRid - startRid) + "ms gl.readPixels:" + (endRidRead - startRidRead) + "ms");
        }

        return rid;
    }



    /**
     * @summary 深度値を、描画済みテクスチャから読み（1ステップ前の値が返却される）、Gocs座標系に変換する
     * @return {mapray.Matrix} view_to_clip View座標系からクリップ座標系への変換マトリックス
     * @return {mapray.Matrix} view_to_gocs View座標系からView座標系への変換マトリックス
     * @return {mapray.Vector3}
     */
    readDepth( view_to_clip, view_to_gocs ) {
        const gl = this._glenv.context;

        const startDepth = Date.now();
        let startDepthRead, endDepthRead;

        this._depth_to_color_frame_buffer.bind();

        let depth_clip = 0;
        gl.viewport( 0, 0, 1, 1 );
        for ( let i=0; i<2; i++ ) {
            const material = this._depth_to_color_materials[ i ];
            material.bindProgram();
            material.bindVertexAttribs(this._vertex_attribs);
            material.setInteger( "u_sampler", 0 );
            material.bindTexture2D( 0, this._frame_buffer.depth_container );
            gl.depthFunc( gl.ALWAYS );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._index_buf);
            gl.drawElements(gl.TRIANGLES, this._indices_length, gl.UNSIGNED_SHORT, 0);
            gl.bindTexture(gl.TEXTURE_2D, null);

            startDepthRead = Date.now();
            gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._depth_value );
            endDepthRead = Date.now();

            // 4bit x4 の値が 8bit x4 に格納されている。 => [0.0 〜 1.0]
            /*
            depth_clip += (
                this._depth_value[ 0 ] * Math.pow(2, i==0 ? -3  : -15) / 17.0 +
                this._depth_value[ 1 ] * Math.pow(2, i==0 ? -6  : -18) / 17.0 +
                this._depth_value[ 2 ] * Math.pow(2, i==0 ? -9  : -21) / 17.0 +
                this._depth_value[ 3 ] * Math.pow(2, i==0 ? -12 : -24) / 17.0
            );
            */
            const coef = COEFFICIENTS_DEPTH[ i ];
            for ( let j=0; j<4; j++ ) {
                depth_clip += coef[ j ] * this._depth_value[ j ];
            }
        }
        this._depth_to_color_frame_buffer.unbind();

        depth_clip = 2.0 * depth_clip - 1.0; // [0.0 〜 1.0] => [-1.0 〜 1.0]

        const vtc = view_to_clip;

        /*
        const ctv = GeoMath.inverse(vtc, GeoMath.createMatrix());
        const v = GeoMath.mul( ctv, [ 0, 0, c ] );
        */
        const v = [
            vtc[8] / vtc[0],
            vtc[9] / vtc[5],
            -1.0,
            (depth_clip + vtc[10]) / vtc[14]
        ];

        // const point = GeoMath.mul_Av( view_to_gocs, v );
        const m = view_to_gocs;
        const w = m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3];
        const point = GeoMath.createVector3([
                ( m[0]*v[0] + m[4]*v[1] + m[ 8]*v[2] + m[12]*v[3] ) / w,
                ( m[1]*v[0] + m[5]*v[1] + m[ 9]*v[2] + m[13]*v[3] ) / w,
                ( m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3] ) / w
        ]);

        const endDepth = Date.now();
        if ( endDepth - startDepth > 7 ) {
            console.log("Render and Read Depth: " + (endDepth - startDepth) + "ms gl.readPixels:" + (endDepthRead - startDepthRead) + "ms");
        }

        return point;
    }
}

const COEFFICIENTS_RID = [];
for ( let i=0; i<4; i++ ) {
    COEFFICIENTS_RID[ i ] = Math.pow(16, 3 - i);
}

const COEFFICIENTS_DEPTH = [[],[]];
for ( let i=0; i<4; i++ ) {
    COEFFICIENTS_DEPTH[ 0 ][ i ] = Math.pow(2, -3 * (i+1)) / 17.0;
    COEFFICIENTS_DEPTH[ 1 ][ i ] = Math.pow(2, -3 * (i+5)) / 17.0;
}


const define_PASS_BASE_0 = "#define PASS_BASE 0";
const define_PASS_BASE_1 = "#define PASS_BASE 1";


export default PickTool;
