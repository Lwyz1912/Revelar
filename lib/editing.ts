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
  softness: 0,
  motionTrail: 0,
  coolShadows: 0,
  warmHighlights: 0,
};

function recipe(changes: Partial<EditingAdjustments>): EditingAdjustments {
  return { ...neutralAdjustments, ...changes };
}

export const builtInPresets: EditingPreset[] = [
  {
    id: "revelar-aurora-35",
    name: "Aurora 35",
    camera: "AURORA 35",
    description: "Pastel frio, luz cremosa e sombras azuladas.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 9,
      contrast: -18,
      highlights: -24,
      shadows: 27,
      temperature: -9,
      tint: 8,
      saturation: -13,
      fade: 17,
      grain: 10,
      halation: 13,
      softness: 18,
      coolShadows: 24,
      warmHighlights: 7,
    }),
  },
  {
    id: "revelar-rose-flash",
    name: "Rosa Flash",
    camera: "ROSA FLASH 02",
    description: "Compacta rosada, flash claro e brilho delicado.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 11,
      contrast: 4,
      highlights: 14,
      shadows: -5,
      temperature: -3,
      tint: 22,
      saturation: 10,
      fade: 5,
      grain: 7,
      halation: 15,
      chromatic: 5,
      softness: 9,
      coolShadows: 8,
      warmHighlights: 12,
    }),
  },
  {
    id: "revelar-solar-77",
    name: "Solar 77",
    camera: "SOLAR 77",
    description: "Amarelo de fim de tarde, contraste baixo e calor intenso.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 7,
      contrast: -8,
      highlights: -19,
      shadows: 18,
      temperature: 35,
      tint: 2,
      saturation: 7,
      fade: 10,
      grain: 17,
      halation: 22,
      lightLeak: 7,
      softness: 8,
      warmHighlights: 31,
    }),
  },
  {
    id: "revelar-pixel-sea",
    name: "Pixel Mar",
    camera: "PIXEL MAR 03",
    description: "Azuis digitais, flash frio e aparência de compacta 2000.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 6,
      contrast: 17,
      highlights: 13,
      shadows: -15,
      temperature: -23,
      tint: -4,
      saturation: 20,
      grain: 5,
      chromatic: 12,
      coolShadows: 28,
    }),
  },
  {
    id: "revelar-velvet-64",
    name: "Veludo 64",
    camera: "VELUDO 64",
    description: "Terrosos suaves, preto lavado e textura de álbum antigo.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 2,
      contrast: -13,
      highlights: -28,
      shadows: 21,
      temperature: 17,
      tint: 7,
      saturation: -15,
      fade: 22,
      grain: 23,
      vignette: 5,
      softness: 12,
      warmHighlights: 15,
    }),
  },
  {
    id: "revelar-coast-200",
    name: "Costa 200",
    camera: "COSTA 200",
    description: "Azul lavado, luz de praia e filme de baixa saturação.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 8,
      contrast: -7,
      highlights: -16,
      shadows: 23,
      temperature: -18,
      tint: -6,
      saturation: -8,
      fade: 16,
      grain: 14,
      softness: 7,
      coolShadows: 33,
      warmHighlights: 5,
    }),
  },
  {
    id: "revelar-ember-400",
    name: "Brasa 400",
    camera: "BRASA 400",
    description: "Vermelhos densos, dourado forte e grão de filme rápido.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 1,
      contrast: 19,
      highlights: -10,
      shadows: -14,
      temperature: 28,
      tint: 11,
      saturation: 14,
      fade: 4,
      grain: 29,
      vignette: 12,
      halation: 20,
      warmHighlights: 28,
    }),
  },
  {
    id: "revelar-mist-160",
    name: "Névoa 160",
    camera: "NÉVOA 160",
    description: "Pele clara, tons leitosos e foco suavizado.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 12,
      contrast: -21,
      highlights: -25,
      shadows: 31,
      temperature: 9,
      tint: 9,
      saturation: -11,
      fade: 18,
      grain: 7,
      halation: 18,
      softness: 27,
      warmHighlights: 10,
    }),
  },
  {
    id: "revelar-echo-02",
    name: "Rastro 02",
    camera: "RASTRO 02",
    description: "Movimento arrastado, cores deslocadas e flash noturno.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 4,
      contrast: 21,
      highlights: 15,
      shadows: -23,
      temperature: -8,
      tint: 17,
      saturation: 9,
      grain: 16,
      vignette: 15,
      halation: 18,
      chromatic: 32,
      motionTrail: 58,
      coolShadows: 23,
    }),
  },
  {
    id: "revelar-amber-zx",
    name: "Âmbar ZX",
    camera: "ÂMBAR ZX",
    description: "Calor digital, verdes dourados e contraste nostálgico.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 3,
      contrast: 14,
      highlights: -8,
      shadows: -7,
      temperature: 31,
      tint: -7,
      saturation: 13,
      fade: 5,
      grain: 11,
      halation: 12,
      warmHighlights: 26,
    }),
  },
  {
    id: "revelar-lume-35",
    name: "Lume 35",
    camera: "LUME 35",
    description: "Filme claro, verdes suaves e luz difusa.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 9,
      contrast: -11,
      highlights: -30,
      shadows: 24,
      temperature: 8,
      tint: -10,
      saturation: -7,
      fade: 13,
      grain: 12,
      halation: 10,
      softness: 10,
      coolShadows: 9,
      warmHighlights: 12,
    }),
  },
  {
    id: "revelar-isla-100",
    name: "Ilha 100",
    camera: "ILHA 100",
    description: "Ciano luminoso, contraste limpo e lembrança de férias.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 8,
      contrast: 12,
      highlights: 7,
      shadows: -8,
      temperature: -15,
      tint: -3,
      saturation: 17,
      grain: 4,
      chromatic: 8,
      coolShadows: 25,
      warmHighlights: 5,
    }),
  },
  {
    id: "revelar-street-400",
    name: "Rua 400",
    camera: "RUA 400",
    description: "Contraste urbano, flash direto e sombras verde-azuladas.",
    builtIn: true,
    category: "Flash",
    adjustments: recipe({
      exposure: 2,
      contrast: 28,
      highlights: 16,
      shadows: -27,
      temperature: -7,
      tint: -9,
      saturation: 5,
      grain: 24,
      vignette: 17,
      chromatic: 11,
      coolShadows: 31,
      warmHighlights: 9,
    }),
  },
  {
    id: "revelar-portrait-160",
    name: "Retrato 160",
    camera: "RETRATO 160",
    description: "Pele cremosa, pêssego discreto e realces protegidos.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 7,
      contrast: -9,
      highlights: -31,
      shadows: 24,
      temperature: 15,
      tint: 8,
      saturation: -5,
      fade: 10,
      grain: 9,
      softness: 8,
      warmHighlights: 18,
    }),
  },
  {
    id: "revelar-portrait-160-ii",
    name: "Retrato 160 II",
    camera: "RETRATO 160 II",
    description: "Variação rosada, mais luminosa e com preto macio.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 10,
      contrast: -14,
      highlights: -26,
      shadows: 29,
      temperature: 9,
      tint: 14,
      saturation: -8,
      fade: 15,
      grain: 10,
      halation: 8,
      softness: 13,
      coolShadows: 6,
      warmHighlights: 17,
    }),
  },
  {
    id: "revelar-negative-sun",
    name: "Negativo Solar",
    camera: "NEGATIVO SOLAR",
    description: "Sombras ciano, luz âmbar e resposta de negativo colorido.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 4,
      contrast: 8,
      highlights: -20,
      shadows: 13,
      temperature: 5,
      tint: -4,
      saturation: -2,
      fade: 9,
      grain: 18,
      halation: 14,
      chromatic: 7,
      coolShadows: 38,
      warmHighlights: 34,
    }),
  },
  {
    id: "revelar-mono",
    name: "Mono 400",
    camera: "MONO 400",
    description: "Preto e branco macio com textura clássica.",
    builtIn: true,
    category: "Mono",
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
    id: "revelar-mono-hard",
    name: "Press 1600",
    camera: "PRESS 1600",
    description: "Preto e branco cru, contrastado e granulado.",
    builtIn: true,
    category: "Mono",
    adjustments: recipe({
      exposure: -2,
      contrast: 42,
      highlights: -7,
      shadows: -28,
      saturation: -100,
      grain: 48,
      vignette: 18,
      dust: 12,
    }),
  },
  {
    id: "revelar-mono-soft",
    name: "Silver Soft",
    camera: "SILVER SOFT",
    description: "Cinzas suaves, pele luminosa e grão fino.",
    builtIn: true,
    category: "Mono",
    adjustments: recipe({
      exposure: 8,
      contrast: -5,
      highlights: -27,
      shadows: 26,
      saturation: -100,
      fade: 13,
      grain: 18,
      halation: 8,
    }),
  },
];

export const presetCategories = [
  "Todos",
  "Filme",
  "Compacta",
  "Flash",
  "Experimental",
  "Mono",
  "Natural",
] as const;

export function blendAdjustments(adjustments: EditingAdjustments, intensity: number) {
  const factor = Math.max(0, Math.min(100, intensity)) / 100;
  return Object.fromEntries(
    Object.entries(adjustments).map(([key, value]) => [key, Math.round(value * factor)]),
  ) as EditingAdjustments;
}

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
  const softness = Math.max(0, adjustments.softness) / 85;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${sepia}) hue-rotate(${hue}deg) blur(${softness}px)`;
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
