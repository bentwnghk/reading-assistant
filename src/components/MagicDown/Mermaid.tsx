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
} from "lucide-react";
import { Button } from "@/components/Internal/Button";
import { downloadFile } from "@/utils/file";

type Props = {
  children: ReactNode;
  className?: string;
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

function Mermaid({ children, className }: Props) {
  const { t } = useTranslation();
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>("");
  const [waitingCopy, setWaitingCopy] = useState(false);

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

    const padding = 60;
    const scaleX = (containerRect.width - padding) / svgWidth;
    const scaleY = (containerRect.height - padding) / svgHeight;

    return Math.max(0.1, Math.min(scaleX, scaleY, 2));
  }, []);

  useEffect(() => {
    const target = mermaidContainerRef.current;
    if (target) {
      setContent(target.innerText);
      loadMermaid(target, target.innerText);
    }
  }, [children]);

  return (
    <div
      ref={wrapperRef}
      className={`relative cursor-pointer justify-center w-full h-full overflow-hidden rounded ${className || ""}`}
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={4}
        smooth
        centerOnInit
      >
        {({ zoomIn, zoomOut, setTransform }) => {
          const handleFitToContainer = () => {
            const scale = calculateFitScale();
            setTransform(0, 0, scale);
          };

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
                  title={t("editor.mermaid.fitView")}
                  onClick={handleFitToContainer}
                >
                  <RefreshCcw />
                </Button>
              </div>
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ display: "flex", justifyContent: "center", alignItems: "center" }}
              >
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
