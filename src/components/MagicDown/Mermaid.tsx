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
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/Internal/Button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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

function stripSvgDimensions(svgString: string): string {
  return svgString
    .replace(/width="[^"]*"/g, 'width="100%"')
    .replace(/height="[^"]*"/g, 'height="100%"')
    .replace(/style="[^"]*"/g, (match) => {
      return match.replace(/max-width:\s*[^;]+;?/g, '').replace(/max-height:\s*[^;]+;?/g, '');
    });
}

function Mermaid({ children }: Props) {
  const { t } = useTranslation();
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const modalMermaidRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<any>(null);
  const [content, setContent] = useState<string>("");
  const [waitingCopy, setWaitingCopy] = useState<boolean>(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [modalSvg, setModalSvg] = useState<string>("");
  const [transformKey, setTransformKey] = useState(0);

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

  const openFullscreen = () => {
    const target = mermaidContainerRef.current;
    if (target) {
      const svgWithResponsiveDimensions = stripSvgDimensions(target.innerHTML);
      setModalSvg(svgWithResponsiveDimensions);
      setIsFullscreenOpen(true);
      setTransformKey(prev => prev + 1);
    }
  };

  const downloadModalSvg = () => {
    const target = mermaidContainerRef.current;
    if (target) {
      downloadFile(target.innerHTML, Date.now() + ".svg", "image/svg+xml");
    }
  };

  const fitToContainer = useCallback(() => {
    if (!modalMermaidRef.current || !transformRef.current) return;
    
    const svg = modalMermaidRef.current.querySelector('svg');
    if (!svg) return;

    const container = modalMermaidRef.current.parentElement?.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const svgBBox = svg.getBBox();
    
    const scaleX = containerRect.width / svgBBox.width;
    const scaleY = containerRect.height / svgBBox.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    transformRef.current.resetTransform();
    transformRef.current.setTransform(
      (containerRect.width - svgBBox.width * scale) / 2,
      (containerRect.height - svgBBox.height * scale) / 2,
      scale
    );
  }, []);

  useEffect(() => {
    const target = mermaidContainerRef.current;
    if (target) {
      setContent(target.innerText);
      loadMermaid(target, target.innerText);
    }
  }, [children]);

  useEffect(() => {
    if (isFullscreenOpen && modalSvg) {
      const timer = setTimeout(() => {
        fitToContainer();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFullscreenOpen, modalSvg, fitToContainer]);

  return (
    <>
      <div className="relative cursor-pointer justify-center w-full overflow-auto rounded">
        <TransformWrapper initialScale={2} smooth>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-0 right-0 z-50 flex gap-1 print:hidden">
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.fullscreen")}
                  onClick={() => openFullscreen()}
                >
                  <Maximize2 />
                </Button>
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
                  onClick={() => resetTransform()}
                >
                  <RefreshCcw />
                </Button>
              </div>
              <TransformComponent>
                <div className="mermaid" ref={mermaidContainerRef}>
                  {children}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 bg-background/95 backdrop-blur-sm">
          <DialogTitle className="sr-only">
            {t("editor.mermaid.fullscreen")}
          </DialogTitle>
          <TransformWrapper
            key={transformKey}
            ref={transformRef}
            initialScale={1}
            minScale={0.1}
            maxScale={5}
            centerOnInit={false}
            smooth
            limitToBounds={false}
          >
            {({ zoomIn, zoomOut }) => (
              <div className="relative w-full h-full flex flex-col">
                <div className="absolute top-2 right-2 z-50 flex gap-1">
                  <Button
                    className="w-8 h-8"
                    size="icon"
                    variant="secondary"
                    title={t("editor.mermaid.downloadSvg")}
                    onClick={() => downloadModalSvg()}
                  >
                    <Download />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-background/80 rounded-lg p-2 backdrop-blur-sm">
                  <Button
                    size="sm"
                    variant="secondary"
                    title={t("editor.mermaid.zoomIn")}
                    onClick={() => zoomIn()}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title={t("editor.mermaid.zoomOut")}
                    onClick={() => zoomOut()}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    title={t("editor.mermaid.resize")}
                    onClick={fitToContainer}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </div>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                  <div
                    ref={modalMermaidRef}
                    className="mermaid"
                    dangerouslySetInnerHTML={{ __html: modalSvg }}
                  />
                </TransformComponent>
              </div>
            )}
          </TransformWrapper>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Mermaid;
