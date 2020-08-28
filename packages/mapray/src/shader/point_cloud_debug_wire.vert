attribute vec4 a_position;

uniform mat4 u_obj_to_clip;

void main(void) {
    gl_Position = u_obj_to_clip * a_position;
}
