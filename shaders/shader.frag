precision highp float;

uniform vec4 fColor;

void main() {
    //vec3 c = fColor + vec3(1.0, 1.0, 1.0);
    gl_FragColor = fColor;
}