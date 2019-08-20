/**
 * テキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;        // アイコンのテクスチャ座標
// varying vec2 v_texmaskcoord;    // アイコンマスクのテクスチャ座標

uniform sampler2D u_image;      // アイコン画像
// uniform sampler2D u_image_mask; // アイコンマスク画像


void
main()
{
    gl_FragColor = texture2D( u_image, v_texcoord );
}