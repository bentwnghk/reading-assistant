/* Shared mind-map helpers used by both the main-page Mind Map section and
 * read-only viewers (e.g. the User Management Student Data dialog), so every
 * surface renders the radial Mermaid view with the same two-tone palette.
 * Rendered identically = implemented once (see AGENTS.md §M on parallel
 * copies drifting). */

/* ── Palette (mirrors the Chapter 02 landing mockup & NotebookLM) ──
   Each branch gets a saturated stroke + a matching light tint for its leaves.
   The palette cycles if a text yields more than 4 branches.
   Shared by MindMapView (tree renderer) and the Mermaid colorizer so both
   renderers mimic the same two-tone scheme. */
export const ROOT_COLOR = "#5C6BC0"; // indigo
export const LEAF_TEXT = "#37474F"; // dark slate — readable on light tints in light & dark mode
export const PALETTE: { stroke: string; fill: string }[] = [
  { stroke: "#EF4444", fill: "#FEE2E2" }, // red
  { stroke: "#F59E0B", fill: "#FEF3C7" }, // amber
  { stroke: "#8B5CF6", fill: "#EDE9FE" }, // violet
  { stroke: "#10B981", fill: "#D1FAE5" }, // emerald
  { stroke: "#3B82F6", fill: "#DBEAFE" }, // blue
  { stroke: "#EC4899", fill: "#FCE7F3" }, // pink
];

/** New mind maps are stored as JSON (`MindMapData`); legacy sessions stored a
 *  Mermaid markdown string. Detect which one this is so legacy data still
 *  renders via Mermaid while new generations render as structured data. */
export function tryParseMindMapData(raw: string): MindMapData | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Legacy Mermaid markdown starts with a code fence or a diagram keyword.
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (
      obj &&
      typeof obj.root === "string" &&
      Array.isArray(obj.branches) &&
      obj.branches.length > 0
    ) {
      return obj as MindMapData;
    }
  } catch {
    // Not valid JSON — fall through to Mermaid rendering.
  }
  return null;
}

/** Render structured mind-map data as a radial Mermaid `mindmap` diagram, so
 *  users who prefer the classic look can view the same data without a second
 *  AI call. Labels are JSON-quoted to tolerate special characters. */
export function mindMapDataToMermaid(data: MindMapData): string {
  const clean = (s: string) => s.replace(/"/g, "'").replace(/\s+/g, " ").trim();
  const lines: string[] = ["mindmap", `  root((${clean(data.root)}))`];
  data.branches.forEach((b, bi) => {
    lines.push(`    b${bi}[${JSON.stringify(clean(b.label))}]`);
    b.leaves.forEach((leaf, li) => {
      lines.push(`      l${bi}_${li}[${JSON.stringify(clean(leaf))}]`);
    });
  });
  return "```mermaid\n" + lines.join("\n") + "\n```";
}

/** Find the actual mind-map <svg> inside the content container. We can't just
 *  querySelector("svg") on the whole section because the toolbar/header icons
 *  (lucide) are <svg> too and appear first in the DOM. Picking the SVG with
 *  the largest area reliably returns the diagram for both renderers (and
 *  ignores stray icon SVGs Mermaid's wrapper may inject). */
export function pickMindMapSvg(container: HTMLElement | null): SVGSVGElement | null {
  if (!container) return null;
  const svgs = Array.from(container.querySelectorAll("svg"));
  if (svgs.length === 0) return null;
  if (svgs.length === 1) return svgs[0];
  const area = (svg: SVGSVGElement): number => {
    const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] && vb[3]) return vb[2] * vb[3];
    const w = parseFloat(svg.getAttribute("width") ?? "");
    const h = parseFloat(svg.getAttribute("height") ?? "");
    if (w && h) return w * h;
    const rect = svg.getBoundingClientRect();
    return rect.width * rect.height;
  };
  return svgs.reduce((best, svg) => (area(svg) > area(best) ? svg : best), svgs[0]);
}

/** Extract the visible label text from a Mermaid mindmap node `<g>`. */
function getNodeText(g: Element): string {
  const fo = g.querySelector("foreignObject");
  if (fo) return fo.textContent || "";
  const text = g.querySelector("text");
  return text?.textContent || "";
}

/** Apply fill + text colors to a mindmap node using inline styles so they
 *  override Mermaid's generated `<style>` block (inline > stylesheet > attribute
 *  in the SVG cascade). `applyContrastTextColors` in Mermaid.tsx runs before
 *  this (it also uses inline styles), so we must match its approach to win. */
function colorizeNode(g: Element, fill: string, textColor: string): void {
  g.querySelectorAll<SVGElement>("rect, circle, ellipse, polygon, path").forEach((shape) => {
    shape.style.fill = fill;
    shape.style.stroke = "none";
  });
  g.querySelectorAll<SVGElement>("text, tspan").forEach((t) => {
    t.style.fill = textColor;
  });
  g.querySelectorAll<HTMLElement>("foreignObject *").forEach((t) => {
    t.style.color = textColor;
  });
}

/** Override Mermaid's default mindmap colors with the Tree view's two-tone palette.
 *  Mermaid assigns the SAME `section-N` class (and thus the same color) to a branch
 *  and all of its leaves. We walk the rendered SVG and differentiate them:
 *  root → indigo, branches → saturated palette stroke, leaves → matching light tint.
 *  Branch vs. leaf is determined by matching the node's text against `data.branches`. */
export function colorizeMindMapSvg(svg: SVGSVGElement, data: MindMapData): void {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const branchLabels = new Set(data.branches.map((b) => norm(b.label)));

  // Root nodes (class includes `section-root` or `section--1`)
  svg.querySelectorAll("g.section-root, g.section--1").forEach((g) => {
    colorizeNode(g, ROOT_COLOR, "#ffffff");
  });

  // Branch vs leaf nodes — identified by text matching + section class
  svg.querySelectorAll<SVGGElement>("g.mindmap-node").forEach((g) => {
    const cls = g.getAttribute("class") || "";
    if (cls.includes("section-root") || cls.includes("section--1")) return;

    const text = norm(getNodeText(g));
    const sectionMatch = cls.match(/section-(\d+)/);
    const section = sectionMatch ? parseInt(sectionMatch[1], 10) : 0;
    const color = PALETTE[section % PALETTE.length];

    if (branchLabels.has(text)) {
      colorizeNode(g, color.stroke, "#ffffff");
    } else {
      colorizeNode(g, color.fill, LEAF_TEXT);
    }
  });

  // Recolor connecting edges to match branch palette
  const branchSections = new Set<number>();
  data.branches.forEach((_, bi) => branchSections.add(bi % 11));
  branchSections.forEach((section) => {
    const color = PALETTE[section % PALETTE.length];
    svg.querySelectorAll<SVGElement>(`.section-edge-${section}`).forEach((el) => {
      el.style.stroke = color.stroke;
    });
  });
}
