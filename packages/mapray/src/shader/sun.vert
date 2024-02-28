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

uniform mat4  u_billboard_matrix;
uniform mat4  u_camera_direction_matrix;
uniform vec3  u_sun_direction;
uniform float u_intensity;

attribute vec3 a_position;
attribute float a_glow;

varying vec4 v_color;

// <atmosphere
const float sun_length = 149597.870000;  // 1/1000000

uniform vec3  u_camera_position;    // The camera's current position
uniform vec3  u_sun_vector;         // The direction vector to the light source
uniform float u_camera_height;      // The camera's current height
uniform float u_kr;                 // Kr
uniform float u_km;                 // Km
uniform float u_scale_depth;        // scale_depth
uniform float u_esun;               // Kr

const float planet_radius = 6.378137;               // 1/1000000
const float atmosphere_radius = 6.378137 * 1.025;   // 1/1000000

const float PI = 3.14159265358979323846;

const vec3 inv_wave_length = vec3( 5.60204474633241, 9.47328443792304, 19.64380261047720 );

float Kr_4PI  = u_kr * 4.0 * PI;    // Kr * 4 * PI
float Km_4PI  = u_km * 4.0 * PI;    // Km * 4 * PI


float
scale( float cos_th )
{
    float x = 1.0 - cos_th;
    return u_scale_depth * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
}
// atmosphere>


void
main()
{
    // <atmosphere
    vec3  sun_pos    = u_sun_vector * sun_length;
    vec3  ray        = normalize( sun_pos - u_camera_position );
    float h_normal   = ( u_camera_height - planet_radius ) / ( atmosphere_radius - planet_radius );
    float density    = exp( - h_normal / u_scale_depth );

    float cos_th = dot( ray, u_camera_position ) / u_camera_height;
    float scatter = density * scale( cos_th );
    vec3  color = exp( -scatter * ( inv_wave_length * Kr_4PI + Km_4PI ) );
    // atmosphere>

    gl_Position = u_billboard_matrix * vec4( a_position, 1.0 );

    v_color = vec4( color * a_glow * u_intensity, 1.0 );
}
