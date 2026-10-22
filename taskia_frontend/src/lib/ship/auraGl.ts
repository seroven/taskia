/**
 * Prototipo: auras con shaders. Un solo canvas WebGL2 y un solo contexto para todas las naves (los navegadores
 * aguantan ~10-16 contextos); cada aura es un rectángulo con un fragment shader de ruido fractal.
 */

export const GL_KINDS = ['nebula', 'fire', 'aurora', 'galaxy', 'plasma', 'portal', 'comets', 'sparks', 'ring', 'halo', 'fireflies', 'blackhole', 'nova', 'storm'] as const
export type GlKind = (typeof GL_KINDS)[number]

export interface GlItem {
  kind: GlKind
  /** Rectángulo de la nave en píxeles de la ventana. */
  rect: { left: number; top: number; width: number; height: number }
  a: [number, number, number]
  b: [number, number, number]
  c: [number, number, number]
  seed: number
}

/** El rectángulo del aura es más ancho y alto que la nave. */
const SCALE_X = 1.5
const SCALE_Y = 1.15

const VERTEX = `#version 300 es
in vec2 aPos;
uniform vec4 uRect;
uniform vec2 uRes;
out vec2 vUv;
void main() {
  vUv = aPos;
  vec2 px = uRect.xy + aPos * uRect.zw;
  vec2 clip = px / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uTime;
uniform float uSeed;
uniform float uAspect;
uniform int uKind;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uLight;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return s;
}

float stars(vec2 p, float t, float density) {
  vec2 g = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = hash(g);
  float s = step(1.0 - density, h);
  return s * smoothstep(0.28, 0.0, length(f)) * (0.55 + 0.45 * sin(t * 2.0 + h * 40.0));
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.y = -p.y * uAspect;
  float t = uTime;
  vec3 col = vec3(0.0);
  float a = 0.0;

  if (uKind == 0) {
    // Nebulosa: ruido fractal deformado dos veces (domain warping), con estrellas dentro.
    vec2 q = p * 1.3 + uSeed;
    vec2 w = vec2(fbm(q + vec2(0.0, t * 0.04)), fbm(q + vec2(5.2, 1.3) - vec2(t * 0.03, 0.0)));
    float r = fbm(q * 1.2 + 3.0 * w + t * 0.02);
    float fall = 1.0 - smoothstep(0.25, 1.0, length(p * vec2(1.0, 1.35)));
    float d = smoothstep(0.3, 0.85, r) * fall;
    vec3 c = mix(uA, uB, smoothstep(0.3, 0.8, r));
    c = mix(c, uC, smoothstep(0.2, 0.9, length(w) - 0.2) * 0.6);
    float s = stars(p * 16.0 + uSeed, t, 0.03) * fall;
    col = c * d * 1.5 + vec3(s);
    a = clamp(d * 1.2 + s, 0.0, 1.0);
  } else if (uKind == 1) {
    // Fuego: llama que sube, ancha abajo y fina arriba, con dos capas de ruido que fluyen hacia arriba.
    vec2 f = vec2(p.x * 1.15, p.y + 0.3);
    float h = clamp(f.y / 0.95, 0.0, 1.0);
    float width = mix(0.8, 0.1, pow(h, 0.75));
    float shape = smoothstep(width, 0.0, abs(f.x));
    float n = fbm(vec2(f.x * 3.0, f.y * 2.2 - t * 1.5) + uSeed);
    float n2 = fbm(vec2(f.x * 6.0 + 3.0, f.y * 4.0 - t * 2.4));
    float inten = shape * (n * 1.15 + n2 * 0.45 - h * 0.95) * 1.7;
    inten = clamp(inten, 0.0, 1.5) * smoothstep(-0.15, 0.12, f.y);
    vec3 c = inten < 0.5 ? mix(uC, uB, inten * 2.0) : mix(uB, uA, (inten - 0.5) * 2.0);
    c = mix(c, vec3(1.0, 0.96, 0.82), smoothstep(1.0, 1.5, inten));
    float glow = exp(-length(vec2(p.x * 1.1, (p.y + 0.1) * 1.6)) * 2.4) * 0.35;
    col = c * inten + uB * glow;
    a = clamp(inten + glow, 0.0, 1.0);
  } else if (uKind == 2) {
    // Aurora: tres cortinas onduladas con vetas verticales y el color subiendo por la altura.
    float amp = 0.0;
    vec3 c = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float base = 0.02 + 0.1 * fi + 0.12 * sin(p.x * 2.5 + t * 0.3 + fi * 2.1) + 0.12 * (fbm(vec2(p.x * 1.5 + fi * 3.0, t * 0.1)) - 0.5);
      float dy = p.y - base;
      float rib = smoothstep(-0.06, 0.14, dy) * exp(-max(dy, 0.0) * 3.0);
      float streak = 0.45 + 0.75 * noise(vec2(p.x * 24.0 + fi * 9.0, t * 0.3 + fi));
      float k = rib * streak * (0.55 + 0.45 * sin(p.x * 3.0 + t * 0.6 + fi));
      vec3 cc = mix(uA, uB, smoothstep(0.0, 0.5, dy));
      cc = mix(cc, uC, smoothstep(0.35, 0.85, dy));
      c += cc * k;
      amp += k;
    }
    float edge = smoothstep(1.0, 0.5, abs(p.x));
    col = c * edge;
    a = clamp(amp * edge, 0.0, 1.0);
  } else if (uKind == 3) {
    // Galaxia: dos brazos en espiral logarítmica, polvo de ruido, núcleo y estrellas.
    vec2 q = vec2(p.x, p.y / 0.42);
    float r = length(q);
    float ang = atan(q.y, q.x);
    float spiral = ang - 3.2 * log(r + 0.06) + t * 0.05;
    float arm = pow(0.5 + 0.5 * cos(2.0 * spiral), 2.2);
    float dust = fbm(q * 5.0 + uSeed);
    float body = smoothstep(0.04, 0.25, r) * (1.0 - smoothstep(0.45, 0.95, r));
    float core = exp(-r * r * 30.0);
    float d = arm * (0.4 + 1.1 * dust) * body * 1.3 + core;
    vec3 c = mix(uC, uA, smoothstep(0.1, 0.7, r));
    c = mix(vec3(1.0), c, smoothstep(0.0, 0.35, r));
    float s = stars(p * 20.0 + uSeed, t, 0.025) * (1.0 - smoothstep(0.5, 1.0, length(q)));
    col = c * d + vec3(s);
    a = clamp(d + s, 0.0, 1.0);
  } else if (uKind == 4) {
    // Energía: arcos eléctricos donde el ruido cruza el 0.5, en dos escalas.
    float r = length(p * vec2(1.0, 1.5));
    float n = fbm(p * 3.0 + vec2(0.0, t * 0.4) + uSeed);
    float arc = pow(1.0 - abs(n * 2.0 - 1.0), 10.0);
    float n2 = fbm(p * 5.0 - vec2(t * 0.5, 0.0) + 7.0);
    arc += pow(1.0 - abs(n2 * 2.0 - 1.0), 12.0) * 0.7;
    float fall = 1.0 - smoothstep(0.3, 0.95, r);
    float glow = exp(-r * 2.2) * 0.5;
    col = (mix(uB, uA, clamp(arc, 0.0, 1.0)) * arc * 1.6 + uB * glow) * fall;
    a = clamp((arc + glow) * fall, 0.0, 1.0);
  } else if (uKind == 5) {
    // Portal: un disco de acreción inclinado, más brillante por un lado, con remolino de ruido.
    vec2 q = vec2(p.x, p.y / 0.4);
    float r = length(q);
    float ang = atan(q.y, q.x);
    float ring = exp(-pow((r - 0.62) / 0.05, 2.0));
    float swirl = fbm(vec2(ang * 2.0 + t * 0.5, r * 8.0 - t * 0.8) + uSeed);
    float dop = 0.55 + 0.45 * cos(ang - 0.6);
    float disk = smoothstep(0.34, 0.6, r) * (1.0 - smoothstep(0.62, 0.92, r)) * swirl * dop * 1.6;
    float halo = exp(-pow((r - 0.62) / 0.2, 2.0)) * 0.35;
    vec3 c = mix(uB, uA, clamp(swirl * dop, 0.0, 1.0));
    col = c * (disk + halo) + mix(uA, vec3(1.0), 0.6) * ring * dop;
    a = clamp(disk + halo + ring * dop, 0.0, 1.0);
  } else if (uKind == 6) {
    // Lluvia de cometas: siete cometas con cabeza brillante y cola granulada que cruzan en diagonal, sobre una banda de polvo.
    vec2 d = normalize(vec2(1.0, -0.52));
    vec2 n = vec2(-d.y, d.x);
    float tail = 0.0;
    vec3 c = vec3(0.0);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float h = hash(vec2(fi, 3.7 + uSeed));
      float speed = 0.16 + 0.1 * hash(vec2(fi, 9.1));
      float ph = fract(t * speed + h * 7.0);
      vec2 origin = n * (-0.62 + 0.24 * fi + 0.1 * (h - 0.5));
      vec2 pos = origin + d * (ph * 3.0 - 1.5);
      vec2 u = p - pos;
      float along = dot(u, d);
      float across = dot(u, n);
      float env = smoothstep(0.0, 0.12, ph) * smoothstep(1.0, 0.8, ph);
      float width = 0.007 + 0.009 * hash(vec2(fi, 1.3));
      float body = exp(-pow(across / (width * (1.0 + max(-along, 0.0) * 5.0)), 2.0));
      float len = 0.28 + 0.2 * h;
      float k = along < 0.0 ? exp(along / len) : 0.0;
      float grain = 0.6 + 0.8 * noise(vec2(along * 70.0, across * 70.0 + fi * 11.0));
      float head = exp(-dot(u, u) / 0.0011);
      float glow = exp(-dot(u, u) / 0.012) * 0.45;
      float piece = (body * k * grain + head + glow) * env;
      vec3 cc = mix(uA, uB, smoothstep(0.0, 0.8, -along / len));
      c += mix(cc, vec3(1.0), head) * piece;
      tail += piece;
    }
    float band = exp(-pow(dot(p, n) / 0.2, 2.0)) * (0.3 + 0.9 * fbm(vec2(dot(p, d) * 3.0 + t * 0.05, dot(p, n) * 6.0) + uSeed));
    float fall = 1.0 - smoothstep(0.5, 1.0, abs(p.x));
    float s = stars(p * 18.0 + uSeed, t, 0.03) * fall;
    col = c + uC * band * 0.4 * fall + vec3(s);
    a = clamp(tail + band * 0.3 * fall + s, 0.0, 1.0);
  } else if (uKind == 7) {
    // Chispas: brasas de tamaños distintos que suben con vaivén, en tres capas con rejillas giradas para que no se note el patrón.
    vec3 c = vec3(0.0);
    float amt = 0.0;
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float ca = 0.6 * fl + 0.3;
      vec2 r = mat2(cos(ca), -sin(ca), sin(ca), cos(ca)) * p;
      vec2 q = r * vec2(3.2, 2.4) * (1.0 + fl * 0.8);
      q.y -= t * (0.35 + fl * 0.28);
      vec2 id = floor(q);
      vec2 f = fract(q) - 0.5;
      float h = hash(id + fl * 17.0);
      f.x += (hash(id + 7.0) - 0.5) * 0.3 + sin(t * 1.3 + h * 6.28) * 0.08;
      f.y += (hash(id + 13.0) - 0.5) * 0.3;
      float size = 0.06 + 0.08 * hash(id + 29.0);
      float dd = length(f * vec2(1.0, 0.62));
      float live = step(0.48, hash(id + 3.0));
      float spark = smoothstep(size, 0.0, dd) * live;
      float halo = exp(-dd * dd / (size * size * 2.2)) * live * 0.6;
      float tw = 0.6 + 0.4 * sin(t * 5.0 + h * 40.0);
      float fade = smoothstep(0.95, 0.12, length(p * vec2(1.0, 1.5)));
      vec3 cc = mix(uA, uB, h);
      c += (mix(cc, vec3(1.0), spark * 0.7) * spark + cc * halo) * tw * fade * 3.2;
      amt += (spark + halo) * tw * fade;
    }
    float glow = exp(-length(p * vec2(1.0, 1.7)) * 2.6) * 0.28;
    col = c + uB * glow;
    a = clamp(amt + glow, 0.0, 1.0);
  } else if (uKind == 8) {
    // Anillo de energía: dos órbitas inclinadas con un cometa que gira, un aro de marcas y un resplandor.
    float TAU = 6.2831853;
    vec2 q = p;
    q = mat2(cos(-0.12), -sin(-0.12), sin(-0.12), cos(-0.12)) * q;
    q.y /= 0.38;
    float r = length(q);
    float ang = atan(q.y, q.x);
    float amt = 0.0;
    vec3 c = vec3(0.0);
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float R = 0.55 + 0.19 * fi;
      float line = exp(-pow((r - R) / (0.011 + 0.004 * fi), 2.0));
      float dirn = fi < 0.5 ? 1.0 : -1.0;
      float head = t * (0.55 - 0.18 * fi) * dirn;
      float trail = pow(1.0 - fract((head - ang * dirn) / TAU), 4.0);
      float energy = 0.7 + 0.6 * fbm(vec2(ang * 3.0 + t * 0.6, fi * 4.0 + uSeed));
      float arc = line * (0.22 + 1.2 * trail * energy);
      float headGlow = exp(-pow((r - R) / 0.03, 2.0)) * exp(-pow(fract((head - ang * dirn) / TAU) * 40.0, 2.0)) * 1.6;
      vec3 cc = fi < 0.5 ? uA : uB;
      c += mix(cc, vec3(1.0), headGlow * 0.6) * (arc + headGlow);
      amt += arc + headGlow;
    }
    float ticks = step(0.62, fract((ang + t * 0.05) * 22.0 / TAU)) * exp(-pow((r - 0.95) / 0.012, 2.0)) * 0.55;
    float glow = exp(-pow((r - 0.66) / 0.3, 2.0)) * 0.22;
    col = c + uA * ticks + uC * glow;
    a = clamp(amt + ticks + glow, 0.0, 1.0);
  } else if (uKind == 9) {
    // Halo: un aro de luz que respira, con un brillo ondulante en el borde.
    float r = length(p * vec2(1.0, 1.5));
    float ang = atan(p.y * 1.5, p.x);
    float breathe = 0.9 + 0.1 * sin(t * 1.2);
    float core = exp(-pow(r / (0.55 * breathe), 2.0));
    float shimmer = 0.75 + 0.5 * fbm(vec2(ang * 2.5 + t * 0.2, t * 0.25) + uSeed);
    float rim = exp(-pow((r - 0.66 * breathe) / 0.07, 2.0)) * shimmer;
    float outer = exp(-pow((r - 0.82 * breathe) / 0.16, 2.0)) * 0.35;
    col = uB * core * 0.55 + uA * rim + uC * outer;
    a = clamp(core * 0.5 + rim + outer, 0.0, 1.0);
  } else if (uKind == 10) {
    // Luciérnagas: dieciocho puntos de luz que vagan despacio y parpadean cada uno a su ritmo.
    vec3 c = vec3(0.0);
    float amt = 0.0;
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float h1 = hash(vec2(fi, 1.7 + uSeed));
      float h2 = hash(vec2(fi, 8.3));
      float h3 = hash(vec2(fi, 4.1));
      vec2 pos = vec2(
        sin(t * (0.2 + 0.25 * h1) + fi * 2.4) * (0.35 + 0.5 * h2),
        cos(t * (0.17 + 0.2 * h2) + fi * 1.7) * (0.18 + 0.4 * h3) + 0.05 * sin(t + fi)
      );
      vec2 u = p - pos;
      float d2 = dot(u, u);
      float blink = 0.25 + 0.75 * smoothstep(0.1, 1.0, sin(t * (0.8 + h3) + fi * 5.0));
      float core = exp(-d2 / 0.0007);
      float glow = exp(-d2 / 0.012) * 0.45;
      vec3 cc = mix(uA, uB, h1);
      c += (mix(cc, vec3(1.0), core * 0.7) * core * 1.4 + cc * glow) * blink;
      amt += (core + glow) * blink;
    }
    col = c;
    a = clamp(amt, 0.0, 1.0);
  } else if (uKind == 11) {
    // Singularidad: estrellas deformadas por la lente, anillo fotónico, disco con efecto Doppler y su cara trasera curvada por encima.
    float r = length(p);
    vec2 w = p * (1.0 + 0.2 / (r * r + 0.07));
    float s = stars(w * 15.0 + uSeed, t, 0.05) * smoothstep(0.25, 0.6, r) * (1.0 - smoothstep(0.7, 1.0, r));
    vec2 dq = vec2(p.x, p.y / 0.26);
    float dr = length(dq);
    float da = atan(dq.y, dq.x);
    float band = smoothstep(0.36, 0.48, dr) * (1.0 - smoothstep(0.52, 0.98, dr));
    float streak = 0.35 + 0.95 * fbm(vec2(da * 4.0 + t * 0.8 / (dr * dr + 0.12), dr * 10.0) + uSeed);
    float dop = 0.4 + 0.6 * cos(da - 0.4);
    float disk = band * streak * dop * 1.9;
    float halo = exp(-pow((r - 0.4) / 0.04, 2.0)) * (0.55 + 0.45 * smoothstep(-0.15, 0.4, p.y)) * (0.7 + 0.5 * fbm(vec2(atan(p.y, p.x) * 3.0 + t * 0.4, 2.0)));
    float photon = exp(-pow((r - 0.345) / 0.007, 2.0)) * 0.9 * (0.5 + 0.5 * smoothstep(-0.4, 0.5, p.x));
    vec3 hot = mix(uB, uA, clamp(streak * dop, 0.0, 1.0));
    col = hot * (disk + halo * 0.9) + uA * photon + uC * exp(-pow((r - 0.5) / 0.3, 2.0)) * 0.16 + vec3(s);
    a = clamp(disk + halo + photon + s + 0.1 * exp(-r * 2.0), 0.0, 1.0);
  } else if (uKind == 12) {
    // Nova: núcleo, rayos gruesos y finos que giran, ondas de choque, corona de plasma y destello en cruz.
    float r = length(p * vec2(1.0, 1.3));
    float ang = atan(p.y * 1.3, p.x);
    float core = exp(-r * r * 16.0);
    float rays = pow(0.5 + 0.5 * sin(ang * 14.0 + t * 0.25), 7.0) * (0.45 + 0.9 * fbm(vec2(ang * 5.0, t * 0.2) + uSeed));
    float fine = pow(0.5 + 0.5 * sin(ang * 41.0 - t * 0.4), 14.0) * 0.6 * fbm(vec2(ang * 9.0, 3.0 + t * 0.1));
    float rayFall = exp(-r * 1.9);
    float corona = fbm(p * vec2(3.5, 4.5) + vec2(t * 0.15, -t * 0.25) + uSeed) * exp(-r * 2.6);
    float shock = 0.0;
    for (int i = 0; i < 2; i++) {
      float ph = fract(t * 0.22 + float(i) * 0.5);
      shock += exp(-pow((ph * 1.05 - r) / (0.018 + 0.03 * ph), 2.0)) * (1.0 - ph) * (1.0 - ph);
    }
    float flare = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 2.2) * 0.75 + exp(-abs(p.x) * 34.0) * exp(-abs(p.y) * 2.6) * 0.45;
    col = mix(uA, vec3(1.0), core) * core * 1.6 + uB * (rays + fine) * rayFall * 1.3 + uC * corona * 1.5 + uA * shock * 1.1 + uA * flare;
    a = clamp(core + (rays + fine) * rayFall + corona + shock + flare, 0.0, 1.0);
  } else {
    // Tormenta: nubes que se iluminan desde dentro con cada rayo, que se ramifica y cae en un sitio distinto cada vez.
    float cell = floor(t * 0.55);
    float local = fract(t * 0.55);
    float on = step(0.4, hash(vec2(cell, uSeed + 2.0)));
    float flash = on * exp(-local * 6.0) * (0.65 + 0.35 * sin(local * 55.0));
    float fx = (hash(vec2(cell, 5.0)) - 0.5) * 1.3;
    float y = p.y;
    float bx = fx + (fbm(vec2(y * 5.0, cell)) - 0.5) * 0.45 + (noise(vec2(y * 22.0, cell)) - 0.5) * 0.07;
    float within = smoothstep(0.78, 0.6, y) * smoothstep(-0.75, -0.5, y);
    float bolt = exp(-pow((p.x - bx) / 0.011, 2.0)) * within * flash;
    float bx2 = bx + (fbm(vec2(y * 9.0, cell + 4.0)) - 0.5) * 0.4 + 0.1 * (0.3 - y);
    float branch = exp(-pow((p.x - bx2) / 0.008, 2.0)) * smoothstep(0.35, 0.1, y) * smoothstep(-0.6, -0.3, y) * flash * 0.7;
    float near = exp(-pow((p.x - bx) / 0.28, 2.0)) * flash;
    float cloud = fbm(p * vec2(2.4, 3.0) + vec2(t * 0.06, 0.0) + uSeed);
    float dens = smoothstep(0.38, 0.8, cloud) * (1.0 - smoothstep(0.5, 1.0, length(p * vec2(0.9, 1.25))));
    vec3 dark = mix(uA * 0.6, uB * 0.8, cloud);
    vec3 cl = dark + dark * uC * (0.15 + 2.4 * near) * 1.5 + uC * near * 0.5;
    col = cl * dens + uC * (bolt + branch) * 1.8 + vec3(1.0) * bolt * 0.6;
    a = clamp(dens * 0.85 + bolt + branch + near * 0.2, 0.0, 1.0);
  }

  // Sobre fondo claro la luz no se ve: el blanco desaparece y los tonos pálidos se lavan. Se pasa de «luz» a «pigmento»:
  // lo casi blanco toma el color del cuerpo y todo se hace más hondo y saturado, algo más opaco.
  if (uLight > 0.5) {
    vec3 u = clamp(col / max(a, 0.001), 0.0, 1.0);
    float lum = dot(u, vec3(0.299, 0.587, 0.114));
    vec3 body = mix(uB, uA, 0.3) * 0.82;
    u = mix(u, body, smoothstep(0.7, 1.0, lum));
    float g = dot(u, vec3(0.299, 0.587, 0.114));
    u = mix(vec3(g), u, 1.3);
    u = pow(clamp(u, 0.0, 1.0), vec3(1.55));
    // El velo casi invisible se corta: sobre blanco se notaría como una caja tenue.
    a = clamp(a * 1.15, 0.0, 1.0) * smoothstep(0.03, 0.14, a);
    col = u * a;
  }

  // Fundido en los bordes del rectángulo, para que nunca se vea su caja.
  float edgeFade = smoothstep(1.0, 0.7, abs(p.x)) * smoothstep(uAspect, uAspect * 0.55, abs(p.y));
  o = vec4(col * edgeFade, a * edgeFade);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
  return shader
}

export interface AuraGl {
  /** Fondo claro (tema de día): las auras se dibujan con tonos más hondos para que se vean. */
  setLight(light: boolean): void
  draw(items: GlItem[], time: number): void
  resize(width: number, height: number, dpr: number): void
  dispose(): void
}

/** Crea el renderizador sobre un canvas, o `null` si el navegador no ofrece WebGL2. */
export function createAuraGl(canvas: HTMLCanvasElement): AuraGl | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null
  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'program')
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(program, name)
  const uRect = u('uRect')
  const uRes = u('uRes')
  const uTime = u('uTime')
  const uSeed = u('uSeed')
  const uAspect = u('uAspect')
  const uKind = u('uKind')
  const uA = u('uA')
  const uB = u('uB')
  const uC = u('uC')
  const uLight = u('uLight')
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  let light = 0
  let cssW = 1
  let cssH = 1
  return {
    resize(width, height, dpr) {
      cssW = width
      cssH = height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    draw(items, time) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes, cssW, cssH)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uLight, light)
      for (const item of items) {
        const w = item.rect.width * SCALE_X
        const h = item.rect.width * SCALE_Y
        const cx = item.rect.left + item.rect.width / 2
        const cy = item.rect.top + item.rect.height / 2
        if (cx + w / 2 < 0 || cx - w / 2 > cssW || cy + h / 2 < 0 || cy - h / 2 > cssH) continue
        gl.uniform4f(uRect, cx - w / 2, cy - h / 2, w, h)
        gl.uniform1f(uSeed, item.seed)
        gl.uniform1f(uAspect, h / w)
        gl.uniform1i(uKind, GL_KINDS.indexOf(item.kind))
        gl.uniform3fv(uA, item.a)
        gl.uniform3fv(uB, item.b)
        gl.uniform3fv(uC, item.c)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    },
    setLight(next) {
      light = next ? 1 : 0
    },
    dispose() {
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    },
  }
}

type Rgb = [number, number, number]
const hex = (value: string): Rgb => {
  const n = parseInt(value.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Nombre y colores de cada aura: (a) luz principal, (b) cuerpo, (c) sombra o borde. */
export const AURA_LOOK: Record<GlKind, { label: string; a: Rgb; b: Rgb; c: Rgb }> = {
  nebula: { label: 'Nebulosa', a: hex('#ff7ad9'), b: hex('#5b6bff'), c: hex('#22e0d0') },
  fire: { label: 'Fuego', a: hex('#ffd23f'), b: hex('#ff6a1a'), c: hex('#b3122a') },
  aurora: { label: 'Aurora', a: hex('#4dffb4'), b: hex('#38d6ff'), c: hex('#b48cff') },
  galaxy: { label: 'Galaxia', a: hex('#9fd0ff'), b: hex('#ffd9a0'), c: hex('#c47bff') },
  plasma: { label: 'Energía', a: hex('#e6f7ff'), b: hex('#3aa0ff'), c: hex('#7a5cff') },
  portal: { label: 'Portal', a: hex('#ffb347'), b: hex('#ff4d6d'), c: hex('#6a4cff') },
  comets: { label: 'Lluvia de cometas', a: hex('#ffe9a8'), b: hex('#6fb3ff'), c: hex('#a98bff') },
  sparks: { label: 'Chispas', a: hex('#ffe27a'), b: hex('#ff8a3d'), c: hex('#ff5e3a') },
  ring: { label: 'Anillo de energía', a: hex('#d6f6ff'), b: hex('#35c8ff'), c: hex('#7c5cff') },
  halo: { label: 'Halo', a: hex('#ffd6a5'), b: hex('#ff9f6b'), c: hex('#ffb3d9') },
  fireflies: { label: 'Luciérnagas', a: hex('#d9ff7a'), b: hex('#7dffb3'), c: hex('#ffffff') },
  blackhole: { label: 'Singularidad', a: hex('#ffffff'), b: hex('#6fb8ff'), c: hex('#8a5cff') },
  nova: { label: 'Nova', a: hex('#fff4c2'), b: hex('#ffb347'), c: hex('#ff5e8a') },
  storm: { label: 'Tormenta', a: hex('#3d3a66'), b: hex('#5f6aa8'), c: hex('#bfe9ff') },
}
