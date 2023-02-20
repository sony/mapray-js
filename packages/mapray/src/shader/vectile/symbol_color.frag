/**
 * SymbolLayer の通常アイコン (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;     // アイコン画像上での位置 (特殊単位)

uniform sampler2D u_image;   // アイコン画像
uniform vec2  u_img_isize;   // 特殊単位からテクスチャ座標への変換

uniform float u_opacity;     // アイコン全体の不透明度


void main()
{
    // 画素の左下角に対応するテクスチャ座標 (特殊単位)
    vec2 texcoord = v_texcoord;

    vec4 color = texture2D( u_image, texcoord * u_img_isize );

    // 混合は C = Cs + (1 - As) Cd を前提
    gl_FragColor = vec4( color.rgb * color.a, color.a ) * u_opacity;
}
