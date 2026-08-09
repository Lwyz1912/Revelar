import assert from "node:assert/strict";
import test from "node:test";

import { defaultProfessionalSettings, normalizeProfessionalSettings } from "../config/settings";

test("separa o perfil pessoal das duas marcas do negócio", () => {
  const settings = normalizeProfessionalSettings(undefined);

  assert.deepEqual(
    settings.brands.map((brand) => brand.name),
    ["Mary Fotografia", "MF Studio"],
  );
  assert.equal(settings.activeBrandId, "mary-fotografia");
  assert.deepEqual(settings.finance.currencies, ["BRL", "EUR"]);
});

test("migra preferências da primeira versão sem inventar arquivos inexistentes", () => {
  const settings = normalizeProfessionalSettings({
    profile: { name: "Maryana Ferreira", instagram: "@maryfotografiaa__" },
    activeBrand: "MF Studio",
    watermarks: ["marca-antiga.png"],
    contractTemplates: ["contrato-antigo.pdf"],
    watermarkOpacity: 60,
  });

  assert.equal(settings.activeBrandId, "mf-studio");
  assert.equal(settings.watermarkOpacity, 60);
  assert.deepEqual(settings.watermarks, []);
  assert.deepEqual(settings.contractTemplates, []);
  assert.equal(settings.agenda.timezone, "America/Recife");
});

test("normalização preserva padrões editáveis salvos", () => {
  const customized = structuredClone(defaultProfessionalSettings);
  customized.work.categories.push("Corporativo");
  customized.appearance.interfaceSize = "large";
  customized.galleries.validityDays = 45;

  const normalized = normalizeProfessionalSettings(customized);

  assert.ok(normalized.work.categories.includes("Corporativo"));
  assert.equal(normalized.appearance.interfaceSize, "large");
  assert.equal(normalized.galleries.validityDays, 45);
});
