/**
 * 天の川 (フラグメントシェーダ)
 */

precision mediump float;

uniform sampler2D u_image;      // 画像

varying vec2 v_texcoord;        // テクスチャ座標
varying vec4 v_intensity;

void
main()
{
    gl_FragColor = texture2D( u_image, v_texcoord ) * v_intensity;
}
