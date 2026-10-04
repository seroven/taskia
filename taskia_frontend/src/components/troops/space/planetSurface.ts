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

float fbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  s += a * noise(p); p = p * 2.02 + vec3(uSeed); a *= 0.5;
  s += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5;
  s += a * noise(p); p = p * 2.01 + 3.1; a *= 0.5;
  s += a * noise(p);
  return s;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 p = normalize(vWorld) * uScale;
  float n1 = fbm(p + vec3(fbm(p + vec3(uWarp)) * uWarp));
  float bands = sin((normalize(vWorld).y * (6.0 + uScale) + n1 * 2.4));
  bands = bands * 0.5 + 0.5;

  vec3 surface = uA;
  if (uKind < 0.5) {
    float land = smoothstep(uCoverage, uCoverage + 0.12, n1);
    surface = mix(uA, uB, land);
    surface = mix(surface, uC, smoothstep(0.72, 0.9, n1) * 0.65);
  } else if (uKind < 1.5) {
    surface = mix(uA, uB, bands);
    surface = mix(surface, uC, smoothstep(0.65, 0.92, n1) * 0.45);
  } else if (uKind < 2.5) {
    float crack = 1.0 - smoothstep(0.08, 0.2, abs(n1 - 0.5));
    surface = mix(uA, uB, n1);
    surface = mix(surface, uC, crack * 0.35);
  } else if (uKind < 3.5) {
    float crack = 1.0 - smoothstep(0.04, 0.16, abs(n1 - 0.48));
    surface = mix(uA, uB, n1 * 0.65);
    surface = mix(surface, uC, crack);
  } else if (uKind < 4.5) {
    float dune = fbm(vec3(p.x * 0.45, p.y * 1.8, p.z * 0.45));
    surface = mix(uA, uB, dune);
    surface = mix(surface, uC, smoothstep(0.7, 0.95, dune) * 0.4);
  } else {
    surface = mix(uA, uB, n1);
    surface = mix(surface, uC, smoothstep(0.55, 0.85, n1) * 0.5);
  }

  float grain = noise(normalize(vWorld) * (16.0 + uScale * 2.0));
  surface = mix(surface * 0.9, surface, grain);

  float clouds = fbm(normalize(vWorld) * (uScale * 1.4) + vec3(uTime * uCloudSpeed, 0.0, 0.0));
  clouds = smoothstep(0.48, 0.72, clouds) * uCloudAmt;
  surface = mix(surface, uCloud, clouds);

  vec3 L = normalize(vec3(0.45, 0.82, 0.35));
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  float lit = mix(0.42, 1.0, smoothstep(0.0, 0.78, ndl));
  vec3 viewDir = normalize(vView);
  vec3 halfDir = normalize(L + viewDir);
  float sheen = pow(clamp(dot(n, halfDir), 0.0, 1.0), 16.0) * uGloss * 0.18;
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.1);
  vec3 color = surface * lit + surface * sheen + uAtmo * fres * 0.32;
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
  float bands = sin(r * 46.0 + uSeed * 3.0) * 0.5 + 0.5;
  float gap = smoothstep(0.38, 0.46, r) * (1.0 - smoothstep(0.54, 0.62, r));
  float alpha = (0.22 + bands * 0.62) * (1.0 - gap * 0.8);
  alpha *= smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.86, r);
  gl_FragColor = vec4(uColor, alpha);
}
`
