/**
 * 天の川 (頂点シェーダ)
 */

precision mediump float;

uniform mat4  u_longitude_matrix;
uniform float u_intensity;

attribute vec3 a_position;
attribute vec2 a_texcoord;     // テクスチャ座標

varying vec2 v_texcoord;       // テクスチャ座標
varying vec4 v_intensity;

const float parsec_factor = 3085677581000000.0;    //parsec

void
main()
{
    vec3 position = a_position * parsec_factor;

    gl_Position = u_longitude_matrix * vec4( position, 1.0 );

    v_texcoord = a_texcoord;

    v_intensity = vec4 ( vec3 ( u_intensity ), 1.0 );
}
