import FrameBuffer from "./FrameBuffer";
import Entity from "./Entity";
import Material from "./Material";
import Camera from "./Camera";

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
                color_buffers: [{
                }],
                depth_buffer: {
                },
        });

        this._depth_to_color_frame_buffer = new FrameBuffer( this._glenv, 1, 1, {
                color_buffers: [{
                }],
        });

        this._depth_to_color_material = new Material( this._glenv, depth_vs_code, depth_fs_code );


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

        this.rid_pixel_buffer = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.rid_pixel_buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, 4, gl.STATIC_COPY);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        this.depth_pixel_buffer = gl.createBuffer();
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.depth_pixel_buffer);
        gl.bufferData(gl.PIXEL_PACK_BUFFER, 4, gl.STATIC_COPY);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

        this._rid_value   = new Uint8Array(4);
        this._depth_value = new Uint8Array(4);
    }

    /**
     * @summary ピック用カメラを返却する。同じインスタンスが返却される。
     * @param {mapray.Camera}  viewer_camera  Viewreのカメラ
     */
    pickCamera( viewer_camera ) {
        const cw = viewer_camera.canvas_size.width;
        const ch = viewer_camera.canvas_size.height;
        this._camera.copyViewParameter( viewer_camera );
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
        let rid = -1;

        const startRid = Date.now();
        this._frame_buffer.bind();

        let startRidRead, endRidRead;
        {
            startRidRead = Date.now();
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.rid_pixel_buffer);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this._rid_value); // get value of previous readPixels
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            endRidRead = Date.now();
            rid = (
                (this._rid_value[0] << 24) |
                (this._rid_value[1] << 16) |
                (this._rid_value[2] <<  8) |
                (this._rid_value[3]      )
            );
            // console.log("pick " + rid + " => " + item, this._viewer.scene._rid_map);
        }

        this._frame_buffer.unbind();

        const endRid = Date.now();
        if (endRid - startRid > 7) {
            console.log("Render and Read Index: " + (endRid - startRid) + "ms gl.readPixels:" + (endRidRead - startRidRead) + "ms");
        }

        return rid;
    }



    /**
     * @summary 深度値を、描画済みテクスチャから読み（1ステップ前の値が返却される）、Gocs座標系に変換する
     * @return {mapray.Matrix} view_to_clip View座標系からクリップ座標系への変換マトリックス
     * @return {mapray.Matrix} view_to_gocs View座標系からView座標系への変換マトリックス
     * @return {number}
     */
    readDepth( view_to_clip, view_to_gocs ) {
        const gl = this._glenv.context;
        let point;

        const startDepth = Date.now();
        let startDepthRead, endDepthRead;
        // Read Depth
        this._depth_to_color_frame_buffer.bind();
        {
            gl.viewport( 0, 0, 1, 1 );

            const material = this._depth_to_color_material;
            material.bindProgram();
            material.bindVertexAttribs(this._vertex_attribs);
            material.setInteger( "u_sampler", 0 );
            material.bindTexture2D( 0, this._frame_buffer.depthTexture );
            gl.depthFunc( gl.ALWAYS );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._index_buf);
            gl.drawElements(gl.TRIANGLES, this._indices_length, gl.UNSIGNED_SHORT, 0);
            gl.bindTexture(gl.TEXTURE_2D, null);

            startDepthRead = Date.now();
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.depth_pixel_buffer);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this._depth_value); // get value of previous readPixels
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            endDepthRead = Date.now();
            {
                // - rgbaのrgb部分(24bit)に値が格納されている
                // - 値の範囲の変換[0 〜 0xFFFFFF] => [-1.0 〜 +1.0]
                const c = (
                    (this._depth_value[0] << 16) |
                    (this._depth_value[1] <<  8) |
                    (this._depth_value[2]      )
                ) / 0x7FFFFF - 1.0;

                const vtc = view_to_clip;
                /*
                const ctv = GeoMath.inverse(vtc, GeoMath.createMatrix());
                const v = GeoMath.mul( ctv, [ 0, 0, c ] );
                /*/
                const v = [
                    vtc[8] / vtc[0],
                    vtc[9] / vtc[5],
                    -1.0,
                    (c + vtc[10]) / vtc[14]
                ];
                //*/

                // const g = GeoMath.mul( this._view_to_gocs, v );
                const m = view_to_gocs;
                const g = [
                    m[0]*v[0] + m[4]*v[1] + m[ 8]*v[2] + m[12]*v[3],
                    m[1]*v[0] + m[5]*v[1] + m[ 9]*v[2] + m[13]*v[3],
                    m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
                    m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]
                ];

                point = GeoMath.createVector3([
                        g[0] / g[3],
                        g[1] / g[3],
                        g[2] / g[3]
                ]);
            }
        }
        this._depth_to_color_frame_buffer.unbind();

        const endDepth = Date.now();
        if (endDepth - startDepth > 7) {
            console.log("Render and Read Depth: " + (endDepth - startDepth) + "ms gl.readPixels:" + (endDepthRead - startDepthRead) + "ms");
        }

        return point;
    }
}




export default PickTool;
