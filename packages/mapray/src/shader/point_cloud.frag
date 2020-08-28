precision highp float;


varying vec3 v_color;       // 色


void main(void) {
#if POINT_SHAPE_TYPE == 0 // RECTANGLE
    gl_FragColor = vec4( v_color,  1.0 );

#elif POINT_SHAPE_TYPE == 1 // CIRCLE
    if ( length( gl_PointCoord - 0.5 ) > 0.5 ) {
        discard;
    }
    else {
        gl_FragColor = vec4( v_color,  1.0 );
    }

#elif POINT_SHAPE_TYPE == 2 // CIRCLE_WITH_BORDER
    float distance = length( gl_PointCoord - 0.5 );
    if ( distance > 0.5 ) {
        discard;
    }
    else if ( distance > 0.45 ) {
        gl_FragColor = vec4( 0, 0, 0, 1.0 );
    }
    else {
        gl_FragColor = vec4( v_color,  1.0 );
    }

#elif POINT_SHAPE_TYPE == 3 // GRADIENT_CIRCLE
    vec2 p = 2.0 * gl_PointCoord - 1.0;
    if ( length(p) > 1.0 ) {
        discard;
    }
    else {
        gl_FragColor = vec4( v_color * (1.0 - 0.3 * tan((p.x + p.y)*0.7853981633)),  1.0 );
    }

#endif
}
