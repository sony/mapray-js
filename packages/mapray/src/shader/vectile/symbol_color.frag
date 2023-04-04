/**
 * SymbolLayer の通常アイコン (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;     // アイコン画像上での位置

uniform sampler2D u_image;   // アイコン画像

uniform float u_opacity;     // アイコン全体の不透明度


void main()
{
    vec4 color = texture2D( u_image, v_texcoord );

    // 混合は C = Cs + (1 - As) Cd を前提
    gl_FragColor = vec4( color.rgb * color.a, color.a ) * u_opacity;
}
