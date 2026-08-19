export const VERT = `#version 300 es
precision highp float;
void main() {
  // full-screen triangle
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Optical lens fragment shader.
 *
 * The whole navigation content lives in uTex (offscreen render target).
 * Outside the lens SDF the texture is passed through 1:1 - the underlying
 * content is never scaled. Inside the lens we:
 *   1. magnify   -> uv is contracted toward the lens centre
 *   2. refract   -> displaced along the SDF gradient, weighted by a spherical
 *                   height profile so the bending is edge-dependent
 *   3. disperse  -> R/G/B sampled with different displacement magnitudes plus
 *                   a directional term (motion driven) => cyan one side,
 *                   red/orange the other
 *   4. shade     -> Fresnel rim, directional edge light, thin top highlight
 */
export const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform vec2  uRes;        // device pixels
uniform vec2  uCenter;     // lens centre, y-down device px
uniform vec2  uHalf;       // lens half extents, device px
uniform float uRadius;     // corner radius, device px
uniform float uMag;        // magnification inside the lens
uniform float uRefract;    // edge refraction strength (0..1)
uniform float uChroma;     // dispersion strength (0..1)
uniform vec2  uChromaDir;  // directional dispersion axis
uniform float uAlpha;      // lens presence (profile fade)
uniform float uLift;       // 0 = resting, 1 = fully lifted

out vec4 frag;

float sdRoundBox(vec2 p, vec2 b, float r) {
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float lensSDF(vec2 sp) {
  return sdRoundBox(sp - uCenter, uHalf, uRadius);
}

vec3 samplePx(vec2 sp) {
  vec2 uv = clamp(sp / uRes, vec2(0.0005), vec2(0.9995));
  return texture(uTex, uv).rgb;
}

void main() {
  // y-down screen pixel coordinate, matching the 2D scene canvas
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 base = samplePx(sp);

  if (uAlpha <= 0.001) { frag = vec4(base, 1.0); return; }

  float d = lensSDF(sp);
  float aa = 1.0 - smoothstep(-1.2, 1.2, d);
  if (aa <= 0.001) { frag = vec4(base, 1.0); return; }

  // SDF gradient = outward surface normal of the lens silhouette
  float e = 1.0;
  vec2 n = normalize(vec2(
    lensSDF(sp + vec2(e, 0.0)) - lensSDF(sp - vec2(e, 0.0)),
    lensSDF(sp + vec2(0.0, e)) - lensSDF(sp - vec2(0.0, e))
  ) + 1e-6);

  float minHalf = min(uHalf.x, uHalf.y);
  float thickness = minHalf * 0.58;
  float t = clamp(-d / thickness, 0.0, 1.0);      // 0 at rim, 1 at core

  // spherical glass height profile -> bending concentrated near the rim
  float k = 1.0 - t;
  float bulge = 1.0 - sqrt(max(0.0, 1.0 - k * k));

  // 1) magnification (only inside the lens)
  float mag = mix(uMag, uMag * 1.06, bulge);
  vec2 magPos = uCenter + (sp - uCenter) / mag;

  // 2) refraction: push samples inward along the normal, edge-weighted
  float disp = bulge * uRefract * minHalf * 0.62;

  // 3) chromatic dispersion (radial + directional)
  float ch = uChroma * bulge * minHalf * 0.085 * (1.0 + uLift * 0.6);
  vec2 dir = uChromaDir;

  vec2 pR = magPos - n * (disp + ch) + dir * ch * 1.15;
  vec2 pG = magPos - n * disp;
  vec2 pB = magPos - n * (disp - ch) - dir * ch * 1.15;

  vec3 col = vec3(samplePx(pR).r, samplePx(pG).g, samplePx(pB).b);

  // crystal body: slight lift in luminance, no milky overlay
  col *= 1.028;
  col += vec3(0.008, 0.011, 0.020) * (1.0 - bulge);

  // 4a) Fresnel rim (inner glow along the whole silhouette)
  float fres = pow(bulge, 2.6);
  col += vec3(0.45, 0.62, 1.0) * fres * 0.10;

  // 4b) directional edge lighting (light from upper-left)
  vec2 L = normalize(vec2(-0.42, -1.0));
  float lambert = max(dot(-n, L), 0.0);
  col += vec3(0.88, 0.94, 1.0) * pow(lambert, 2.4) * fres * 0.20;

  // 4c) thin bright optical highlight along the upper edge
  float upper = max(dot(n, vec2(0.0, -1.0)), 0.0);
  float band = smoothstep(0.55, 1.0, bulge);
  float hl = pow(upper, 5.0) * smoothstep(0.72, 1.0, bulge);
  col += vec3(1.0, 1.0, 1.0) * hl * (0.38 + uLift * 0.22);

  // faint dark refracted lip on the lower edge (glass thickness)
  float lower = max(dot(n, vec2(0.0, 1.0)), 0.0);
  col -= vec3(0.10, 0.11, 0.14) * pow(lower, 3.0) * band * 0.55;

  frag = vec4(mix(base, col, aa * uAlpha), 1.0);
}`;
