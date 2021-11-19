precision highp float;

varying vec3 fNormal;

void main() {
    vec3 c = fNormal + vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(0.5*c, 1.0);
}