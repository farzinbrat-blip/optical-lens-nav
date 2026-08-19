import UIKit

/// Hosts the Metal navigation view full-screen. The lens, island, tabs and
/// profile button are all GPU-composited inside `LiquidLensView`; UIKit is only
/// used for hosting and accessibility.
final class MainViewController: UIViewController {

    private var lensView: LiquidLensView!
    private var accessibilityButtons: [UIButton] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        lensView = LiquidLensView(frame: view.bounds)
        lensView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lensView.isAccessibilityElement = false
        view.addSubview(lensView)

        lensView.onSelectionChange = { [weak self] selection in
            self?.syncAccessibility(selection)
        }

        buildAccessibilityLayer()
        syncAccessibility(lensView.selection)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var prefersHomeIndicatorAutoHidden: Bool { false }

    /// Invisible UIKit buttons mirroring the GPU-drawn tabs so VoiceOver and
    /// Switch Control can operate the navigation.
    private func buildAccessibilityLayer() {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        for tab in NavTab.allCases {
            let b = UIButton(type: .custom)
            b.accessibilityLabel = tab.title
            b.tag = tab.rawValue
            b.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
            b.isUserInteractionEnabled = false   // touches are handled by the Metal view
            accessibilityButtons.append(b)
            stack.addArrangedSubview(b)
        }

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -80),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            stack.heightAnchor.constraint(equalToConstant: 64),
        ])
    }

    @objc private func tabTapped(_ sender: UIButton) {
        guard let tab = NavTab(rawValue: sender.tag) else { return }
        lensView.select(.tab(tab))
    }

    private func syncAccessibility(_ selection: Selection) {
        for (i, b) in accessibilityButtons.enumerated() {
            let isActive = selection == .tab(NavTab.allCases[i])
            b.accessibilityTraits = isActive ? [.button, .selected] : [.button]
        }
    }
}
