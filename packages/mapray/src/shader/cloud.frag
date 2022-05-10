/**
 * 雲 (フラグメントシェーダ)
 */

precision mediump float;

uniform sampler2D u_image;      // contour画像
uniform float u_margin;

varying float v_light;
varying float v_level;

void
main()
{
    vec4 color = texture2D( u_image, vec2( v_level, 0.5 ) );
    color.r /= color.a;
    color.g /= color.a;
    color.b /= color.a;
    gl_FragColor = vec4( color.r * v_light, color.g * v_light, color.b * v_light, color.a );
}
