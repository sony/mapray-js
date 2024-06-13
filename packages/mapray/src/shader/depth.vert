#version 300 es

/**
 * 深度描画用シェーダ (頂点シェーダ)
 */

in vec3 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord; // required for error prevention

void
main( void ) {
    v_texcoord = a_texcoord;
    gl_Position = vec4( a_position, 1.0 );
}
