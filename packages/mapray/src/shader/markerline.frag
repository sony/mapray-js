/**
 * 太さ付き線分のフラグメントシェーダ
 */

precision mediump float;

uniform vec4 u_color;  // 線の基本色と不透明度

void
main()
{
    gl_FragColor = vec4( u_color.xyz * u_color.w, u_color.w );
}
