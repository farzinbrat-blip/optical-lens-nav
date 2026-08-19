export type Rect = { x: number; y: number; w: number; h: number };

export type NavLayout = {
  /** CSS pixel size of the viewport */
  width: number;
  height: number;
  dpr: number;
  island: Rect;
  islandRadius: number;
  tabCenters: number[];
  tabWidth: number;
  centerY: number;
  profile: { cx: number; cy: number; r: number };
  lensRest: { w: number; h: number; r: number };
  lensLift: { w: number; h: number; r: number; dy: number };
};

export const TABS = ["Contacts", "Calls", "Chats", "Settings"] as const;
export type TabId = 0 | 1 | 2 | 3;

export function computeLayout(width: number, height: number, dpr: number, safeBottom: number): NavLayout {
  const landscape = width > height;
  const margin = landscape ? Math.max(24, width * 0.06) : 12;
  const islandH = landscape ? 56 : 64;
  const profileD = islandH - 6;
  const gap = 10;

  const bottomInset = safeBottom + (landscape ? 10 : 16);
  const islandY = height - bottomInset - islandH;
  const islandW = width - margin * 2 - profileD - gap;
  const island: Rect = { x: margin, y: islandY, w: islandW, h: islandH };

  const tabWidth = islandW / TABS.length;
  const tabCenters = TABS.map((_, i) => island.x + tabWidth * (i + 0.5));
  const centerY = islandY + islandH / 2;

  const lensW = Math.min(tabWidth - 4, 92);
  const lensH = islandH - 8;

  return {
    width,
    height,
    dpr,
    island,
    islandRadius: islandH / 2,
    tabCenters,
    tabWidth,
    centerY,
    profile: { cx: island.x + islandW + gap + profileD / 2, cy: centerY, r: profileD / 2 },
    lensRest: { w: lensW, h: lensH, r: lensH / 2 },
    lensLift: { w: lensW * 1.3, h: lensH * 1.24, r: (lensH * 1.24) / 2, dy: -14 },
  };
}

export function nearestTab(x: number, layout: NavLayout): TabId {
  let best: TabId = 0;
  let bestD = Infinity;
  layout.tabCenters.forEach((cx, i) => {
    const d = Math.abs(cx - x);
    if (d < bestD) {
      bestD = d;
      best = i as TabId;
    }
  });
  return best;
}

export function hitTest(x: number, y: number, layout: NavLayout): { kind: "tab"; index: TabId } | { kind: "profile" } | null {
  const p = layout.profile;
  if (Math.hypot(x - p.cx, y - p.cy) <= p.r + 8) return { kind: "profile" };
  const i = layout.island;
  if (x >= i.x - 6 && x <= i.x + i.w + 6 && y >= i.y - 22 && y <= i.y + i.h + 12) {
    return { kind: "tab", index: nearestTab(x, layout) };
  }
  return null;
}
