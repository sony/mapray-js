/**
 * 深度描画用シェーダ (fragment shader)
 */

precision highp float;
uniform vec4 u_rid; // rid

void main(void) {

#if POINT_SHAPE_TYPE == 0 // RECTANGLE
    gl_FragColor = u_rid;

#elif POINT_SHAPE_TYPE > 0 // CIRCLE
    if ( length( gl_PointCoord - 0.5 ) > 0.5 ) {
        discard;
    }
    else {
        gl_FragColor = u_rid;
    }
#endif
}
