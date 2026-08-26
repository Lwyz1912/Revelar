import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const sourceDir = "/workspace/scratch/7222a07516a1/upload";
const target = new URL("../data/two-shoot-presets.generated.ts", import.meta.url);
const files = readdirSync(sourceDir)
  .filter((name) => name.toLowerCase().endsWith(".xmp"))
  .sort();
const colors = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"];
const clamp = (value, min = -100, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value || 0)));

function attribute(source, name) {
  return source.match(new RegExp(`\\bcrs:${name}=["']([^"']*)["']`, "i"))?.[1];
}

function number(source, name, fallback = 0) {
  const value = Number(attribute(source, name));
  return Number.isFinite(value) ? value : fallback;
}

function alt(source, name) {
  return source.match(
    new RegExp(`<crs:${name}>[\\s\\S]*?<rdf:li[^>]*>([^<]+)<\\/rdf:li>`, "i"),
  )?.[1];
}

function curve(source, name) {
  const inline = attribute(source, name);
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

function cleanName(filename, source) {
  const raw = attribute(source, "Name") || alt(source, "Name") || basename(filename, ".xmp");
  return raw
    .replace(/\s*\(Fixed\)$/i, "")
    .replace(/^\d{2}\s*[-_]\s*/, "")
    .replaceAll("_", " ")
    .trim();
}

function category(filename, source) {
  const haystack = `${filename} ${attribute(source, "Group") || alt(source, "Group") || ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  if (/monochrome|\bbw\b|black.white|silver|noir|bright minimal/.test(haystack))
    return "Preto e branco";
  if (/portra|p400/.test(haystack)) return "Portra";
  if (/quicksnap|party|compact|beach.washed|expired.film/.test(haystack)) return "Digital compacta";
  if (/ocean|tropical|coastal|resort|beach/.test(haystack)) return "Praia e oceano";
  if (/forest|jungle|emerald/.test(haystack)) return "Floresta e verde";
  if (/vintage|70s|analog|kodachrome|super.8|film|sepia|nostalgic|kodak|grain/.test(haystack))
    return "Filme e vintage";
  return "Editorial";
}

function compatibilityNotes(source) {
  const notes = [];
  const hasAbsoluteWhiteBalance =
    attribute(source, "Temperature") !== undefined &&
    attribute(source, "IncrementalTemperature") === undefined;
  if (hasAbsoluteWhiteBalance) {
    notes.push(
      "Balanço de branco absoluto do RAW é mantido neutro em JPG/PNG para evitar dupla correção.",
    );
  }
  if (/<crs:(?:Masking|GradientBasedCorrections|RetouchInfo|CorrectionMasks)>/i.test(source)) {
    notes.push("Máscaras e ajustes locais ainda não são reproduzidos.");
  }
  const cameraProfile = attribute(source, "CameraProfile");
  if (cameraProfile && !/^(?:embedded|adobe standard)$/i.test(cameraProfile)) {
    notes.push(`Perfil de câmera “${cameraProfile}” depende do arquivo RAW original.`);
  }
  const lensCorrectionEnabled =
    Number(attribute(source, "LensProfileEnable") || 0) > 0 ||
    Number(attribute(source, "AutoLateralCA") || 0) > 0;
  if (lensCorrectionEnabled) {
    notes.push("Correção de lente depende dos metadados da câmera e da lente originais.");
  }
  const hasPerspectiveCorrection =
    Math.abs(Number(attribute(source, "PerspectiveVertical") || 0)) > 0 ||
    Math.abs(Number(attribute(source, "PerspectiveHorizontal") || 0)) > 0 ||
    Math.abs(Number(attribute(source, "PerspectiveRotate") || 0)) > 0 ||
    Math.abs(Number(attribute(source, "PerspectiveScale") || 100) - 100) > 0;
  if (hasPerspectiveCorrection) {
    notes.push("Transformações de perspectiva ainda não são reproduzidas.");
  }
  const hasAdvancedDefringe =
    Number(attribute(source, "DefringePurpleAmount") || 0) > 0 ||
    Number(attribute(source, "DefringeGreenAmount") || 0) > 0;
  if (hasAdvancedDefringe) {
    notes.push("Remoção avançada de franjas cromáticas é aproximada pelo editor.");
  }
  return notes;
}

function preset(filename) {
  const source = readFileSync(join(sourceDir, filename), "utf8");
  const name = cleanName(filename, source);
  const group = attribute(source, "Group") || alt(source, "Group") || "2shoot";
  const presetCategory = category(filename, source);
  const hasAbsoluteWhiteBalance =
    attribute(source, "Temperature") !== undefined &&
    attribute(source, "IncrementalTemperature") === undefined;
  const temperature = hasAbsoluteWhiteBalance ? 0 : number(source, "IncrementalTemperature");
  const tint = hasAbsoluteWhiteBalance ? 0 : number(source, "IncrementalTint");
  const vibrance = number(source, "Vibrance");
  const saturation = number(source, "Saturation");
  const blacks = number(source, "Blacks2012");
  const clarity = number(source, "Clarity2012");
  const shadowHue = number(source, "ColorGradeShadowHue", number(source, "SplitToningShadowHue"));
  const shadowSaturation = number(
    source,
    "ColorGradeShadowSat",
    number(source, "SplitToningShadowSaturation"),
  );
  const highlightHue = number(
    source,
    "ColorGradeHighlightHue",
    number(source, "SplitToningHighlightHue"),
  );
  const highlightSaturation = number(
    source,
    "ColorGradeHighlightSat",
    number(source, "SplitToningHighlightSaturation"),
  );
  const toneCurve = curve(source, "ToneCurvePV2012");
  const description = attribute(source, "Description") || `${group} · receita XMP original`;
  const notes = compatibilityNotes(source);
  return {
    id: `2shoot-${name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`,
    name,
    camera: group,
    description,
    builtIn: true,
    collection: "2shoot",
    category: presetCategory,
    compatibility: notes.length ? "partial" : "full",
    compatibilityNotes: notes,
    adjustments: {
      exposure: clamp(number(source, "Exposure2012") * 24),
      contrast: clamp(number(source, "Contrast2012")),
      highlights: clamp(number(source, "Highlights2012")),
      shadows: clamp(number(source, "Shadows2012")),
      temperature: clamp(temperature),
      tint: clamp(tint),
      saturation: clamp(saturation),
      fade: 0,
      grain: clamp(number(source, "GrainAmount"), 0, 100),
      vignette: clamp(
        -number(source, "PostCropVignetteAmount", number(source, "VignetteAmount")),
        0,
        100,
      ),
      halation: 0,
      chromatic: 0,
      dust: 0,
      lightLeak: /film burn/i.test(name) ? 35 : 0,
      softness: 0,
      motionTrail: 0,
      coolShadows: 0,
      warmHighlights: 0,
      xmp: {
        whites: clamp(number(source, "Whites2012")),
        blacks: clamp(blacks),
        vibrance: clamp(vibrance),
        clarity: clamp(clarity),
        dehaze: clamp(number(source, "Dehaze")),
        texture: clamp(number(source, "Texture")),
        grayscale:
          /true/i.test(attribute(source, "ConvertToGrayscale") || "") || saturation <= -100,
        hue: colors.map((color) =>
          clamp(number(source, `HueAdjustment${color}`, number(source, `Hue${color}`))),
        ),
        colorSaturation: colors.map((color) =>
          clamp(
            number(source, `SaturationAdjustment${color}`, number(source, `Saturation${color}`)),
          ),
        ),
        luminance: colors.map((color) =>
          clamp(number(source, `LuminanceAdjustment${color}`, number(source, `Luminance${color}`))),
        ),
        toneCurve: toneCurve.length
          ? toneCurve
          : [
              [0, 0],
              [255, 255],
            ],
        redCurve: curve(source, "ToneCurvePV2012Red").length
          ? curve(source, "ToneCurvePV2012Red")
          : [
              [0, 0],
              [255, 255],
            ],
        greenCurve: curve(source, "ToneCurvePV2012Green").length
          ? curve(source, "ToneCurvePV2012Green")
          : [
              [0, 0],
              [255, 255],
            ],
        blueCurve: curve(source, "ToneCurvePV2012Blue").length
          ? curve(source, "ToneCurvePV2012Blue")
          : [
              [0, 0],
              [255, 255],
            ],
        shadowHue,
        shadowSaturation: clamp(shadowSaturation, 0, 100),
        shadowLuminance: clamp(number(source, "ColorGradeShadowLum")),
        midtoneHue: number(source, "ColorGradeMidtoneHue"),
        midtoneSaturation: clamp(number(source, "ColorGradeMidtoneSat"), 0, 100),
        midtoneLuminance: clamp(number(source, "ColorGradeMidtoneLum")),
        highlightHue,
        highlightSaturation: clamp(highlightSaturation, 0, 100),
        highlightLuminance: clamp(number(source, "ColorGradeHighlightLum")),
        balance: clamp(number(source, "ColorGradeBalance", number(source, "SplitToningBalance"))),
        blending: clamp(number(source, "ColorGradeBlending", 50), 0, 100),
        grainSize: clamp(number(source, "GrainSize"), 0, 100),
        grainFrequency: clamp(number(source, "GrainFrequency"), 0, 100),
        vignetteMidpoint: clamp(
          number(source, "PostCropVignetteMidpoint", number(source, "VignetteMidpoint", 50)),
          0,
          100,
        ),
        vignetteFeather: clamp(number(source, "PostCropVignetteFeather", 50), 0, 100),
        vignetteRoundness: clamp(number(source, "PostCropVignetteRoundness")),
        sharpness: clamp(number(source, "Sharpness"), 0, 150),
        sharpenRadius: Math.max(
          0,
          Math.min(3, number(source, "SharpenRadius", number(source, "SharpeningRadius"))),
        ),
        sharpenDetail: clamp(
          number(source, "SharpenDetail", number(source, "SharpeningDetail")),
          0,
          100,
        ),
        sharpenMasking: clamp(
          number(source, "SharpenEdgeMasking", number(source, "SharpeningMasking")),
          0,
          100,
        ),
        luminanceNoiseReduction: clamp(number(source, "LuminanceSmoothing"), 0, 100),
        colorNoiseReduction: clamp(number(source, "ColorNoiseReduction"), 0, 100),
        shadowTint: clamp(number(source, "ShadowTint")),
        absoluteWhiteBalance: hasAbsoluteWhiteBalance,
      },
    },
  };
}

const output = `import type { EditingPreset } from "@/types/revelar";\n\n// Generated from the user-supplied 2shoot XMP recipes.\nexport const twoShootPresets: EditingPreset[] = ${JSON.stringify(files.map(preset), null, 2)};\n`;
writeFileSync(target, output);
console.log(`Generated ${files.length} presets at ${target.pathname}`);
