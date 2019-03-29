precision highp float;

varying vec3  v_normal;    // 法線 (視点座標系)
varying vec2  v_texcoord;  // テクスチャ座標

uniform vec3      u_light_dir;   // ライト逆方向 (視点座標系) と強さ
uniform vec4      u_base_color;  // 基本色係数
uniform sampler2D u_base_image;  // 基本色画像


void
main()
{
    vec3 normal = normalize( v_normal );  // 法線 (視点座標系)

    vec3 dlit = vec3( dot( normal, u_light_dir ) );  // 拡散光の強さ

    gl_FragColor = u_base_color * texture2D( u_base_image, v_texcoord ) * vec4( dlit, 1.0 );
}
