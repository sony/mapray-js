#version 300 es
precision mediump float;

in float v_height;
in float v_pixel_rate;
out vec4 out_color;

uniform float u_opacity;

uniform float u_interval;   // meter
uniform float u_width;      // pixel
uniform vec4  u_color;

void main()
{
    float contour_distance = mod( v_height, u_interval );

    float dx_height = abs( dFdx( v_height ) );
    float dy_height = abs( dFdy( v_height ) );
    float dF_height = max( dx_height, dy_height ) * v_pixel_rate * u_width;

    if ( step( dF_height, contour_distance ) > 0.0 ) discard;

    out_color = u_color;
    out_color.a *= u_opacity;
}
