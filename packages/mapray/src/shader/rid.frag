/**
 * マウスピック用ID描画シェーダ (フラグメントシェーダ)
 */

precision mediump float;
uniform vec4 u_rid; // rid

void main()
{
    gl_FragColor = u_rid;
}
