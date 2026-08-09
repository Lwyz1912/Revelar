import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles/foundation/tokens.css", import.meta.url), "utf8");

function variablesFor(selector: string) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `seletor ausente: ${selector}`);
  const opening = css.indexOf("{", start);
  const closing = css.indexOf("}", opening);
  const variables: Record<string, string> = {};

  for (const match of css.slice(opening + 1, closing).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    variables[match[1]] = match[2].trim();
  }

  return variables;
}

function luminance(hex: string) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, `cor não hexadecimal: ${hex}`);
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

const base = variablesFor(".revelar-app");
const dark = variablesFor(".revelar-app.theme-dark");
const palettes = ["essencia", "terracota", "rose", "mono", "lune"] as const;

function paletteVariables(palette: (typeof palettes)[number], mode: "light" | "dark") {
  const paletteLight =
    palette === "essencia" ? {} : variablesFor(`.revelar-app.palette-${palette}`);
  const paletteDark =
    mode === "dark" && palette !== "essencia"
      ? variablesFor(`.revelar-app.palette-${palette}.theme-dark`)
      : {};

  return { ...base, ...paletteLight, ...(mode === "dark" ? dark : {}), ...paletteDark };
}

for (const palette of palettes) {
  for (const mode of ["light", "dark"] as const) {
    test(`${palette} ${mode} preserva contraste de leitura e ações`, () => {
      const colors = paletteVariables(palette, mode);
      const pairs = [
        ["text", "surface"],
        ["text", "bg"],
        ["muted", "surface"],
        ["on-primary", "primary"],
        ["accent", "surface"],
        ["accent", "accent-soft"],
        ["message-text", "message-in"],
        ["message-text", "message-out"],
        ["on-positive", "positive"],
      ] as const;

      for (const [foreground, background] of pairs) {
        assert.ok(
          contrast(colors[foreground], colors[background]) >= 4.5,
          `${palette} ${mode}: ${foreground} sobre ${background} abaixo de 4.5:1`,
        );
      }
    });
  }
}

test("os dez modos visuais têm assinaturas de cor distintas", () => {
  const signatures = palettes.flatMap((palette) =>
    (["light", "dark"] as const).map((mode) => {
      const colors = paletteVariables(palette, mode);
      return [colors.bg, colors.surface, colors.primary, colors.accent].join("|");
    }),
  );

  assert.equal(new Set(signatures).size, signatures.length);
});
