precision highp float;

varying   vec4 v_color;
varying   float v_is_ground;

void
main()
{
    if ( v_is_ground > 0.99 ) {
        discard;
        // gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
        // return;
    }

    gl_FragColor = v_color;
}
