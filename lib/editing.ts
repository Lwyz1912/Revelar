import type { EditingAdjustments, EditingPreset } from "@/types/revelar";

export const neutralAdjustments: EditingAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  fade: 0,
  grain: 0,
  vignette: 0,
  halation: 0,
  chromatic: 0,
  dust: 0,
  lightLeak: 0,
};

function recipe(changes: Partial<EditingAdjustments>): EditingAdjustments {
  return { ...neutralAdjustments, ...changes };
}

export const builtInPresets: EditingPreset[] = [
  {
    id: "revelar-72",
    name: "R72",
    camera: "REVELAR 72",
    description: "Quente, suave e com grão de filme.",
    builtIn: true,
    adjustments: recipe({
      exposure: 4,
      contrast: -10,
      highlights: -18,
      shadows: 15,
      temperature: 22,
      saturation: -8,
      fade: 16,
      grain: 28,
      vignette: 8,
      halation: 16,
    }),
  },
  {
    id: "revelar-pocket",
    name: "Pocket 00",
    camera: "POCKET 2000",
    description: "Compacta digital, flash frio e cores diretas.",
    builtIn: true,
    adjustments: recipe({
      exposure: 8,
      contrast: 18,
      highlights: 12,
      shadows: -12,
      temperature: -9,
      tint: 5,
      saturation: 13,
      grain: 8,
      chromatic: 14,
    }),
  },
  {
    id: "revelar-sun",
    name: "Sun 35",
    camera: "SUN 35",
    description: "Filme ensolarado, pele quente e luz vazada.",
    builtIn: true,
    adjustments: recipe({
      exposure: 7,
      contrast: 4,
      highlights: -12,
      shadows: 10,
      temperature: 30,
      tint: 3,
      saturation: 8,
      fade: 8,
      grain: 18,
      halation: 22,
      lightLeak: 18,
    }),
  },
  {
    id: "revelar-night",
    name: "Night 800",
    camera: "NIGHT 800",
    description: "Sombras profundas, neon e grão marcado.",
    builtIn: true,
    adjustments: recipe({
      exposure: -4,
      contrast: 22,
      highlights: -20,
      shadows: -8,
      temperature: -12,
      tint: 14,
      saturation: -2,
      grain: 34,
      vignette: 24,
      chromatic: 10,
    }),
  },
  {
    id: "revelar-mono",
    name: "Mono 400",
    camera: "MONO 400",
    description: "Preto e branco macio com textura clássica.",
    builtIn: true,
    adjustments: recipe({
      contrast: 15,
      highlights: -12,
      shadows: 8,
      saturation: -100,
      fade: 10,
      grain: 30,
      vignette: 13,
    }),
  },
  {
    id: "revelar-clean",
    name: "Clean Pro",
    camera: "CLEAN PRO",
    description: "Natural e discreto para trabalhos profissionais.",
    builtIn: true,
    adjustments: recipe({
      exposure: 3,
      contrast: 5,
      highlights: -20,
      shadows: 18,
      temperature: 4,
      saturation: 2,
    }),
  },
];

export function clampAdjustment(value: number) {
  return Math.max(-100, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

export function normalizeAdjustments(
  value?: Partial<EditingAdjustments> | null,
): EditingAdjustments {
  return Object.fromEntries(
    Object.keys(neutralAdjustments).map((key) => [
      key,
      clampAdjustment(value?.[key as keyof EditingAdjustments] ?? 0),
    ]),
  ) as EditingAdjustments;
}

export function editingCssFilter(adjustments: EditingAdjustments) {
  const brightness = 1 + adjustments.exposure / 180 + adjustments.shadows / 500;
  const contrast = 1 + adjustments.contrast / 100 - adjustments.fade / 230;
  const saturation = Math.max(0, 1 + adjustments.saturation / 100);
  const sepia = Math.max(0, adjustments.temperature) / 260;
  const hue = adjustments.tint / 7 - adjustments.temperature / 18;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${sepia}) hue-rotate(${hue}deg)`;
}

function readNumber(source: string, names: string[]) {
  for (const name of names) {
    const attribute = source.match(new RegExp(`(?:crs:)?${name}=["']([^"']+)["']`, "i"));
    const element = source.match(
      new RegExp(`<(?:crs:)?${name}[^>]*>([^<]+)</(?:crs:)?${name}>`, "i"),
    );
    const parsed = Number(attribute?.[1] ?? element?.[1]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readName(source: string, fallback: string) {
  const value =
    source.match(/(?:crs:)?Name=["']([^"']+)["']/i)?.[1] ||
    source.match(/<rdf:li[^>]*>([^<]+)<\/rdf:li>/i)?.[1];
  return value?.trim().slice(0, 80) || fallback.replace(/\.(xmp|dng)$/i, "");
}

export async function parseImportedPreset(file: File): Promise<EditingPreset> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "xmp" && extension !== "dng") {
    throw new Error("Escolha um preset .xmp ou .dng.");
  }
  if (file.size > 80 * 1024 * 1024) {
    throw new Error("O arquivo de preset deve ter até 80 MB.");
  }
  const bytes = await file.arrayBuffer();
  const source = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const extracted = source.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/i)?.[0] || source;
  if (!/(crs:|CameraRaw|Exposure|Contrast|Saturation)/i.test(extracted)) {
    throw new Error(
      extension === "dng"
        ? "Este DNG não contém ajustes XMP legíveis. Exporte o preset como XMP no Lightroom."
        : "Não encontrei ajustes compatíveis neste XMP.",
    );
  }
  const exposure = readNumber(extracted, ["Exposure2012", "Exposure"]) ?? 0;
  const adjustments = normalizeAdjustments({
    exposure: exposure * 24,
    contrast: readNumber(extracted, ["Contrast2012", "Contrast"]) ?? 0,
    highlights: readNumber(extracted, ["Highlights2012", "Highlights"]) ?? 0,
    shadows: readNumber(extracted, ["Shadows2012", "Shadows"]) ?? 0,
    temperature: ((readNumber(extracted, ["Temperature"]) ?? 5500) - 5500) / 28,
    tint: readNumber(extracted, ["Tint"]) ?? 0,
    saturation: readNumber(extracted, ["Saturation"]) ?? 0,
    grain: readNumber(extracted, ["GrainAmount"]) ?? 0,
    vignette: -(readNumber(extracted, ["PostCropVignetteAmount", "VignetteAmount"]) ?? 0),
    fade: Math.max(0, readNumber(extracted, ["Blacks2012"]) ?? 0),
  });
  return {
    id: `imported-${crypto.randomUUID()}`,
    name: readName(extracted, file.name),
    camera: extension === "dng" ? "DNG IMPORTADO" : "XMP IMPORTADO",
    description: "Conversão aproximada dos ajustes compatíveis do Lightroom.",
    adjustments,
    builtIn: false,
    source: extension,
  };
}

export function buildDemoEditingData() {
  const createdAt = "2026-08-09T10:00:00.000Z";
  const album = {
    id: "demo-vintage",
    name: "Câmeras vintage",
    createdAt,
    updatedAt: createdAt,
    demo: true,
  };
  const sources = [
    ["demo-edit-1", "casamento-luz-dourada.jpg", "/demo/gallery/casamento.webp"],
    ["demo-edit-2", "editorial-urbano.jpg", "/demo/gallery/editorial.webp"],
    ["demo-edit-3", "familia-no-parque.jpg", "/demo/gallery/familia.webp"],
    ["demo-edit-4", "ensaio-retrato.jpg", "/demo/gallery/ensaio-pessoal.webp"],
  ];
  return {
    albums: [album],
    photos: sources.map(([id, filename, url], index) => ({
      id,
      albumId: album.id,
      filename,
      mimeType: "image/webp",
      size: 900_000 + index * 180_000,
      width: 1600,
      height: 1067,
      previewUrl: url,
      originalUrl: url,
      presetId: builtInPresets[index].id,
      adjustments: builtInPresets[index].adjustments,
      createdAt,
      updatedAt: createdAt,
      demo: true,
    })),
  };
}
