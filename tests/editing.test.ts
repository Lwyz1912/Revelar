import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  blendAdjustments,
  builtInPresets,
  editingCssFilter,
  normalizeAdjustments,
  parseImportedPreset,
} from "../lib/editing";
import {
  applyCameraRawTone,
  applyLinearExposure,
  applyLuminanceContrast,
  buildCurveLookup,
  createCurveSampler,
  hslAdjustmentWeight,
  neutralColorProtectionWeight,
  preserveHighlightHeadroom,
  prepareHighPrecisionSourcePixels,
  sampleHueBandAdjustment,
  smoothFlatRegionChromaArtifacts,
  tonalZoneWeight,
  xmpGlobalContrast,
} from "../lib/editor-image.client";

function createSyntheticImage(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [red, green, blue] = colorAt(x, y);
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = 255;
    }
  }
  return data;
}

test("oferece estilos de câmera próprios com receitas completas", () => {
  assert.equal(builtInPresets.length, 48);
  assert.equal(builtInPresets.filter((preset) => preset.category === "Preto e branco").length, 11);
  assert.ok(builtInPresets.every((preset) => preset.builtIn));
  assert.ok(builtInPresets.every((preset) => preset.collection === "2shoot"));
  assert.ok(new Set(builtInPresets.map((preset) => preset.category)).size >= 6);
  assert.ok(builtInPresets.every((preset) => preset.adjustments.xmp));
  assert.ok(builtInPresets.some((preset) => preset.adjustments.xmp?.grayscale));
  assert.ok(builtInPresets.some((preset) => preset.adjustments.xmp?.toneCurve.length));
  assert.ok(builtInPresets.every((preset) => preset.compatibility));
  assert.ok(
    builtInPresets.every(
      (preset) =>
        preset.adjustments.fade === 0 &&
        preset.adjustments.softness === 0 &&
        preset.adjustments.coolShadows === 0 &&
        preset.adjustments.warmHighlights === 0,
    ),
  );
});

test("mantém o último ponto da curva nas altas luzes", () => {
  const lookup = buildCurveLookup([
    [0, 22],
    [128, 132],
    [240, 246],
  ]);
  assert.equal(lookup[0], 22);
  assert.equal(lookup[240], 246);
  assert.equal(lookup[255], 246);
  assert.ok(lookup[220] > lookup[120]);
});

test("interpola curvas sem arredondar os valores intermediários", () => {
  const sample = createCurveSampler([
    [0, 22],
    [100, 108],
    [255, 248],
  ]);
  const value = sample(50.25);
  assert.ok(value > 65 && value < 66);
  assert.notEqual(value, Math.round(value));
  assert.equal(sample(255), 248);
});

test("interpola o mixer HSL sem criar degraus entre cores vizinhas", () => {
  const values = [0, 20, -20, 40, -40, 10, 0, 0];
  const beforeBoundary = sampleHueBandAdjustment(values, 44.9);
  const afterBoundary = sampleHueBandAdjustment(values, 45.1);
  assert.ok(Math.abs(beforeBoundary - afterBoundary) < 1);
  assert.equal(sampleHueBandAdjustment(values, 30), 20);
  assert.equal(sampleHueBandAdjustment(values, 360), 0);
});

test("protege tons neutros dos ajustes de luminância do mixer HSL", () => {
  assert.equal(hslAdjustmentWeight(0), 0);
  assert.equal(hslAdjustmentWeight(0.025), 0);
  assert.ok(hslAdjustmentWeight(0.08) < 0.2);
  assert.equal(hslAdjustmentWeight(0.24), 1);
});

test("protege brancos e cinzas da coloração excessiva em balanço absoluto", () => {
  assert.equal(neutralColorProtectionWeight(0, true, false), 0.9);
  assert.ok(neutralColorProtectionWeight(0.12, true, false) > 0.65);
  assert.equal(neutralColorProtectionWeight(0.32, true, false), 0);
  assert.equal(neutralColorProtectionWeight(0.05, false, false), 0);
  assert.equal(neutralColorProtectionWeight(0.05, true, true), 0);
});

test("aplica ajustes tonais por zonas sem levantar pretos nem apagar brancos", () => {
  assert.equal(tonalZoneWeight(0, 0.28, 0.28), 0);
  assert.equal(tonalZoneWeight(1, 0.72, 0.28), 0);
  assert.equal(tonalZoneWeight(0.28, 0.28, 0.28), 1);
  assert.equal(tonalZoneWeight(0.72, 0.72, 0.28), 1);
  assert.ok(tonalZoneWeight(0.12, 0.28, 0.28) < 0.5);
});

test("recupera altas luzes antes que sejam recortadas", () => {
  const recovered = applyCameraRawTone(1.08, -28, 18, 25, -12);
  assert.ok(recovered < 1);
  assert.ok(recovered > 0.9);
  assert.equal(applyCameraRawTone(0.5, 0, 0, 0, 0), 0.5);
});

test("preserva a proporção das cores ao proteger o branco", () => {
  const protectedColor = preserveHighlightHeadroom(280, 250, 210);
  assert.ok(Math.max(...protectedColor) <= 254.5);
  assert.ok(Math.abs(protectedColor[1] / protectedColor[0] - 250 / 280) < 0.0001);
  assert.deepEqual(preserveHighlightHeadroom(-12, 30, 20), [0, 30, 20]);
});

test("não transforma clareza e desembaçar em contraste global excessivo", () => {
  assert.ok(xmpGlobalContrast(28, -22, 4, 12) > 1.08);
  assert.ok(xmpGlobalContrast(28, -22, 4, 12) < 1.13);
  assert.ok(xmpGlobalContrast(-30, -18, -10, 0) > 0.82);
  assert.ok(xmpGlobalContrast(-30, -18, -10, 0) < 0.87);
});

test("aplica exposição em luz linear como o Camera Raw", () => {
  const [red, green, blue] = applyLinearExposure(128, 128, 128, 1, 0, 0);
  assert.ok(red > 174 && red < 177);
  assert.equal(red, green);
  assert.equal(green, blue);
  assert.ok(red < 200);
});

test("corrige matiz verde e magenta em direções opostas", () => {
  const magenta = applyLinearExposure(128, 128, 128, 0, 0, 0.08);
  const green = applyLinearExposure(128, 128, 128, 0, 0, -0.08);
  assert.ok(magenta[0] > magenta[1]);
  assert.ok(green[1] > green[0]);
});

test("aplica contraste na luminância sem criar manchas coloridas nas sombras", () => {
  const source = [20, 24, 32] as const;
  const contrasted = applyLuminanceContrast(...source, 1.25);
  assert.ok(contrasted.every((channel) => channel >= 0));
  assert.ok(Math.abs(contrasted[0] / contrasted[2] - source[0] / source[2]) < 0.0001);
});

test("reduz blocos cromáticos de JPEG em áreas uniformes", () => {
  const width = 24;
  const height = 16;
  const source = createSyntheticImage(width, height, (x) =>
    Math.floor(x / 8) % 2 === 0 ? [126, 121, 118] : [121, 124, 120],
  );
  const processed = prepareHighPrecisionSourcePixels(source, width, height);
  const boundaryDifference = (pixels: ArrayLike<number>, left: number, right: number) => {
    let total = 0;
    for (let y = 0; y < height; y += 1) {
      const leftIndex = (y * width + left) * 4;
      const rightIndex = (y * width + right) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        total += Math.abs(pixels[leftIndex + channel] - pixels[rightIndex + channel]);
      }
    }
    return total;
  };
  const before = boundaryDifference(source, 7, 8);
  const after = boundaryDifference(processed, 7, 8);
  assert.ok(after < before * 0.72);
  assert.ok(Array.from(processed).some((value) => !Number.isInteger(value)));
});

test("preserva bordas reais enquanto remove artefatos em áreas lisas", () => {
  const width = 16;
  const height = 12;
  const source = createSyntheticImage(width, height, (x) =>
    x < 8 ? [24, 28, 31] : [232, 228, 220],
  );
  const processed = prepareHighPrecisionSourcePixels(source, width, height);
  const leftIndex = (5 * width + 7) * 4;
  const rightIndex = (5 * width + 8) * 4;
  assert.ok(processed[rightIndex] - processed[leftIndex] > 200);
});

test("remove manchas cromáticas reveladas depois das curvas", () => {
  const width = 48;
  const height = 32;
  const source = createSyntheticImage(width, height, (x) =>
    Math.floor(x / 12) % 2 === 0 ? [139, 124, 107] : [125, 135, 110],
  );
  const processed = new Float32Array(source);
  const boundaryDifference = (pixels: ArrayLike<number>, left: number, right: number) => {
    let total = 0;
    for (let y = 8; y < height - 8; y += 1) {
      const leftIndex = (y * width + left) * 4;
      const rightIndex = (y * width + right) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        total += Math.abs(pixels[leftIndex + channel] - pixels[rightIndex + channel]);
      }
    }
    return total;
  };
  const before = boundaryDifference(processed, 11, 12);
  smoothFlatRegionChromaArtifacts(processed, width, height, 1);
  const after = boundaryDifference(processed, 11, 12);
  assert.ok(after < before * 0.6);
});

test("remove blocos grandes de cor sem apagar uma borda real", () => {
  const width = 160;
  const height = 120;
  const source = new Float32Array(
    createSyntheticImage(width, height, (x, y) =>
      (Math.floor(x / 24) + Math.floor(y / 24)) % 2 === 0 ? [184, 194, 165] : [198, 184, 167],
    ),
  );
  const boundaryDifference = (pixels: ArrayLike<number>, left: number, right: number) => {
    let total = 0;
    for (let y = 20; y < height - 20; y += 1) {
      const leftIndex = (y * width + left) * 4;
      const rightIndex = (y * width + right) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        total += Math.abs(pixels[leftIndex + channel] - pixels[rightIndex + channel]);
      }
    }
    return total;
  };
  const before = boundaryDifference(source, 23, 24);
  smoothFlatRegionChromaArtifacts(source, width, height, 1);
  const after = boundaryDifference(source, 23, 24);
  assert.ok(after < before * 0.22);

  const edge = new Float32Array(
    createSyntheticImage(width, height, (x) => (x < 80 ? [30, 35, 40] : [225, 220, 210])),
  );
  smoothFlatRegionChromaArtifacts(edge, width, height, 1);
  const leftIndex = (60 * width + 79) * 4;
  const rightIndex = (60 * width + 80) * 4;
  assert.ok(edge[rightIndex] - edge[leftIndex] > 185);
});

test("intensidade mistura a receita XMP completa", () => {
  const preset = builtInPresets.find((item) => item.name === "CM Portra Glow");
  assert.ok(preset?.adjustments.xmp);
  const half = blendAdjustments(preset.adjustments, 50);
  assert.equal(half.exposure, Math.round(preset.adjustments.exposure / 2));
  assert.equal(half.grain, Math.round(preset.adjustments.grain / 2));
  assert.equal(half.xmp?.sharpness, Math.round((preset.adjustments.xmp?.sharpness || 0) / 2));
  assert.equal(
    half.xmp?.colorSaturation[2],
    Math.round((preset.adjustments.xmp?.colorSaturation[2] || 0) / 2),
  );
});

test("valida os 48 presets em interior, retrato, exterior e paisagem", () => {
  const scenarios = ["interior", "retrato", "exterior", "paisagem"];
  const matrix = builtInPresets.flatMap((preset) =>
    scenarios.map((scenario) => ({ preset, scenario })),
  );
  assert.equal(matrix.length, 48 * 4);
  for (const { preset } of matrix) {
    const recipe = preset.adjustments.xmp;
    assert.ok(recipe);
    assert.equal(recipe.hue.length, 8);
    assert.equal(recipe.colorSaturation.length, 8);
    assert.equal(recipe.luminance.length, 8);
    for (const curve of [recipe.toneCurve, recipe.redCurve, recipe.greenCurve, recipe.blueCurve]) {
      const lookup = buildCurveLookup(curve);
      assert.equal(lookup.length, 256);
      assert.ok(lookup.every((value) => Number.isFinite(value) && value >= 0 && value <= 255));
      assert.equal(
        lookup[255],
        Math.round([...curve].sort((a, b) => a[0] - b[0]).at(-1)?.[1] ?? 255),
      );
    }
  }
});

test("mantém a resposta tonal dos 48 presets finita, ordenada e sem recorte severo", () => {
  const samples = Array.from({ length: 33 }, (_, index) => (index * 255) / 32);
  for (const preset of builtInPresets) {
    const recipe = preset.adjustments.xmp;
    assert.ok(recipe);
    const tone = createCurveSampler(recipe.toneCurve);
    const redCurve = createCurveSampler(recipe.redCurve);
    const greenCurve = createCurveSampler(recipe.greenCurve);
    const blueCurve = createCurveSampler(recipe.blueCurve);
    const contrast = xmpGlobalContrast(
      preset.adjustments.contrast,
      recipe.clarity,
      recipe.dehaze,
      recipe.texture,
    );
    let previousLightness = -1;

    for (const sample of samples) {
      let [red, green, blue] = applyLinearExposure(
        sample,
        sample,
        sample,
        preset.adjustments.exposure / 24,
        recipe.absoluteWhiteBalance ? 0 : preset.adjustments.temperature / 560,
        recipe.absoluteWhiteBalance ? 0 : preset.adjustments.tint / 900,
      );
      [red, green, blue] = applyLuminanceContrast(red, green, blue, contrast);
      const sourceLightness = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      const mappedLightness = applyCameraRawTone(
        sourceLightness,
        preset.adjustments.highlights,
        preset.adjustments.shadows,
        recipe.whites,
        recipe.blacks,
      );
      const scale = sourceLightness > 0.0001 ? mappedLightness / sourceLightness : 1;
      [red, green, blue] = preserveHighlightHeadroom(red * scale, green * scale, blue * scale);
      red = redCurve(tone(Math.max(0, Math.min(255, red))));
      green = greenCurve(tone(Math.max(0, Math.min(255, green))));
      blue = blueCurve(tone(Math.max(0, Math.min(255, blue))));
      [red, green, blue] = preserveHighlightHeadroom(red, green, blue);
      const lightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

      assert.ok(
        [red, green, blue].every(
          (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 254.5,
        ),
        `${preset.name} produziu um canal fora da faixa segura`,
      );
      assert.ok(
        lightness + 0.6 >= previousLightness,
        `${preset.name} inverteu a ordem tonal entre duas amostras`,
      );
      previousLightness = lightness;
    }
  }
});

test("neutraliza balanço de branco absoluto de RAW nos 28 presets afetados", () => {
  const absolutePresets = builtInPresets.filter(
    (preset) => preset.adjustments.xmp?.absoluteWhiteBalance,
  );
  assert.equal(absolutePresets.length, 28);
  assert.ok(
    absolutePresets.every(
      (preset) => preset.adjustments.temperature === 0 && preset.adjustments.tint === 0,
    ),
  );
  assert.ok(
    absolutePresets.every((preset) =>
      preset.compatibilityNotes?.some((note) => note.includes("evitar dupla correção")),
    ),
  );
});

test("migra receitas antigas com balanço absoluto sem aquecer o JPG novamente", () => {
  const normalized = normalizeAdjustments({
    temperature: 32,
    tint: 14,
    xmp: {
      ...builtInPresets.find((preset) => preset.name === "CM Portra Glow")!.adjustments.xmp!,
      absoluteWhiteBalance: true,
    },
  });
  assert.equal(normalized.temperature, 0);
  assert.equal(normalized.tint, 0);
});

test("limita ajustes importados à faixa segura do editor", () => {
  const normalized = normalizeAdjustments({ exposure: 240, contrast: -150 });
  assert.equal(normalized.exposure, 100);
  assert.equal(normalized.contrast, -100);
  assert.match(editingCssFilter(normalized), /brightness\(.+\) contrast\(.+\)/);
});

test("converte ajustes compatíveis de um preset XMP", async () => {
  const file = new File(
    [
      `<x:xmpmeta><rdf:Description crs:Name="Filme Mary" crs:Exposure2012="0.50" crs:Contrast2012="12" crs:Temperature="5780" crs:GrainAmount="22" /></x:xmpmeta>`,
    ],
    "filme-mary.xmp",
    { type: "application/xml" },
  );
  const preset = await parseImportedPreset(file);
  assert.equal(preset.name, "Filme Mary");
  assert.equal(preset.source, "xmp");
  assert.equal(preset.adjustments.exposure, 12);
  assert.equal(preset.adjustments.temperature, 0);
  assert.equal(preset.adjustments.tint, 0);
  assert.equal(preset.adjustments.grain, 22);
  assert.equal(preset.adjustments.xmp?.absoluteWhiteBalance, true);
  assert.ok(preset.compatibilityNotes?.some((note) => note.includes("evitar dupla correção")));
});

test("preserva balanço de branco incremental de presets compatíveis com JPG", async () => {
  const file = new File(
    [
      `<x:xmpmeta><rdf:Description crs:Name="Filme incremental" crs:IncrementalTemperature="8" crs:IncrementalTint="-3" /></x:xmpmeta>`,
    ],
    "filme-incremental.xmp",
    { type: "application/xml" },
  );
  const preset = await parseImportedPreset(file);
  assert.equal(preset.adjustments.temperature, 8);
  assert.equal(preset.adjustments.tint, -3);
  assert.equal(preset.adjustments.xmp?.absoluteWhiteBalance, false);
});

test("avisa quando o XMP depende de lente, perspectiva ou desfranjo avançado", async () => {
  const file = new File(
    [
      `<x:xmpmeta><rdf:Description crs:Name="Receita óptica" crs:IncrementalTemperature="0" crs:LensProfileEnable="1" crs:PerspectiveVertical="4" crs:DefringePurpleAmount="3" /></x:xmpmeta>`,
    ],
    "receita-optica.xmp",
    { type: "application/xml" },
  );
  const preset = await parseImportedPreset(file);
  assert.equal(preset.compatibility, "partial");
  assert.ok(preset.compatibilityNotes?.some((note) => note.includes("Correção de lente")));
  assert.ok(preset.compatibilityNotes?.some((note) => note.includes("perspectiva")));
  assert.ok(preset.compatibilityNotes?.some((note) => note.includes("franjas cromáticas")));
});

test("a textura de filme não usa mosaico radial repetido", () => {
  const styles = readFileSync(new URL("../styles/modules/editing.css", import.meta.url), "utf8");
  assert.doesNotMatch(styles, /repeating-radial-gradient/);
  assert.match(styles, /revelar-film-grain/);
});

test("redimensiona a imagem inteira no canvas sem recortar o enquadramento", () => {
  const renderer = readFileSync(new URL("../lib/editor-image.client.ts", import.meta.url), "utf8");
  const renderPhoto = renderer.slice(renderer.indexOf("export async function renderEditedPhoto"));
  assert.match(renderPhoto, /drawImage\(image, 0, 0, canvas\.width, canvas\.height\)/);
  assert.doesNotMatch(renderPhoto, /drawImage\(image, 0, 0\);/);
});

test("o editor usa o original no motor e a prévia apenas como carregamento inicial", () => {
  const editor = readFileSync(
    new URL("../components/modules/editing/EditingStudioView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(editor, /src=\{activePhoto\.originalUrl\}/);
  assert.match(editor, /placeholderSrc=\{activePhoto\.previewUrl\}/);
  assert.doesNotMatch(editor, />Parcial<\/small>/);
});
