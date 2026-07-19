// Ashima / Ian McEwan simplex noise (webgl-noise, MIT)
const simplexNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const curlNoise = /* glsl */ `
vec3 snoiseVec3(vec3 x) {
  return vec3(
    snoise(x),
    snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
    snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
  );
}

// curl of a noise potential field — divergence-free, so particles swirl like smoke
// instead of clumping or scattering
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 x0 = snoiseVec3(p - dx);
  vec3 x1 = snoiseVec3(p + dx);
  vec3 y0 = snoiseVec3(p - dy);
  vec3 y1 = snoiseVec3(p + dy);
  vec3 z0 = snoiseVec3(p - dz);
  vec3 z1 = snoiseVec3(p + dz);
  float x = (y1.z - y0.z) - (z1.y - z0.y);
  float y = (z1.x - z0.x) - (x1.z - x0.z);
  float z = (x1.y - x0.y) - (y1.x - y0.x);
  return normalize(vec3(x, y, z) / (2.0 * e));
}
`;

// Stateless flow: each particle's position is a pure function of (seed, time) —
// a tilted orbit around the core, displaced by curl noise. No FBO ping-pong needed,
// and it never diverges or needs resetting.
// position attribute carries randoms: x = orbit phase, y = spare rand, z = size rand
// aSeed: x = radius jitter, y = stream selector, z = speed rand, w = color mix
export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseAmp;
uniform float uSize;
uniform float uBass;
uniform float uTreble;
uniform float uBeat;

attribute vec4 aSeed;

varying float vColorMix;
varying float vGlow;
varying float vFade;

${simplexNoise}
${curlNoise}

const float TAU = 6.28318530718;

void main() {
  // quantize particles into 8 orbital streams so they read as flowing ribbons,
  // not a uniform shell; curl noise then breaks the ribbons into plasma wisps
  float streamId = floor(aSeed.y * 8.0);
  float sr = fract(sin(streamId * 91.3458) * 47453.5453);
  float radius = mix(1.7, 3.8, sr) + (aSeed.x - 0.5) * 0.7;
  float dir = sr > 0.5 ? 1.0 : -1.0;
  float angle = position.x * TAU + uTime * mix(0.25, 0.6, fract(sr * 3.7)) * dir;

  vec3 p = vec3(cos(angle) * radius, 0.0, sin(angle) * radius);
  float tx = (sr - 0.5) * 2.8;
  float tz = (fract(sr * 7.31) - 0.5) * 2.8;
  p.yz = mat2(cos(tx), -sin(tx), sin(tx), cos(tx)) * p.yz;
  p.xy = mat2(cos(tz), -sin(tz), sin(tz), cos(tz)) * p.xy;

  float amp = uNoiseAmp * (1.0 + uBass * 1.6 + uBeat * 1.2);
  p += curlNoise(p * uNoiseScale + uTime * 0.15) * amp;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = uSize * mix(0.5, 1.6, position.z) * (1.0 + uTreble * 1.2 + uBeat * 0.8);
  gl_PointSize = size * (220.0 / -mv.z);

  vColorMix = aSeed.w;
  vGlow = uBeat;
  vFade = smoothstep(26.0, 6.0, -mv.z);
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorHot;
uniform float uBrightness;

varying float vColorMix;
varying float vGlow;
varying float vFade;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float falloff = max(1.0 - d, 0.0);
  float alpha = pow(falloff, 2.2);
  if (alpha < 0.01) discard;

  vec3 col = mix(uColorA, uColorB, vColorMix);
  col = mix(col, uColorHot, vGlow * 0.6);
  col += uColorHot * pow(falloff, 6.0) * 0.6;

  gl_FragColor = vec4(col * uBrightness * alpha * vFade, alpha);
}
`;
