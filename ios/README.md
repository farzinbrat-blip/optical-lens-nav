# Liquid Glass Navigation — Swift + Metal

A native recreation of the Telegram iOS bottom navigation "liquid glass" lens:
a floating dark-navy rounded island, a separate profile button, and a fully
transparent optical lens that magnifies and refracts whatever sits underneath
it, with chromatic dispersion, spring physics and direct drag control.

No `UIBlurEffect`, no `UIVisualEffectView`, no gradient fakery — the lens is a
real GPU pass that samples an offscreen texture with distorted UVs.

## Build

```bash
brew install xcodegen
cd ios
xcodegen generate
open LiquidGlassNav.xcodeproj
```

Run on a device (the Simulator works but the optical pass looks best at 120 Hz
on ProMotion hardware). iOS 16+, Metal required.

## Architecture

```text
MainViewController                UIKit host + VoiceOver mirror
└── LiquidLensView (MTKView)      frame loop, springs, direct touch handling
    ├── SceneRasterizer           Core Graphics -> MTLTexture (bgra8Unorm)
    │     background / chat rows / island / icons / labels / profile button
    └── LiquidLens.metal          full-screen triangle, optical lens pass
```

Every frame:

1. `SceneRasterizer` supplies the scene texture. It is only re-rasterized when
   layout or selection changes, so the animation itself is pure GPU work.
2. The springs advance with fixed 1/480 s sub-steps.
3. The fragment shader passes the texture through 1:1 outside the lens SDF and
   performs the optical work inside it.

## The optical pass (`Shaders/LiquidLens.metal`)

| Stage | Technique |
| --- | --- |
| Silhouette | Rounded-box SDF, analytic, anti-aliased over ±1.2 px |
| Surface normal | Central-difference gradient of the SDF |
| Height profile | Spherical `1 - sqrt(1 - k²)` so bending concentrates at the rim |
| Magnification | UV contracted toward the lens centre (1.10× rest → 1.30× lifted) |
| Refraction | Displacement along the normal, edge-weighted by the bulge |
| Dispersion | R/G/B sampled at different displacements, plus a velocity-driven directional axis (cyan one edge, red/orange the other) |
| Shading | Fresnel rim, upper-left key light, specular top highlight, dark lower lip |

Content outside the lens is never scaled or tinted — only the region under the
glass is transformed, which is what makes it read as an optical element rather
than an overlay.

## Physics (`Sources/Spring.swift`)

Explicit `a = k(target − x) − c·v` integrator with fixed sub-steps, so the feel
is identical at 60 Hz and 120 Hz.

- Distance-aware stiffness: `k = clamp(300 − distance·0.32, 150, 300)` — short
  hops settle in ~260 ms, long hops keep a softer ~420 ms arc.
- Damping ratio ζ = 0.86 → a barely perceptible overshoot, no wobble.
- Separate springs drive horizontal position, lift (rest ↔ lifted geometry) and
  alpha (dissolve onto the profile button).

## Interaction (`Sources/LiquidLensView.swift`)

Raw `touchesBegan/Moved/Ended` — not `UIGestureRecognizer` — so there is zero
recognition delay.

- **Tap**: the tab commits on touch-down; the lens lifts and springs across.
- **Drag**: `Spring.drive` puts the finger in direct control of the lens and
  records a real velocity; release hands that velocity to the spring and snaps
  to the nearest tab.
- **Profile**: the lens contracts and fades as it reaches the profile button,
  which takes over the active-state ring; touching a tab again makes the lens
  re-emerge from the button and travel back into the island.

## Tuning knobs

All in `LiquidLensView.draw(in:)`:

```swift
magnification: 1.10 + 0.20 * lift
refraction:    0.22 + 0.20 * lift
chroma:        0.18 + 0.62 * lift + abs(speed) * 0.35
```

Geometry (island height, lens size at rest and lifted, lift offset) lives in
`NavLayout.compute`.

## Reference prototype

`src/lib/liquidglass/*` in this repository is the WebGL2 prototype used to tune
the optical constants; the Metal shader is a line-for-line port of
`shaders.ts`, and `Spring.swift` of `spring.ts`.
