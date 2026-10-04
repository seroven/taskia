export const planetVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vView;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const planetFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uKind;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uCloud;
uniform vec3 uAtmo;
uniform float uScale;
uniform float uCoverage;
uniform float uWarp;
uniform float uGloss;
uniform float uCloudAmt;
uniform float uCloudSpeed;

varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vView;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float shape(vec3 p) {
  return noise(p) * 0.7 + noise(p * 2.0 + vec3(uSeed)) * 0.3;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 dir = normalize(vWorld);
  vec3 p = dir * (1.15 + mod(uScale, 1.4)) + vec3(uWarp * 0.2, uSeed * 0.05, 0.0);
  float n1 = shape(p);
  float y = dir.y;

  vec3 surface = uA;
  if (uKind < 0.5) {
    float land = smoothstep(uCoverage, uCoverage + 0.05, n1);
    surface = mix(uA, uB, land);
    float spot = smoothstep(0.64, 0.7, n1);
    surface = mix(surface, uC, spot);
  } else if (uKind < 1.5) {
    float wave = sin(y * 2.8 + uSeed);
    surface = mix(uA, uB, smoothstep(-0.08, 0.08, wave));
    float belt = smoothstep(0.12, 0.18, y) * (1.0 - smoothstep(0.34, 0.42, y));
    surface = mix(surface, uC, belt);
  } else if (uKind < 2.5) {
    surface = mix(uA, uB, smoothstep(0.4, 0.48, abs(y)));
    surface = mix(surface, uC, smoothstep(0.6, 0.67, shape(p + vec3(1.7))));
  } else if (uKind < 3.5) {
    float river = 1.0 - smoothstep(0.0, 0.08, abs(shape(vec3(p.x * 0.65, p.y * 1.35, p.z * 0.65)) - 0.5));
    surface = mix(uA, uC, river);
    surface = mix(surface, uB, smoothstep(0.62, 0.68, n1) * (1.0 - river));
  } else if (uKind < 4.5) {
    float dune = smoothstep(-0.04, 0.04, sin(y * 2.15 + n1));
    surface = mix(uA, uB, dune);
    surface = mix(surface, uC, smoothstep(0.66, 0.72, n1));
  } else {
    surface = mix(uA, uB, smoothstep(0.5, 0.57, n1));
    surface = mix(surface, uC, smoothstep(0.62, 0.68, shape(p + vec3(2.4, 0.6, 1.1))));
  }

  float drift = noise(dir * 1.3 + vec3(uTime * uCloudSpeed, 0.0, uSeed));
  float puff = smoothstep(0.58, 0.66, drift);
  surface = mix(surface, uCloud, puff * clamp(uCloudAmt, 0.0, 0.8));

  vec3 L = normalize(vec3(0.45, 0.82, 0.35));
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  float lit = 0.58;
  lit = mix(lit, 0.82, step(0.42, ndl));
  lit = mix(lit, 1.0, step(0.74, ndl));
  vec3 viewDir = normalize(vView);
  float facing = clamp(dot(n, viewDir), 0.0, 1.0);
  float ink = 1.0 - smoothstep(0.16, 0.3, facing);
  vec3 color = mix(surface * lit, vec3(0.09, 0.12, 0.22), ink);
  gl_FragColor = vec4(color, 1.0);
}
`

export const ringVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const ringFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uSeed;
varying vec2 vUv;

void main() {
  float r = vUv.y;
  float shift = fract(uSeed * 0.17) * 0.06;
  float band = smoothstep(0.04, 0.1, r) * (1.0 - smoothstep(0.3 + shift, 0.38 + shift, r));
  band += smoothstep(0.56, 0.64, r) * (1.0 - smoothstep(0.88, 0.96, r));
  gl_FragColor = vec4(uColor, band * 0.95);
}
`
