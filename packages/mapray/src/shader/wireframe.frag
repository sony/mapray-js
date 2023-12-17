precision mediump float;

uniform bool u_inner_grid_visibility;
varying vec2 v_uv;

void main()
{
    if (v_uv.x < 0.005 || v_uv.y < 0.005 || v_uv.x > 0.995 || v_uv.y > 0.995) {
        gl_FragColor = vec4( 1, 1, 0, 1 );
    }
    else {
        if ( !u_inner_grid_visibility ) {
            discard;
        }
        gl_FragColor = vec4( 0.5, 0.5, 0.5, 1 );
    }
}
