/**
 * SymbolLayer のテキスト (フラグメントシェーダ)
 */

precision mediump float;

varying vec2 v_texcoord;     // テキストのテクスチャ座標

uniform sampler2D u_image;   // テキスト画像
uniform vec4      u_color;   // テキストの色と不透明度

void
main()
{
    float level = texture2D( u_image, v_texcoord ).w;  // 輝度
    float alpha = u_color.w * level;
    gl_FragColor = vec4( u_color.xyz, alpha );
}
