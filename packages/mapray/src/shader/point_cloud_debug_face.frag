precision highp float;

uniform vec4 u_color;
varying vec4 pos;

void main(void) {
    // gl_FragCoord.x, gl_FragCoord.y
    if (mod(gl_FragCoord.x, 3.0) < 1.0 && mod(gl_FragCoord.y, 3.0) < 1.0) {
        gl_FragColor = vec4(u_color.x, u_color.y, u_color.z, 1.0);
    }
    else {
        discard;
    }
}
