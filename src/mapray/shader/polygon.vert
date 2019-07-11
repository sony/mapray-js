/**
 * 多角形の頂点シェーダ
 */

attribute vec4 a_position;   // 位置 (モデル座標系)
attribute vec3 a_normal;     // 法線 (モデル座標系)

uniform mat4 u_obj_to_clip;  // モデル座標系からクリップ座標系への変換
uniform mat4 u_obj_to_view;  // モデル座標系から視点座標系への変換
uniform bool u_lighting;     // 照光の有無
uniform vec3 u_light_dir;    // ライト逆方向 (視点座標系) と強さ

varying vec3 v_lit_diffuse;  // 拡散光ライト


void
main()
{
    gl_Position = u_obj_to_clip * a_position;

    if ( u_lighting ) {
        // 法線 (視点座標系)
        vec3 normal = normalize( vec3( u_obj_to_view * vec4( a_normal, 0.0 ) ) );

        // 拡散光の強さ
        v_lit_diffuse = vec3( dot( normal, u_light_dir ) );
    }
    else {
        // 照光なしのときは 1 に固定
        v_lit_diffuse = vec3( 1 );
    }
}
