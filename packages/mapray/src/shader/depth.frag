// define PASS_BASE 0 or 1 JS側で指定される

/**
 * 深度描画用シェーダ (フラグメントシェーダ)
 */

uniform highp sampler2D u_sampler;

void
main( void ) {
    highp float fdepth = texture2D( u_sampler, vec2( 0.5, 0.5 ) ).r; // r:[0.0-1.0](24bit), g:0.0, b:0.0, a:1.0

    /* 疑似コード PASS_BASEは0か4を想定
    int n[8];  // 各 n[i] の値は範囲 [0, 7], ただし n[0] は [0, 8]
    for ( int i = 0; i < 8; ++i ) {
        n[i] = 0;
        for ( int w = (i == 0 ? 3 : 2); w >= 0; --w ) {
            if ( fdepth >= 1.0 ) {
                n[i] += (1 << w);
                fdepth = fract( fdepth );
            }
            fdepth *= 2.0;
        }
    }

    gl_FragColor = vec4( n[PASS_BASE + 0],
        n[PASS_BASE + 1],
        n[PASS_BASE + 2],
        n[PASS_BASE + 3]
    ) / NMAX;
    */

#if PASS_BASE == 1
    for ( int i=0; i<12; i++ ) {
        fdepth = fract( fdepth * 2.0 );
    }
#endif // PASS_BASE

    highp vec4 v;

    int n = 0;
    if ( fdepth >= 1.0 ) { n += 0x8; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x4; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x2; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x1; fdepth = fract( fdepth ); } fdepth *= 2.0;
    v[0] = float(n) / 15.0;

    n = 0;
    if ( fdepth >= 1.0 ) { n += 0x4; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x2; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x1; fdepth = fract( fdepth ); } fdepth *= 2.0;
    v[1] = float(n) / 15.0;

    n = 0;
    if ( fdepth >= 1.0 ) { n += 0x4; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x2; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x1; fdepth = fract( fdepth ); } fdepth *= 2.0;
    v[2] = float(n) / 15.0;

    n = 0;
    if ( fdepth >= 1.0 ) { n += 0x4; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x2; fdepth = fract( fdepth ); } fdepth *= 2.0;
    if ( fdepth >= 1.0 ) { n += 0x1; fdepth = fract( fdepth ); } fdepth *= 2.0;
    v[3] = float(n) / 15.0;

    gl_FragColor = v;
}
