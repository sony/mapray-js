attribute vec4 a_position;

uniform mat4 u_obj_to_clip;
varying vec4 pos;

void main(void) {
    pos = gl_Position;
    gl_Position = u_obj_to_clip * a_position;
}
