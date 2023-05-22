/**
 * SymbolLayer のテキストまたは SDF アイコン (フラグメントシェーダ)
 */

precision mediump float;

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
 * 被覆率を計算するための画素の分割数
 *
 * 現在の実装は等間隔に分割するが、別の分割方法でも実装可能である。
 */
const ivec2 DIVS_Zeta = ivec2( 2, 2 );


/** 引数の値を交換 */
void
swap( inout float a, inout float b )
{
    float temp = a;
    a = b;
    b = temp;
}


/** 三角形内の図形の被覆率を計算
 *
 *  詳細は `vector-tile-style.org` の「シンボルの縁取り表示」を参照の
 *  こと。
 */
float
coverage( float dist_a, float dist_b, float dist_c, float w )
{
    float d[3];
    d[0] = dist_a;
    d[1] = dist_b;
    d[2] = dist_c;

    // 昇順ソート
    if ( d[0] > d[1] ) swap( d[0], d[1] );
    if ( d[0] > d[2] ) swap( d[0], d[2] );
    if ( d[1] > d[2] ) swap( d[1], d[2] );

    // 画素に対する三角形の数
    const int num_triangles = 2 * DIVS_Zeta[0] * DIVS_Zeta[1];

    // 画素に対する三角形の面積
    const float area = 1.0 / float( num_triangles );

    if ( d[0] >  w ) {
        // 図形と三角形は重ならない
        return 0.0 * area;
    }

    if ( d[2] <= w ) {
        // 図形は三角形を覆っている
        return 1.0 * area;
    }

    if ( d[1] > w ) {
        // 1 つ頂点が図形内 (r1)
        float n = (w    - d[0]) * (w    - d[0]);
        float m = (d[1] - d[0]) * (d[2] - d[0]);
        return n / m * area;
    }
    else {
        // 2 つ頂点が図形内 (r2)
        float n = (w    - d[2]) * (w    - d[2]);
        float m = (d[1] - d[2]) * (d[0] - d[2]);
        return (1.0 - n / m) * area;
    }
}


/** sdistance 用のインデックス */
int
index( int k0, int k1 )
{
    return k0 + k1 * (DIVS_Zeta[0] + 1);
}


void main()
{
    // 画素の左下角に対応するテクスチャ座標
    vec2 tc_base = v_texcoord - 0.5 * u_img_psize;

     // 距離のサンプリング
    float sdistance[(DIVS_Zeta[0] + 1) * (DIVS_Zeta[1] + 1)];

//     for ( int k1 = 0; k1 < DIVS_Zeta[1] + 1; ++k1 ) {
//         for ( int k0 = 0; k0 < DIVS_Zeta[0] + 1; ++k0 ) {
//             // 標本点のテクスチャ座標 (特殊単位)
//             vec2 tc = tc_base + vec2( k0, k1 ) / vec2( DIVS_Zeta ) * u_img_psize;
//             sdistance[index( k0, k1 )] = texture2D( u_image, tc ).x;
//         }
//     }
    {
        vec2 tc = tc_base + vec2( 0.0, 0.0 ) * u_img_psize;
        sdistance[index( 0, 0 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 0.0, 0.5 ) * u_img_psize;
        sdistance[index( 0, 1 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 0.0, 1.0 ) * u_img_psize;
        sdistance[index( 0, 2 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 0.5, 0.0 ) * u_img_psize;
        sdistance[index( 1, 0 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 0.5, 0.5 ) * u_img_psize;
        sdistance[index( 1, 1 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 0.5, 1.0 ) * u_img_psize;
        sdistance[index( 1, 2 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 1.0, 0.0 ) * u_img_psize;
        sdistance[index( 2, 0 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 1.0, 0.5 ) * u_img_psize;
        sdistance[index( 2, 1 )] = texture2D( u_image, tc ).x;

        tc = tc_base + vec2( 1.0, 1.0 ) * u_img_psize;
        sdistance[index( 2, 2 )] = texture2D( u_image, tc ).x;
    }

   // ζ_b: シンボル本体の被覆率
    float zeta_b = 0.0;

    // ζ_u: シンボル本体と縁取りの合併の被覆率
    float zeta_u = 0.0;

    // 最小距離がこれ以下のとき、シンボル本体内
    const float body_edge_dist = (0.0 - DIST_LOWER) * DIST_FACTOR;

    // 被覆率 ζ_b, ζ_u を計算
    for ( int k1 = 0; k1 < DIVS_Zeta[1]; ++k1 ) {
        for ( int k0 = 0; k0 < DIVS_Zeta[0]; ++k0 ) {
            // 四角形の角のサンプリング値
            float d00 = sdistance[index( k0 + 0, k1 + 0 )];
            float d10 = sdistance[index( k0 + 1, k1 + 0 )];
            float d01 = sdistance[index( k0 + 0, k1 + 1 )];
            float d11 = sdistance[index( k0 + 1, k1 + 1 )];

            // 下三角形
            zeta_b += coverage( d00, d10, d01, body_edge_dist );
            zeta_u += coverage( d00, d10, d01,   u_halo_width );

            // 上三角形
            zeta_b += coverage( d01, d10, d11, body_edge_dist );
            zeta_u += coverage( d01, d10, d11,   u_halo_width );
        }
    }

    // ζ_h: シンボル縁取りの被覆率
    float zeta_h = zeta_u - zeta_b;

    // 混合は C = Cs + (1 - As) Cd を前提
    gl_FragColor = vec4( zeta_b * u_color.rgb + zeta_h * u_halo_color.rgb,
                         zeta_b * u_color.a   + zeta_h * u_halo_color.a ) * u_opacity;
}
