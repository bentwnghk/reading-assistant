import { useRef, useEffect, useState, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import copy from "copy-to-clipboard";
import { customAlphabet } from "nanoid";
import {
  Download,
  Copy,
  CopyCheck,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
  Map,
} from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { downloadFile } from "@/utils/file";

type Props = {
  children: ReactNode;
};

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", 8);

async function loadMermaid(element: HTMLElement, code: string) {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({ startOnLoad: false });
  const canParse = await mermaid.parse(code, { suppressErrors: true });
  if (canParse) {
    await mermaid.render(nanoid(), code).then(({ svg }) => {
      element.innerHTML = svg;
    });
  }
}

function Mermaid({ children }: Props) {
  const { t } = useTranslation();
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>("");
  const [waitingCopy, setWaitingCopy] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [initialScale, setInitialScale] = useState<number>(1);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number } | null>(null);

  function downloadSvg() {
    const target = mermaidContainerRef.current;
    if (target) {
      downloadFile(target.innerHTML, Date.now() + ".svg", "image/svg+xml");
    }
  }

  const handleCopy = () => {
    const target = mermaidContainerRef.current;
    if (target) {
      setWaitingCopy(true);
      copy(content);
      setTimeout(() => {
        setWaitingCopy(false);
      }, 1200);
    }
  };

  const calculateFitScale = useCallback(() => {
    const container = wrapperRef.current;
    const svgElement = mermaidContainerRef.current?.querySelector("svg");
    if (!container || !svgElement) return 1;

    const containerRect = container.getBoundingClientRect();
    const svgWidth = svgElement.getBBox?.()?.width || svgElement.clientWidth || 800;
    const svgHeight = svgElement.getBBox?.()?.height || svgElement.clientHeight || 600;

    setSvgDimensions({ width: svgWidth, height: svgHeight });

    const padding = 40;
    const scaleX = (containerRect.width - padding) / svgWidth;
    const scaleY = (containerRect.height - padding) / svgHeight;

    return Math.min(scaleX, scaleY, 1);
  }, []);

  useEffect(() => {
    const target = mermaidContainerRef.current;
    if (target) {
      setContent(target.innerText);
      loadMermaid(target, target.innerText).then(() => {
        setTimeout(() => {
          const scale = calculateFitScale();
          setInitialScale(scale);
        }, 100);
      });
    }
  }, [children, calculateFitScale]);

  return (
    <div ref={wrapperRef} className="relative cursor-pointer justify-center w-full overflow-auto rounded min-h-[300px]">
      <TransformWrapper initialScale={initialScale} minScale={0.1} maxScale={3} smooth centerOnInit>
        {({ zoomIn, zoomOut, setTransform, instance }) => {
          const handleFitToContainer = () => {
            const scale = calculateFitScale();
            setTransform(0, 0, scale);
          };

          const viewportState = instance.transformState;

          return (
            <>
              <div className="absolute top-0 right-0 z-50 flex gap-1 print:hidden">
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.downloadSvg")}
                  onClick={() => downloadSvg()}
                >
                  <Download />
                </Button>
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.copyText")}
                  onClick={() => handleCopy()}
                >
                  {waitingCopy ? (
                    <CopyCheck className="h-full w-full text-green-500" />
                  ) : (
                    <Copy className="h-full w-full" />
                  )}
                </Button>
              </div>
              <div className="absolute bottom-0 right-0 z-50 flex gap-1 print:hidden">
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.zoomIn")}
                  onClick={() => zoomIn()}
                >
                  <ZoomIn />
                </Button>
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.zoomOut")}
                  onClick={() => zoomOut()}
                >
                  <ZoomOut />
                </Button>
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.resize")}
                  onClick={handleFitToContainer}
                >
                  <RefreshCcw />
                </Button>
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.toggleMinimap")}
                  onClick={() => setShowMinimap(!showMinimap)}
                >
                  <Map className={showMinimap ? "h-full w-full text-primary" : "h-full w-full"} />
                </Button>
              </div>
              {showMinimap && svgDimensions && (
                <div className="absolute bottom-10 left-2 z-40 p-2 bg-background/80 border rounded shadow-lg print:hidden">
                  <div className="relative w-32 h-24 overflow-hidden rounded bg-muted">
                    <div
                      className="mermaid-preview scale-[0.1] origin-top-left"
                      style={{ width: svgDimensions.width, height: svgDimensions.height }}
                      dangerouslySetInnerHTML={{ __html: mermaidContainerRef.current?.innerHTML || "" }}
                    />
                    <div
                      className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                      style={{
                        left: `${Math.max(0, Math.min(70, ((-viewportState.positionX / svgDimensions.width) * 100)))}%`,
                        top: `${Math.max(0, Math.min(70, ((-viewportState.positionY / svgDimensions.height) * 100)))}%`,
                        width: `${Math.min(100, (1 / viewportState.scale) * 100)}%`,
                        height: `${Math.min(100, (1 / viewportState.scale) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <TransformComponent>
                <div className="mermaid" ref={mermaidContainerRef}>
                  {children}
                </div>
              </TransformComponent>
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}

export default Mermaid;
