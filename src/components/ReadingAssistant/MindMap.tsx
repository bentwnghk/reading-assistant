"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Waypoints, LoaderCircle, Languages, Network, Download, Move } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import GuideDialog from "@/components/Internal/GuideDialog";
import { useReadingStore } from "@/store/reading";
import { useSettingStore } from "@/store/setting";
import useReadingAssistant from "@/hooks/useReadingAssistant";
import MindMapView, { PALETTE, ROOT_COLOR, LEAF_TEXT } from "./MindMapView";

const MagicDown = dynamic(() => import("@/components/MagicDown/View"));

/** New mind maps are stored as JSON (`MindMapData`); legacy sessions stored a
 *  Mermaid markdown string. Detect which one this is so legacy data still
 *  renders via Mermaid while new generations render as the left-to-right tree. */
function tryParseMindMapData(raw: string): MindMapData | null {
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
function mindMapDataToMermaid(data: MindMapData): string {
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
function pickMindMapSvg(container: HTMLElement | null): SVGSVGElement | null {
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
function colorizeMindMapSvg(svg: SVGSVGElement, data: MindMapData): void {
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

/** Make an SVG safe to rasterize via <img> + canvas. Per the HTML spec, an SVG
 *  containing <foreignObject> (Mermaid's HTML labels) or external resource
 *  references taints the canvas, making toBlob() throw a SecurityError. This
 *  converts <foreignObject> labels to native <text> and strips external refs
 *  / scripts so the export is clean — without losing the visible content. */
function sanitizeForRaster(svg: SVGSVGElement): void {
  const SVGNS = "http://www.w3.org/2000/svg";
  const XLINKNS = "http://www.w3.org/1999/xlink";

  svg.querySelectorAll("script").forEach((el) => el.remove());

  // Strip external url() / @import from <style> blocks (keep theme CSS).
  svg.querySelectorAll("style").forEach((st) => {
    const css = st.textContent ?? "";
    if (/url\(\s*['"]?https?:/i.test(css) || /@import/i.test(css)) {
      st.textContent = css
        .replace(/url\(\s*['"]?https?:[^)]+\)/gi, "none")
        .replace(/@import[^;]+;?/gi, "");
    }
  });

  // Strip external url() from inline style attributes.
  svg.querySelectorAll<SVGElement>("[style]").forEach((el) => {
    const style = el.getAttribute("style");
    if (style && /url\(\s*['"]?https?:/i.test(style)) {
      el.setAttribute("style", style.replace(/url\(\s*['"]?https?:[^)]+\)/gi, "none"));
    }
  });

  // Drop external hrefs (keep data: and internal #refs).
  svg.querySelectorAll<SVGElement>("[href],[xlink\\:href]").forEach((el) => {
    const h = el.getAttribute("href");
    if (h && /^https?:/i.test(h)) el.removeAttribute("href");
    const xh = el.getAttributeNS(XLINKNS, "href");
    if (xh && /^https?:/i.test(xh)) el.removeAttributeNS(XLINKNS, "href");
  });

  // Reusable canvas for word-wrap measurement — see convertForeignObject().
  const measureCtx = document.createElement("canvas").getContext("2d");

  // Convert <foreignObject> HTML labels to native <text>, preserving the line
  // breaks Mermaid/HTML produced on screen. `textContent` flattens <br> and
  // block elements into a single string with no separator, and native SVG
  // <text> does not auto-wrap, so we must (a) walk the DOM to recover the
  // paragraph structure and (b) re-wrap each paragraph to the foreignObject
  // width using canvas measurement — otherwise long labels collapse to one
  // clipped line in the exported PNG.
  svg.querySelectorAll<SVGForeignObjectElement>("foreignObject").forEach((fo) => {
    // Read the font Mermaid applied so the wrapping matches what the browser
    // rendered (mindmap nodes use a non-default size/family).
    let fontSize = 14;
    let fontFamily = "sans-serif";
    const firstEl = fo.firstElementChild as HTMLElement | null;
    if (firstEl) {
      const cs = window.getComputedStyle(firstEl);
      const px = parseFloat(cs.fontSize);
      if (!isNaN(px) && px > 0) fontSize = px;
      if (cs.fontFamily) fontFamily = cs.fontFamily;
    }
    const font = `${fontSize}px ${fontFamily}`;

    const paragraphs = extractHtmlLines(fo)
      .map((l) => l.replace(/\s+/g, " ").trim());
    // Drop trailing empties from the block-walk so they don't add blank lines.
    while (paragraphs.length > 0 && paragraphs[paragraphs.length - 1] === "") {
      paragraphs.pop();
    }
    if (paragraphs.length === 0 || paragraphs.every((p) => !p)) {
      fo.remove();
      return;
    }

    const x = parseFloat(fo.getAttribute("x") ?? "0");
    const y = parseFloat(fo.getAttribute("y") ?? "0");
    const width = parseFloat(fo.getAttribute("width") ?? "0");
    const height = parseFloat(fo.getAttribute("height") ?? "0");
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const lines: string[] = [];
    for (const p of paragraphs) {
      if (!p) {
        lines.push("");
        continue;
      }
      lines.push(...wrapTextLine(measureCtx, p, width, font));
    }

    const lineHeight = fontSize * 1.2;
    const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;

    // Inherit the label color from the on-screen rendering. Both
    // applyContrastTextColors (Mermaid.tsx) and colorizeMindMapSvg set
    // `style.color` on foreignObject descendants; read the first one found.
    let fill = "#333333";
    const colored = Array.from(fo.querySelectorAll<HTMLElement>("*")).find((e) => e.style.color);
    if (colored?.style.color) fill = colored.style.color;

    const replacement = document.createElementNS(SVGNS, "text");
    replacement.setAttribute("x", String(centerX));
    replacement.setAttribute("y", String(firstLineY));
    replacement.setAttribute("text-anchor", "middle");
    replacement.setAttribute("dominant-baseline", "central");
    replacement.setAttribute("font-size", String(fontSize));
    replacement.setAttribute("font-family", fontFamily);
    // Use inline style (not setAttribute) so the color survives Mermaid's
    // generated <style> rules (e.g. `.section-0 text { fill: … }`) which
    // override presentation attributes but not inline styles. Without this,
    // the exported PNG shows Mermaid's default label colors instead of the
    // two-tone palette applied on screen.
    replacement.style.fill = fill;
    lines.forEach((line, i) => {
      const tspan = document.createElementNS(SVGNS, "tspan");
      tspan.setAttribute("x", String(centerX));
      tspan.setAttribute("y", String(firstLineY + i * lineHeight));
      tspan.textContent = line;
      replacement.appendChild(tspan);
    });
    fo.replaceWith(replacement);
  });
}

/** HTML block-level tags that should start a new line when flattening
 *  foreignObject content to text. Inline tags (span, b, i, em, strong, ...)
 *  are walked recursively without breaking the line. */
const BLOCK_TAGS = new Set([
  "div", "p", "ul", "ol", "li", "section", "article",
  "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "tr",
]);

/** Walk an HTML subtree inside a Mermaid <foreignObject> and return its text
 *  split into paragraphs at <br> and block-element boundaries, mirroring the
 *  line structure the browser rendered. Inline elements concatenate onto the
 *  current line. */
function extractHtmlLines(node: Node): string[] {
  const lines: string[] = [""];
  const walk = (n: Node) => {
    n.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        lines[lines.length - 1] += child.textContent ?? "";
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = (child as Element).tagName.toLowerCase();
      if (tag === "br") {
        lines.push("");
        return;
      }
      if (BLOCK_TAGS.has(tag)) {
        if (lines[lines.length - 1] !== "") lines.push("");
        walk(child);
        lines.push("");
        return;
      }
      walk(child);
    });
  };
  walk(node);
  return lines;
}

/** Word-wrap a single paragraph to fit maxWidth using canvas measurement so
 *  the rasterized line breaks match what HTML word-wrap produced on screen.
 *  Falls back to the unwrapped input if no 2D context is available. */
function wrapTextLine(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  if (!text) return [];
  if (!ctx || maxWidth <= 0) return [text];
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else if (current) {
      out.push(current);
      current = word;
    } else {
      // Single word wider than maxWidth — keep it intact on its own line.
      out.push(word);
      current = "";
    }
  }
  if (current) out.push(current);
  return out;
}

function MindMap() {
  const { t } = useTranslation();
  const { extractedText, mindMap, docTitle } = useReadingStore();
  const { mindMapRenderer, update } = useSettingStore();
  const { activeGenerations, generateMindMap } = useReadingAssistant();
  const isGenerating = !!activeGenerations["mindmap"];
  const [useChinese, setUseChinese] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // New mind maps are JSON; legacy sessions stored Mermaid markdown. `parsed`
  // is non-null only for the new structured format, which is what the tree
  // renderer (and the renderer toggle) requires.
  const parsed = mindMap ? tryParseMindMapData(mindMap) : null;
  // There is nothing to export in the legacy+tree CTA state (no rendered map).
  const canDownload = !!mindMap && (mindMapRenderer === "mermaid" || !!parsed);

  // Colorize the Mermaid mindmap SVG after Mermaid finishes rendering. Mermaid
  // assigns the same section color to a branch and all its leaves — we override
  // this with the two-tone palette (saturated branch, light-tint leaf) to match
  // the Tree renderer. Uses a MutationObserver because Mermaid renders
  // asynchronously (dynamic import + async render). Our inline-style writes are
  // attribute changes, not childList changes, so the observer does NOT loop.
  useEffect(() => {
    if (!parsed || mindMapRenderer !== "mermaid") return;
    const container = contentRef.current;
    if (!container) return;

    const tryColorize = () => {
      const svg = pickMindMapSvg(container);
      if (svg && svg.querySelector("g.mindmap-node")) {
        colorizeMindMapSvg(svg, parsed);
      }
    };

    // Try immediately in case the SVG is already in the DOM.
    tryColorize();

    const observer = new MutationObserver(tryColorize);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [parsed, mindMapRenderer]);

  if (!extractedText) {
    return null;
  }

  function handleDownload() {
    const svg = pickMindMapSvg(contentRef.current);
    if (!svg) return;
    const safeFileName = (docTitle || "Untitled")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    // Rasterize the SVG to a PNG via a canvas. The SVG is cloned with an
    // explicit pixel size + namespaces so the Image loads it standalone.
    const clone = svg.cloneNode(true) as SVGSVGElement;
    // Strip <foreignObject>/external refs so the canvas isn't tainted (Mermaid
    // uses HTML labels that would otherwise throw on toBlob).
    sanitizeForRaster(clone);
    // Resolve an intrinsic pixel size. Prefer the viewBox — Mermaid sets
    // width="100%" (not a real size), and the tree SVG carries matching
    // width/height/viewBox anyway.
    let w = 0;
    let h = 0;
    const vb = (clone.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb[2] && vb[3]) {
      w = vb[2];
      h = vb[3];
    }
    if (!w || !h) {
      w = parseFloat(clone.getAttribute("width") ?? "");
      h = parseFloat(clone.getAttribute("height") ?? "");
    }
    if (!w || !h) {
      toast.error(t("reading.mindMap.downloadError"));
      return;
    }
    const SCALE = 2;
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * SCALE);
      canvas.height = Math.round(h * SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error(t("reading.mindMap.downloadError"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error(t("reading.mindMap.downloadError"));
          return;
        }
        saveAs(blob, `${safeFileName} - Mind Map.png`);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(t("reading.mindMap.downloadError"));
    };
    img.src = url;
  }

  return (
    <section className="p-4 border rounded-md mt-4">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between border-b pb-4 mb-4 gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-muted-foreground" />
          {t("reading.mindMap.title")}
          <GuideDialog
            titleKey="reading.mindMap.help.title"
            introKey="reading.mindMap.help.intro"
            itemsBaseKey="reading.mindMap.help.items"
            items={[
              { key: "views", icon: Network, bgClass: "bg-primary/10", iconClass: "text-primary" },
              { key: "interact", icon: Move, bgClass: "bg-amber-500/10", iconClass: "text-amber-500" },
              { key: "bilingual", icon: Languages, bgClass: "bg-orange-500/10", iconClass: "text-orange-500" },
              { key: "export", icon: Download, bgClass: "bg-emerald-500/10", iconClass: "text-emerald-500" },
            ]}
            stepsTitleKey="reading.mindMap.help.stepsTitle"
            stepsKeys={[
              "reading.mindMap.help.steps.s1",
              "reading.mindMap.help.steps.s2",
              "reading.mindMap.help.steps.s3",
              "reading.mindMap.help.steps.s4",
            ]}
            tipTitleKey="reading.mindMap.help.tipTitle"
            tipContentKey="reading.mindMap.help.tipContent"
          />
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
          {canDownload && (
            <Button
              onClick={handleDownload}
              size="sm"
              variant="ghost"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-1" />
              {t("reading.mindMap.download")}
            </Button>
          )}
          <div
            className="flex items-center rounded-md border bg-background/60 p-0.5"
            role="group"
            aria-label={t("reading.mindMap.renderer")}
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update({ mindMapRenderer: "mermaid" })}
              className={`h-7 gap-1 px-2 ${
                mindMapRenderer === "mermaid"
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground"
              }`}
              title={t("reading.mindMap.rendererMap")}
              aria-pressed={mindMapRenderer === "mermaid"}
            >
              <Waypoints className="h-4 w-4" />
              <span>{t("reading.mindMap.rendererMap")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update({ mindMapRenderer: "tree" })}
              className={`h-7 gap-1 px-2 ${
                mindMapRenderer === "tree"
                  ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  : "text-muted-foreground"
              }`}
              title={t("reading.mindMap.rendererTree")}
              aria-pressed={mindMapRenderer === "tree"}
            >
              <Network className="h-4 w-4" />
              <span>{t("reading.mindMap.rendererTree")}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={useChinese}
              onCheckedChange={setUseChinese}
              disabled={isGenerating}
            />
            <span className="text-sm text-muted-foreground">
              {t("reading.mindMap.chineseLabel")}
            </span>
          </div>
          <Button
            onClick={() => generateMindMap(useChinese)}
            disabled={isGenerating}
            size="sm"
            variant={mindMap ? "secondary" : "default"}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>{t("reading.mindMap.generating")}</span>
              </>
            ) : mindMap ? (
              <>
                <Waypoints className="h-4 w-4" />
                <span>{t("reading.mindMap.regenerate")}</span>
              </>
            ) : (
              <>
                <Waypoints className="h-4 w-4" />
                <span>{t("reading.mindMap.generate")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {mindMap ? (
        mindMapRenderer === "tree" ? (
          parsed ? (
            <div ref={contentRef} className="overflow-hidden rounded-md border">
              <MindMapView data={parsed} />
            </div>
          ) : (
            // Legacy Mermaid data can't render as an interactive tree — offer
            // a one-click regeneration, which produces structured JSON.
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-10 text-center text-muted-foreground">
              <Network className="h-10 w-10 opacity-50" />
              <p className="max-w-md px-4 text-sm">{t("reading.mindMap.legacyTreeHint")}</p>
              <Button
                onClick={() => generateMindMap(useChinese)}
                disabled={isGenerating}
                size="sm"
                variant="secondary"
              >
                {isGenerating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Waypoints className="h-4 w-4" />
                )}
                {t("reading.mindMap.regenerate")}
              </Button>
            </div>
          )
        ) : (
          // Radial (Mermaid) view: convert structured data, or render legacy
          // markdown as-is.
          <div ref={contentRef} className="prose prose-slate dark:prose-invert max-w-full overflow-x-auto">
            <Suspense fallback={null}>
              <MagicDown hideMermaidDownload>
                {parsed ? mindMapDataToMermaid(parsed) : mindMap}
              </MagicDown>
            </Suspense>
          </div>
        )
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Waypoints className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("reading.mindMap.emptyTip")}</p>
        </div>
      )}
    </section>
  );
}

export default MindMap;
