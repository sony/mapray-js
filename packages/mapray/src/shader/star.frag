/**
 * 恒星 (フラグメントシェーダ)
 */

precision mediump float;

varying vec3 v_color;

void
main()
{
    vec2 p = 2.0 * gl_PointCoord - 1.0;
    float z = 1.0 - dot( p, p );
    if ( z < 0.0 ) discard;

    float len = 1.0 - sqrt(p.x * p.x + p.y * p.y);
    len = pow ( len, 3.0 );
    gl_FragColor = vec4( v_color * len,  1.0 );
}
