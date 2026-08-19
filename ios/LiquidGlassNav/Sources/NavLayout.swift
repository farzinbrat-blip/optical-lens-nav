import CoreGraphics
import Foundation

enum NavTab: Int, CaseIterable {
    case contacts, calls, chats, settings

    var title: String {
        switch self {
        case .contacts: return "Contacts"
        case .calls:    return "Calls"
        case .chats:    return "Chats"
        case .settings: return "Settings"
        }
    }
}

enum Selection: Equatable {
    case tab(NavTab)
    case profile
}

/// Pure geometry for the floating island, the tab slots, the separate profile
/// button and the lens at rest / lifted. Everything is in points; the renderer
/// multiplies by the screen scale.
struct NavLayout {
    var width: CGFloat
    var height: CGFloat
    var scale: CGFloat

    var island: CGRect
    var islandRadius: CGFloat
    var tabCenters: [CGFloat]
    var tabWidth: CGFloat
    var centerY: CGFloat

    var profileCenter: CGPoint
    var profileRadius: CGFloat

    var lensRest: CGSize
    var lensLift: CGSize
    var lensLiftDY: CGFloat

    static func compute(width: CGFloat, height: CGFloat, scale: CGFloat, safeBottom: CGFloat) -> NavLayout {
        let landscape = width > height
        let margin: CGFloat = landscape ? max(24, width * 0.06) : 12
        let islandH: CGFloat = landscape ? 56 : 64
        let profileD = islandH - 6
        let gap: CGFloat = 10

        let bottomInset = safeBottom + (landscape ? 10 : 16)
        let islandY = height - bottomInset - islandH
        let islandW = width - margin * 2 - profileD - gap
        let island = CGRect(x: margin, y: islandY, width: islandW, height: islandH)

        let tabWidth = islandW / CGFloat(NavTab.allCases.count)
        let centers = NavTab.allCases.map { island.minX + tabWidth * (CGFloat($0.rawValue) + 0.5) }
        let centerY = islandY + islandH / 2

        let lensW = min(tabWidth - 4, 92)
        let lensH = islandH - 9

        return NavLayout(
            width: width,
            height: height,
            scale: scale,
            island: island,
            islandRadius: islandH / 2,
            tabCenters: centers,
            tabWidth: tabWidth,
            centerY: centerY,
            profileCenter: CGPoint(x: island.minX + islandW + gap + profileD / 2, y: centerY),
            profileRadius: profileD / 2,
            lensRest: CGSize(width: lensW, height: lensH),
            lensLift: CGSize(width: lensW * 1.32, height: lensH * 1.2),
            lensLiftDY: -15
        )
    }

    func nearestTab(toX x: CGFloat) -> NavTab {
        var best = NavTab.contacts
        var bestD = CGFloat.greatestFiniteMagnitude
        for tab in NavTab.allCases {
            let d = abs(tabCenters[tab.rawValue] - x)
            if d < bestD { bestD = d; best = tab }
        }
        return best
    }

    enum Hit { case tab(NavTab), profile }

    func hitTest(_ p: CGPoint) -> Hit? {
        if hypot(p.x - profileCenter.x, p.y - profileCenter.y) <= profileRadius + 8 { return .profile }
        if p.x >= island.minX - 6, p.x <= island.maxX + 6,
           p.y >= island.minY - 22, p.y <= island.maxY + 12 {
            return .tab(nearestTab(toX: p.x))
        }
        return nil
    }

    func x(for selection: Selection) -> CGFloat {
        switch selection {
        case .profile: return profileCenter.x
        case .tab(let t): return tabCenters[t.rawValue]
        }
    }
}
