/**
 * SymbolLayer のテキストまたは SDF アイコン (フラグメントシェーダ)
 */

precision highp float; // TODO: 最後に調整

varying vec2 v_texcoord;     // シンボル画像上での位置

uniform sampler2D u_image;   // シンボル画像 (x: 最小距離 - DIST_LOWER)
uniform vec2  u_img_psize;   // テクスチャ空間での画面画素の寸法

uniform vec4  u_color;       // シンボル本体の RGBA 色 (α前乗算)
uniform float u_opacity;     // シンボル全体の不透明度

uniform vec4  u_halo_color;   // シンボル縁取りの RGBA 色 (α前乗算)
uniform float u_halo_width;   // シンボル縁取りの太さ - DIST_LOWER


/**
 * sdfield.ts の DIST_FACTOR と同じ値
 */
const float DIST_FACTOR = _DIST_FACTOR_;


/**
 * sdfield.ts の DIST_LOWER と同じ値
 */
const float DIST_LOWER = _DIST_LOWER_;


/**
 * 被覆率を計算するためのサンプリング数
 */
const ivec2 DIVS_Zeta = ivec2( 3, 6 );


/**
 * チェス盤パターンのサンプリング
 *
 * 有向のとき 1.0, 無効のとき 0.0 を指定する。
 */
const float chessboard = 1.0;


void main()
{
    // 画素の左下角に対応するテクスチャ座標
    vec2 tc_base = v_texcoord - 0.5 * u_img_psize;

    // ζ_b: シンボル本体の被覆率
    float zeta_b = 0.0;

    // ζ_u: シンボル本体と縁取りの合併の被覆率
    float zeta_u = 0.0;

    // 被覆率の増加量
    const float delta = 1.0 / float( DIVS_Zeta[0] * DIVS_Zeta[1] );

    // 最小距離がこれ以下のとき、シンボル本体内
    const float body_edge_dist = (0.0 - DIST_LOWER) * DIST_FACTOR;

    // 被覆率 ζ_b, ζ_u を計算
    for ( int k1 = 0; k1 < DIVS_Zeta[1]; ++k1 ) {
        for ( int k0 = 0; k0 < DIVS_Zeta[0]; ++k0 ) {
            float p0 = (mod( float( k1 ), 2.0 ) == 0.0 ? -0.25 : 0.25) * chessboard;

            // 標本点のテクスチャ座標
            vec2 tc = tc_base + (vec2( k0, k1 ) + vec2( 0.5 + p0, 0.5 )) / vec2( DIVS_Zeta ) * u_img_psize;

            // 符号付きの最小距離
            float n = texture2D( u_image, tc ).x;

            if ( n <= body_edge_dist ) {
                zeta_b += delta;
            }
            if ( n <= u_halo_width ) {
                zeta_u += delta;
            }
        }
    }

    // ζ_h: シンボル縁取りの被覆率
    float zeta_h = zeta_u - zeta_b;

    // 混合は C = Cs + (1 - As) Cd を前提
    gl_FragColor = vec4( zeta_b * u_color.rgb + zeta_h * u_halo_color.rgb,
                         zeta_b * u_color.a   + zeta_h * u_halo_color.a ) * u_opacity;
}
