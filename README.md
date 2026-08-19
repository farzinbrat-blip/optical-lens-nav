# Optical Lens Nav

You are a senior iOS graphics/rendering engineer specializing in Swift, Metal, Core Animation, UIKit/SwiftUI, and reverse-engineering high-end glass UI effects.

TASK:

Recreate the Telegram iOS bottom navigation Liquid Glass / optical lens navigation bar as accurately as technically possible.

IMPORTANT:

Do NOT create a generic "Liquid Glass" UI.

Do NOT use a simple blur.

Do NOT use CSS backdrop-filter.

Do NOT use fake gradients pretending to be refraction.

Do NOT use a normal shadow to simulate glass.

Do NOT simplify the optical effect.

The target is the Telegram iOS bottom navigation interaction and appearance.

TARGET UI:

- Floating dark navy/purple rounded navigation island.

- Four navigation items.

- Separate circular profile/avatar button on the right.

- Active navigation item is contained inside a transparent optical glass lens.

- The lens can lift above the navigation bar.

- During movement the lens becomes larger vertically and horizontally.

- Content underneath the lens is optically magnified.

- Lens produces real refraction/distortion.

- Lens has subtle chromatic dispersion:

  cyan/blue toward one side,

  red/orange toward the opposite side.

- Bright thin optical highlight along the upper edge.

- Transparent crystal appearance.

- No milky white glass.

- No opaque white overlay.

INTERACTION:

1. Idle:

   - Lens rests naturally over the selected tab.

   - Lens is approximately normal size.

   - Content is sharp.

2. Tap another tab:

   - Lens lifts immediately.

   - Lens expands.

   - Lens travels from old tab to new tab using physical spring motion.

   - During travel the underlying icons/text are magnified and optically distorted.

   - Lens settles smoothly over the new tab.

3. Long press / drag:

   - Lens follows the user's finger immediately.

   - No artificial transition delay.

   - No CSS transition.

   - No setTimeout-based animation.

   - Finger movement must directly control lens position.

   - While dragging, maintain optical magnification and refraction.

4. Release:

   - Find the nearest tab.

   - Use spring physics to settle there.

   - Return from lifted lens to resting lens smoothly.

5. Profile button:

   - It is physically separated from the main navigation island.

   - When selected, the active lens contracts toward the profile button and disappears.

   - Profile receives a subtle green optical ring/glow.

   - When another navigation tab is selected, the lens must visually originate from the profile button and travel back into the navigation island.

PHYSICS:

Use a real spring simulation.

Do not use setTimeout for animation sequencing.

Use CADisplayLink / requestAnimationFrame depending on platform.

Implement spring position/velocity state explicitly.

Use parameters approximately equivalent to:

stiffness = 0.22

damping = 0.70

Tune the actual values visually rather than blindly using these numbers.

Movement distance must affect perceived travel duration:

- adjacent tab: approximately 250–300 ms

- distant tab: approximately 380–450 ms

OPTICAL RENDERING:

This is the most important requirement.

Implement the lens using a real GPU rendering pipeline.

Preferred:

Swift + Metal

Acceptable:

Metal + Core Animation / UIKit

Metal shader + offscreen texture

Metal shader + render-to-texture pipeline

The lens must sample the actual navigation content from an offscreen texture.

Use UV distortion to produce spherical optical refraction.

Implement magnification inside the lens.

Implement chromatic aberration by sampling R/G/B channels with slightly different UV offsets.

Implement edge-dependent distortion.

Implement subtle Fresnel-like edge intensity.

Implement directional edge lighting.

Implement a thin top highlight.

The lens must remain transparent and show the actual content underneath.

Do not fake magnification by simply scaling the whole navigation view.

The magnification must exist ONLY inside the lens.

ARCHITECTURE:

Main UI

    ↓

Navigation content

    ↓

Offscreen render target / texture

    ↓

Metal lens shader

    ↓

Refraction + magnification

    ↓

Chromatic dispersion

    ↓

Edge lighting / highlight

    ↓

Composite over navigation

The navigation content underneath must remain at its normal scale.

Only the pixels sampled through the lens are magnified/distorted.

TECHNICAL REQUIREMENTS:

- Swift

- Metal

- UIKit or SwiftUI where appropriate

- CADisplayLink

- UIPointerInteraction if useful

- UIGestureRecognizer / touches or modern pointer APIs

- 120 Hz ProMotion support

- 60 Hz fallback

- correct Retina scaling

- safe-area handling

- portrait and landscape support

- no external dependencies

PERFORMANCE:

- Keep rendering GPU accelerated.

- Avoid continuously creating UIViews during animation.

- Avoid expensive CPU pixel manipulation.

- Avoid image snapshots every frame if a GPU render target can be used.

- Reuse Metal textures and buffers.

- Avoid memory leaks.

- Avoid retain cycles.

- Make the renderer stable during rapid taps and rapid drag gestures.

VERY IMPORTANT:

Before writing code, inspect the actual Telegram iOS implementation and any publicly available Liquid Glass-related implementation in the Telegram iOS repository.

Do not invent filenames.

Do not claim a file exists unless you have verified it.

If Telegram's exact implementation is unavailable or proprietary/internal, explicitly state that and reproduce the visual/physical behavior independently using Metal.

DO NOT copy copyrighted Telegram source code wholesale.

Instead, implement an independent clean-room recreation of the visual behavior.

DELIVERABLE:

Create a complete working Xcode project.

Provide:

1. Exact project/file structure.

2. Every Swift file.

3. Every Metal shader file.

4. App entry point.

5. Navigation UI.

6. Lens renderer.

7. Spring physics engine.

8. Gesture handling.

9. Profile button behavior.

10. Build instructions.

Do not give pseudocode.

Do not give incomplete snippets.

Do not omit files with "implement this yourself".

Do not replace the optical renderer with blur.

Do not replace Metal with a fake gradient.

Do not use placeholder lens effects.

The final result should be visually and behaviorally as close to Telegram iOS's Liquid Glass bottom navigation as technically possible.

QUALITY CONTROL:

After implementing it, compare the result against the Telegram iOS reference behavior and iterate on:

- lens dimensions

- magnification

- refraction strength

- chromatic dispersion

- edge lighting

- highlight position

- spring response

- drag response

- profile-to-navigation transition

- navigation island dimensions

- icon positioning

- label positioning

- spacing

- corner radius

- transparency

- color

Do not stop after the first implementation.

Perform at least 3 refinement passes.

At the end, clearly list:

- what is genuinely implemented with Metal,

- what is approximated,

- what cannot be exactly reproduced without Telegram's private/internal implementation.

The priority order is:

1. Optical behavior

2. Lens magnification

3. Refraction

4. Chromatic dispersion

5. Spring physics

6. Drag behavior

7. Profile transition

8. Visual styling

9. Performance

Do not optimize away the optical effect just to make the implementation easier.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4df87f3d-b949-47e9-aad6-a30d52db3983).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
