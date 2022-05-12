/**
 * 恒星 (頂点シェーダ)
 */

precision mediump float;

uniform mat4  u_gocs_to_clip;
uniform mat4  u_longitude_matrix;
uniform float u_scale;


attribute vec3  a_position;
attribute vec3  a_color;
attribute float a_rank;

varying vec3  v_color;

const float parsec_factor = 3085677581000000.0;    //parsec

void
main()
{
    vec3 star_position = a_position * parsec_factor;

    gl_Position = u_gocs_to_clip * u_longitude_matrix * vec4( star_position, 1.0 );

    gl_PointSize = clamp ( a_rank * u_scale, 2.0, 100.0 );

    v_color = a_color;
}
