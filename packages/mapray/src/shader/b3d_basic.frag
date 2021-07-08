precision highp float;

varying vec3 v_normal;    // 法線 (視点座標系)
varying vec2 v_texcoord;  // テクスチャ座標

uniform vec3      u_light_dir;   // ライト逆方向 (視点座標系) と強さ
uniform float     u_ambient;     // 環境光
uniform sampler2D u_teximage;    // タイル TEXIMAGE_PART 画像
uniform vec3      u_clip_color;  // テスト用


void
main()
{
    vec3 normal = normalize( v_normal );  // 法線 (視点座標系)

    float dlit = dot( normal, u_light_dir );  // 拡散光の強さ
    dlit += u_ambient;

    vec3 txi_color = texture2D( u_teximage, v_texcoord ).rgb;

    gl_FragColor = vec4( vec3( dlit ) * txi_color, 1.0 );

#ifdef CLIP_COLORING
    // クリップされたタイルを着色
    gl_FragColor += vec4( u_clip_color, 0 );
#endif
}
