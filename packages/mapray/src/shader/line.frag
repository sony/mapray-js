/**
 * 太さ付き線分のフラグメントシェーダ
 * RID描画に対応
 */

precision mediump float;



#ifdef PATH
uniform highp float u_lower_length; // 距離の下限値 (PathEntityのみ利用)
uniform highp float u_upper_length; // 距離の上限値 (PathEntityのみ利用)

varying highp float  v_length;      // 始点からの距離 (PathEntityのみ利用)
#endif // PATH

#ifdef RID
uniform highp vec4 u_rid;           // rid
#else // RID
uniform vec4 u_color;               // 線の基本色と不透明度
#endif // RID


void
main()
{
#ifdef PATH
    if ( u_lower_length <= v_length && v_length <= u_upper_length ) {
#endif // PATH

#ifdef RID
        gl_FragColor = u_rid;
#else // RID
        gl_FragColor = vec4( u_color.xyz * u_color.w, u_color.w );
#endif // RID

#ifdef PATH
    }
    else {
        discard;  // フラグメントを破棄
    }
#endif // PATH
}
