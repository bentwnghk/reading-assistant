"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { PALETTE, ROOT_COLOR, LEAF_TEXT } from "@/utils/mindmap";

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

/* Approximate glyph width as a fraction of font size. CJK glyphs are roughly
   full-width (~1em) while Latin glyphs are ~0.56em; treating them the same
   made Chinese labels overflow their pill/box (e.g. 9+ root characters). */
const LATIN_RATIO = 0.56;
const CJK_RATIO = 1.0;

function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x3040 && code <= 0x30ff) || // Hiragana / Katakana
    (code >= 0x3400 && code <= 0x9fff) || // CJK Unified Ideographs (+ Ext A)
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
    (code >= 0xff00 && code <= 0xffef) // Fullwidth Forms
  );
}

function measureText(text: string, font: number): number {
  let w = 0;
  for (const ch of text) {
    w += (isCJK(ch) ? CJK_RATIO : LATIN_RATIO) * font;
  }
  return w;
}

function fitFont(text: string, maxWidth: number, maxFont: number, minFont: number): number {
  for (let f = maxFont; f >= minFont; f -= 0.5) {
    if (measureText(text, f) <= maxWidth) return f;
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
  const textW = measureText(root, rootFont);
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
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    moved: false,
    captured: false,
  });
  const pinchRef = useRef<{ p1: { x: number; y: number }; p2: { x: number; y: number }; t: Transform } | null>(null);
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

  function releasePanCapture() {
    const d = panRef.current;
    if (d.captured) {
      try {
        containerRef.current?.releasePointerCapture(d.pointerId);
      } catch {
        /* noop */
      }
    }
    d.captured = false;
    d.active = false;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    suppressClickRef.current = false;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      // Begin tracking a potential pan. We do NOT capture yet — capturing in
      // pointerdown retargets pointer events to the container and prevents
      // the click that node onClick handlers rely on. Capture only starts
      // once movement proves this is a drag (see onPointerMove).
      panRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTx: transform.tx,
        startTy: transform.ty,
        moved: false,
        captured: false,
      };
    } else if (pointersRef.current.size === 2) {
      // Second finger lands → switch from pan to pinch.
      releasePanCapture();
      setIsPanning(false);
      const pts = [...pointersRef.current.values()];
      pinchRef.current = { p1: pts[0], p2: pts[1], t: transform };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch: scale around the gesture midpoint and translate so
    // the midpoint's content point tracks the fingers (natural touch feel).
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const p1 = pts[0];
      const p2 = pts[1];
      const start = pinchRef.current;
      const startDist = Math.hypot(start.p2.x - start.p1.x, start.p2.y - start.p1.y) || 1;
      const curDist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
      const ns = clampScale(start.t.s * (curDist / startDist));
      const startMidX = (start.p1.x + start.p2.x) / 2;
      const startMidY = (start.p1.y + start.p2.y) / 2;
      const curMidX = (p1.x + p2.x) / 2;
      const curMidY = (p1.y + p2.y) / 2;
      const cx = (startMidX - start.t.tx) / start.t.s;
      const cy = (startMidY - start.t.ty) / start.t.s;
      setTransform({ tx: curMidX - cx * ns, ty: curMidY - cy * ns, s: ns });
      return;
    }

    const d = panRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      d.moved = true;
      setIsPanning(true);
      try {
        containerRef.current?.setPointerCapture(d.pointerId);
        d.captured = true;
      } catch {
        /* noop */
      }
    }
    if (d.moved) {
      setTransform((t) => ({ ...t, tx: d.startTx + dx, ty: d.startTy + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const wasTracked = pointersRef.current.has(e.pointerId);
    pointersRef.current.delete(e.pointerId);

    const d = panRef.current;
    if (d.active && d.pointerId === e.pointerId) {
      if (d.moved) suppressClickRef.current = true;
      releasePanCapture();
      setIsPanning(false);
    }

    if (wasTracked && pointersRef.current.size < 2) {
      const wasPinching = pinchRef.current !== null;
      pinchRef.current = null;
      if (wasPinching) suppressClickRef.current = true;
      // One finger remains after a pinch → let it continue as a fresh pan.
      if (pointersRef.current.size === 1) {
        const [pid] = [...pointersRef.current.keys()];
        const [pt] = [...pointersRef.current.values()];
        panRef.current = {
          active: true,
          pointerId: pid,
          startX: pt.x,
          startY: pt.y,
          startTx: transform.tx,
          startTy: transform.ty,
          moved: false,
          captured: false,
        };
      }
    }
  }

  function onPointerCancel() {
    pointersRef.current.clear();
    pinchRef.current = null;
    releasePanCapture();
    setIsPanning(false);
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
      onPointerCancel={onPointerCancel}
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
          style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
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
