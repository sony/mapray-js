/**
 * テキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;        // アイコンのテクスチャ座標
varying vec2 v_texmaskcoord;    // アイコンマスクのテクスチャ座標
varying vec3 v_fg_color;        // 前景色
varying vec3 v_bg_color;        // 背景色

uniform sampler2D u_image;      // アイコン画像
uniform sampler2D u_image_mask; // アイコンマスク画像
uniform float u_trans_factor;   // 透明度


void
main()
{
    float alpha = texture2D( u_image, v_texcoord ).w;          // 輝度
    float mask = texture2D( u_image_mask, v_texmaskcoord ).w;  // マスク
    alpha *= mask;
    gl_FragColor = vec4( v_fg_color * alpha + v_bg_color * ( 1.0 - alpha ), u_trans_factor );
}
