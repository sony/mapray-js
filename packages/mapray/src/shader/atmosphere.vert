precision highp float;

attribute vec3 a_position;

uniform mat4  u_gocs_to_clip;
uniform vec3  u_camera_position;    // The camera's current position
uniform vec3  u_sun_vector;         // The direction vector to the light source
uniform float u_camera_height;      // The camera's current height
uniform float u_camera_height2;     // u_camera_height^2
uniform float u_kr;                 // Kr
uniform float u_km;                 // Km
uniform float u_scale_depth;        // scale_depth
uniform float u_esun;               // Kr
uniform float u_exposure;           // Exposure

varying vec4 v_color;

const float loop_float = 10.0;         // loop
const int   loop_int   = 10;           // loop

const float planet_radius = 10.0;
const float atmosphere_radius = 10.25;
const float planet_factor = 637813.7;

const float PI = 3.14159265358932384626;

const vec3 inv_wave_length = vec3( 5.60204474633241, 9.47328443792304, 19.64380261047720 );

const float outer_radius  = atmosphere_radius;                      // The outer (atmosphere) radius
const float outer_radius2 = atmosphere_radius * atmosphere_radius;  // outer_radius^2
const float inner_radius  = planet_radius;                          // The inner (planetary) radius
const float inner_radius2 = planet_radius * planet_radius;          // inner_radius^2

// variavle
// float ratio = ( u_kr * 100.0 - 0.25 ) / 0.25;
// float vkr = clamp( ( 0.25 - ( u_camera_height - 10.0 ) ) * ratio + 0.25, 0.25, u_kr * 100.0 ) * 0.01;

// fixed
float vkr = u_kr;

// float Kr_ESun = u_kr * u_esun;      // Kr * ESun
float Kr_ESun = vkr  * u_esun;      // Kr * ESun
float Km_ESun = u_km * u_esun;      // Km * ESun
// float Kr_4PI  = u_kr * 4.0 * PI;  // Kr * 4 * PI
float Kr_4PI  = vkr  * 4.0 * PI;  // Kr * 4 * PI
float Km_4PI  = u_km * 4.0 * PI;  // Km * 4 * PI

const float radius_scale = 1.0 / ( atmosphere_radius - planet_radius );   // 1 / (outer_radius - inner_radius)
float scale_over_scale_depth = radius_scale / u_scale_depth;              // radius_scale / scale_depth


float
scale( float angle )
{
    float x = 1.0 - angle;
    return u_scale_depth * exp( -0.00287 + x * ( 0.459 + x * ( 3.83 + x * ( -6.80 + x * 5.25 ) ) ) );
}


void
main()
{
    vec3  ray        = a_position - u_camera_position;
    float far_length = length( ray );
    ray /= far_length;

#ifdef SKY_IN_ATMOSPHERE
    vec3  start_position = u_camera_position;
    float start_height   = length( start_position );
    float depth          = exp( scale_over_scale_depth * ( inner_radius - u_camera_height ) );
    float start_angle    = dot( ray, start_position ) / start_height;
    float start_offset   = depth * scale( start_angle );
#else
    float B           = 2.0 * dot( u_camera_position, ray );
    float C           = u_camera_height2 - outer_radius2;
    float det         = max( 0.0, B * B - 4.0 * C );
    float near_length = 0.5 * ( -B - sqrt( det ) );

    vec3  start_position = u_camera_position + ray * near_length;
    far_length -= near_length;
    float start_angle    = dot( ray, start_position ) / outer_radius;
    float start_depth    = exp( -1.0 / u_scale_depth );
    float start_offset   = start_depth * scale( start_angle ) ;
#endif

    float sample_length = far_length / loop_float;
    float scaled_length = sample_length * radius_scale;
    vec3  sample_ray    = ray * sample_length;
    vec3  sample_point  = start_position + sample_ray * 0.5;

    vec3 front_color = vec3( 0.0, 0.0, 0.0 );
    for ( int i=0; i<loop_int; i++ )
    {
        float sample_height = length( sample_point );
        float sample_depth  = exp( scale_over_scale_depth * ( inner_radius - sample_height ) );
        float light_angle   = dot( u_sun_vector, sample_point ) / sample_height;
        float camera_angle  = dot( ray, sample_point ) / sample_height;
        float scatter = ( start_offset + sample_depth * ( scale( light_angle ) - scale( camera_angle ) ) );
        vec3 attenuate = exp( -scatter * ( inv_wave_length * Kr_4PI + Km_4PI ) );
        front_color += attenuate * ( sample_depth * scaled_length );
        front_color   = clamp( front_color, 0.0, 10.0 );
        sample_point += sample_ray;
    }

    vec4 first_color;
    vec4 secondary_color;
    secondary_color.rgb = front_color * Km_ESun;
    secondary_color.a   = 1.0;
    first_color.rgb     = front_color * ( inv_wave_length * Kr_ESun );
    first_color.a       = 1.0;

    v_color   = first_color + secondary_color;
    v_color   = vec4( 1.0 ) - exp( v_color * u_exposure );
    v_color.a = 1.0;
    v_color   = clamp( v_color, 0.0, 1.0 );

    vec3 atmosphere_position = a_position * planet_factor;
    gl_Position = u_gocs_to_clip * vec4( atmosphere_position, 1.0 );
}
