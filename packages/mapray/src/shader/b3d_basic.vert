attribute vec4 a_position;     // 位置 (ALCS)
attribute vec3 a_normal;       // 法線 (ALCS)
attribute vec3 a_color;        // RGB カラー

uniform mat4  u_obj_to_clip;   // ALCS からクリップ座標系への変換
uniform mat4  u_obj_to_view;   // ALCS から視点座標系への変換

varying vec3  v_normal;        // 法線 (視点座標系)
varying vec3  v_color;         // RGB カラー


void
main()
{
    gl_Position = u_obj_to_clip * a_position;

    v_normal = normalize( vec3( u_obj_to_view * vec4( a_normal, 0.0 ) ) );  // 法線 (視点座標系)

    v_color = a_color;
}
