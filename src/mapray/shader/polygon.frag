/**
 * 多角形のフラグメントシェーダ
 */

precision mediump float;

varying vec3 v_lit_diffuse;  // 拡散光ライト

uniform vec4 u_color;        // 基本色と不透明度


void
main()
{
    vec3  color   = u_color.xyz * v_lit_diffuse;
    float opacity = u_color.w;

    gl_FragColor = vec4( color * opacity, opacity );
}
