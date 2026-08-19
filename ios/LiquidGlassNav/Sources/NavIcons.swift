import CoreGraphics
import UIKit

/// Hand-drawn Core Graphics tab glyphs. Vector paths are used (instead of SF
/// Symbols) so the glyph geometry is identical to the tuned WebGL prototype and
/// so the rasterized scene texture the lens samples stays crisp at any scale.
enum NavIcons {

    static func draw(_ tab: NavTab, in ctx: CGContext, center: CGPoint, size: CGFloat, color: UIColor) {
        ctx.saveGState()
        ctx.translateBy(x: center.x, y: center.y)
        let s = size / 24.0
        ctx.scaleBy(x: s, y: s)
        ctx.setStrokeColor(color.cgColor)
        ctx.setFillColor(color.cgColor)
        ctx.setLineWidth(1.9)
        ctx.setLineCap(.round)
        ctx.setLineJoin(.round)

        switch tab {
        case .contacts: drawContacts(ctx)
        case .calls:    drawCalls(ctx)
        case .chats:    drawChats(ctx)
        case .settings: drawSettings(ctx)
        }

        ctx.restoreGState()
    }

    // person: head + shoulders
    private static func drawContacts(_ ctx: CGContext) {
        ctx.addArc(center: CGPoint(x: 0, y: -4.4), radius: 4.0,
                   startAngle: 0, endAngle: .pi * 2, clockwise: false)
        ctx.strokePath()

        let p = CGMutablePath()
        p.move(to: CGPoint(x: -7.4, y: 8.6))
        p.addCurve(to: CGPoint(x: 0, y: 2.2),
                   control1: CGPoint(x: -7.4, y: 4.6), control2: CGPoint(x: -3.9, y: 2.2))
        p.addCurve(to: CGPoint(x: 7.4, y: 8.6),
                   control1: CGPoint(x: 3.9, y: 2.2), control2: CGPoint(x: 7.4, y: 4.6))
        ctx.addPath(p)
        ctx.strokePath()
    }

    // handset: tapered receiver rotated like the iOS phone glyph
    private static func drawCalls(_ ctx: CGContext) {
        ctx.saveGState()
        ctx.rotate(by: -0.18)
        let p = CGMutablePath()
        p.move(to: CGPoint(x: -6.6, y: -7.2))
        p.addCurve(to: CGPoint(x: -2.4, y: -1.0),
                   control1: CGPoint(x: -3.6, y: -7.6), control2: CGPoint(x: -2.0, y: -4.2))
        p.addCurve(to: CGPoint(x: -1.2, y: 3.0),
                   control1: CGPoint(x: -2.9, y: 1.0), control2: CGPoint(x: -2.6, y: 2.0))
        p.addCurve(to: CGPoint(x: 3.4, y: 5.0),
                   control1: CGPoint(x: 0.6, y: 4.4), control2: CGPoint(x: 1.6, y: 4.9))
        p.addCurve(to: CGPoint(x: 7.6, y: 8.0),
                   control1: CGPoint(x: 6.6, y: 5.2), control2: CGPoint(x: 8.0, y: 5.6))
        ctx.addPath(p)
        ctx.setLineWidth(2.5)
        ctx.strokePath()
        ctx.restoreGState()
    }

    // rounded speech bubble with a tail
    private static func drawChats(_ ctx: CGContext) {
        let r = CGRect(x: -8.2, y: -7.4, width: 16.4, height: 13.0)
        let path = UIBezierPath(roundedRect: r, cornerRadius: 4.6).cgPath
        ctx.addPath(path)
        ctx.strokePath()

        let tail = CGMutablePath()
        tail.move(to: CGPoint(x: -3.6, y: 5.4))
        tail.addLine(to: CGPoint(x: -5.4, y: 9.4))
        tail.addLine(to: CGPoint(x: -0.4, y: 5.6))
        ctx.addPath(tail)
        ctx.strokePath()
    }

    // gear: 8-tooth cog + hub
    private static func drawSettings(_ ctx: CGContext) {
        let teeth = 8
        let path = CGMutablePath()
        for i in 0..<(teeth * 2) {
            let a = (Double(i) / Double(teeth * 2)) * .pi * 2 - .pi / 2
            let rad: Double = i % 2 == 0 ? 8.4 : 6.3
            let pt = CGPoint(x: cos(a) * rad, y: sin(a) * rad)
            if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
        }
        path.closeSubpath()
        ctx.addPath(path)
        ctx.setLineWidth(1.8)
        ctx.setLineJoin(.round)
        ctx.strokePath()

        ctx.addArc(center: .zero, radius: 3.0, startAngle: 0, endAngle: .pi * 2, clockwise: false)
        ctx.strokePath()
    }
}
