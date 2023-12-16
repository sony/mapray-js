/**
 * Flakeの緯度経度高度によるBBOX(頂点シェーダ)
 */

attribute vec4 a_position;

uniform mat4 u_gocs_to_clip;
uniform mat4 u_obj_to_clip;

void main(void) {
    // gl_Position = u_gocs_to_clip * a_position;
    gl_Position = u_obj_to_clip * a_position;
}
