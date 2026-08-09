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
    category: "Filme",
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
    category: "Compacta",
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
    category: "Filme",
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
    category: "Flash",
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
    id: "revelar-clean",
    name: "Clean Pro",
    camera: "CLEAN PRO",
    description: "Natural e discreto para trabalhos profissionais.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 3,
      contrast: 5,
      highlights: -20,
      shadows: 18,
      temperature: 4,
      saturation: 2,
    }),
  },
  {
    id: "revelar-candy",
    name: "Candy Mini",
    camera: "CANDY MINI",
    description: "Rosa suave, flash frontal e brilho de compacta.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 9,
      contrast: 7,
      highlights: 15,
      shadows: -5,
      temperature: -4,
      tint: 18,
      saturation: 16,
      fade: 5,
      grain: 7,
      halation: 9,
      chromatic: 8,
    }),
  },
  {
    id: "revelar-aqua",
    name: "Aqua Snap",
    camera: "AQUA SNAP",
    description: "Azuis limpos, flash frio e contraste de férias.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 6,
      contrast: 16,
      highlights: 8,
      shadows: -10,
      temperature: -18,
      tint: -3,
      saturation: 19,
      grain: 5,
      chromatic: 11,
    }),
  },
  {
    id: "revelar-date",
    name: "Date 98",
    camera: "DATE 98",
    description: "Álbum de família, tons quentes e textura nostálgica.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 3,
      contrast: 9,
      highlights: -8,
      shadows: 7,
      temperature: 18,
      tint: 6,
      saturation: 5,
      fade: 12,
      grain: 19,
      vignette: 7,
      dust: 8,
    }),
  },
  {
    id: "revelar-flash-red",
    name: "Red Flash",
    camera: "RED FLASH",
    description: "Noite, pele quente e vermelho intenso de festa.",
    builtIn: true,
    category: "Flash",
    adjustments: recipe({
      exposure: 5,
      contrast: 24,
      highlights: 18,
      shadows: -24,
      temperature: 12,
      tint: 19,
      saturation: 21,
      grain: 15,
      vignette: 16,
      halation: 23,
      chromatic: 12,
    }),
  },
  {
    id: "revelar-club",
    name: "Club 02",
    camera: "CLUB 02",
    description: "Flash duro, sombras azuladas e energia de pista.",
    builtIn: true,
    category: "Flash",
    adjustments: recipe({
      exposure: 8,
      contrast: 29,
      highlights: 24,
      shadows: -29,
      temperature: -20,
      tint: 15,
      saturation: 8,
      grain: 18,
      vignette: 19,
      chromatic: 20,
    }),
  },
  {
    id: "revelar-late-night",
    name: "After 1AM",
    camera: "AFTER 1AM",
    description: "Verdes urbanos, granulação alta e luz estourada.",
    builtIn: true,
    category: "Flash",
    adjustments: recipe({
      exposure: -2,
      contrast: 31,
      highlights: 20,
      shadows: -31,
      temperature: -15,
      tint: -12,
      saturation: -9,
      fade: 3,
      grain: 38,
      vignette: 27,
      halation: 18,
      chromatic: 17,
    }),
  },
  {
    id: "revelar-portra",
    name: "Warm 160",
    camera: "WARM 160",
    description: "Pele cremosa, luz dourada e contraste delicado.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 6,
      contrast: -7,
      highlights: -28,
      shadows: 22,
      temperature: 20,
      tint: 8,
      saturation: -3,
      fade: 9,
      grain: 13,
      halation: 10,
    }),
  },
  {
    id: "revelar-forest",
    name: "Forest 400",
    camera: "FOREST 400",
    description: "Verdes profundos e tons terrosos de filme.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 1,
      contrast: 12,
      highlights: -22,
      shadows: 7,
      temperature: 8,
      tint: -16,
      saturation: -10,
      fade: 11,
      grain: 22,
      vignette: 9,
    }),
  },
  {
    id: "revelar-ocean",
    name: "Ocean 200",
    camera: "OCEAN 200",
    description: "Filme frio, azul lavado e luz de litoral.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 7,
      contrast: -2,
      highlights: -17,
      shadows: 17,
      temperature: -14,
      tint: -5,
      saturation: -4,
      fade: 14,
      grain: 16,
      halation: 6,
    }),
  },
  {
    id: "revelar-gold",
    name: "Gold 84",
    camera: "GOLD 84",
    description: "Dourado envelhecido, grão fino e luz macia.",
    builtIn: true,
    category: "Filme",
    adjustments: recipe({
      exposure: 3,
      contrast: 3,
      highlights: -16,
      shadows: 12,
      temperature: 32,
      tint: 3,
      saturation: 2,
      fade: 13,
      grain: 21,
      vignette: 6,
      halation: 14,
      dust: 5,
    }),
  },
  {
    id: "revelar-disposable",
    name: "One Shot",
    camera: "ONE SHOT",
    description: "Descartável com flash, bordas escuras e imperfeições.",
    builtIn: true,
    category: "Compacta",
    adjustments: recipe({
      exposure: 4,
      contrast: 21,
      highlights: 19,
      shadows: -19,
      temperature: 8,
      saturation: 12,
      fade: 4,
      grain: 31,
      vignette: 29,
      chromatic: 13,
      dust: 17,
      lightLeak: 7,
    }),
  },
  {
    id: "revelar-dream",
    name: "Dream Lens",
    camera: "DREAM LENS",
    description: "Bloom delicado, cores pastel e atmosfera sonhadora.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 12,
      contrast: -24,
      highlights: -8,
      shadows: 29,
      temperature: 10,
      tint: 12,
      saturation: -12,
      fade: 21,
      grain: 8,
      halation: 34,
      chromatic: 7,
      lightLeak: 5,
    }),
  },
  {
    id: "revelar-prism",
    name: "Prism Pop",
    camera: "PRISM POP",
    description: "Cores deslocadas, aberração e contraste criativo.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 5,
      contrast: 17,
      highlights: 4,
      shadows: -7,
      temperature: -3,
      tint: 22,
      saturation: 29,
      grain: 9,
      chromatic: 37,
      halation: 13,
    }),
  },
  {
    id: "revelar-burn",
    name: "Film Burn",
    camera: "FILM BURN",
    description: "Vazamento quente e bordas queimadas de negativo.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 2,
      contrast: 13,
      highlights: -5,
      shadows: -3,
      temperature: 24,
      tint: 7,
      saturation: 9,
      fade: 10,
      grain: 24,
      vignette: 14,
      halation: 29,
      dust: 13,
      lightLeak: 44,
    }),
  },
  {
    id: "revelar-lilac",
    name: "Lilac Haze",
    camera: "LILAC HAZE",
    description: "Lavanda suave, brilho difuso e baixa saturação.",
    builtIn: true,
    category: "Experimental",
    adjustments: recipe({
      exposure: 9,
      contrast: -19,
      highlights: -13,
      shadows: 25,
      temperature: -7,
      tint: 28,
      saturation: -14,
      fade: 18,
      grain: 11,
      halation: 26,
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
  {
    id: "revelar-clean-wedding",
    name: "Ceremony",
    camera: "CEREMONY PRO",
    description: "Natural, pele fiel e realces protegidos para casamento.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 5,
      contrast: 2,
      highlights: -34,
      shadows: 25,
      temperature: 7,
      tint: 4,
      saturation: -2,
    }),
  },
  {
    id: "revelar-clean-studio",
    name: "Studio True",
    camera: "STUDIO TRUE",
    description: "Cor limpa, contraste controlado e fundo neutro.",
    builtIn: true,
    category: "Natural",
    adjustments: recipe({
      exposure: 3,
      contrast: 9,
      highlights: -24,
      shadows: 15,
      temperature: 1,
      saturation: 1,
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
