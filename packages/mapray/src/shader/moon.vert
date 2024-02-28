/**
 * 月 (頂点シェーダ)
 */

uniform vec3  u_sun_direction;
uniform mat4  u_moon_matrix;

uniform mat4  u_billboard_matrix;
uniform float u_moon_scale;

attribute vec3 a_position;
attribute vec2 a_texcoord;     // テクスチャ座標

varying vec4 v_color;
varying vec2 v_texcoord;       // テクスチャ座標


#ifndef MASK_MOON
float sigmoid( float a, float x )
{
    return 1.0 / ( 1.0 + exp( -( a * x )) );
}
#endif

void
main()
{
    vec3 moon =  mat3( u_moon_matrix ) * a_position;
    gl_Position = u_billboard_matrix * vec4( moon, 1.0 );

#ifndef MASK_MOON
    // lighting
    float moon_light = sigmoid ( 5.0, dot( u_sun_direction, normalize( moon ) ) );
    v_color = vec4( moon_light, moon_light, moon_light, 1.0 );
    v_texcoord = a_texcoord;
#endif

}
