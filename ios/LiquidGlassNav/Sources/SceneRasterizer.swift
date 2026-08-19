import CoreGraphics
import Metal
import UIKit

/// Rasterizes everything the lens can magnify (background, mock chat content,
/// the floating dark-navy island, the tab glyphs/labels and the profile button)
/// into a single BGRA texture. Only re-rasterized when layout or selection
/// changes: the lens animation itself is pure GPU work.
final class SceneRasterizer {
    private(set) var texture: MTLTexture?
    private var cachedKey: String = ""
    private var pixelWidth = 0
    private var pixelHeight = 0

    private let device: MTLDevice

    init(device: MTLDevice) {
        self.device = device
    }

    /// Returns true if the texture was (re)built this call.
    @discardableResult
    func update(layout: NavLayout, selection: Selection) -> Bool {
        let w = Int((layout.width * layout.scale).rounded())
        let h = Int((layout.height * layout.scale).rounded())
        let key = "\(w)x\(h)|\(selection)"
        if key == cachedKey, texture != nil { return false }
        guard w > 0, h > 0 else { return false }

        let bytesPerRow = w * 4
        var buffer = [UInt8](repeating: 0, count: bytesPerRow * h)

        buffer.withUnsafeMutableBytes { raw in
            guard let ctx = CGContext(
                data: raw.baseAddress,
                width: w, height: h,
                bitsPerComponent: 8, bytesPerRow: bytesPerRow,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
            ) else { return }

            // Flip to a y-down, point-space coordinate system (UIKit-like),
            // which is what the layout and the shader both assume.
            ctx.translateBy(x: 0, y: CGFloat(h))
            ctx.scaleBy(x: layout.scale, y: -layout.scale)
            UIGraphicsPushContext(ctx)
            draw(in: ctx, layout: layout, selection: selection)
            UIGraphicsPopContext()
        }

        if texture == nil || pixelWidth != w || pixelHeight != h {
            let desc = MTLTextureDescriptor.texture2DDescriptor(
                pixelFormat: .bgra8Unorm, width: w, height: h, mipmapped: false)
            desc.usage = [.shaderRead]
            desc.storageMode = .shared
            texture = device.makeTexture(descriptor: desc)
            pixelWidth = w
            pixelHeight = h
        }

        texture?.replace(region: MTLRegionMake2D(0, 0, w, h),
                         mipmapLevel: 0,
                         withBytes: buffer,
                         bytesPerRow: bytesPerRow)
        cachedKey = key
        return true
    }

    // MARK: - Scene painting

    private func draw(in ctx: CGContext, layout: NavLayout, selection: Selection) {
        drawBackground(ctx, layout)
        drawContent(ctx, layout)
        drawIsland(ctx, layout)
        drawTabs(ctx, layout, selection)
        drawProfile(ctx, layout, active: selection == .profile)
    }

    private func drawBackground(_ ctx: CGContext, _ l: NavLayout) {
        let space = CGColorSpaceCreateDeviceRGB()
        let colors = [
            UIColor(red: 0.043, green: 0.055, blue: 0.086, alpha: 1).cgColor,
            UIColor(red: 0.031, green: 0.078, blue: 0.098, alpha: 1).cgColor,
            UIColor(red: 0.024, green: 0.035, blue: 0.063, alpha: 1).cgColor,
        ] as CFArray
        if let g = CGGradient(colorsSpace: space, colors: colors, locations: [0, 0.55, 1]) {
            ctx.drawLinearGradient(g,
                                   start: CGPoint(x: 0, y: 0),
                                   end: CGPoint(x: l.width, y: l.height),
                                   options: [])
        }

        // warm accent orb - gives the lens something colourful to refract
        ctx.saveGState()
        let orb = CGPoint(x: l.width * 0.14, y: l.height * 0.78)
        if let g = CGGradient(colorsSpace: space,
                              colors: [UIColor(red: 1.0, green: 0.55, blue: 0.18, alpha: 0.85).cgColor,
                                       UIColor(red: 1.0, green: 0.35, blue: 0.20, alpha: 0.0).cgColor] as CFArray,
                              locations: [0, 1]) {
            ctx.drawRadialGradient(g, startCenter: orb, startRadius: 0,
                                   endCenter: orb, endRadius: l.width * 0.34, options: [])
        }
        ctx.restoreGState()
    }

    private func drawContent(_ ctx: CGContext, _ l: NavLayout) {
        let title = "Studio"
        (title as NSString).draw(
            at: CGPoint(x: 20, y: max(46, l.height * 0.07)),
            withAttributes: [
                .font: UIFont.systemFont(ofSize: 30, weight: .bold),
                .foregroundColor: UIColor(white: 0.97, alpha: 1),
            ])

        let rows = [
            ("Design Review", "Shipping the lens tomorrow", "Sun"),
            ("Metal Guild", "UV distortion pass looks right", "Sat"),
            ("Ana", "Chromatic fringing is subtle now", "Fri"),
            ("Optics", "Fresnel + spherical profile", "Thu"),
            ("Release", "120 Hz spring sub-stepping", "Wed"),
            ("Notes", "Offscreen texture, no fake blur", "Tue"),
        ]
        var y = max(102, l.height * 0.14)
        for (name, msg, when) in rows {
            let avatar = CGRect(x: 20, y: y, width: 46, height: 46)
            ctx.saveGState()
            ctx.addEllipse(in: avatar)
            ctx.clip()
            if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                  colors: [UIColor(red: 0.30, green: 0.45, blue: 0.95, alpha: 1).cgColor,
                                           UIColor(red: 0.55, green: 0.35, blue: 0.95, alpha: 1).cgColor] as CFArray,
                                  locations: [0, 1]) {
                ctx.drawLinearGradient(g, start: CGPoint(x: avatar.minX, y: avatar.minY),
                                       end: CGPoint(x: avatar.maxX, y: avatar.maxY), options: [])
            }
            ctx.restoreGState()

            (String(name.prefix(1)) as NSString).draw(
                at: CGPoint(x: avatar.midX - 7, y: avatar.midY - 11),
                withAttributes: [.font: UIFont.systemFont(ofSize: 18, weight: .semibold),
                                 .foregroundColor: UIColor(white: 1, alpha: 0.95)])

            (name as NSString).draw(at: CGPoint(x: 78, y: y + 3), withAttributes: [
                .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
                .foregroundColor: UIColor(white: 0.94, alpha: 1)])
            (msg as NSString).draw(at: CGPoint(x: 78, y: y + 25), withAttributes: [
                .font: UIFont.systemFont(ofSize: 14, weight: .regular),
                .foregroundColor: UIColor(white: 0.62, alpha: 1)])
            (when as NSString).draw(at: CGPoint(x: l.width - 56, y: y + 4), withAttributes: [
                .font: UIFont.systemFont(ofSize: 13, weight: .regular),
                .foregroundColor: UIColor(white: 0.48, alpha: 1)])

            y += 66
            if y > l.island.minY - 40 { break }
        }
    }

    private func drawIsland(_ ctx: CGContext, _ l: NavLayout) {
        let rect = l.island
        let path = UIBezierPath(roundedRect: rect, cornerRadius: l.islandRadius).cgPath

        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: 12),
                      blur: 34,
                      color: UIColor(red: 0, green: 0, blue: 0, alpha: 0.55).cgColor)
        ctx.addPath(path)
        ctx.setFillColor(UIColor(red: 0.07, green: 0.10, blue: 0.18, alpha: 0.92).cgColor)
        ctx.fillPath()
        ctx.restoreGState()

        // vertical sheen inside the island
        ctx.saveGState()
        ctx.addPath(path)
        ctx.clip()
        if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                              colors: [UIColor(white: 1, alpha: 0.10).cgColor,
                                       UIColor(white: 1, alpha: 0.02).cgColor] as CFArray,
                              locations: [0, 1]) {
            ctx.drawLinearGradient(g, start: CGPoint(x: 0, y: rect.minY),
                                   end: CGPoint(x: 0, y: rect.maxY), options: [])
        }
        ctx.restoreGState()

        ctx.addPath(path)
        ctx.setLineWidth(1)
        ctx.setStrokeColor(UIColor(white: 1, alpha: 0.12).cgColor)
        ctx.strokePath()
    }

    private func drawTabs(_ ctx: CGContext, _ l: NavLayout, _ selection: Selection) {
        for tab in NavTab.allCases {
            let cx = l.tabCenters[tab.rawValue]
            let active = selection == .tab(tab)
            let color = active ? UIColor(white: 1.0, alpha: 1.0) : UIColor(white: 0.66, alpha: 1.0)

            NavIcons.draw(tab, in: ctx,
                          center: CGPoint(x: cx, y: l.centerY - 8),
                          size: 24, color: color)

            let label = tab.title as NSString
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: active ? .semibold : .medium),
                .foregroundColor: color,
            ]
            let size = label.size(withAttributes: attrs)
            label.draw(at: CGPoint(x: cx - size.width / 2, y: l.centerY + 8), withAttributes: attrs)
        }
    }

    private func drawProfile(_ ctx: CGContext, _ l: NavLayout, active: Bool) {
        let c = l.profileCenter
        let r = l.profileRadius
        let rect = CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)

        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: 10), blur: 26,
                      color: UIColor(white: 0, alpha: 0.5).cgColor)
        ctx.addEllipse(in: rect)
        ctx.setFillColor(UIColor(red: 0.07, green: 0.10, blue: 0.18, alpha: 0.92).cgColor)
        ctx.fillPath()
        ctx.restoreGState()

        let inner = rect.insetBy(dx: 5, dy: 5)
        ctx.saveGState()
        ctx.addEllipse(in: inner)
        ctx.clip()
        if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                              colors: [UIColor(red: 0.36, green: 0.47, blue: 0.98, alpha: 1).cgColor,
                                       UIColor(red: 0.61, green: 0.40, blue: 0.98, alpha: 1).cgColor] as CFArray,
                              locations: [0, 1]) {
            ctx.drawLinearGradient(g, start: CGPoint(x: inner.minX, y: inner.minY),
                                   end: CGPoint(x: inner.maxX, y: inner.maxY), options: [])
        }
        ctx.restoreGState()

        let initials = "AJ" as NSString
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold),
            .foregroundColor: UIColor(white: 1, alpha: 0.96),
        ]
        let s = initials.size(withAttributes: attrs)
        initials.draw(at: CGPoint(x: c.x - s.width / 2, y: c.y - s.height / 2), withAttributes: attrs)

        // selection ring: the lens dissolves into the profile button, so the
        // button itself carries the active state
        if active {
            ctx.saveGState()
            ctx.setShadow(offset: .zero, blur: 16,
                          color: UIColor(red: 0.25, green: 0.92, blue: 0.59, alpha: 0.55).cgColor)
            ctx.addEllipse(in: rect.insetBy(dx: 1.4, dy: 1.4))
            ctx.setLineWidth(2.4)
            ctx.setStrokeColor(UIColor(red: 0.38, green: 0.91, blue: 0.66, alpha: 0.8).cgColor)
            ctx.strokePath()
            ctx.restoreGState()
        }
    }
}
