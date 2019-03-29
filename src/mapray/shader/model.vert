attribute vec4 a_position;    // 位置 (モデル座標系)
attribute vec3 a_normal;      // 法線 (モデル座標系)
attribute vec2 a_texcoord;    // テクスチャ座標

uniform mat4  u_obj_to_clip;  // モデル座標系からクリップ座標系への変換
uniform mat4  u_obj_to_view;  // モデル座標系から視点座標系への変換

varying vec3  v_normal;       // 法線 (視点座標系)
varying vec2  v_texcoord;     // テクスチャ座標


void
main()
{
    gl_Position = u_obj_to_clip * a_position;

    v_normal   =  normalize( vec3( u_obj_to_view * vec4( a_normal, 0.0 ) ) );  // 法線 (視点座標系)
    v_texcoord = a_texcoord;
}
