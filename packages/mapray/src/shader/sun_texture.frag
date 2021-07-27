/**
 * 太陽 (フラグメントシェーダ)
 */

precision mediump float;

uniform sampler2D u_image;      // 画像

varying vec4 v_color;
varying vec2 v_texcoord;        // テクスチャ座標

void
main()
{
    gl_FragColor = v_color * texture2D( u_image, v_texcoord );
}
