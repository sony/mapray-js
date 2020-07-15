/**
 * 深度描画用シェーダ (フラグメントシェーダ)
 */

uniform highp sampler2D u_sampler;

varying highp vec2 v_texcoord;

void
main( void ) {
    highp float d = texture2D( u_sampler, v_texcoord ).r; // r:[0.0-1.0](24bit), g:0.0, b:0.0, a:1.0
    gl_FragColor = vec4(
        d,
        mod(d * 256.0, 1.0),
        mod(d * 256.0 * 256.0, 1.0),
        1.0
    );
}
