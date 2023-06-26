/**
 * 深度描画用シェーダ (フラグメントシェーダ)
 */

uniform highp sampler2D u_sampler;

void
main( void ) {
    highp float fdepth = texture2D( u_sampler, vec2( 0.5, 0.5 ) ).r; // r:[0.0-1.0](24bit), g:0.0, b:0.0, a:1.0
    gl_FragColor = vec4(fdepth,0,0,0);
}
