import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  builtInPresets,
  editingCssFilter,
  normalizeAdjustments,
  parseImportedPreset,
} from "../lib/editing";

test("oferece estilos de câmera próprios com receitas completas", () => {
  assert.equal(builtInPresets.length, 19);
  assert.equal(builtInPresets.filter((preset) => preset.category === "Mono").length, 3);
  assert.equal(builtInPresets.filter((preset) => preset.category !== "Mono").length, 16);
  assert.ok(builtInPresets.every((preset) => preset.builtIn));
  assert.ok(new Set(builtInPresets.map((preset) => preset.category)).size >= 6);
  assert.equal(Object.keys(builtInPresets[0].adjustments).length, 18);
  assert.ok(builtInPresets.some((preset) => preset.adjustments.motionTrail > 0));
  assert.ok(builtInPresets.some((preset) => preset.adjustments.coolShadows > 0));
  assert.ok(builtInPresets.some((preset) => preset.adjustments.warmHighlights > 0));
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
  assert.equal(preset.adjustments.temperature, 10);
  assert.equal(preset.adjustments.grain, 22);
});

test("a textura de filme não usa mosaico radial repetido", () => {
  const styles = readFileSync(new URL("../styles/modules/editing.css", import.meta.url), "utf8");
  assert.doesNotMatch(styles, /repeating-radial-gradient/);
  assert.match(styles, /revelar-film-grain/);
});
