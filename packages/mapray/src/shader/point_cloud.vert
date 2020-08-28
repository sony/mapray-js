attribute vec4 a_position;
attribute vec3 a_color;

uniform mat4 u_obj_to_clip; // モデル座標系からクリップ座標系への変換
uniform float u_point_size; // 点描画サイズ(負の場合は[m]、正の場合は[px])

uniform float u_debug;      // デバッグ用パラメータ(正の場合のみ有効)

varying vec3 v_color;       // 色


void main(void) {
    gl_Position = u_obj_to_clip * a_position;

    if ( u_point_size < 0.0 ) {
        gl_PointSize = -u_point_size / gl_Position.w;
    }
    else {
        gl_PointSize = u_point_size;
    }

    if ( u_debug < 0.0 ) {
        v_color = a_color;
    }
    else {
        float alpha = min( 1.0, u_debug );
        v_color = vec3( alpha, 0.0, 1.0 - alpha );
    }
}
