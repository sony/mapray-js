precision mediump float;

varying vec2  v_texcoord_hi;    // 高レベル画像のテクスチャ座標
varying vec2  v_texcoord_lo;    // 低レベル画像のテクスチャ座標
varying float v_lod;            // 補間された LOD

#ifdef NIGHTIMAGE
    varying float v_opacity;           // 不透明度(太陽方向による処理)
#elif defined(ATMOSPHERE)
    uniform float u_opacity;           // 不透明度
    uniform float u_exposure;          // Exposure
    varying vec4  v_color;
    varying vec4  v_secondary_color;
#else
    uniform float u_opacity;           // 不透明度
#endif

uniform sampler2D u_image_hi;   // 高レベル画像
uniform sampler2D u_image_lo;   // 低レベル画像

/** 画像パラメータ
 *
 *  x = u_image_lo の LOD
 *  y = 1 / (u_image_hi の LOD - x)
 *
 *  ただし u_image_hi と u_image_lo が同じ画像のときは y = 0
 */
uniform vec2 u_image_param;


void main()
{
    vec4 color_hi = texture2D( u_image_hi, v_texcoord_hi );
    vec4 color_lo = texture2D( u_image_lo, v_texcoord_lo );

    // 画像の混合率
    float lo_lod = u_image_param.x;
    float  delta = u_image_param.y;
    float  ratio = clamp( (v_lod - lo_lod) * delta, 0.0, 1.0 );


    // 不透明度を適用
#ifdef NIGHTIMAGE
    gl_FragColor = mix( color_lo, color_hi, ratio );
    gl_FragColor.a *= v_opacity;
#elif defined(ATMOSPHERE)
    vec4 color            = mix( color_lo, color_hi, ratio );
    vec4 atmosphere_color = v_color + color * v_secondary_color;

    atmosphere_color   = 1.0 - exp( atmosphere_color * u_exposure );
    atmosphere_color.a = 1.0;

    gl_FragColor = atmosphere_color;
    gl_FragColor.a *= u_opacity;
#else
    gl_FragColor = mix( color_lo, color_hi, ratio );
    gl_FragColor.a *= u_opacity;
#endif
}
