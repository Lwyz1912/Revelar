import { twoShootPresets } from "@/data/two-shoot-presets.generated";
import type { EditingAdjustments, EditingPreset, XmpColorRecipe } from "@/types/revelar";

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

export const builtInPresets = twoShootPresets;

export const presetCategories = [
  "Todos",
  "Filme e vintage",
  "Portra",
  "Digital compacta",
  "Preto e branco",
  "Praia e oceano",
  "Floresta e verde",
  "Editorial",
] as const;

export function blendAdjustments(adjustments: EditingAdjustments, intensity: number) {
  const factor = Math.max(0, Math.min(100, intensity)) / 100;
  const blended = Object.fromEntries(
    Object.entries(adjustments)
      .filter(([key]) => key !== "xmp")
      .map(([key, value]) => [key, Math.round(Number(value) * factor)]),
  ) as unknown as EditingAdjustments;
  if (adjustments.xmp) {
    blended.xmp = {
      ...adjustments.xmp,
      whites: Math.round(adjustments.xmp.whites * factor),
      blacks: Math.round(adjustments.xmp.blacks * factor),
      vibrance: Math.round(adjustments.xmp.vibrance * factor),
      clarity: Math.round(adjustments.xmp.clarity * factor),
      dehaze: Math.round(adjustments.xmp.dehaze * factor),
      texture: Math.round(adjustments.xmp.texture * factor),
      grayscale: factor > 0.5 && adjustments.xmp.grayscale,
      hue: adjustments.xmp.hue.map((value) => Math.round(value * factor)),
      colorSaturation: adjustments.xmp.colorSaturation.map((value) => Math.round(value * factor)),
      luminance: adjustments.xmp.luminance.map((value) => Math.round(value * factor)),
      toneCurve: blendCurve(adjustments.xmp.toneCurve, factor),
      redCurve: blendCurve(adjustments.xmp.redCurve, factor),
      greenCurve: blendCurve(adjustments.xmp.greenCurve, factor),
      blueCurve: blendCurve(adjustments.xmp.blueCurve, factor),
      shadowSaturation: Math.round(adjustments.xmp.shadowSaturation * factor),
      shadowLuminance: Math.round(adjustments.xmp.shadowLuminance * factor),
      midtoneSaturation: Math.round(adjustments.xmp.midtoneSaturation * factor),
      midtoneLuminance: Math.round(adjustments.xmp.midtoneLuminance * factor),
      highlightSaturation: Math.round(adjustments.xmp.highlightSaturation * factor),
      highlightLuminance: Math.round(adjustments.xmp.highlightLuminance * factor),
      grainSize: Math.round(adjustments.xmp.grainSize * factor),
      grainFrequency: Math.round(adjustments.xmp.grainFrequency * factor),
      vignetteMidpoint: Math.round(50 + (adjustments.xmp.vignetteMidpoint - 50) * factor),
      vignetteFeather: Math.round(adjustments.xmp.vignetteFeather * factor),
      vignetteRoundness: Math.round(adjustments.xmp.vignetteRoundness * factor),
      sharpness: Math.round(adjustments.xmp.sharpness * factor),
      sharpenRadius: adjustments.xmp.sharpenRadius * factor,
      sharpenDetail: Math.round(adjustments.xmp.sharpenDetail * factor),
      sharpenMasking: Math.round(adjustments.xmp.sharpenMasking * factor),
      luminanceNoiseReduction: Math.round(adjustments.xmp.luminanceNoiseReduction * factor),
      colorNoiseReduction: Math.round(adjustments.xmp.colorNoiseReduction * factor),
      shadowTint: Math.round(adjustments.xmp.shadowTint * factor),
    };
  }
  return blended;
}

function blendCurve(curve: Array<[number, number]>, factor: number) {
  return curve.map(
    ([input, output]) => [input, Math.round(input + (output - input) * factor)] as [number, number],
  );
}

export function clampAdjustment(value: number) {
  return Math.max(-100, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

export function normalizeAdjustments(
  value?: Partial<EditingAdjustments> | null,
): EditingAdjustments {
  const normalized = Object.fromEntries(
    Object.keys(neutralAdjustments).map((key) => [
      key,
      clampAdjustment(Number(value?.[key as keyof EditingAdjustments] ?? 0)),
    ]),
  ) as unknown as EditingAdjustments;
  if (value?.xmp) normalized.xmp = normalizeXmpRecipe(value.xmp);
  if (normalized.xmp?.absoluteWhiteBalance) {
    normalized.temperature = 0;
    normalized.tint = 0;
  }
  return normalized;
}

function normalizeCurve(value?: Array<[number, number]>) {
  const curve = (value || [])
    .filter((point) => Array.isArray(point) && point.length === 2)
    .map(
      ([input, output]) =>
        [Math.max(0, Math.min(255, Number(input))), Math.max(0, Math.min(255, Number(output)))] as [
          number,
          number,
        ],
    )
    .sort((a, b) => a[0] - b[0]);
  return curve.length >= 2
    ? curve
    : ([
        [0, 0],
        [255, 255],
      ] as Array<[number, number]>);
}

function normalizeXmpRecipe(value: Partial<XmpColorRecipe>): XmpColorRecipe {
  const list = (items?: number[]) =>
    Array.from({ length: 8 }, (_, index) => clampAdjustment(Number(items?.[index] || 0)));
  return {
    whites: clampAdjustment(Number(value.whites || 0)),
    blacks: clampAdjustment(Number(value.blacks || 0)),
    vibrance: clampAdjustment(Number(value.vibrance || 0)),
    clarity: clampAdjustment(Number(value.clarity || 0)),
    dehaze: clampAdjustment(Number(value.dehaze || 0)),
    texture: clampAdjustment(Number(value.texture || 0)),
    grayscale: Boolean(value.grayscale),
    hue: list(value.hue),
    colorSaturation: list(value.colorSaturation),
    luminance: list(value.luminance),
    toneCurve: normalizeCurve(value.toneCurve),
    redCurve: normalizeCurve(value.redCurve),
    greenCurve: normalizeCurve(value.greenCurve),
    blueCurve: normalizeCurve(value.blueCurve),
    shadowHue: Number(value.shadowHue || 0),
    shadowSaturation: clampAdjustment(Number(value.shadowSaturation || 0)),
    shadowLuminance: clampAdjustment(Number(value.shadowLuminance || 0)),
    midtoneHue: Number(value.midtoneHue || 0),
    midtoneSaturation: clampAdjustment(Number(value.midtoneSaturation || 0)),
    midtoneLuminance: clampAdjustment(Number(value.midtoneLuminance || 0)),
    highlightHue: Number(value.highlightHue || 0),
    highlightSaturation: clampAdjustment(Number(value.highlightSaturation || 0)),
    highlightLuminance: clampAdjustment(Number(value.highlightLuminance || 0)),
    balance: clampAdjustment(Number(value.balance || 0)),
    blending: clampAdjustment(Number(value.blending ?? 50)),
    grainSize: clampAdjustment(Number(value.grainSize || 0)),
    grainFrequency: clampAdjustment(Number(value.grainFrequency || 0)),
    vignetteMidpoint: Math.max(0, Math.min(100, Number(value.vignetteMidpoint ?? 50))),
    vignetteFeather: Math.max(0, Math.min(100, Number(value.vignetteFeather ?? 50))),
    vignetteRoundness: clampAdjustment(Number(value.vignetteRoundness || 0)),
    sharpness: Math.max(0, Math.min(150, Number(value.sharpness || 0))),
    sharpenRadius: Math.max(0, Math.min(3, Number(value.sharpenRadius || 0))),
    sharpenDetail: Math.max(0, Math.min(100, Number(value.sharpenDetail || 0))),
    sharpenMasking: Math.max(0, Math.min(100, Number(value.sharpenMasking || 0))),
    luminanceNoiseReduction: Math.max(0, Math.min(100, Number(value.luminanceNoiseReduction || 0))),
    colorNoiseReduction: Math.max(0, Math.min(100, Number(value.colorNoiseReduction || 0))),
    shadowTint: clampAdjustment(Number(value.shadowTint || 0)),
    absoluteWhiteBalance: Boolean(value.absoluteWhiteBalance),
  };
}

export function editingCssFilter(adjustments: EditingAdjustments) {
  const xmp = adjustments.xmp;
  const brightness =
    1 + adjustments.exposure / 180 + adjustments.shadows / 500 + (xmp?.whites || 0) / 950;
  const contrast =
    1 +
    adjustments.contrast / 100 -
    adjustments.fade / 230 +
    (xmp?.clarity || 0) / 420 +
    (xmp?.dehaze || 0) / 350;
  const saturation = Math.max(0, 1 + adjustments.saturation / 100 + (xmp?.vibrance || 0) / 180);
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

const xmpColors = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"];

function readCurve(source: string, name: string): Array<[number, number]> {
  const inline = source.match(new RegExp(`\\bcrs:${name}=["']([^"']+)["']`, "i"))?.[1];
  if (inline) {
    const values = inline.split(",").map(Number).filter(Number.isFinite);
    return Array.from({ length: Math.floor(values.length / 2) }, (_, index) => [
      values[index * 2],
      values[index * 2 + 1],
    ]);
  }
  const block = source.match(new RegExp(`<crs:${name}>[\\s\\S]*?<\\/crs:${name}>`, "i"))?.[0] || "";
  return [...block.matchAll(/<rdf:li>([\d.+-]+)\s*,\s*([\d.+-]+)<\/rdf:li>/gi)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
}

function xmpRecipe(source: string): XmpColorRecipe {
  const shadowHue = readNumber(source, ["ColorGradeShadowHue", "SplitToningShadowHue"]) ?? 0;
  const shadowSaturation =
    readNumber(source, ["ColorGradeShadowSat", "SplitToningShadowSaturation"]) ?? 0;
  const highlightHue =
    readNumber(source, ["ColorGradeHighlightHue", "SplitToningHighlightHue"]) ?? 0;
  const highlightSaturation =
    readNumber(source, ["ColorGradeHighlightSat", "SplitToningHighlightSaturation"]) ?? 0;
  return normalizeXmpRecipe({
    whites: readNumber(source, ["Whites2012"]) ?? 0,
    blacks: readNumber(source, ["Blacks2012"]) ?? 0,
    vibrance: readNumber(source, ["Vibrance"]) ?? 0,
    clarity: readNumber(source, ["Clarity2012"]) ?? 0,
    dehaze: readNumber(source, ["Dehaze"]) ?? 0,
    texture: readNumber(source, ["Texture"]) ?? 0,
    grayscale:
      /crs:ConvertToGrayscale=["']True["']/i.test(source) ||
      (readNumber(source, ["Saturation"]) ?? 0) <= -100,
    hue: xmpColors.map(
      (color) => readNumber(source, [`HueAdjustment${color}`, `Hue${color}`]) ?? 0,
    ),
    colorSaturation: xmpColors.map(
      (color) => readNumber(source, [`SaturationAdjustment${color}`, `Saturation${color}`]) ?? 0,
    ),
    luminance: xmpColors.map(
      (color) => readNumber(source, [`LuminanceAdjustment${color}`, `Luminance${color}`]) ?? 0,
    ),
    toneCurve: readCurve(source, "ToneCurvePV2012"),
    redCurve: readCurve(source, "ToneCurvePV2012Red"),
    greenCurve: readCurve(source, "ToneCurvePV2012Green"),
    blueCurve: readCurve(source, "ToneCurvePV2012Blue"),
    shadowHue,
    shadowSaturation,
    shadowLuminance: readNumber(source, ["ColorGradeShadowLum"]) ?? 0,
    midtoneHue: readNumber(source, ["ColorGradeMidtoneHue"]) ?? 0,
    midtoneSaturation: readNumber(source, ["ColorGradeMidtoneSat"]) ?? 0,
    midtoneLuminance: readNumber(source, ["ColorGradeMidtoneLum"]) ?? 0,
    highlightHue,
    highlightSaturation,
    highlightLuminance: readNumber(source, ["ColorGradeHighlightLum"]) ?? 0,
    balance: readNumber(source, ["ColorGradeBalance", "SplitToningBalance"]) ?? 0,
    blending: readNumber(source, ["ColorGradeBlending"]) ?? 50,
    grainSize: readNumber(source, ["GrainSize"]) ?? 0,
    grainFrequency: readNumber(source, ["GrainFrequency"]) ?? 0,
    vignetteMidpoint: readNumber(source, ["PostCropVignetteMidpoint", "VignetteMidpoint"]) ?? 50,
    vignetteFeather: readNumber(source, ["PostCropVignetteFeather"]) ?? 50,
    vignetteRoundness: readNumber(source, ["PostCropVignetteRoundness"]) ?? 0,
    sharpness: readNumber(source, ["Sharpness"]) ?? 0,
    sharpenRadius: readNumber(source, ["SharpenRadius", "SharpeningRadius"]) ?? 0,
    sharpenDetail: readNumber(source, ["SharpenDetail", "SharpeningDetail"]) ?? 0,
    sharpenMasking: readNumber(source, ["SharpenEdgeMasking", "SharpeningMasking"]) ?? 0,
    luminanceNoiseReduction: readNumber(source, ["LuminanceSmoothing"]) ?? 0,
    colorNoiseReduction: readNumber(source, ["ColorNoiseReduction"]) ?? 0,
    shadowTint: readNumber(source, ["ShadowTint"]) ?? 0,
    absoluteWhiteBalance:
      readNumber(source, ["Temperature"]) !== undefined &&
      readNumber(source, ["IncrementalTemperature"]) === undefined,
  });
}

function xmpCompatibilityNotes(source: string) {
  const notes: string[] = [];
  const hasAbsoluteWhiteBalance =
    readNumber(source, ["Temperature"]) !== undefined &&
    readNumber(source, ["IncrementalTemperature"]) === undefined;
  if (hasAbsoluteWhiteBalance) {
    notes.push(
      "Balanço de branco absoluto do RAW é mantido neutro em JPG/PNG para evitar dupla correção.",
    );
  }
  if (/<crs:(?:Masking|GradientBasedCorrections|RetouchInfo|CorrectionMasks)>/i.test(source)) {
    notes.push("Máscaras e ajustes locais ainda não são reproduzidos.");
  }
  const cameraProfile = source.match(/\bcrs:CameraProfile=["']([^"']+)["']/i)?.[1];
  if (cameraProfile && !/^(?:embedded|adobe standard)$/i.test(cameraProfile)) {
    notes.push(`Perfil de câmera “${cameraProfile}” depende do arquivo RAW original.`);
  }
  const lensCorrectionEnabled =
    (readNumber(source, ["LensProfileEnable"]) ?? 0) > 0 ||
    (readNumber(source, ["AutoLateralCA"]) ?? 0) > 0;
  if (lensCorrectionEnabled) {
    notes.push("Correção de lente depende dos metadados da câmera e da lente originais.");
  }
  const hasPerspectiveCorrection =
    Math.abs(readNumber(source, ["PerspectiveVertical"]) ?? 0) > 0 ||
    Math.abs(readNumber(source, ["PerspectiveHorizontal"]) ?? 0) > 0 ||
    Math.abs(readNumber(source, ["PerspectiveRotate"]) ?? 0) > 0 ||
    Math.abs((readNumber(source, ["PerspectiveScale"]) ?? 100) - 100) > 0;
  if (hasPerspectiveCorrection) {
    notes.push("Transformações de perspectiva ainda não são reproduzidas.");
  }
  const hasAdvancedDefringe =
    (readNumber(source, ["DefringePurpleAmount"]) ?? 0) > 0 ||
    (readNumber(source, ["DefringeGreenAmount"]) ?? 0) > 0;
  if (hasAdvancedDefringe) {
    notes.push("Remoção avançada de franjas cromáticas é aproximada pelo editor.");
  }
  return notes;
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
  const recipe = xmpRecipe(extracted);
  const incrementalTemperature = readNumber(extracted, ["IncrementalTemperature"]);
  const incrementalTint = readNumber(extracted, ["IncrementalTint"]);
  const compatibilityNotes = xmpCompatibilityNotes(extracted);
  const adjustments = normalizeAdjustments({
    exposure: exposure * 24,
    contrast: readNumber(extracted, ["Contrast2012", "Contrast"]) ?? 0,
    highlights: readNumber(extracted, ["Highlights2012", "Highlights"]) ?? 0,
    shadows: readNumber(extracted, ["Shadows2012", "Shadows"]) ?? 0,
    temperature: recipe.absoluteWhiteBalance ? 0 : (incrementalTemperature ?? 0),
    tint: recipe.absoluteWhiteBalance ? 0 : (incrementalTint ?? 0),
    saturation: readNumber(extracted, ["Saturation"]) ?? 0,
    grain: readNumber(extracted, ["GrainAmount"]) ?? 0,
    vignette: -(readNumber(extracted, ["PostCropVignetteAmount", "VignetteAmount"]) ?? 0),
    fade: 0,
    softness: 0,
    coolShadows: 0,
    warmHighlights: 0,
    xmp: recipe,
  });
  return {
    id: `imported-${crypto.randomUUID()}`,
    name: readName(extracted, file.name),
    camera: extension === "dng" ? "DNG IMPORTADO" : "XMP IMPORTADO",
    description:
      compatibilityNotes.length > 0
        ? "Receita XMP importada com compatibilidade parcial."
        : "Receita XMP importada com ajustes compatíveis.",
    adjustments,
    builtIn: false,
    source: extension,
    collection: "imported",
    category: "Importados",
    compatibility: compatibilityNotes.length > 0 ? "partial" : "full",
    compatibilityNotes,
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
