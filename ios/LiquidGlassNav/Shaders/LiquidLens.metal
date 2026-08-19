//
//  LiquidLens.metal
//  Optical "liquid glass" lens for the Telegram-style bottom navigation.
//
//  The entire navigation scene (background, content, floating island, icons,
//  labels, profile button) is rasterized into `sceneTex`. This shader draws a
//  full-screen triangle and passes that texture through 1:1 everywhere except
//  inside the lens silhouette, where it performs real optical work:
//
//    1. magnification  - UV contracted toward the lens centre
//    2. refraction     - displacement along the SDF gradient (surface normal),
//                        weighted by a spherical height profile so bending is
//                        concentrated near the rim
//    3. dispersion     - R/G/B sampled with different displacements plus a
//                        velocity-driven directional term (cyan on one edge,
//                        red/orange on the other)
//    4. shading        - Fresnel rim, directional edge light, specular top
//                        highlight and a dark refracted lower lip
//
#include <metal_stdlib>
using namespace metal;

struct LensUniforms {
    float2 resolution;   // drawable size in device pixels
    float2 center;       // lens centre, y-down device pixels
    float2 half;         // lens half extents, device pixels
    float2 chromaDir;    // directional dispersion axis
    float  radius;       // corner radius, device pixels
    float  magnification;
    float  refraction;   // 0..1
    float  chroma;       // 0..1
    float  alpha;        // lens presence (fades out onto the profile button)
    float  lift;         // 0 = resting, 1 = fully lifted
};

struct VSOut {
    float4 position [[position]];
};

vertex VSOut lensVertex(uint vid [[vertex_id]]) {
    // full-screen triangle, no vertex buffer
    float2 p = float2((vid << 1) & 2, vid & 2);
    VSOut out;
    out.position = float4(p * 2.0 - 1.0, 0.0, 1.0);
    return out;
}

static inline float sdRoundBox(float2 p, float2 b, float r) {
    r = min(r, min(b.x, b.y));
    float2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

static inline float lensSDF(float2 sp, constant LensUniforms &u) {
    return sdRoundBox(sp - u.center, u.half, u.radius);
}

static inline float3 samplePx(texture2d<float> tex, sampler s, float2 sp, float2 res) {
    float2 uv = clamp(sp / res, float2(0.0005), float2(0.9995));
    return tex.sample(s, uv).rgb;
}

fragment float4 lensFragment(VSOut in [[stage_in]],
                             texture2d<float> sceneTex [[texture(0)]],
                             constant LensUniforms &u [[buffer(0)]]) {
    constexpr sampler smp(filter::linear, mip_filter::none, address::clamp_to_edge);

    // Metal's fragment coordinates are already y-down, matching the scene raster.
    float2 sp = in.position.xy;
    float3 base = samplePx(sceneTex, smp, sp, u.resolution);

    if (u.alpha <= 0.001) { return float4(base, 1.0); }

    float d  = lensSDF(sp, u);
    float aa = 1.0 - smoothstep(-1.2, 1.2, d);
    if (aa <= 0.001) { return float4(base, 1.0); }

    // SDF gradient == outward surface normal of the glass silhouette
    const float e = 1.0;
    float2 n = normalize(float2(
        lensSDF(sp + float2(e, 0.0), u) - lensSDF(sp - float2(e, 0.0), u),
        lensSDF(sp + float2(0.0, e), u) - lensSDF(sp - float2(0.0, e), u)
    ) + 1e-6);

    float minHalf   = min(u.half.x, u.half.y);
    float thickness = minHalf * 0.58;
    float t = clamp(-d / thickness, 0.0, 1.0);       // 0 at rim, 1 at core

    // spherical glass height profile
    float k     = 1.0 - t;
    float bulge = 1.0 - sqrt(max(0.0, 1.0 - k * k));

    // 1) magnification
    float mag = mix(u.magnification, u.magnification * 1.06, bulge);
    float2 magPos = u.center + (sp - u.center) / mag;

    // 2) refraction
    float disp = bulge * u.refraction * minHalf * 0.62;

    // 3) chromatic dispersion (radial + directional)
    float ch = u.chroma * bulge * minHalf * 0.085 * (1.0 + u.lift * 0.6);
    float2 dir = u.chromaDir;

    float2 pR = magPos - n * (disp + ch) + dir * ch * 1.15;
    float2 pG = magPos - n * disp;
    float2 pB = magPos - n * (disp - ch) - dir * ch * 1.15;

    float3 col = float3(samplePx(sceneTex, smp, pR, u.resolution).r,
                        samplePx(sceneTex, smp, pG, u.resolution).g,
                        samplePx(sceneTex, smp, pB, u.resolution).b);

    // crystal body: subtle luminance lift, never a milky overlay
    col *= 1.028;
    col += float3(0.008, 0.011, 0.020) * (1.0 - bulge);

    // 4a) Fresnel rim
    float fres = pow(bulge, 2.6);
    col += float3(0.45, 0.62, 1.0) * fres * 0.10;

    // 4b) directional edge lighting (key light upper-left)
    float2 L = normalize(float2(-0.42, -1.0));
    float lambert = max(dot(-n, L), 0.0);
    col += float3(0.88, 0.94, 1.0) * pow(lambert, 2.4) * fres * 0.20;

    // 4c) specular highlight along the upper edge
    float upper = max(dot(n, float2(0.0, -1.0)), 0.0);
    float band  = smoothstep(0.55, 1.0, bulge);
    float hl    = pow(upper, 5.0) * smoothstep(0.72, 1.0, bulge);
    col += float3(1.0) * hl * (0.38 + u.lift * 0.22);

    // dark refracted lip on the lower edge (glass thickness)
    float lower = max(dot(n, float2(0.0, 1.0)), 0.0);
    col -= float3(0.10, 0.11, 0.14) * pow(lower, 3.0) * band * 0.55;

    return float4(mix(base, col, aa * u.alpha), 1.0);
}
