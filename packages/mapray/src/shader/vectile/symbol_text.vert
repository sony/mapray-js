/**
 * SymbolLayer のテキスト (頂点シェーダ)
 */

attribute vec3 a_offset;      // 頂点変位 (X,Y: スクリーン座標系, Z: 深度係数)
attribute vec2 a_texcoord;    // テクスチャ座標 (特殊単位)

uniform vec3 u_position;      // 頂点位置 (モデル座標系)
uniform mat4 u_obj_to_view;   // モデル座標系からビュー座標系への変換
uniform mat4 u_view_to_clip;  // ビュー座標系からクリップ座標系への変換
uniform vec3 u_sparam;        // 画面パラメータ: {2/w, 2/h, pixel_step}

varying vec2 v_texcoord;      // テキストのテクスチャ座標

void
main()
{
    // ビュー座標変換と深度変位
    vec4 view_pos = u_obj_to_view * vec4( u_position, 1 );
    view_pos.xyz *= 1.0 - a_offset.z * u_sparam.z;

    // クリップ座標変換と XY 変位
    vec4 clip_pos = u_view_to_clip * view_pos;
    clip_pos.xy += a_offset.xy * u_sparam.xy * clip_pos.w;

    gl_Position = clip_pos;
    v_texcoord = a_texcoord;
}
