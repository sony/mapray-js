/**
 * テキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;        // テクスチャ座標
uniform sampler2D u_image;      // 画像
uniform float u_trans_factor;   // 透明度

void
main()
{
    vec4 color = texture2D( u_image, v_texcoord );
    gl_FragColor = vec4( color.xyz, color.w * u_trans_factor );
}
