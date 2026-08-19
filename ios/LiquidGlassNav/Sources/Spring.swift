import Foundation

/// Explicit spring integrator (position + velocity state).
///
/// Continuous form: `a = k * (target - x) - c * v`, integrated with fixed
/// sub-steps so the motion is identical on 60 Hz and 120 Hz ProMotion displays.
final class Spring {
    var x: Double
    var v: Double = 0
    var target: Double
    var k: Double
    var c: Double

    init(_ x: Double, k: Double = 260, c: Double = 26) {
        self.x = x
        self.target = x
        self.k = k
        self.c = c
    }

    /// Hard-set the position, killing velocity.
    func set(_ value: Double) {
        x = value
        target = value
        v = 0
    }

    /// Direct position control during a drag; keeps a real velocity estimate
    /// so the release hand-off inherits the finger's momentum.
    func drive(_ value: Double, dt: Double) {
        if dt > 0 { v = (value - x) / dt }
        x = value
        target = value
    }

    func tune(k: Double, c: Double) {
        self.k = k
        self.c = c
    }

    func step(_ dt: Double) {
        var remaining = min(dt, 0.05)   // clamp catastrophic frame gaps
        let h = 1.0 / 480.0
        while remaining > 0 {
            let s = remaining > h ? h : remaining
            remaining -= s
            let a = k * (target - x) - c * v
            v += a * s
            x += v * s
        }
    }

    var settled: Bool {
        abs(target - x) < 0.03 && abs(v) < 0.05
    }
}

/// Distance-aware stiffness: short hops feel snappy (~260 ms), long hops keep
/// a slightly softer, longer arc (~420 ms).
func stiffnessForDistance(_ distance: Double) -> Double {
    min(300, max(150, 300 - distance * 0.32))
}

func dampingForStiffness(_ k: Double, zeta: Double = 0.86) -> Double {
    2 * zeta * k.squareRoot()
}
