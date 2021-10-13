/**
 * 深度描画用シェーダ (頂点シェーダ)
 */

attribute vec4 a_position;
attribute float a_meta;

uniform mat4 u_obj_to_clip; // モデル座標系からクリップ座標系への変換
uniform float u_point_size; // 点描画サイズ(負の場合は[m]、正の場合は[px])

void
main( void ) {
    gl_Position = u_obj_to_clip * a_position;

    if ( u_point_size < 0.0 ) {
        gl_PointSize = -u_point_size / gl_Position.w;
    }
    else {
        gl_PointSize = u_point_size;
    }
}
