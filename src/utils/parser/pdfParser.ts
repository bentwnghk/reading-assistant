import * as pdfjsLib from "pdfjs-dist";

const WORKER_SRC = "./scripts/pdf.worker.min.mjs";

function getPdfDocumentParams(source: string | ArrayBuffer) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  
  return {
    data: typeof source === "string" ? undefined : source,
    url: typeof source === "string" ? source : undefined,
    standardFontDataUrl: "./standard_fonts/",
    wasmUrl: "./scripts/wasm/",
    useWorkerFetch: false,
    useSystemFonts: true,
  };
}

function isBlankCanvas(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let nonWhitePixels = 0;
  const sampleSize = Math.min(data.length / 4, 10000);
  const step = Math.max(1, Math.floor(data.length / 4 / sampleSize));
  
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 250 || g < 250 || b < 250) {
      nonWhitePixels++;
    }
  }
  
  return nonWhitePixels < sampleSize * 0.001;
}

async function getTextContent(file: string | ArrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument(getPdfDocumentParams(file));
    const pdfDocument = await loadingTask.promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .filter((item) => "str" in item)
        .map((item) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error("Error extracting text");
  }
}

export async function renderPdfPagesAsImages(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      if (!reader.result) {
        reject(new Error("File reading failed"));
        return;
      }

      try {
        const loadingTask = pdfjsLib.getDocument(getPdfDocumentParams(reader.result));
        const pdfDocument = await loadingTask.promise;
        const images: string[] = [];
        const scale = 2;

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          if (isBlankCanvas(canvas)) {
            continue;
          }

          const imageDataUrl = canvas.toDataURL("image/png");
          images.push(imageDataUrl);
        }

        resolve(images);
      } catch (error) {
        console.error("Error rendering PDF pages:", error);
        reject(new Error("Error rendering PDF pages"));
      }
    };

    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function readTextFromPDF(file: File): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      if (reader.result) {
        try {
          const text = await getTextContent(reader.result);
          resolve(text);
        } catch (error) {
          console.error("Error processing PDF:", error);
          reject(new Error("Error processing PDF"));
        }
      } else {
        reject(new Error("File reading failed"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function processPdfFile(file: File): Promise<string[]> {
  return renderPdfPagesAsImages(file);
}
