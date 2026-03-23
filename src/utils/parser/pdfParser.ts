import * as pdfjsLib from "pdfjs-dist";

function initPdfWorker() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `./scripts/pdf.worker.min.mjs`;
}

async function getTextContent(file: string | ArrayBuffer) {
  try {
    initPdfWorker();

    const loadingTask = pdfjsLib.getDocument(file);
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
        initPdfWorker();

        const loadingTask = pdfjsLib.getDocument(reader.result);
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

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

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

export async function processPdfFile(
  file: File
): Promise<{ text: string; images: string[]; isScanned: boolean }> {
  try {
    const text = await readTextFromPDF(file);
    const cleanedText = text.trim();

    if (cleanedText.length > 50) {
      return {
        text: cleanedText,
        images: [],
        isScanned: false,
      };
    }

    const images = await renderPdfPagesAsImages(file);
    return {
      text: "",
      images,
      isScanned: true,
    };
  } catch {
    const images = await renderPdfPagesAsImages(file);
    return {
      text: "",
      images,
      isScanned: true,
    };
  }
}
