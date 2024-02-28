/**
 * 星座 (頂点シェーダ)
 */

uniform mat4  u_longitude_matrix;
uniform vec3  u_line_color;

attribute vec3  a_position;

varying vec3  v_color;

const float parsec_factor = 3085677581000000.0;    //parsec

void
main()
{
    vec3 position = a_position * parsec_factor;

    gl_Position = u_longitude_matrix * vec4( position, 1.0 );

    v_color = u_line_color;
}
