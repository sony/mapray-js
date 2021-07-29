/**
 * 月 (頂点シェーダ)
 */

precision mediump float;

uniform mat4  u_gocs_to_clip;
uniform vec3  u_moon_direction;
uniform vec3  u_sun_direction;
uniform mat4  u_moon_matrix;
uniform mat4  u_moon_tilt_matrix;

uniform mat4  u_billboard_matrix;
uniform float u_moon_scale;

attribute vec3 a_position;
attribute vec2 a_texcoord;     // テクスチャ座標

varying vec4 v_color;
varying vec2 v_texcoord;       // テクスチャ座標


// const float planet_radius = 10.0;
// const float atmosphere_radius = 10.25;
const float planet_factor = 173715.0;

#ifndef MASK_MOON
float sigmoid( float a, float x )
{
    return 1.0 / ( 1.0 + exp( -( a * x )) );
}
#endif

void
main()
{
    vec4 moon =  u_moon_matrix * u_moon_tilt_matrix * vec4( a_position, 1.0 );
    vec3 moon_vert_normal = normalize( moon.xyz );
    moon.xyz *= planet_factor * u_moon_scale;

    gl_Position = u_gocs_to_clip * u_billboard_matrix * moon;

#ifndef MASK_MOON

    // lighting
    // float moon_light = dot( vec3(1.0, 0.0, 0.0), normalize( a_position ) );   //test
    float moon_light = dot( u_sun_direction, moon_vert_normal );
    moon_light = sigmoid ( 5.0, moon_light );
    v_color = vec4( moon_light, moon_light, moon_light, 1.0 );

    // v_color = vec4( 1.0 ); //test

    v_texcoord = a_texcoord;

#endif

}
