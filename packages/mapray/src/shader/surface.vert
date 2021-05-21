attribute vec4 a_position;         // 位置 (地表断片座標系)
attribute vec2 a_uv;               // uv 座標

uniform mat4  u_obj_to_clip;       // 地表断片座標系からクリップ座標系への変換

uniform vec4  u_texcoord_rect_hi;  // 高レベル画像 左下座標: (x, y), 座標サイズ: (z, w)
uniform vec4  u_texcoord_rect_lo;  // 低レベル画像 左下座標: (x, y), 座標サイズ: (z, w)
uniform vec4  u_corner_lod;        // uv = (0,0), (1,0), (0,1), (1,1) の LOD

#ifdef NIGHTIMAGE
uniform mat4  u_obj_to_gocs;       // 地表断片座標系からGOCS座標系への変換
uniform float u_opacity;           // 不透明度
uniform vec3  u_sun_direction;     // 太陽方向

varying float v_opacity;           // 不透明度(太陽方向による処理)
#endif

varying vec2  v_texcoord_hi;       // 高レベル画像のテクスチャ座標
varying vec2  v_texcoord_lo;       // 低レベル画像のテクスチャ座標
varying float v_lod;               // 補間された LOD

#ifdef NIGHTIMAGE
float sigmoid( float a, float x )
{
  return 1.0 / ( 1.0 + exp( -( a * x )) );
}
#endif

void main()
{
    gl_Position = u_obj_to_clip * a_position;

    // uv 座標をテクスチャ座標に変換
    v_texcoord_hi = u_texcoord_rect_hi.xy + u_texcoord_rect_hi.zw * a_uv;
    v_texcoord_lo = u_texcoord_rect_lo.xy + u_texcoord_rect_lo.zw * a_uv;

    // LOD の補間
    float u = a_uv.x;
    float v = a_uv.y;

    float lod_00 = u_corner_lod.x;  // uv = (0,0) の LOD
    float lod_10 = u_corner_lod.y;  // uv = (1,0) の LOD
    float lod_01 = u_corner_lod.z;  // uv = (0,1) の LOD
    float lod_11 = u_corner_lod.w;  // uv = (1,1) の LOD

    float lod_u0 = mix( lod_00, lod_10, u );  // uv = (u, 0) の LOD
    float lod_u1 = mix( lod_01, lod_11, u );  // uv = (u, 1) の LOD
    float lod_uv = mix( lod_u0, lod_u1, v );  // uv = (u, v) の LOD

    v_lod = lod_uv;

#ifdef NIGHTIMAGE
    vec4 ground_vector = normalize( u_obj_to_gocs * a_position );
    float dir = dot( ground_vector.xyz, u_sun_direction );
    float sun_opacity = 1.0 - sigmoid( 5.0, dir );
    v_opacity = sun_opacity;  // 不透明度を適用
#endif
}
