/**
 * 月 (フラグメントシェーダ)
 */

precision mediump float;

#ifndef MASK_MOON
uniform sampler2D u_image;      // 画像

varying vec4 v_color;
varying vec2 v_texcoord;        // テクスチャ座標
#endif

void
main()
{
#ifdef MASK_MOON
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
#else
    gl_FragColor = v_color * texture2D( u_image, v_texcoord );
#endif
}
