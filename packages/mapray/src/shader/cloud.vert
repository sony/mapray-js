/**
 * 雲 (頂点シェーダ)
 */

precision mediump float;

uniform mat4  u_gocs_to_clip;
uniform vec3  u_sun_direction;
uniform float u_intensity;
uniform float u_margin;

uniform float u_cloud_frame;

attribute vec3 a_position;
attribute vec2 a_cloud;     // 雲量パラメータ 2ch

varying float v_light;
varying float v_level;

const float planet_factor = 637813.7;

const float value_rate = 255.0;

float sigmoid( float a, float x )
{
    return 1.0 / ( 1.0 + exp( -( a * x )) );
}

void
main()
{
    vec3 atmosphere_position = a_position * planet_factor;
    gl_Position = u_gocs_to_clip * vec4( atmosphere_position, 1.0 );

    // 影面
    vec3 cloud_vert_normal = normalize( atmosphere_position );
    float cloud_light = dot( u_sun_direction, cloud_vert_normal );
    cloud_light = sigmoid( 5.0, cloud_light );

    // from と to を合成
    float cloud_level1 = a_cloud.x / value_rate * ( 1.0 - u_cloud_frame );
    float cloud_level2 = a_cloud.y / value_rate * u_cloud_frame;
    float cloud_level = clamp ( cloud_level1 + cloud_level2, 0.0, 1.0 );
 
    v_light = clamp( cloud_light + u_intensity, 0.0, 1.0 ); // u_intensityでlightの有無(強度)を切り替え

    v_level = cloud_level * (1.0 - 2.0 * u_margin) + u_margin;
}
