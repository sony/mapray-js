/**
 * テキスト (頂点シェーダ)
 */

attribute vec4 a_position;     // 頂点位置 (モデル座標系)
attribute vec2 a_offset;       // 頂点変位 (スクリーン座標系)
attribute vec2 a_texcoord;     // テクスチャ座標
attribute vec2 a_texmaskcoord; // テクスチャマスク座標

uniform mat4 u_obj_to_clip;    // モデル座標系からクリップ座標系への変換
uniform vec2 u_sparam;         // 画面パラメータ: {2/w, 2/h}

varying vec2 v_texcoord;       // テクスチャ座標

void
main()
{
    gl_Position = u_obj_to_clip * a_position;
    gl_Position.xy += a_offset * u_sparam * gl_Position.w;
    v_texcoord = a_texcoord;
}