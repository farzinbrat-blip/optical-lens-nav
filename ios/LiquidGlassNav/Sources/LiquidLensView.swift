import Metal
import MetalKit
import UIKit
import simd

/// Uniform block; must match `LensUniforms` in LiquidLens.metal.
struct LensUniforms {
    var resolution: SIMD2<Float>
    var center: SIMD2<Float>
    var half: SIMD2<Float>
    var chromaDir: SIMD2<Float>
    var radius: Float
    var magnification: Float
    var refraction: Float
    var chroma: Float
    var alpha: Float
    var lift: Float
}

/// Full-screen Metal view that owns the navigation scene texture, the optical
/// lens pass, the spring state and the direct-drag gesture handling.
final class LiquidLensView: MTKView {

    // MARK: GPU
    private var commandQueue: MTLCommandQueue!
    private var pipeline: MTLRenderPipelineState!
    private var scene: SceneRasterizer!

    // MARK: State
    private var layout: NavLayout!
    private(set) var selection: Selection = .tab(.chats)
    var onSelectionChange: ((Selection) -> Void)?

    private var xSpring = Spring(0)
    private var liftSpring = Spring(0, k: 300, c: dampingForStiffness(300, zeta: 0.9))
    private var alphaSpring = Spring(1, k: 320, c: dampingForStiffness(320, zeta: 0.95))

    private var dragging = false
    private var didDrag = false
    private var downX: CGFloat = 0
    private var lastTime: CFTimeInterval = CACurrentMediaTime()
    private var sceneDirty = true
    private var idleFrames = 0

    private let selectionFeedback = UISelectionFeedbackGenerator()

    // MARK: Init

    init(frame: CGRect) {
        let dev = MTLCreateSystemDefaultDevice()
        super.init(frame: frame, device: dev)
        commonInit()
    }

    required init(coder: NSCoder) {
        super.init(coder: coder)
        device = device ?? MTLCreateSystemDefaultDevice()
        commonInit()
    }

    private func commonInit() {
        guard let device else { fatalError("Metal is not supported on this device") }

        colorPixelFormat = .bgra8Unorm
        framebufferOnly = true
        isOpaque = true
        isMultipleTouchEnabled = false
        preferredFramesPerSecond = UIScreen.main.maximumFramesPerSecond   // 120 Hz on ProMotion
        enableSetNeedsDisplay = false
        isPaused = false
        backgroundColor = .black

        commandQueue = device.makeCommandQueue()
        scene = SceneRasterizer(device: device)

        guard let library = device.makeDefaultLibrary() else {
            fatalError("Missing default Metal library")
        }
        let desc = MTLRenderPipelineDescriptor()
        desc.vertexFunction = library.makeFunction(name: "lensVertex")
        desc.fragmentFunction = library.makeFunction(name: "lensFragment")
        desc.colorAttachments[0].pixelFormat = colorPixelFormat
        pipeline = try! device.makeRenderPipelineState(descriptor: desc)

        relayout()
        xSpring.set(Double(layout.x(for: selection)))
        delegate = self
    }

    // MARK: Layout

    override func layoutSubviews() {
        super.layoutSubviews()
        relayout()
    }

    private func relayout() {
        let scale = min(UIScreen.main.scale, 3)
        contentScaleFactor = scale
        let safeBottom = window?.safeAreaInsets.bottom ?? safeAreaInsets.bottom
        layout = NavLayout.compute(width: bounds.width,
                                   height: bounds.height,
                                   scale: scale,
                                   safeBottom: safeBottom)
        drawableSize = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        sceneDirty = true
        idleFrames = 0
        if selection == .profile { xSpring.set(Double(layout.profileCenter.x)) }
    }

    // MARK: Selection

    func select(_ next: Selection) {
        guard next != selection else { return }
        let from = xSpring.x
        let to = Double(layout.x(for: next))
        let k = stiffnessForDistance(abs(to - from))
        xSpring.tune(k: k, c: dampingForStiffness(k))
        xSpring.target = to

        selection = next
        onSelectionChange?(next)
        selectionFeedback.selectionChanged()

        alphaSpring.target = (next == .profile) ? 0 : 1
        liftSpring.x = max(liftSpring.x, 0.55)   // the lens lifts on any transition
        liftSpring.target = 1
        sceneDirty = true
        idleFrames = 0
    }

    // MARK: Touches (direct manipulation, no UIGestureRecognizer latency)

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = touches.first else { return }
        let p = t.location(in: self)
        guard let hit = layout.hitTest(p) else { return }

        if case .profile = hit {
            select(.profile)
            return
        }
        guard case .tab(let tab) = hit else { return }

        dragging = true
        didDrag = false
        downX = p.x
        if selection == .profile {
            // the lens must originate from the profile button and travel back in
            xSpring.set(Double(layout.profileCenter.x))
            alphaSpring.target = 1
        }
        liftSpring.target = 1
        select(.tab(tab))
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard dragging, let t = touches.first else { return }
        let p = t.location(in: self)
        if abs(p.x - downX) > 6 { didDrag = true }
        guard didDrag else { return }

        let now = CACurrentMediaTime()
        let dt = max(0.001, now - lastTime)
        let minX = layout.island.minX + layout.lensRest.width * 0.5
        let maxX = layout.island.maxX - layout.lensRest.width * 0.5
        let clamped = min(max(p.x, minX - 10), maxX + layout.profileRadius * 1.6)
        xSpring.drive(Double(clamped), dt: dt)   // finger drives the lens directly
        liftSpring.target = 1
        idleFrames = 0
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        finishDrag(touches.first?.location(in: self))
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        finishDrag(touches.first?.location(in: self))
    }

    private func finishDrag(_ point: CGPoint?) {
        guard dragging else { return }
        dragging = false

        var next = selection
        if let p = point,
           hypot(p.x - layout.profileCenter.x, p.y - layout.profileCenter.y) <= layout.profileRadius + 10 {
            next = .profile
        } else if didDrag {
            next = .tab(layout.nearestTab(toX: CGFloat(xSpring.x)))
        }

        let to = Double(layout.x(for: next))
        let k = stiffnessForDistance(abs(to - xSpring.x))
        xSpring.tune(k: k, c: dampingForStiffness(k))
        xSpring.target = to

        if next != selection {
            selection = next
            onSelectionChange?(next)
            selectionFeedback.selectionChanged()
            sceneDirty = true
        }
        alphaSpring.target = (next == .profile) ? 0 : 1
        liftSpring.target = 0
        idleFrames = 0
    }
}

// MARK: - Frame loop

extension LiquidLensView: MTKViewDelegate {

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        sceneDirty = true
    }

    func draw(in view: MTKView) {
        let now = CACurrentMediaTime()
        let dt = min(0.05, now - lastTime)
        lastTime = now

        if scene.update(layout: layout, selection: selection) { sceneDirty = true }

        if !dragging { xSpring.step(dt) }
        if !dragging, xSpring.settled, liftSpring.target == 1, selection != .profile {
            liftSpring.target = 0
        }
        liftSpring.step(dt)
        alphaSpring.step(dt)

        let moving = dragging || !xSpring.settled || !liftSpring.settled || !alphaSpring.settled
        if !moving && !sceneDirty {
            idleFrames += 1
            if idleFrames > 2 { return }   // nothing changed: skip GPU work
        } else {
            idleFrames = 0
        }
        sceneDirty = false

        guard let drawable = view.currentDrawable,
              let pass = view.currentRenderPassDescriptor,
              let texture = scene.texture,
              let buffer = commandQueue.makeCommandBuffer(),
              let encoder = buffer.makeRenderCommandEncoder(descriptor: pass) else { return }

        let s = Float(layout.scale)
        let lift = Float(min(max(liftSpring.x, 0), 1))
        let alpha = Float(alphaSpring.x)
        let contract = 0.28 + 0.72 * alpha
        let restW = Float(layout.lensRest.width), restH = Float(layout.lensRest.height)
        let liftW = Float(layout.lensLift.width), liftH = Float(layout.lensLift.height)
        let w = (restW + (liftW - restW) * lift) * contract
        let h = (restH + (liftH - restH) * lift) * contract
        let cy = Float(layout.centerY) + Float(layout.lensLiftDY) * lift
        let speed = Float(min(max(xSpring.v / 2200, -1), 1))

        var u = LensUniforms(
            resolution: SIMD2(Float(view.drawableSize.width), Float(view.drawableSize.height)),
            center: SIMD2(Float(xSpring.x) * s, (cy + 2) * s),
            half: SIMD2(w / 2 * s, h / 2 * s),
            chromaDir: SIMD2(speed * 0.9 + 0.28, -0.45),
            radius: (h / 2) * 0.94 * s,
            magnification: 1.10 + 0.20 * lift,
            refraction: 0.22 + 0.20 * lift,
            chroma: 0.18 + 0.62 * lift + abs(speed) * 0.35,
            alpha: alpha,
            lift: lift
        )

        encoder.setRenderPipelineState(pipeline)
        encoder.setFragmentTexture(texture, index: 0)
        encoder.setFragmentBytes(&u, length: MemoryLayout<LensUniforms>.stride, index: 0)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
        encoder.endEncoding()

        buffer.present(drawable)
        buffer.commit()
    }
}
