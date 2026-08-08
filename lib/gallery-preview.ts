function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível gerar a prévia desta imagem."));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar prévia protegida."))),
      "image/jpeg",
      0.84,
    );
  });
}

function drawWatermarkText(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string,
) {
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((-27 * Math.PI) / 180);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(22, Math.round(width / 34))}px Arial, sans-serif`;
  context.fillStyle = "rgba(255, 255, 255, 0.34)";
  context.strokeStyle = "rgba(0, 0, 0, 0.16)";
  context.lineWidth = 2;
  const text = `${label.toUpperCase()} · PROVA`;
  const stepX = Math.max(260, width * 0.32);
  const stepY = Math.max(150, height * 0.24);
  for (let y = -height; y <= height; y += stepY) {
    for (let x = -width; x <= width; x += stepX) {
      context.strokeText(text, x, y);
      context.fillText(text, x, y);
    }
  }
  context.restore();
}

function drawWatermarkImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const targetWidth = Math.min(width * 0.34, 520);
  const ratio = image.naturalHeight / image.naturalWidth;
  const targetHeight = targetWidth * ratio;
  context.save();
  context.globalAlpha = 0.42;
  context.translate(width / 2, height / 2);
  context.rotate((-24 * Math.PI) / 180);
  const stepX = targetWidth * 1.45;
  const stepY = Math.max(targetHeight * 2.7, height * 0.28);
  for (let y = -height; y <= height; y += stepY) {
    for (let x = -width; x <= width; x += stepX) {
      context.drawImage(
        image,
        x - targetWidth / 2,
        y - targetHeight / 2,
        targetWidth,
        targetHeight,
      );
    }
  }
  context.restore();
}

export async function createProtectedPreview({
  file,
  label,
  clientName,
  watermarkFile,
}: {
  file: File;
  label: string;
  clientName: string;
  watermarkFile?: File | null;
}) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error(
      "RAW e ZIP são internos e precisam de uma versão JPG para aparecer na galeria.",
    );
  }
  const image = await loadImage(file);
  const maxEdge = 2200;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("O navegador não conseguiu preparar a prévia.");
  context.drawImage(image, 0, 0, width, height);
  if (watermarkFile) {
    const watermark = await loadImage(watermarkFile);
    drawWatermarkImage(context, watermark, width, height);
  } else {
    drawWatermarkText(context, width, height, label || "Revelar.");
  }
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.52)";
  context.fillRect(0, height - Math.max(28, height * 0.035), width, Math.max(28, height * 0.035));
  context.fillStyle = "rgba(255, 255, 255, 0.84)";
  context.font = `600 ${Math.max(11, Math.round(width / 130))}px Arial, sans-serif`;
  context.textAlign = "right";
  context.fillText(
    `${clientName} · uso somente para seleção`,
    width - Math.max(12, width * 0.012),
    height - Math.max(8, height * 0.01),
  );
  context.restore();
  const blob = await toBlob(canvas);
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}-prova.jpg`, { type: "image/jpeg" });
}
