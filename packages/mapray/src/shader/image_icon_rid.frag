/**
 * マウスピック用ID描画シェーダ (フラグメントシェーダ)
 */

precision mediump float;

varying vec2      v_texcoord;              // テクスチャ座標
uniform sampler2D u_image;                 // 画像
uniform float     u_alpha_clip_threshold;  // アルファクリップの閾値
uniform vec3      u_mask_color;            // マスク色
uniform vec4      u_rid;                   // ID

void
main()
{
    vec4 texColor = texture2D( u_image, v_texcoord );

    if ( texColor.a <= u_alpha_clip_threshold ) {
        discard;
    }

    if ( all( lessThan( abs( texColor.rgb - u_mask_color ), vec3( 0.00196078431 ) ) ) ) {
        discard;
    }

    gl_FragColor = u_rid;
}
