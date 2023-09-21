/**
 * Modified from GPU Gems 2 (https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html)
 * Includes the following third-party code.
 *
 * s_p_oneil@hotmail.com
 * Copyright (c) 2000, Sean O'Neil
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of this project nor the names of its contributors
 *   may be used to endorse or promote products derived from this software
 *   without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * 太陽 (頂点シェーダ)
 */

precision mediump float;

uniform mat4  u_gocs_to_clip;
uniform mat4  u_billboard_matrix;
uniform mat4  u_camera_direction_matrix;
uniform vec3  u_sun_direction;
uniform float u_sun_scale;

uniform float u_intensity;

attribute vec3 a_position;
attribute vec2 a_texcoord;     // テクスチャ座標

varying vec4 v_color;
varying vec2 v_texcoord;       // テクスチャ座標

const float sun_length = 149597.870000;  // 1/1000000

const float GAMMA = 1.0 / 2.2;

// <atmosphere
uniform vec3  u_camera_position;    // The camera's current position
uniform vec3  u_sun_vector;         // The direction vector to the light source
uniform float u_camera_height;      // The camera's current height
uniform float u_camera_height2;     // u_camera_height^2
uniform float u_kr;                 // Kr
uniform float u_km;                 // Km
uniform float u_scale_depth;        // scale_depth
uniform float u_esun;               // Kr
uniform float u_exposure;           // Exposure

const float planet_radius = 6.378137;               // 1/1000000
const float atmosphere_radius = 6.378137 * 1.025;   // 1/1000000

const float PI = 3.14159265358932384626;

const vec3 inv_wave_length = vec3( 5.60204474633241, 9.47328443792304, 19.64380261047720 );

const float outer_radius  = atmosphere_radius;                      // The outer (atmosphere) radius
const float outer_radius2 = atmosphere_radius * atmosphere_radius;  // outer_radius^2
const float inner_radius  = planet_radius;                          // The inner (planetary) radius
const float inner_radius2 = planet_radius * planet_radius;          // inner_radius^2

float Kr_ESun = u_kr * u_esun;      // Kr * ESun
float Km_ESun = u_km * u_esun;      // Km * ESun
float Kr_4PI  = u_kr * 4.0 * PI;    // Kr * 4 * PI
float Km_4PI  = u_km * 4.0 * PI;    // Km * 4 * PI

const float radius_scale = 1.0 / ( atmosphere_radius - planet_radius );   // 1 / (outer_radius - inner_radius)
float scale_over_scale_depth = radius_scale / u_scale_depth;              // radius_scale / scale_depth
// atmosphere>


float
scale( float angle )
{
    float x = 1.0 - angle;
    return u_scale_depth * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
}
// atmosphere>

void
main()
{
    // <atmosphere
    vec3  sun_pos    = u_sun_vector * sun_length;
    vec3  ray        = sun_pos - u_camera_position;
    float depth      = exp( scale_over_scale_depth * ( inner_radius - u_camera_height ) );

    float angle = dot( normalize( ray ),  u_camera_position ) / u_camera_height;
    float scatter = depth * ( scale( angle ) );
    vec3  FrontSecondaryColor = exp( -scatter * ( inv_wave_length * Kr_4PI + Km_4PI ) );
    // atmosphere>


    vec3 vertex_pos = a_position * u_sun_scale;
    vec4 pos = u_gocs_to_clip * u_billboard_matrix * vec4( vertex_pos, 1.0 );
    gl_Position = pos;

    v_color = vec4( FrontSecondaryColor * u_intensity, 1.0 );

    v_texcoord = a_texcoord;
}
