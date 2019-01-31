attribute vec4 a_position;
attribute vec2 a_uv;

uniform mat4 u_obj_to_clip;

varying vec2 v_uv;

void main()
{
    gl_Position = u_obj_to_clip * a_position;
    v_uv  = a_uv;
}
