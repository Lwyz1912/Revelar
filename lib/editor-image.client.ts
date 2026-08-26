import { editingCssFilter } from "@/lib/editing";
import type { EditingAdjustments } from "@/types/revelar";

async function sourceBlob(url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Não foi possível abrir a imagem original.");
  return response.blob();
}

async function imageFromBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Formato de imagem não suportado."));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível renderizar a foto."))),
      mimeType,
      quality,
    ),
  );
}

export function buildCurveLookup(points: Array<[number, number]>) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  return Array.from({ length: 256 }, (_, value) => {
    const rightIndex = sorted.findIndex(([input]) => input >= value);
    if (rightIndex < 0) return Math.round(sorted.at(-1)?.[1] ?? value);
    if (rightIndex === 0) return Math.round(sorted[0]?.[1] ?? value);
    const left = sorted[rightIndex - 1];
    const right = sorted[rightIndex];
    const factor = right[0] === left[0] ? 0 : (value - left[0]) / (right[0] - left[0]);
    return Math.max(0, Math.min(255, Math.round(left[1] + (right[1] - left[1]) * factor)));
  });
}

export function createCurveSampler(points: Array<[number, number]>) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  return (value: number) => {
    if (!sorted.length) return Math.max(0, Math.min(255, value));
    if (value <= sorted[0][0]) return sorted[0][1];
    const last = sorted.at(-1)!;
    if (value >= last[0]) return last[1];
    for (let index = 1; index < sorted.length; index += 1) {
      const right = sorted[index];
      if (value > right[0]) continue;
      const left = sorted[index - 1];
      const factor = right[0] === left[0] ? 0 : (value - left[0]) / (right[0] - left[0]);
      return Math.max(0, Math.min(255, left[1] + (right[1] - left[1]) * factor));
    }
    return last[1];
  };
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness] as const;
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue =
    max === r
      ? ((g - b) / delta + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / delta + 2) / 6
        : ((r - g) / delta + 4) / 6;
  return [hue * 360, saturation, lightness] as const;
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = (((hue % 360) + 360) % 360) / 360;
  if (saturation <= 0) {
    const value = lightness * 255;
    return [value, value, value] as const;
  }
  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channel = (offset: number) => {
    let t = h + offset;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(1 / 3) * 255, channel(0) * 255, channel(-1 / 3) * 255] as const;
}

const colorBandCenters = [0, 30, 60, 120, 180, 240, 285, 330] as const;

export function sampleHueBandAdjustment(values: number[], hue: number) {
  if (!values.length) return 0;
  const normalizedHue = ((hue % 360) + 360) % 360;
  for (let index = 0; index < colorBandCenters.length; index += 1) {
    const leftHue = colorBandCenters[index];
    const rightHue = colorBandCenters[index + 1] ?? 360;
    if (normalizedHue > rightHue) continue;
    const leftValue = values[index] || 0;
    const rightValue = values[index + 1] ?? values[0] ?? 0;
    const factor = rightHue === leftHue ? 0 : (normalizedHue - leftHue) / (rightHue - leftHue);
    const eased = factor * factor * (3 - 2 * factor);
    return leftValue + (rightValue - leftValue) * eased;
  }
  return values[0] || 0;
}

export function hslAdjustmentWeight(saturation: number) {
  const normalized = Math.max(0, Math.min(1, (saturation - 0.025) / 0.215));
  return normalized * normalized * (3 - 2 * normalized);
}

export function neutralColorProtectionWeight(
  saturation: number,
  absoluteWhiteBalance: boolean,
  grayscale: boolean,
) {
  if (!absoluteWhiteBalance || grayscale) return 0;
  const normalized = Math.max(0, Math.min(1, (saturation - 0.035) / 0.285));
  const smooth = normalized * normalized * (3 - 2 * normalized);
  return (1 - smooth) * 0.9;
}

export function tonalZoneWeight(lightness: number, center: number, radius: number) {
  const distance = Math.abs(Math.max(0, Math.min(1, lightness)) - center);
  const normalized = Math.max(0, Math.min(1, 1 - distance / radius));
  return normalized * normalized * (3 - 2 * normalized);
}

function smoothRange(value: number, start: number, end: number) {
  const normalized = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return normalized * normalized * (3 - 2 * normalized);
}

export function applyCameraRawTone(
  lightness: number,
  highlights: number,
  shadows: number,
  whites: number,
  blacks: number,
) {
  let value = lightness;
  let bounded = Math.max(0, Math.min(1, value));
  const shadowWeight = 1 - smoothRange(bounded, 0.05, 0.62);
  const shadowAmount = shadows / 100;
  value += shadowAmount * shadowWeight * bounded * (shadowAmount >= 0 ? 0.72 : 0.52);

  bounded = Math.max(0, Math.min(1, value));
  const highlightWeight = smoothRange(bounded, 0.42, 0.95);
  const highlightAmount = highlights / 100;
  value +=
    highlightAmount *
    highlightWeight *
    (highlightAmount >= 0 ? Math.max(0, 1 - bounded) * 0.46 : Math.max(0.35, bounded) * 0.38);

  bounded = Math.max(0, Math.min(1, value));
  const blackWeight = 1 - smoothRange(bounded, 0, 0.28);
  const blackAmount = blacks / 100;
  value +=
    blackAmount *
    blackWeight *
    (blackAmount >= 0 ? Math.max(0, 1 - bounded) * 0.14 : Math.max(0.15, bounded) * 0.18);

  bounded = Math.max(0, Math.min(1, value));
  const whiteWeight = smoothRange(bounded, 0.72, 1);
  const whiteAmount = whites / 100;
  value +=
    whiteAmount *
    whiteWeight *
    (whiteAmount >= 0 ? Math.max(0.12, 1 - bounded) * 0.2 : Math.max(0.2, bounded) * 0.18);

  return Math.max(0, value);
}

export function preserveHighlightHeadroom(red: number, green: number, blue: number) {
  red = Math.max(0, red);
  green = Math.max(0, green);
  blue = Math.max(0, blue);
  const maximum = Math.max(red, green, blue);
  if (maximum <= 254.5) return [red, green, blue] as const;
  const scale = 254.5 / maximum;
  return [red * scale, green * scale, blue * scale] as const;
}

export function xmpGlobalContrast(
  contrast: number,
  clarity: number,
  dehaze: number,
  texture: number,
) {
  return Math.max(
    0.55,
    Math.min(1.6, 1 + contrast / 240 + clarity / 1000 + dehaze / 800 + texture / 1800),
  );
}

export function srgbToLinear(channel: number) {
  const value = Math.max(0, channel) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(channel: number) {
  const value = Math.max(0, channel);
  const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return encoded * 255;
}

export function applyLinearExposure(
  red: number,
  green: number,
  blue: number,
  exposureEv: number,
  temperature: number,
  tint: number,
) {
  const exposureMultiplier = 2 ** exposureEv;
  const redMultiplier = Math.max(0.1, 1 + temperature + tint * 0.35);
  const greenMultiplier = Math.max(0.1, 1 - tint * 0.55);
  const blueMultiplier = Math.max(0.1, 1 - temperature + tint * 0.35);
  return [
    linearToSrgb(srgbToLinear(red) * exposureMultiplier * redMultiplier),
    linearToSrgb(srgbToLinear(green) * exposureMultiplier * greenMultiplier),
    linearToSrgb(srgbToLinear(blue) * exposureMultiplier * blueMultiplier),
  ] as const;
}

export function applyLuminanceContrast(red: number, green: number, blue: number, contrast: number) {
  const lightness = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  if (lightness <= 0.0001) return [0, 0, 0] as const;
  const boundedLightness = Math.max(0, Math.min(1, lightness));
  const mappedLightness =
    boundedLightness < 0.5
      ? 0.5 * (boundedLightness * 2) ** contrast
      : 1 - 0.5 * ((1 - boundedLightness) * 2) ** contrast;
  const scale = mappedLightness / lightness;
  return [red * scale, green * scale, blue * scale] as const;
}

const pixelLuminance = (red: number, green: number, blue: number) =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

export function prepareHighPrecisionSourcePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const pixels = new Float32Array(data.length);
  const rowStride = width * 4;
  const maxX = Math.max(0, width - 1);
  const maxY = Math.max(0, height - 1);
  const neighborIndexes = new Int32Array(8);

  for (let y = 0; y < height; y += 1) {
    const nearUpY = Math.max(0, y - 1);
    const nearDownY = Math.min(maxY, y + 1);
    const farUpY = Math.max(0, y - 4);
    const farDownY = Math.min(maxY, y + 4);

    for (let x = 0; x < width; x += 1) {
      const nearLeftX = Math.max(0, x - 1);
      const nearRightX = Math.min(maxX, x + 1);
      const farLeftX = Math.max(0, x - 4);
      const farRightX = Math.min(maxX, x + 4);
      const index = y * rowStride + x * 4;
      neighborIndexes[0] = y * rowStride + nearLeftX * 4;
      neighborIndexes[1] = y * rowStride + nearRightX * 4;
      neighborIndexes[2] = nearUpY * rowStride + x * 4;
      neighborIndexes[3] = nearDownY * rowStride + x * 4;
      neighborIndexes[4] = y * rowStride + farLeftX * 4;
      neighborIndexes[5] = y * rowStride + farRightX * 4;
      neighborIndexes[6] = farUpY * rowStride + x * 4;
      neighborIndexes[7] = farDownY * rowStride + x * 4;
      const centerRed = data[index];
      const centerGreen = data[index + 1];
      const centerBlue = data[index + 2];
      const centerLuminance = pixelLuminance(centerRed, centerGreen, centerBlue);
      let redTotal = centerRed * 4;
      let greenTotal = centerGreen * 4;
      let blueTotal = centerBlue * 4;
      let weightTotal = 4;
      let minimumLuminance = centerLuminance;
      let maximumLuminance = centerLuminance;

      for (let neighbor = 0; neighbor < neighborIndexes.length; neighbor += 1) {
        const neighborIndex = neighborIndexes[neighbor];
        const weight = neighbor < 4 ? 2 : 1;
        const neighborRed = data[neighborIndex];
        const neighborGreen = data[neighborIndex + 1];
        const neighborBlue = data[neighborIndex + 2];
        const neighborLuminance = pixelLuminance(neighborRed, neighborGreen, neighborBlue);
        redTotal += neighborRed * weight;
        greenTotal += neighborGreen * weight;
        blueTotal += neighborBlue * weight;
        weightTotal += weight;
        minimumLuminance = Math.min(minimumLuminance, neighborLuminance);
        maximumLuminance = Math.max(maximumLuminance, neighborLuminance);
      }

      const averageRed = redTotal / weightTotal;
      const averageGreen = greenTotal / weightTotal;
      const averageBlue = blueTotal / weightTotal;
      const averageLuminance = pixelLuminance(averageRed, averageGreen, averageBlue);
      const localRange = maximumLuminance - minimumLuminance;
      const flatRegion = 1 - smoothRange(localRange, 4, 26);
      const luminanceBlend = flatRegion * 0.34;
      const chromaBlend = flatRegion * 0.84;
      const outputLuminance =
        centerLuminance + (averageLuminance - centerLuminance) * luminanceBlend;
      const centerRedChroma = centerRed - centerLuminance;
      const centerGreenChroma = centerGreen - centerLuminance;
      const centerBlueChroma = centerBlue - centerLuminance;
      const averageRedChroma = averageRed - averageLuminance;
      const averageGreenChroma = averageGreen - averageLuminance;
      const averageBlueChroma = averageBlue - averageLuminance;

      pixels[index] =
        outputLuminance + centerRedChroma + (averageRedChroma - centerRedChroma) * chromaBlend;
      pixels[index + 1] =
        outputLuminance +
        centerGreenChroma +
        (averageGreenChroma - centerGreenChroma) * chromaBlend;
      pixels[index + 2] =
        outputLuminance + centerBlueChroma + (averageBlueChroma - centerBlueChroma) * chromaBlend;
      pixels[index + 3] = data[index + 3];
    }
  }

  return pixels;
}

export function smoothFlatRegionChromaArtifacts(
  pixels: Float32Array,
  width: number,
  height: number,
  strength = 1,
) {
  if (width < 12 || height < 12 || strength <= 0) return pixels;
  const source = new Float32Array(pixels);
  const pixelCount = width * height;
  const horizontalChannels = new Float32Array(pixelCount * 3);
  const radius = Math.max(4, Math.min(24, Math.round(Math.min(width, height) / 70)));
  const boundedStrength = Math.max(0, Math.min(1, strength));
  const edgeIndexes = new Int32Array(8);

  const addHorizontalPixel = (pixel: number, direction: 1 | -1, totals: number[]) => {
    const index = pixel * 4;
    const luminance = pixelLuminance(source[index], source[index + 1], source[index + 2]);
    totals[0] += (source[index] - luminance) * direction;
    totals[1] += (source[index + 2] - luminance) * direction;
    totals[2] += luminance * direction;
  };

  for (let y = 0; y < height; y += 1) {
    let left = 0;
    let right = Math.min(width - 1, radius);
    const totals = [0, 0, 0];
    for (let x = left; x <= right; x += 1) addHorizontalPixel(y * width + x, 1, totals);

    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const destination = pixel * 3;
      const divisor = right - left + 1;
      horizontalChannels[destination] = totals[0] / divisor;
      horizontalChannels[destination + 1] = totals[1] / divisor;
      horizontalChannels[destination + 2] = totals[2] / divisor;

      const nextLeft = Math.max(0, x + 1 - radius);
      const nextRight = Math.min(width - 1, x + 1 + radius);
      while (left < nextLeft) {
        addHorizontalPixel(y * width + left, -1, totals);
        left += 1;
      }
      while (right < nextRight) {
        right += 1;
        addHorizontalPixel(y * width + right, 1, totals);
      }
    }
  }

  const edgeRadius = Math.max(3, Math.round(radius * 0.65));
  const correctionLimit = 12 + boundedStrength * 8;

  for (let x = 0; x < width; x += 1) {
    let top = 0;
    let bottom = Math.min(height - 1, radius);
    let redChromaTotal = 0;
    let blueChromaTotal = 0;
    let luminanceTotal = 0;
    for (let y = top; y <= bottom; y += 1) {
      const horizontalIndex = (y * width + x) * 3;
      redChromaTotal += horizontalChannels[horizontalIndex];
      blueChromaTotal += horizontalChannels[horizontalIndex + 1];
      luminanceTotal += horizontalChannels[horizontalIndex + 2];
    }

    for (let y = 0; y < height; y += 1) {
      const pixel = y * width + x;
      const index = pixel * 4;
      const centerRed = source[index];
      const centerGreen = source[index + 1];
      const centerBlue = source[index + 2];
      const centerLuminance = pixelLuminance(centerRed, centerGreen, centerBlue);
      const leftX = Math.max(0, x - edgeRadius);
      const rightX = Math.min(width - 1, x + edgeRadius);
      const topY = Math.max(0, y - edgeRadius);
      const bottomY = Math.min(height - 1, y + edgeRadius);
      const farLeftX = Math.max(0, x - radius);
      const farRightX = Math.min(width - 1, x + radius);
      const farTopY = Math.max(0, y - radius);
      const farBottomY = Math.min(height - 1, y + radius);
      edgeIndexes[0] = (y * width + leftX) * 4;
      edgeIndexes[1] = (y * width + rightX) * 4;
      edgeIndexes[2] = (topY * width + x) * 4;
      edgeIndexes[3] = (bottomY * width + x) * 4;
      edgeIndexes[4] = (y * width + farLeftX) * 4;
      edgeIndexes[5] = (y * width + farRightX) * 4;
      edgeIndexes[6] = (farTopY * width + x) * 4;
      edgeIndexes[7] = (farBottomY * width + x) * 4;

      let minimumLuminance = centerLuminance;
      let maximumLuminance = centerLuminance;
      let maximumColorDistance = 0;
      for (const edgeIndex of edgeIndexes) {
        const red = source[edgeIndex];
        const green = source[edgeIndex + 1];
        const blue = source[edgeIndex + 2];
        const luminance = pixelLuminance(red, green, blue);
        minimumLuminance = Math.min(minimumLuminance, luminance);
        maximumLuminance = Math.max(maximumLuminance, luminance);
        maximumColorDistance = Math.max(
          maximumColorDistance,
          Math.abs(red - centerRed),
          Math.abs(green - centerGreen),
          Math.abs(blue - centerBlue),
        );
      }

      const localRange = maximumLuminance - minimumLuminance;
      const flatLuminance = 1 - smoothRange(localRange, 7, 58);
      const coherentColor = 1 - smoothRange(maximumColorDistance, 24, 72);
      const flatRegion = flatLuminance * coherentColor;
      if (flatRegion > 0.001) {
        const divisor = bottom - top + 1;
        const targetRedChroma = redChromaTotal / divisor;
        const targetBlueChroma = blueChromaTotal / divisor;
        const targetLuminance = luminanceTotal / divisor;
        const sourceRedChroma = centerRed - centerLuminance;
        const sourceBlueChroma = centerBlue - centerLuminance;
        const blend = flatRegion * boundedStrength * 0.96;
        const luminanceBlend = flatRegion * boundedStrength * 0.68;
        const redCorrection = Math.max(
          -correctionLimit,
          Math.min(correctionLimit, targetRedChroma - sourceRedChroma),
        );
        const blueCorrection = Math.max(
          -correctionLimit,
          Math.min(correctionLimit, targetBlueChroma - sourceBlueChroma),
        );
        const redChroma = sourceRedChroma + redCorrection * blend;
        const blueChroma = sourceBlueChroma + blueCorrection * blend;
        const luminanceCorrection = Math.max(
          -correctionLimit,
          Math.min(correctionLimit, targetLuminance - centerLuminance),
        );
        const outputLuminance = centerLuminance + luminanceCorrection * luminanceBlend;
        const red = outputLuminance + redChroma;
        const blue = outputLuminance + blueChroma;
        const green = (outputLuminance - 0.2126 * red - 0.0722 * blue) / 0.7152;
        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
      }

      const nextTop = Math.max(0, y + 1 - radius);
      const nextBottom = Math.min(height - 1, y + 1 + radius);
      while (top < nextTop) {
        const horizontalIndex = (top * width + x) * 3;
        redChromaTotal -= horizontalChannels[horizontalIndex];
        blueChromaTotal -= horizontalChannels[horizontalIndex + 1];
        luminanceTotal -= horizontalChannels[horizontalIndex + 2];
        top += 1;
      }
      while (bottom < nextBottom) {
        bottom += 1;
        const horizontalIndex = (bottom * width + x) * 3;
        redChromaTotal += horizontalChannels[horizontalIndex];
        blueChromaTotal += horizontalChannels[horizontalIndex + 1];
        luminanceTotal += horizontalChannels[horizontalIndex + 2];
      }
    }
  }

  return pixels;
}

function finalOutputDither(x: number, y: number) {
  let hash = Math.imul(x + 1, 0x1f123bb5) ^ Math.imul(y + 1, 0x5f356495);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  hash ^= hash >>> 12;
  return ((hash >>> 0) / 0xffffffff - 0.5) * 0.9;
}

function applyXmpRecipe(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: EditingAdjustments,
) {
  const recipe = adjustments.xmp;
  if (!recipe) return;
  const image = context.getImageData(0, 0, width, height);
  const pixels = prepareHighPrecisionSourcePixels(image.data, width, height);
  const tone = createCurveSampler(recipe.toneCurve);
  const red = createCurveSampler(recipe.redCurve);
  const green = createCurveSampler(recipe.greenCurve);
  const blue = createCurveSampler(recipe.blueCurve);
  const gradeColors = [
    hslToRgb(recipe.shadowHue, 1, 0.5),
    hslToRgb(recipe.midtoneHue, 1, 0.5),
    hslToRgb(recipe.highlightHue, 1, 0.5),
  ];
  const contrast = xmpGlobalContrast(
    adjustments.contrast,
    recipe.clarity,
    recipe.dehaze,
    recipe.texture,
  );
  const temperature = (recipe.absoluteWhiteBalance ? 0 : adjustments.temperature) / 560;
  const tint = (recipe.absoluteWhiteBalance ? 0 : adjustments.tint) / 900;
  for (let index = 0; index < pixels.length; index += 4) {
    const sourceR = pixels[index];
    const sourceG = pixels[index + 1];
    const sourceB = pixels[index + 2];
    let [r, g, b] = applyLinearExposure(
      sourceR,
      sourceG,
      sourceB,
      adjustments.exposure / 24,
      temperature,
      tint,
    );
    [r, g, b] = applyLuminanceContrast(r, g, b, contrast);

    const originalLightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const mappedLightness = applyCameraRawTone(
      originalLightness,
      adjustments.highlights,
      adjustments.shadows,
      recipe.whites,
      recipe.blacks,
    );
    const lightnessScale = originalLightness > 0.0001 ? mappedLightness / originalLightness : 1;
    r *= lightnessScale;
    g *= lightnessScale;
    b *= lightnessScale;
    [r, g, b] = preserveHighlightHeadroom(r, g, b);

    const [baseHue, initialSaturation, baseLightness] = rgbToHsl(r, g, b);
    let baseSaturation = initialSaturation;
    baseSaturation = Math.max(
      0,
      Math.min(
        1,
        baseSaturation * (1 + adjustments.saturation / 100) +
          (recipe.vibrance / 100) * (1 - baseSaturation) * 0.38,
      ),
    );
    [r, g, b] = hslToRgb(baseHue, baseSaturation, baseLightness);
    const toneR = tone(Math.max(0, Math.min(255, r)));
    const toneG = tone(Math.max(0, Math.min(255, g)));
    const toneB = tone(Math.max(0, Math.min(255, b)));
    r = red(toneR);
    g = green(toneG);
    b = blue(toneB);
    let [hue, saturation, lightness] = rgbToHsl(r, g, b);
    const colorWeight = hslAdjustmentWeight(saturation);
    const hueAdjustment = sampleHueBandAdjustment(recipe.hue, hue);
    const saturationAdjustment = sampleHueBandAdjustment(recipe.colorSaturation, hue);
    const luminanceAdjustment = sampleHueBandAdjustment(recipe.luminance, hue);
    hue += hueAdjustment * 0.45 * colorWeight;
    saturation = Math.max(
      0,
      Math.min(1, saturation * (1 + (saturationAdjustment / 100) * colorWeight)),
    );
    lightness = Math.max(0, Math.min(1, lightness + (luminanceAdjustment / 500) * colorWeight));
    if (recipe.grayscale) saturation = 0;
    [r, g, b] = hslToRgb(hue, saturation, lightness);

    const gradePivot = 0.5 - recipe.balance / 500;
    const gradeSpan = 1.9 + recipe.blending / 80;
    const gradeShadowWeight = Math.max(0, Math.min(1, (gradePivot - lightness) * gradeSpan));
    const gradeHighlightWeight = Math.max(0, Math.min(1, (lightness - gradePivot) * gradeSpan));
    const midtoneWeight = Math.max(0, 1 - gradeShadowWeight - gradeHighlightWeight);
    const weights = [gradeShadowWeight, midtoneWeight, gradeHighlightWeight];
    const strengths = [
      recipe.shadowSaturation,
      recipe.midtoneSaturation,
      recipe.highlightSaturation,
    ];
    const gradeLuminance = [
      recipe.shadowLuminance,
      recipe.midtoneLuminance,
      recipe.highlightLuminance,
    ];
    for (let grade = 0; grade < 3; grade += 1) {
      const amount = (weights[grade] * strengths[grade]) / 520;
      r += (gradeColors[grade][0] - r) * amount;
      g += (gradeColors[grade][1] - g) * amount;
      b += (gradeColors[grade][2] - b) * amount;
      const luminanceDelta = (weights[grade] * gradeLuminance[grade] * 255) / 1250;
      r += luminanceDelta;
      g += luminanceDelta;
      b += luminanceDelta;
    }
    const shadowTint = (recipe.shadowTint / 100) * gradeShadowWeight * 12;
    r += shadowTint;
    b += shadowTint;
    g -= shadowTint;
    [r, g, b] = preserveHighlightHeadroom(r, g, b);
    pixels[index] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
  }
  const maximumColorBoost = Math.max(
    Math.abs(recipe.vibrance),
    ...recipe.colorSaturation.map((value) => Math.abs(value)),
    Math.abs(recipe.shadowSaturation),
    Math.abs(recipe.midtoneSaturation),
    Math.abs(recipe.highlightSaturation),
  );
  const artifactCleanupStrength = Math.min(
    1,
    0.58 + maximumColorBoost / 125 + recipe.colorNoiseReduction / 180,
  );
  applyDetailProcessing(pixels, width, height, recipe);
  smoothFlatRegionChromaArtifacts(pixels, width, height, artifactCleanupStrength);
  for (let index = 0; index < pixels.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const dither = finalOutputDither(x, y);
    image.data[index] = Math.max(0, Math.min(255, pixels[index] + dither));
    image.data[index + 1] = Math.max(0, Math.min(255, pixels[index + 1] + dither));
    image.data[index + 2] = Math.max(0, Math.min(255, pixels[index + 2] + dither));
  }
  context.putImageData(image, 0, 0);
}

function applyDetailProcessing(
  pixels: Float32Array,
  width: number,
  height: number,
  recipe: NonNullable<EditingAdjustments["xmp"]>,
) {
  const noiseAmount = Math.max(recipe.luminanceNoiseReduction, recipe.colorNoiseReduction);
  const sharpenAmount = recipe.sharpness;
  if (noiseAmount <= 0 && sharpenAmount <= 0) return;
  const source = new Float32Array(pixels);
  const step = recipe.sharpenRadius >= 1.5 ? 2 : 1;
  const noiseBlend = Math.min(0.34, recipe.luminanceNoiseReduction / 260);
  const colorBlend = Math.min(0.3, recipe.colorNoiseReduction / 280);
  const sharpenBlend =
    Math.min(0.42, (recipe.sharpness + recipe.sharpenDetail * 0.25) / 240) *
    (1 - recipe.sharpenMasking / 180);
  const neighbors = new Int32Array(4);
  for (let y = step; y < height - step; y += 1) {
    for (let x = step; x < width - step; x += 1) {
      const index = (y * width + x) * 4;
      neighbors[0] = index - step * 4;
      neighbors[1] = index + step * 4;
      neighbors[2] = index - step * width * 4;
      neighbors[3] = index + step * width * 4;
      const centerLuminance = pixelLuminance(source[index], source[index + 1], source[index + 2]);
      let minimumLuminance = centerLuminance;
      let maximumLuminance = centerLuminance;
      for (const neighbor of neighbors) {
        const neighborLuminance = pixelLuminance(
          source[neighbor],
          source[neighbor + 1],
          source[neighbor + 2],
        );
        minimumLuminance = Math.min(minimumLuminance, neighborLuminance);
        maximumLuminance = Math.max(maximumLuminance, neighborLuminance);
      }
      const localRange = maximumLuminance - minimumLuminance;
      const flatRegion = 1 - smoothRange(localRange, 3, 30);
      const detailRegion = smoothRange(localRange, 6, 36);
      for (let channel = 0; channel < 3; channel += 1) {
        const average =
          neighbors.reduce((total, neighbor) => total + source[neighbor + channel], 0) /
          neighbors.length;
        let value = source[index + channel];
        const baseSmoothing = channel === 1 ? noiseBlend : Math.max(noiseBlend, colorBlend);
        const smoothing = baseSmoothing * (0.7 + flatRegion * 1.35);
        value += (average - value) * smoothing;
        value += (source[index + channel] - average) * sharpenBlend * detailRegion;
        pixels[index + channel] = Math.max(0, Math.min(255, value));
      }
    }
  }
}

function addEffects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: EditingAdjustments,
) {
  if (adjustments.fade > 0) {
    context.fillStyle = `rgba(229, 215, 190, ${adjustments.fade / 700})`;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.coolShadows > 0) {
    context.save();
    context.globalCompositeOperation = "multiply";
    context.fillStyle = `rgba(31, 92, 116, ${adjustments.coolShadows / 620})`;
    context.fillRect(0, height * 0.25, width, height * 0.75);
    context.restore();
  }
  if (adjustments.warmHighlights > 0) {
    const warmth = context.createLinearGradient(0, 0, 0, height * 0.72);
    warmth.addColorStop(0, `rgba(255, 184, 91, ${adjustments.warmHighlights / 520})`);
    warmth.addColorStop(1, "rgba(255, 184, 91, 0)");
    context.save();
    context.globalCompositeOperation = "screen";
    context.fillStyle = warmth;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
  if (adjustments.halation > 0) {
    const glow = context.createRadialGradient(
      width * 0.68,
      height * 0.28,
      0,
      width * 0.68,
      height * 0.28,
      Math.max(width, height) * 0.6,
    );
    glow.addColorStop(0, `rgba(255, 157, 83, ${adjustments.halation / 480})`);
    glow.addColorStop(0.35, `rgba(239, 86, 54, ${adjustments.halation / 1000})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.lightLeak > 0) {
    const leak = context.createLinearGradient(0, 0, width * 0.55, 0);
    leak.addColorStop(0, `rgba(255, 100, 45, ${adjustments.lightLeak / 360})`);
    leak.addColorStop(0.42, `rgba(255, 200, 100, ${adjustments.lightLeak / 900})`);
    leak.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = leak;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.vignette > 0) {
    const recipe = adjustments.xmp;
    const midpoint = recipe?.vignetteMidpoint ?? 50;
    const feather = recipe?.vignetteFeather ?? 50;
    const roundness = recipe?.vignetteRoundness ?? 0;
    const vignette = context.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * (0.1 + midpoint / 500),
      width / 2,
      height / 2,
      Math.max(width, height) * (0.58 + feather / 500 - roundness / 900),
    );
    vignette.addColorStop(0.55, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(8, 5, 3, ${adjustments.vignette / 180})`);
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
  }
  if (adjustments.grain > 0) {
    const recipe = adjustments.xmp;
    const grain = document.createElement("canvas");
    grain.width = 160;
    grain.height = 160;
    const grainContext = grain.getContext("2d")!;
    const pixels = grainContext.createImageData(160, 160);
    const grainSize = Math.max(1, Math.round(1 + (recipe?.grainSize || 0) / 28));
    const frequency = Math.max(0.25, (recipe?.grainFrequency || 50) / 50);
    for (let y = 0; y < 160; y += grainSize) {
      for (let x = 0; x < 160; x += grainSize) {
        const seed = Math.sin((x + 17) * 12.9898 + (y + 31) * 78.233) * 43758.5453;
        const tone = Math.floor((seed - Math.floor(seed)) * 256);
        const alpha = Math.round(Math.min(90, adjustments.grain * (0.38 + frequency * 0.22)));
        for (let dy = 0; dy < grainSize && y + dy < 160; dy += 1) {
          for (let dx = 0; dx < grainSize && x + dx < 160; dx += 1) {
            const index = ((y + dy) * 160 + x + dx) * 4;
            pixels.data[index] = tone;
            pixels.data[index + 1] = tone;
            pixels.data[index + 2] = tone;
            pixels.data[index + 3] = alpha;
          }
        }
      }
    }
    grainContext.putImageData(pixels, 0, 0);
    const pattern = context.createPattern(grain, "repeat");
    if (pattern) {
      context.save();
      context.globalCompositeOperation = "soft-light";
      context.fillStyle = pattern;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }
  if (adjustments.dust > 0) {
    context.save();
    context.globalAlpha = adjustments.dust / 220;
    context.strokeStyle = "#f7ead2";
    context.lineWidth = Math.max(1, width / 1800);
    const marks = Math.round((width * height * adjustments.dust) / 4_000_000);
    for (let index = 0; index < marks; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + Math.random() * width * 0.018, y + Math.random() * height * 0.08);
      context.stroke();
    }
    context.restore();
  }
}

export async function createEditingPreview(file: File) {
  const image = await imageFromBlob(file);
  const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await canvasBlob(canvas, "image/webp", 0.86);
  return {
    file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-preview.webp`, {
      type: "image/webp",
    }),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export async function renderEditedPhoto(
  sourceUrl: string,
  adjustments: EditingAdjustments,
  options: { mimeType: "image/jpeg" | "image/png"; quality?: number; maxDimension?: number },
) {
  const image = await imageFromBlob(await sourceBlob(sourceUrl));
  const scale = options.maxDimension
    ? Math.min(1, options.maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: options.mimeType === "image/png" })!;
  context.filter = adjustments.xmp ? "none" : editingCssFilter(adjustments);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.filter = "none";
  applyXmpRecipe(context, canvas.width, canvas.height, adjustments);
  if (adjustments.motionTrail > 0) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = adjustments.motionTrail / 460;
    const distance = (Math.max(canvas.width, canvas.height) * adjustments.motionTrail) / 9000;
    context.drawImage(image, distance, 0, canvas.width, canvas.height);
    context.globalAlpha = adjustments.motionTrail / 760;
    context.drawImage(image, -distance * 0.7, 0, canvas.width, canvas.height);
    context.restore();
  }
  context.filter = "none";
  addEffects(context, canvas.width, canvas.height, adjustments);
  return canvasBlob(canvas, options.mimeType, options.quality ?? 0.96);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
