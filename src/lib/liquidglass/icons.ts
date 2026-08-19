type Ctx = CanvasRenderingContext2D;

function stroke(ctx: Ctx, color: string, w: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function drawChats(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  const w = s * 0.92;
  const h = s * 0.76;
  const r = s * 0.26;
  const x = cx - w / 2;
  const y = cy - h / 2 - s * 0.05;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.lineTo(x + w * 0.36, y + h);
  ctx.lineTo(x + w * 0.2, y + h + s * 0.24);
  ctx.lineTo(x + w * 0.22, y + h);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  stroke(ctx, color, s * 0.13);
}

export function drawCalls(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  const len = s * 0.98;
  const cap = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(-cap / 2, -len / 2);
  ctx.lineTo(cap / 2, -len / 2);
  ctx.moveTo(0, -len / 2);
  ctx.bezierCurveTo(s * 0.34, -len * 0.16, s * 0.34, len * 0.16, 0, len / 2);
  ctx.moveTo(-cap / 2, len / 2);
  ctx.lineTo(cap / 2, len / 2);
  stroke(ctx, color, s * 0.13);
  ctx.restore();
}

export function drawContacts(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.22, s * 0.24, 0, Math.PI * 2);
  stroke(ctx, color, s * 0.13);
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.42, s * 0.42, Math.PI * 1.15, Math.PI * 1.85);
  stroke(ctx, color, s * 0.13);
}

export function drawSettings(ctx: Ctx, cx: number, cy: number, s: number, color: string) {
  const teeth = 8;
  const rOuter = s * 0.5;
  const rInner = s * 0.38;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  stroke(ctx, color, s * 0.12);
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.17, 0, Math.PI * 2);
  stroke(ctx, color, s * 0.12);
}

export const TAB_ICONS = [drawContacts, drawCalls, drawChats, drawSettings];
