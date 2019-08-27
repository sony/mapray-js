/**
 * テキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;        // テクスチャ座標
uniform sampler2D u_image;      // 画像


void
main()
{
    gl_FragColor = texture2D( u_image, v_texcoord );
}