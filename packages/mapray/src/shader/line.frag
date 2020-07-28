/**
 * 太さ付き線分のフラグメントシェーダ
 */

precision mediump float;

uniform vec4 u_color;               // 線の基本色と不透明度
uniform highp float u_lower_length; // 距離の下限値 (PathEntityのみ利用)
uniform highp float u_upper_length; // 距離の上限値 (PathEntityのみ利用)

varying highp float  v_length;      // 始点からの距離 (PathEntityのみ利用)

void
main()
{
#ifdef PATH
// PathEntityの場合
    if ( u_lower_length <= v_length && v_length <= u_upper_length ) {
        gl_FragColor = vec4( u_color.xyz * u_color.w, u_color.w );
    }
    else {
        discard;  // フラグメントを破棄
    }
#else
// MarkerLineEntityの場合
    gl_FragColor = vec4( u_color.xyz * u_color.w, u_color.w );
#endif
}
