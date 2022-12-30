/**
 * 太さ付き線分の頂点シェーダ
 */

attribute vec4 a_position;      // 頂点位置 (モデル座標系)
attribute vec3 a_direction;     // 線分方向 (モデル座標系) = 終点位置 - 始点位置
attribute vec2 a_where;         // 線分の4隅指定: 始点左: {-1, 1}, 始点右: {-1, -1}, 終点左: {1, 1}, 終点右: {1, -1}
attribute float a_length;

uniform mat4 u_obj_to_clip;     // モデル座標系からクリップ座標系への変換
uniform vec3 u_sparam;          // 画面パラメータ: {2/w, 2/h, h/w}
uniform vec2 u_thickness;       // 線の太さの半分: {u, v}

varying highp float  v_length;  // 始点からの距離 (PathEntityのみ利用)

vec2
offset( vec4 cpos )
{
    vec4 p = cpos;
    p.y *= u_sparam.z;  // 画面空間に変換
    vec4 d = u_obj_to_clip * vec4( a_direction, 0 );
    d.y *= u_sparam.z;  // 画面空間に変換

    vec2 ds = normalize( p.w * d.xy - d.w * p.xy );
    vec2 wt = a_where * u_thickness;
    return mat2( ds.x, ds.y, -ds.y, ds.x ) * wt;
}

void
main()
{
    gl_Position = u_obj_to_clip * a_position;
    gl_Position.xy += offset( gl_Position ) * u_sparam.xy * gl_Position.w;
    v_length = a_length;
}
