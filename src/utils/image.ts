/** Browser-only image helpers (canvas). */

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

export interface PercentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops an image data URL to a rectangle expressed in percent (0–100) of the
 * image, at the image's native resolution (no resampling), as high-quality JPEG.
 */
export async function cropImage(
  dataUrl: string,
  rect: PercentRect,
  quality = 0.95,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const x = Math.round((clamp(rect.x) / 100) * img.naturalWidth);
  const y = Math.round((clamp(rect.y) / 100) * img.naturalHeight);
  const width = Math.max(
    1,
    Math.min(img.naturalWidth - x, Math.round((clamp(rect.width) / 100) * img.naturalWidth)),
  );
  const height = Math.max(
    1,
    Math.min(img.naturalHeight - y, Math.round((clamp(rect.height) / 100) * img.naturalHeight)),
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Downscales an image data URL so its longest side is at most `maxSide` px and
 * re-encodes it as JPEG. Handwriting stays legible at ~2000px while payloads
 * (OCR request + DB row) shrink from several MB to a few hundred KB.
 */
export async function downscaleImage(
  dataUrl: string,
  maxSide = 2000,
  quality = 0.85,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const ratio = longest > maxSide ? maxSide / longest : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  // JPEG has no alpha: flatten transparent PNG scans onto white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
