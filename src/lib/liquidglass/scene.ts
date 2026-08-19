import { TABS, type NavLayout, type TabId } from "./layout";
import { TAB_ICONS } from "./icons";

/**
 * Offscreen render target.
 *
 * Everything the user sees (background, mock content, the navigation island,
 * the profile button) is rasterised here ONCE per state change. The GPU lens
 * shader then samples this texture. Nothing on this canvas is ever scaled to
 * fake magnification — magnification exists only inside the shader.
 */
export class NavScene {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private key = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.bg = document.createElement("canvas");
    this.bgCtx = this.bg.getContext("2d", { alpha: false })!;
  }

  /** Returns true when the texture content changed and needs re-upload. */
  render(layout: NavLayout, selected: TabId | "profile"): boolean {
    const pw = Math.round(layout.width * layout.dpr);
    const ph = Math.round(layout.height * layout.dpr);
    const key = `${pw}x${ph}|${selected}`;
    if (key === this.key) return false;
    this.key = key;

    for (const c of [this.canvas, this.bg]) {
      if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
      }
    }

    this.paintBackground(layout);
    const ctx = this.ctx;
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);
    ctx.drawImage(this.bg, 0, 0, layout.width, layout.height);

    this.paintIsland(layout, selected);
    this.paintProfile(layout, selected === "profile");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return true;
  }

  private paintBackground(layout: NavLayout) {
    const ctx = this.bgCtx;
    const { width: w, height: h } = layout;
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);

    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, "#0a0c1c");
    g.addColorStop(0.55, "#12142c");
    g.addColorStop(1, "#080a16");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // coloured light blobs - give the lens something rich to refract
    const blobs: [number, number, number, string][] = [
      [w * 0.15, h * 0.12, w * 0.55, "rgba(92,120,255,0.30)"],
      [w * 0.95, h * 0.34, w * 0.6, "rgba(190,80,220,0.22)"],
      [w * 0.5, h * 0.92, w * 0.8, "rgba(40,190,190,0.16)"],
    ];
    for (const [x, y, r, c] of blobs) {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, c);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    this.paintHeader(ctx, layout);
    this.paintList(ctx, layout);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private paintHeader(ctx: CanvasRenderingContext2D, layout: NavLayout) {
    const w = layout.width;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "700 30px -apple-system, system-ui, 'Segoe UI', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Chats", 20, 84);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.font = "400 13px -apple-system, system-ui, sans-serif";
    ctx.fillText("Liquid lens navigation study", 21, 106);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 124);
    ctx.lineTo(w, 124);
    ctx.stroke();
  }

  private paintList(ctx: CanvasRenderingContext2D, layout: NavLayout) {
    const names = [
      ["Nargiza", "Bugun kelasizmi?", "9:41"],
      ["Design Team", "Lens radius 1.24x looks right", "9:12"],
      ["Bekzod", "Metal shader ishladi 🔥", "8:57"],
      ["Saved Messages", "refraction = 0.42", "Tue"],
      ["Shaders / GPU", "chromatic dispersion demo", "Tue"],
      ["Family", "Rahmat!", "Mon"],
      ["Alerts", "Build succeeded", "Mon"],
      ["Nodirbek", "120 Hz stable", "Sun"],
      ["Studio", "ProMotion capture", "Sun"],
    ];
    const hues = [212, 286, 158, 32, 340, 190, 258, 96, 12];
    let y = 148;
    const rowH = 72;
    ctx.textBaseline = "middle";
    for (let i = 0; i < names.length && y < layout.height - 40; i++) {
      const [name, msg, time] = names[i];
      const cy = y + rowH / 2;
      const ag = ctx.createLinearGradient(20, cy - 24, 68, cy + 24);
      ag.addColorStop(0, `hsl(${hues[i]} 85% 62%)`);
      ag.addColorStop(1, `hsl(${hues[i] + 28} 80% 44%)`);
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(46, cy, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "600 17px -apple-system, system-ui, sans-serif";
      ctx.fillText(name.slice(0, 1), 41, cy + 1);

      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.font = "600 15px -apple-system, system-ui, sans-serif";
      ctx.fillText(name, 84, cy - 10);
      ctx.fillStyle = "rgba(255,255,255,0.46)";
      ctx.font = "400 14px -apple-system, system-ui, sans-serif";
      ctx.fillText(msg, 84, cy + 12);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.font = "400 12px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(time, layout.width - 18, cy - 10);
      ctx.textAlign = "left";

      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.moveTo(84, y + rowH);
      ctx.lineTo(layout.width, y + rowH);
      ctx.stroke();
      y += rowH;
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private paintIsland(layout: NavLayout, selected: TabId | "profile") {
    const ctx = this.ctx;
    const { island: r, islandRadius: rad } = layout;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 10;
    this.roundRect(ctx, r.x, r.y, r.w, r.h, rad);
    ctx.fillStyle = "rgba(0,0,0,0.001)";
    ctx.fill();
    ctx.restore();

    // material: blurred backdrop of the scene, then navy tint
    ctx.save();
    this.roundRect(ctx, r.x, r.y, r.w, r.h, rad);
    ctx.clip();
    ctx.filter = "blur(18px) saturate(150%)";
    ctx.drawImage(this.bg, 0, 0, layout.width, layout.height);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(21,24,54,0.72)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();

    ctx.save();
    this.roundRect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, rad);
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const iconSize = layout.island.h * 0.34;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    TABS.forEach((label, i) => {
      const active = selected === i;
      const color = active ? "rgba(255,255,255,0.98)" : "rgba(178,186,220,0.72)";
      const cx = layout.tabCenters[i];
      const cy = r.y + r.h * 0.38;
      TAB_ICONS[i](ctx, cx, cy, iconSize, color);
      ctx.fillStyle = color;
      ctx.font = `${active ? 600 : 500} 10px -apple-system, system-ui, sans-serif`;
      ctx.fillText(label, cx, r.y + r.h * 0.79);
    });
    ctx.textAlign = "left";
  }

  private paintProfile(layout: NavLayout, active: boolean) {
    const ctx = this.ctx;
    const { cx, cy, r } = layout.profile;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.filter = "blur(18px) saturate(150%)";
    ctx.drawImage(this.bg, 0, 0, layout.width, layout.height);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(21,24,54,0.68)";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ag = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ag.addColorStop(0, "rgba(94,132,255,0.85)");
    ag.addColorStop(1, "rgba(150,84,220,0.85)");
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "600 16px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AJ", cx, cy + 1);
    ctx.textAlign = "left";

    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (active) {
      ctx.save();
      ctx.shadowColor = "rgba(64,235,150,0.85)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(90,240,165,0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.stroke();
      ctx.restore();
      const rg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.7);
      rg.addColorStop(0, "rgba(70,235,150,0.20)");
      rg.addColorStop(1, "rgba(70,235,150,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
