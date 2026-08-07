"use client";

import { useMemo } from "react";

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

/* ── Layout constants (SVG user units) ──
   Horizontal positions (branchX / leafX) are derived from the root pill
   width in `computeGeometry`, so a longer root shifts the whole tree right. */
const PAD_Y = 20;
const PAD_X = 14;
const ROOT_LEFT = PAD_X;
const ROOT_H = 46; // pill height
const ROOT_FONT_MAX = 12;
const ROOT_FONT_MIN = 8;
const ROOT_HPAD = 18; // horizontal padding inside the pill
const ROOT_MIN_W = 60;
const ROOT_GAP = 56; // gap between root pill right edge and first branch
const BRANCH_W = 132;
const BRANCH_H = 24;
const BRANCH_TO_LEAF_GAP = 56;
const LEAF_W = 158;
const LEAF_H = 18;
const LEAF_GAP = 8; // vertical gap between leaves within a branch
const BRANCH_GAP = 30; // vertical gap between branch blocks

/* Approximate average glyph width as a fraction of font size — used to fit
   node labels within their rect without overflowing. */
const GLYPH_RATIO = 0.56;

function fitFont(text: string, maxWidth: number, maxFont: number, minFont: number): number {
  for (let f = maxFont; f >= minFont; f -= 0.5) {
    if (text.length * f * GLYPH_RATIO <= maxWidth) return f;
  }
  return minFont;
}

type LaidOutBranch = {
  label: string;
  stroke: string;
  fill: string;
  centerY: number;
  leaves: { text: string; y: number }[];
};

type Layout = {
  branches: LaidOutBranch[];
  rootCY: number;
  height: number;
};

/** Vertical layout only — assigns a y to every leaf and a centerY to every
 *  branch, centered around the root's vertical midpoint. */
function computeLayout(data: MindMapData): Layout {
  const branches: LaidOutBranch[] = [];
  let cursor = PAD_Y + LEAF_H / 2;

  data.branches.forEach((b, bi) => {
    const color = PALETTE[bi % PALETTE.length];
    const leaves = (b.leaves.length ? b.leaves : [""]).map((text) => {
      const leaf = { text, y: cursor };
      cursor += LEAF_H + LEAF_GAP;
      return leaf;
    });
    const top = leaves[0].y;
    const bottom = leaves[leaves.length - 1].y;
    branches.push({
      label: b.label,
      stroke: color.stroke,
      fill: color.fill,
      centerY: (top + bottom) / 2,
      leaves,
    });
    cursor += BRANCH_GAP;
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

/** Horizontal geometry — the root pill width adapts to the root text, which
 *  cascades to the branch and leaf column x-positions and the total width. */
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

/** Left-to-right mind-map tree rendered as SVG. Visual design mirrors the
 *  Chapter 02 landing-page mockup (`UnderstandMindMapMockup`) and NotebookLM:
 *  indigo root pill, colored branch rects, tinted leaf rects, curved Bezier
 *  connectors colored per branch. */
export default function MindMapView({ data }: { data: MindMapData }) {
  const layout = useMemo(() => computeLayout(data), [data]);
  const geometry = useMemo(() => computeGeometry(data.root), [data.root]);
  const { branches, rootCY, height } = layout;
  const { rootFont, pillWidth, rootRight, branchX, branchRight, leafX, width } = geometry;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ height: "auto", maxWidth: "100%", display: "block" }}
      role="img"
      aria-label={`Mind map: ${data.root}`}
    >
      {/* ── connectors: root → branches (curved Bezier, per-branch color) ── */}
      {branches.map((b) => (
        <path
          key={`rc-${b.label}`}
          d={`M ${rootRight} ${rootCY} Q ${(rootRight + branchX) / 2} ${b.centerY} ${branchX} ${b.centerY}`}
          stroke={b.stroke}
          strokeWidth={1.3}
          fill="none"
        />
      ))}

      {/* ── connectors: branches → leaves ── */}
      {branches.map((b) =>
        b.leaves.map((leaf, li) => (
          <path
            key={`bc-${b.label}-${li}`}
            d={`M ${branchRight} ${b.centerY} Q ${(branchRight + leafX) / 2} ${leaf.y} ${leafX} ${leaf.y}`}
            stroke={b.stroke}
            strokeWidth={0.9}
            fill="none"
          />
        )),
      )}

      {/* ── leaves (light tint rects, dark text) ── */}
      {branches.map((b) =>
        b.leaves.map((leaf, li) => {
          if (!leaf.text) return null;
          const fs = fitFont(leaf.text, LEAF_W - 8, 8, 5.5);
          return (
            <g key={`l-${b.label}-${li}`}>
              <rect
                x={leafX}
                y={leaf.y - LEAF_H / 2}
                width={LEAF_W}
                height={LEAF_H}
                rx={3}
                fill={b.fill}
              />
              <text
                x={leafX + LEAF_W / 2}
                y={leaf.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs}
                fill={LEAF_TEXT}
              >
                {leaf.text}
              </text>
            </g>
          );
        }),
      )}

      {/* ── branches (saturated rects, white text) ── */}
      {branches.map((b) => {
        const fs = fitFont(b.label, BRANCH_W - 10, 9.5, 6.5);
        return (
          <g key={`b-${b.label}`}>
            <rect
              x={branchX}
              y={b.centerY - BRANCH_H / 2}
              width={BRANCH_W}
              height={BRANCH_H}
              rx={4}
              fill={b.stroke}
            />
            <text
              x={branchX + BRANCH_W / 2}
              y={b.centerY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fs}
              fontWeight={600}
              fill="white"
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {/* ── root (indigo pill, white text) ── */}
      <rect
        x={ROOT_LEFT}
        y={rootCY - ROOT_H / 2}
        width={pillWidth}
        height={ROOT_H}
        rx={ROOT_H / 2}
        fill={ROOT_COLOR}
      />
      <text
        x={ROOT_LEFT + pillWidth / 2}
        y={rootCY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={rootFont}
        fontWeight={700}
        fill="white"
      >
        {data.root}
      </text>
    </svg>
  );
}
