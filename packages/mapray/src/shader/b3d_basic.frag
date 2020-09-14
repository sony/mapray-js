precision highp float;

varying vec3 v_normal;   // 法線 (視点座標系)
varying vec3 v_color;    // RGB カラー

uniform vec3 u_light_dir;   // ライト逆方向 (視点座標系) と強さ
uniform float u_ambient;    // 環境光


void
main()
{
    vec3 normal = normalize( v_normal );  // 法線 (視点座標系)

    float dlit = dot( normal, u_light_dir );  // 拡散光の強さ
    dlit += u_ambient;

    gl_FragColor = vec4( dlit * v_color, 1.0 );
}
