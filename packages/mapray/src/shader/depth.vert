#version 300 es

/**
 * 深度描画用シェーダ (頂点シェーダ)
 */

in vec3 a_position;


void
main( void ) {
    gl_Position = vec4( a_position, 1.0 );
}
