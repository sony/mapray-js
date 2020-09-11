attribute vec4 a_position;    // 位置 (ALCS)

uniform mat4 u_obj_to_clip;   // ALCS からクリップ座標系への変換

void
main()
{
    gl_Position = u_obj_to_clip * a_position;
}
