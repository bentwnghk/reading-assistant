"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

/* ── Palette (mirrors the Chapter 02 landing mockup & NotebookLM) ──
   Each branch gets a saturated stroke + a matching light tint for its leaves.
   The palette cycles if a text yields more than 4 branches. */
const ROOT_COLOR = "#5C6BC0"; // indigo
const LEAF_TEXT = "#37474F"; // dark slate — readable on light tints in light & dark mode
const PALETTE: { stroke: string; fill: string }[] = [
  { stroke: "#EF4444", fill: "#FEE2E2" }, // red
  { stroke: "#F59E0B", fill: "#FEF3C7" }, // amber
  { stroke: "#8B5CF6", fill: "#EDE9FE" }, // violet
  { stroke: "#10B981", fill: "#D1FAE5" }, // emerald
  { stroke: "#3B82F6", fill: "#DBEAFE" }, // blue
  { stroke: "#EC4899", fill: "#FCE7F3" }, // pink
];

/* ── Layout constants (SVG user units) ── */
const PAD_Y = 20;
const PAD_X = 14;
const ROOT_LEFT = PAD_X;
const ROOT_H = 46; // pill height
const ROOT_FONT_MAX = 12;
const ROOT_FONT_MIN = 8;
const ROOT_HPAD = 18;
const ROOT_MIN_W = 60;
const ROOT_GAP = 56;
const BRANCH_W = 132;
const BRANCH_H = 24;
const BRANCH_TO_LEAF_GAP = 56;
const LEAF_W = 158;
const LEAF_H = 18;
const LEAF_GAP = 8;
const BRANCH_GAP = 30;
const TOGGLE_R = 7; // collapse/expand button radius on a branch

const MAX_SCALE = 4;
const EMPTY_SET: Set<number> = new Set();

/* Approximate average glyph width as a fraction of font size. */
const GLYPH_RATIO = 0.56;

function fitFont(text: string, maxWidth: number, maxFont: number, minFont: number): number {
  for (let f = maxFont; f >= minFont; f -= 0.5) {
    if (text.length * f * GLYPH_RATIO <= maxWidth) return f;
  }
  return minFont;
}

type LaidOutLeaf = { text: string; y: number };
type LaidOutBranch = {
  index: number;
  label: string;
  stroke: string;
  fill: string;
  centerY: number;
  leaves: LaidOutLeaf[];
  collapsed: boolean;
};

type Layout = {
  branches: LaidOutBranch[];
  rootCY: number;
  height: number;
};

/** Vertical layout. Collapsed branches reflow into a single BRANCH_H slot
 *  (no leaves), so the tree compacts smoothly when a branch is collapsed. */
function computeLayout(data: MindMapData, collapsed: Set<number>): Layout {
  const branches: LaidOutBranch[] = [];
  let cursor = PAD_Y;

  data.branches.forEach((b, bi) => {
    const color = PALETTE[bi % PALETTE.length];
    const isCollapsed = collapsed.has(bi);
    if (isCollapsed) {
      branches.push({
        index: bi,
        label: b.label,
        stroke: color.stroke,
        fill: color.fill,
        centerY: cursor + BRANCH_H / 2,
        leaves: [],
        collapsed: true,
      });
      cursor += BRANCH_H + BRANCH_GAP;
      return;
    }
    const leafSource = b.leaves.length ? b.leaves : [""];
    const start = cursor + LEAF_H / 2;
    const leaves: LaidOutLeaf[] = leafSource.map((text, li) => ({
      text,
      y: start + li * (LEAF_H + LEAF_GAP),
    }));
    const top = leaves[0].y;
    const bottom = leaves[leaves.length - 1].y;
    branches.push({
      index: bi,
      label: b.label,
      stroke: color.stroke,
      fill: color.fill,
      centerY: (top + bottom) / 2,
      leaves,
      collapsed: false,
    });
    cursor = bottom + LEAF_H / 2 + BRANCH_GAP;
  });

  const height = cursor - BRANCH_GAP + PAD_Y;
  const rootCY = height / 2;
  return { branches, rootCY, height };
}

type Geometry = {
  rootFont: number;
  pillWidth: number;
  rootRight: number;
  branchX: number;
  branchRight: number;
  leafX: number;
  width: number;
};

function computeGeometry(root: string): Geometry {
  const rootFont = fitFont(root, 220, ROOT_FONT_MAX, ROOT_FONT_MIN);
  const textW = root.length * rootFont * GLYPH_RATIO;
  const pillWidth = Math.max(textW + ROOT_HPAD * 2, ROOT_MIN_W);
  const rootRight = ROOT_LEFT + pillWidth;
  const branchX = rootRight + ROOT_GAP;
  const branchRight = branchX + BRANCH_W;
  const leafX = branchRight + BRANCH_TO_LEAF_GAP;
  const width = leafX + LEAF_W + PAD_X;
  return { rootFont, pillWidth, rootRight, branchX, branchRight, leafX, width };
}

type Transform = { tx: number; ty: number; s: number };

/** Interactive left-to-right mind-map tree. The canvas is pannable (drag),
 *  zoomable (wheel / buttons), branches are collapsible (toggle button), and
 *  clicking a node zooms to it. Visual design mirrors the Chapter 02 landing
 *  mockup (`UnderstandMindMapMockup`) and NotebookLM. */
export default function MindMapView({ data }: { data: MindMapData }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startTx: 0, startTy: 0, moved: false });
  const suppressClickRef = useRef(false);
  const minScaleRef = useRef(0);

  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [transform, setTransform] = useState<Transform>({ tx: 0, ty: 0, s: 1 });
  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const layout = useMemo(() => computeLayout(data, collapsed), [data, collapsed]);
  const fullLayout = useMemo(() => computeLayout(data, EMPTY_SET), [data]);
  const geometry = useMemo(() => computeGeometry(data.root), [data.root]);
  const { branches, rootCY } = layout;
  const { rootFont, pillWidth, rootRight, branchX, branchRight, leafX } = geometry;
  const contentW = geometry.width;
  const contentH = layout.height;
  const fullH = fullLayout.height;

  /* Measure the viewport and refit whenever it (or the full content) changes. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setContainer({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cw = container.w;
    const ch = container.h;
    if (!cw || !ch || !contentW || !fullH) return;
    const s = Math.min(cw / contentW, ch / fullH);
    minScaleRef.current = s;
    setTransform({ tx: (cw - contentW * s) / 2, ty: (ch - fullH * s) / 2, s });
  }, [container.w, container.h, contentW, fullH]);

  const clampScale = (s: number) =>
    Math.min(Math.max(s, minScaleRef.current || s), MAX_SCALE);

  function fit() {
    const cw = container.w;
    const ch = container.h;
    if (!cw || !ch || !contentW || !fullH) return;
    const s = Math.min(cw / contentW, ch / fullH);
    minScaleRef.current = s;
    setTransform({ tx: (cw - contentW * s) / 2, ty: (ch - fullH * s) / 2, s });
  }

  function centerOn(cx: number, cy: number, ns: number) {
    const cw = container.w;
    const ch = container.h;
    setTransform({ tx: cw / 2 - cx * ns, ty: ch / 2 - cy * ns, s: ns });
  }

  function zoomAt(screenX: number, screenY: number, factor: number) {
    setTransform((t) => {
      const cx = (screenX - t.tx) / t.s;
      const cy = (screenY - t.ty) / t.s;
      const ns = clampScale(t.s * factor);
      return { tx: screenX - cx * ns, ty: screenY - cy * ns, s: ns };
    });
  }

  /* Native (non-passive) wheel listener so we can preventDefault page scroll. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setTransform((t) => {
        const cx = (sx - t.tx) / t.s;
        const cy = (sy - t.ty) / t.s;
        const ns = clampScale(t.s * (e.deltaY > 0 ? 1 / 1.12 : 1.12));
        return { tx: sx - cx * ns, ty: sy - cy * ns, s: ns };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    suppressClickRef.current = false;
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTx: transform.tx,
      startTy: transform.ty,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      d.moved = true;
      setIsPanning(true);
    }
    if (d.moved) {
      setTransform((t) => ({ ...t, tx: d.startTx + dx, ty: d.startTy + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    if (d.active && d.moved) suppressClickRef.current = true;
    d.active = false;
    setIsPanning(false);
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  function consumeClick(): boolean {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return false;
    }
    return true;
  }

  function onRootClick() {
    if (!consumeClick()) return;
    fit();
  }

  function onBranchBodyClick(b: LaidOutBranch) {
    if (!consumeClick()) return;
    const cx = branchX + BRANCH_W / 2;
    centerOn(cx, b.centerY, clampScale(Math.max(minScaleRef.current * 1.8, 1.6)));
  }

  function onLeafClick(leaf: LaidOutLeaf) {
    if (!consumeClick()) return;
    const cx = leafX + LEAF_W / 2;
    centerOn(cx, leaf.y, clampScale(Math.max(minScaleRef.current * 2.5, 2.2)));
  }

  function onToggleCollapse(bi: number, e: React.MouseEvent) {
    e.stopPropagation();
    consumeClick();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(bi)) next.delete(bi);
      else next.add(bi);
      return next;
    });
  }

  const { tx, ty, s } = transform;

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none overflow-hidden bg-muted/30 dark:bg-muted/20 ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ height: "min(60vh, 640px)", minHeight: 360, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
          transformOrigin: "0 0",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={contentW}
          height={contentH}
          viewBox={`0 0 ${contentW} ${contentH}`}
          role="img"
          aria-label={`Mind map: ${data.root}`}
        >
          {/* connectors: root → branches */}
          {branches.map((b) => (
            <path
              key={`rc-${b.index}`}
              d={`M ${rootRight} ${rootCY} Q ${(rootRight + branchX) / 2} ${b.centerY} ${branchX} ${b.centerY}`}
              stroke={b.stroke}
              strokeWidth={1.3}
              fill="none"
              pointerEvents="none"
            />
          ))}

          {/* connectors: branches → leaves (only when expanded) */}
          {branches.map((b) =>
            b.leaves.map((leaf, li) => (
              <path
                key={`bc-${b.index}-${li}`}
                d={`M ${branchRight} ${b.centerY} Q ${(branchRight + leafX) / 2} ${leaf.y} ${leafX} ${leaf.y}`}
                stroke={b.stroke}
                strokeWidth={0.9}
                fill="none"
                pointerEvents="none"
              />
            )),
          )}

          {/* leaves */}
          {branches.map((b) =>
            b.leaves.map((leaf, li) => {
              if (!leaf.text) return null;
              const fs = fitFont(leaf.text, LEAF_W - 8, 8, 5.5);
              return (
                <g
                  key={`l-${b.index}-${li}`}
                  className="cursor-pointer"
                  onClick={() => onLeafClick(leaf)}
                >
                  <rect
                    x={leafX}
                    y={leaf.y - LEAF_H / 2}
                    width={LEAF_W}
                    height={LEAF_H}
                    rx={3}
                    fill={b.fill}
                    className="transition-opacity hover:opacity-80"
                  />
                  <text
                    x={leafX + LEAF_W / 2}
                    y={leaf.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fs}
                    fill={LEAF_TEXT}
                    pointerEvents="none"
                  >
                    {leaf.text}
                  </text>
                </g>
              );
            }),
          )}

          {/* branches */}
          {branches.map((b) => {
            const fs = fitFont(b.label, BRANCH_W - 24, 9.5, 6.5);
            return (
              <g key={`b-${b.index}`}>
                <g className="cursor-pointer" onClick={() => onBranchBodyClick(b)}>
                  <rect
                    x={branchX}
                    y={b.centerY - BRANCH_H / 2}
                    width={BRANCH_W}
                    height={BRANCH_H}
                    rx={4}
                    fill={b.stroke}
                    className="transition-opacity hover:opacity-90"
                  />
                  <text
                    x={branchX + (BRANCH_W - TOGGLE_R * 2) / 2}
                    y={b.centerY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fs}
                    fontWeight={600}
                    fill="white"
                    pointerEvents="none"
                  >
                    {b.label}
                  </text>
                </g>
                {/* collapse / expand toggle */}
                <g
                  className="cursor-pointer"
                  onClick={(e) => onToggleCollapse(b.index, e)}
                >
                  <circle
                    cx={branchRight - TOGGLE_R - 2}
                    cy={b.centerY}
                    r={TOGGLE_R}
                    fill="rgba(255,255,255,0.28)"
                  />
                  <text
                    x={branchRight - TOGGLE_R - 2}
                    y={b.centerY + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fontWeight={700}
                    fill="white"
                    pointerEvents="none"
                  >
                    {b.collapsed ? "+" : "−"}
                  </text>
                </g>
              </g>
            );
          })}

          {/* root pill */}
          <g className="cursor-pointer" onClick={onRootClick}>
            <rect
              x={ROOT_LEFT}
              y={rootCY - ROOT_H / 2}
              width={pillWidth}
              height={ROOT_H}
              rx={ROOT_H / 2}
              fill={ROOT_COLOR}
              className="transition-opacity hover:opacity-90"
            />
            <text
              x={ROOT_LEFT + pillWidth / 2}
              y={rootCY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={rootFont}
              fontWeight={700}
              fill="white"
              pointerEvents="none"
            >
              {data.root}
            </text>
          </g>
        </svg>
      </div>

      {/* hint */}
      <div className="pointer-events-none absolute left-2 top-2 rounded bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
        {t("reading.mindMap.hint")}
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomAt(container.w / 2, container.h / 2, 1.25)}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
          title={t("reading.mindMap.zoomIn")}
          aria-label={t("reading.mindMap.zoomIn")}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomAt(container.w / 2, container.h / 2, 1 / 1.25)}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
          title={t("reading.mindMap.zoomOut")}
          aria-label={t("reading.mindMap.zoomOut")}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={fit}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
          title={t("reading.mindMap.resetView")}
          aria-label={t("reading.mindMap.resetView")}
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
