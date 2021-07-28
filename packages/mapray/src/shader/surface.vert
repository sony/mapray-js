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
#elif defined(ATMOSPHERE)
    uniform mat4  u_obj_to_gocs;       // 地表断片座標系からGOCS座標系への変換
    uniform vec3  u_sun_direction;     // 太陽方向
    uniform vec3  u_camera_position;   // The camera's current position
    uniform float u_camera_height;     // The camera's current height
    uniform float u_camera_height2;    // The camera's current height^2

    uniform float u_kr;                 // Kr
    uniform float u_km;                 // Km
    uniform float u_scale_depth;        // scale_depth
    uniform float u_esun;               // Kr

    varying vec4  v_color;
    varying vec4  v_secondary_color;
#endif

varying vec2  v_texcoord_hi;       // 高レベル画像のテクスチャ座標
varying vec2  v_texcoord_lo;       // 低レベル画像のテクスチャ座標
varying float v_lod;               // 補間された LOD

#ifdef NIGHTIMAGE
    float sigmoid( float a, float x )
    {
        return 1.0 / ( 1.0 + exp( -( a * x )) );
    }
#elif defined(ATMOSPHERE)
    const float loop_float = 2.0;         // loop
    const int   loop_int   = 2;           // loop

    const float planet_radius = 6378137.0;
    const float atmosphere_radius = planet_radius * 1.025;

    const float PI = 3.14159265358932384626;

    const vec3 inv_wave_length = vec3( 5.60204474633241, 9.47328443792304, 19.64380261047720 );

    const float outer_radius  = atmosphere_radius;                   // The outer (atmosphere) radius
    const float outer_radius2 = atmosphere_radius*atmosphere_radius; // outer_radius^2
    const float inner_radius  = planet_radius;                       // The inner (planetary) radius
    const float inner_radius2 = planet_radius*planet_radius;         // inner_radius^2

    float Kr_ESun = u_kr * u_esun;      // Kr * ESun
    float Km_ESun = u_km * u_esun;      // Km * ESun
    float Kr_4PI  = u_kr * 4.0 * PI;  // Kr * 4 * PI
    float Km_4PI  = u_km * 4.0 * PI;  // Km * 4 * PI

    const float radius_scale = 1.0 / ( atmosphere_radius - planet_radius );   // 1 / (outer_radius - inner_radius)
    float scale_over_scale_depth = radius_scale / u_scale_depth;          // radius_scale / scale_depth

    float scale( float angle )
    {
        float x = 1.0 - angle;
        return u_scale_depth * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
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
    vec3 ground_vector = normalize( vec3( u_obj_to_gocs * a_position ) );
    float dir = dot( ground_vector, u_sun_direction );
    float sun_opacity = 1.0 - sigmoid( 5.0, dir );
    v_opacity = sun_opacity * u_opacity;  // 不透明度を適用
#elif defined(ATMOSPHERE)
    vec3  vertex_position = vec3( u_obj_to_gocs * a_position );
    vec3  ray             = vertex_position - u_camera_position;
    float far_length      = length( ray );
    ray /= far_length;

    #ifdef FROMSPACE
        float B           = 2.0 * dot( u_camera_position, ray );
        float C           = u_camera_height2 - outer_radius2;
        float det         = max( 0.0, B * B - 4.0 * C );
        float near_length = 0.5 * ( -B - sqrt( det ) );

        vec3 start_position = u_camera_position + ray * near_length;
        far_length -= near_length;
        float depth = exp( ( inner_radius - outer_radius ) / ( atmosphere_radius - planet_radius ));
    #else
        vec3 start_position = u_camera_position;
        float depth = exp( ( inner_radius - u_camera_height ) / ( atmosphere_radius - planet_radius ));
    #endif

    float camera_angle  = dot( -ray, vertex_position ) / length( vertex_position );
    float light_angle   = dot( u_sun_direction, vertex_position ) / length( vertex_position );
    float camera_scale  = scale( camera_angle );
    float light_scale   = scale( light_angle );
    float camera_offset = depth * camera_scale;
    float temp          = light_scale + camera_scale;

    float sample_length = far_length / loop_float;
    float scaled_length = sample_length * radius_scale;
    vec3  sample_ray    = ray * sample_length;
    vec3  sample_point  = start_position + sample_ray * 0.5;

    vec3 front_color = vec3( 0.0, 0.0, 0.0 );
    vec3 attenuate   = vec3( 0.0, 0.0, 0.0 );
    for ( int i=0; i<loop_int; i++ )
    {
        float sample_height = length( sample_point );
        float sample_depth  = exp( scale_over_scale_depth * ( inner_radius - sample_height ) );
        float scatter = sample_depth * temp - camera_offset;
        attenuate = exp( -scatter * ( inv_wave_length * Kr_4PI + Km_4PI ) );
        front_color += attenuate * ( sample_depth * scaled_length );
        sample_point += sample_ray;
    }

    v_color.rgb = front_color * ( inv_wave_length * Kr_ESun + Km_ESun );
    v_secondary_color.rgb = attenuate;
#endif
}
