import { useRef, useEffect, useState, type ReactNode } from "react";
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
  X,
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

function Mermaid({ children }: Props) {
  const { t } = useTranslation();
  const mermaidContainerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>("");
  const [waitingCopy, setWaitingCopy] = useState<boolean>(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [modalSvg, setModalSvg] = useState<string>("");
  const [modalKey, setModalKey] = useState(0);

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
      setModalSvg(target.innerHTML);
      setModalKey(prev => prev + 1);
      setIsFullscreenOpen(true);
    }
  };

  const closeModal = () => {
    setIsFullscreenOpen(false);
  };

  const resetModal = () => {
    setModalKey(prev => prev + 1);
  };

  useEffect(() => {
    const target = mermaidContainerRef.current;
    if (target) {
      setContent(target.innerText);
      loadMermaid(target, target.innerText);
    }
  }, [children]);

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
                  title={t("editor.mermaid.copyText")}
                  onClick={() => handleCopy()}
                >
                  {waitingCopy ? (
                    <CopyCheck className="h-full w-full text-green-500" />
                  ) : (
                    <Copy className="h-full w-full" />
                  )}
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
                  title={t("editor.mermaid.fullscreen")}
                  onClick={() => openFullscreen()}
                >
                  <Maximize2 />
                </Button>
              </div>
              <div className="absolute bottom-0 right-0 z-50 flex gap-1 print:hidden">
                <Button
                  className="w-6 h-6"
                  size="icon"
                  variant="ghost"
                  title={t("editor.mermaid.resize")}
                  onClick={() => resetTransform()}
                >
                  <RefreshCcw />
                </Button>
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
              </div>
              <TransformComponent>
                <div
                  className="mermaid cursor-pointer"
                  ref={mermaidContainerRef}
                  onClick={() => openFullscreen()}
                >
                  {children}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0">
          <DialogTitle className="sr-only">
            {t("editor.mermaid.fullscreen")}
          </DialogTitle>
          <TransformWrapper
            key={modalKey}
            initialScale={1}
            minScale={0.1}
            maxScale={5}
            centerOnInit
            smooth
          >
            {({ zoomIn, zoomOut }) => (
              <div className="relative w-full h-full">
                <div className="absolute top-2 right-2 z-50 flex gap-1">
                  <Button
                    className="w-8 h-8"
                    size="icon"
                    variant="secondary"
                    title={t("editor.mermaid.downloadSvg")}
                    onClick={() => downloadSvg()}
                  >
                    <Download />
                  </Button>
                  <Button
                    className="w-8 h-8"
                    size="icon"
                    variant="secondary"
                    title={t("editor.mermaid.close")}
                    onClick={() => closeModal()}
                  >
                    <X />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-background/80 rounded-lg p-2 backdrop-blur-sm">
                  <Button
                    size="sm"
                    variant="secondary"
                    title={t("editor.mermaid.resize")}
                    onClick={() => resetModal()}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
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
                </div>
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <div
                    className="mermaid w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-none [&_svg]:max-h-none"
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
