/**
 * テキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;     // テキストのテクスチャ座標
varying vec4 v_color;        // テキストの色と不透明度

uniform sampler2D u_image;   // テキスト画像

void
main()
{
    float level = texture2D( u_image, v_texcoord ).w;  // 輝度
    float alpha = v_color.w * level;
    gl_FragColor = vec4( v_color.xyz * alpha, alpha );
}
