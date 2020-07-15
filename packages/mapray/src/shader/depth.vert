/**
 * 深度描画用シェーダ (頂点シェーダ)
 */

attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void
main(void) {
    gl_Position = vec4(a_position, 1.0);
    v_texcoord = a_texcoord;
}
