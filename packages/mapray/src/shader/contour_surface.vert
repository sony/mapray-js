#version 300 es

in vec4 a_position;         // 位置 (地表断片座標系)
in float a_height;          // 高さ

out float v_height;
out float v_pixel_rate;

uniform mat4  u_obj_to_clip;       // 地表断片座標系からクリップ座標系への変換

void main()
{
    gl_Position = u_obj_to_clip * a_position;

    v_height = a_height;
    v_pixel_rate = gl_Position.z / gl_Position.w;
}
