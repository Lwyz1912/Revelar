import { editingCssFilter } from "@/lib/editing";
import type { EditingAdjustments } from "@/types/revelar";

async function sourceBlob(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Não foi possível abrir a imagem original.");
  return response.blob();
}

async function imageFromBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Formato de imagem não suportado."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível renderizar a foto."))),
      mimeType,
      quality,
    ),
  );
}

function addEffects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: EditingAdjustments,
) {
  if (adjustments.fade > 0) {
    context.fillStyle = `rgba(229, 215, 190, ${adjustments.fade / 700})`;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.coolShadows > 0) {
    context.save();
    context.globalCompositeOperation = "multiply";
    context.fillStyle = `rgba(31, 92, 116, ${adjustments.coolShadows / 620})`;
    context.fillRect(0, height * 0.25, width, height * 0.75);
    context.restore();
  }
  if (adjustments.warmHighlights > 0) {
    const warmth = context.createLinearGradient(0, 0, 0, height * 0.72);
    warmth.addColorStop(0, `rgba(255, 184, 91, ${adjustments.warmHighlights / 520})`);
    warmth.addColorStop(1, "rgba(255, 184, 91, 0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = warmth;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
  if (adjustments.halation > 0) {
    const glow = context.createRadialGradient(
      width * 0.68,
      height * 0.28,
      0,
      width * 0.68,
      height * 0.28,
      Math.max(width, height) * 0.6,
    );
    glow.addColorStop(0, `rgba(255, 157, 83, ${adjustments.halation / 480})`);
    glow.addColorStop(0.35, `rgba(239, 86, 54, ${adjustments.halation / 1000})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.lightLeak > 0) {
    const leak = context.createLinearGradient(0, 0, width * 0.55, 0);
    leak.addColorStop(0, `rgba(255, 100, 45, ${adjustments.lightLeak / 360})`);
    leak.addColorStop(0.42, `rgba(255, 200, 100, ${adjustments.lightLeak / 900})`);
    leak.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = leak;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.vignette > 0) {
    const vignette = context.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72,
    );
    vignette.addColorStop(0.55, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(8, 5, 3, ${adjustments.vignette / 180})`);
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.grain > 0) {
    const grain = document.createElement("canvas");
    grain.width = 160;
    grain.height = 160;
    const grainContext = grain.getContext("2d")!;
    const pixels = grainContext.createImageData(160, 160);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const tone = Math.floor(Math.random() * 256);
      pixels.data[index] = tone;
      pixels.data[index + 1] = tone;
      pixels.data[index + 2] = tone;
      pixels.data[index + 3] = Math.round(adjustments.grain * 0.7);
    }
    grainContext.putImageData(pixels, 0, 0);
    const pattern = context.createPattern(grain, "repeat");
    if (pattern) {
      context.save();
      context.globalCompositeOperation = "soft-light";
      context.fillStyle = pattern;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }
  if (adjustments.dust > 0) {
    context.save();
    context.globalAlpha = adjustments.dust / 220;
    context.strokeStyle = "#f7ead2";
    context.lineWidth = Math.max(1, width / 1800);
    const marks = Math.round((width * height * adjustments.dust) / 4_000_000);
    for (let index = 0; index < marks; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + Math.random() * width * 0.018, y + Math.random() * height * 0.08);
      context.stroke();
    }
    context.restore();
  }
}

export async function createEditingPreview(file: File) {
  const image = await imageFromBlob(file);
  const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasBlob(canvas, "image/webp", 0.86);
  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-preview.webp`, {
      type: "image/webp",
    }),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export async function renderEditedPhoto(
  sourceUrl: string,
  adjustments: EditingAdjustments,
  options: { mimeType: "image/jpeg" | "image/png"; quality?: number },
) {
  const image = await imageFromBlob(await sourceBlob(sourceUrl));
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { alpha: options.mimeType === "image/png" })!;
  context.filter = editingCssFilter(adjustments);
  context.drawImage(image, 0, 0);
  if (adjustments.motionTrail > 0) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = adjustments.motionTrail / 460;
    const distance = (Math.max(canvas.width, canvas.height) * adjustments.motionTrail) / 9000;
    context.drawImage(image, distance, 0, canvas.width, canvas.height);
    context.globalAlpha = adjustments.motionTrail / 760;
    context.drawImage(image, -distance * 0.7, 0, canvas.width, canvas.height);
    context.restore();
  }
  context.filter = "none";
  addEffects(context, canvas.width, canvas.height, adjustments);
  return canvasBlob(canvas, options.mimeType, options.quality ?? 0.96);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
