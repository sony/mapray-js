attribute vec4 a_position;    // 位置 (モデル座標系)
attribute vec2 a_texcoord;    // テクスチャ座標

uniform mat4  u_obj_to_clip;  // モデル座標系からクリップ座標系への変換

varying vec2  v_texcoord;     // テクスチャ座標

void main()
{
    gl_Position = u_obj_to_clip * a_position;
    v_texcoord  = a_texcoord;
}
