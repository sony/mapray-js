#version 300 es

/**
 * 深度描画用シェーダ (フラグメントシェーダ)
 */
precision highp float;

uniform sampler2D u_sampler;

out vec4 out_color;

void
main( void ) {
    float fdepth = texture( u_sampler, vec2( 0.5, 0.5 ) ).r; // r:[0.0-1.0](24bit), g:0.0, b:0.0, a:1.0
    out_color = vec4( fdepth, 0.0, 0.0, 0.0 );
}
