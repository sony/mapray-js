precision mediump float;

varying vec2 v_uv;

void main()
{
    vec4 color = (v_uv.x < 0.005 || v_uv.y < 0.005 || v_uv.x > 0.995 || v_uv.y > 0.995) ?
                 vec4( 1, 1, 0, 1 ) : vec4( 0.5, 0.5, 0.5, 1 );
    gl_FragColor = color;
}
