import { useEffect, useRef, useState } from "react";
import { LensRenderer } from "@/lib/liquidglass/renderer";
import { NavScene } from "@/lib/liquidglass/scene";
import { Spring, dampingForStiffness, stiffnessForDistance } from "@/lib/liquidglass/spring";
import { TABS, computeLayout, hitTest, nearestTab, type NavLayout, type TabId } from "@/lib/liquidglass/layout";

type Selection = TabId | "profile";

export function LiquidLensNav() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<Selection>(2);
  const [error, setError] = useState<string | null>(null);
  const selectionRef = useRef<Selection>(2);
  const applyRef = useRef<(s: Selection) => void>(() => {});

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;

    let renderer: LensRenderer;
    try {
      renderer = new LensRenderer(canvas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "WebGL2 unavailable");
      return;
    }

    const scene = new NavScene();
    let layout: NavLayout = computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, safeBottom());

    const x = new Spring(layout.tabCenters[2]!);
    const lift = new Spring(0, 300, dampingForStiffness(300, 0.9));
    const alpha = new Spring(1, 320, dampingForStiffness(320, 0.95));

    let dragging = false;
    let pointerId = -1;
    let selection: Selection = selectionRef.current;
    let lastT = performance.now();
    let dirty = true;
    let idleFrames = 0;

    function safeBottom() {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--safe-bottom");
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    }

    function relayout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      layout = computeLayout(window.innerWidth, window.innerHeight, dpr, safeBottom());
      renderer.resize(Math.round(layout.width * dpr), Math.round(layout.height * dpr));
      canvas.style.width = `${layout.width}px`;
      canvas.style.height = `${layout.height}px`;
      dirty = true;
      idleFrames = 0;
      if (selection === "profile") x.set(layout.profile.cx);
    }

    function select(next: Selection) {
      if (next === selection) return;
      const from = x.x;
      const toX = next === "profile" ? layout.profile.cx : layout.tabCenters[next]!;
      const k = stiffnessForDistance(Math.abs(toX - from));
      x.tune(k, dampingForStiffness(k));
      x.target = toX;
      selection = next;
      selectionRef.current = next;
      setSelected(next);
      alpha.target = next === "profile" ? 0 : 1;
      // lens lifts immediately on any transition
      lift.x = Math.max(lift.x, 0.55);
      lift.target = 1;
      idleFrames = 0;
    }
    applyRef.current = select;

    function localPoint(ev: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      return { px: ev.clientX - r.left, py: ev.clientY - r.top };
    }

    function onDown(ev: PointerEvent) {
      const { px, py } = localPoint(ev);
      const hit = hitTest(px, py, layout);
      if (!hit) return;
      canvas.setPointerCapture(ev.pointerId);
      pointerId = ev.pointerId;
      if (hit.kind === "profile") {
        select("profile");
        return;
      }
      dragging = true;
      if (selection === "profile") {
        // lens must originate from the profile button and travel back in
        x.set(layout.profile.cx);
        alpha.target = 1;
      }
      lift.target = 1;
      select(hit.index);
      idleFrames = 0;
    }

    function onMove(ev: PointerEvent) {
      if (!dragging || ev.pointerId !== pointerId) return;
      const { px } = localPoint(ev);
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const minX = layout.island.x + layout.lensRest.w * 0.5;
      const maxX = layout.island.x + layout.island.w - layout.lensRest.w * 0.5;
      // finger drives the lens position directly - no transition, no easing
      x.drive(Math.max(minX - 10, Math.min(maxX + layout.profile.r * 1.6, px)), dt);
      lift.target = 1;
      idleFrames = 0;
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      pointerId = -1;
      if (!dragging) return;
      dragging = false;
      const { px, py } = localPoint(ev);
      const overProfile = Math.hypot(px - layout.profile.cx, py - layout.profile.cy) <= layout.profile.r + 10;
      const next: Selection = overProfile ? "profile" : nearestTab(x.x, layout);
      const toX = next === "profile" ? layout.profile.cx : layout.tabCenters[next]!;
      const k = stiffnessForDistance(Math.abs(toX - x.x));
      x.tune(k, dampingForStiffness(k));
      x.target = toX;
      if (next !== selection) {
        selection = next;
        selectionRef.current = next;
        setSelected(next);
      }
      alpha.target = next === "profile" ? 0 : 1;
      lift.target = 0;
      idleFrames = 0;
    }

    let raf = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (scene.render(layout, selection)) {
        renderer.upload(scene.canvas);
        dirty = true;
      }

      if (!dragging) x.step(dt);
      if (!dragging && x.settled && lift.target === 1 && selection !== "profile") lift.target = 0;
      lift.step(dt);
      alpha.step(dt);

      const moving = dragging || !x.settled || !lift.settled || !alpha.settled;
      if (!moving && !dirty) {
        if (idleFrames++ > 2) return; // GPU idle, nothing changed
      } else {
        idleFrames = 0;
      }
      dirty = false;

      const dpr = layout.dpr;
      const l = Math.max(0, Math.min(1, lift.x));
      const contract = 0.28 + 0.72 * alpha.x;
      const w = (layout.lensRest.w + (layout.lensLift.w - layout.lensRest.w) * l) * contract;
      const h = (layout.lensRest.h + (layout.lensLift.h - layout.lensRest.h) * l) * contract;
      const cy = layout.centerY + layout.lensLift.dy * l;
      const speed = Math.max(-1, Math.min(1, x.v / 2200));

      renderer.draw({
        cx: x.x * dpr,
        cy: cy * dpr,
        hw: (w / 2) * dpr,
        hh: (h / 2) * dpr,
        radius: (h / 2) * 0.94 * dpr,
        mag: 1.11 + 0.17 * l,
        refract: 0.26 + 0.15 * l,
        chroma: 0.22 + 0.5 * l + Math.abs(speed) * 0.6,
        chromaDirX: speed * 0.9 + 0.28,
        chromaDirY: -0.45,
        alpha: alpha.x,
        lift: l,
      });
    }

    relayout();
    lastT = performance.now();
    raf = requestAnimationFrame(frame);

    canvas.addEventListener("pointerdown", onDown, { passive: true });
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerup", onUp, { passive: true });
    canvas.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("resize", relayout);
    window.addEventListener("orientationchange", relayout);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", relayout);
      window.removeEventListener("orientationchange", relayout);
      applyRef.current = () => {};
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 touch-none select-none" aria-hidden="true" />
      {error && (
        <div className="absolute inset-x-0 top-1/2 px-6 text-center text-sm text-muted-foreground">
          WebGL2 is required for the optical lens renderer: {error}
        </div>
      )}
      <nav aria-label="Main" className="sr-only">
        {TABS.map((label, i) => (
          <button key={label} aria-current={selected === i} onClick={() => applyRef.current(i as TabId)}>
            {label}
          </button>
        ))}
        <button aria-current={selected === "profile"} onClick={() => applyRef.current("profile")}>
          Profile
        </button>
      </nav>
    </div>
  );
}
