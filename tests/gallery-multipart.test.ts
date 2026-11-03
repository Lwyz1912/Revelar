import assert from "node:assert/strict";
import test from "node:test";

import { GALLERY_MULTIPART_PART_SIZE, galleryUploadParts } from "../lib/gallery-multipart.client";

test("divide uma foto de 15,2 MB em partes abaixo do limite da requisição", () => {
  const size = 15_244_168;
  const parts = galleryUploadParts(size);

  assert.equal(parts.length, 3);
  assert.deepEqual(
    parts.map((part) => part.partNumber),
    [1, 2, 3],
  );
  assert.equal(parts[0].end - parts[0].start, GALLERY_MULTIPART_PART_SIZE);
  assert.equal(parts[1].end - parts[1].start, GALLERY_MULTIPART_PART_SIZE);
  assert.equal(parts[2].end, size);
});

test("não cria lacunas nem sobreposição entre as partes", () => {
  const parts = galleryUploadParts(90 * 1024 * 1024);

  assert.equal(parts.length, 18);
  parts.forEach((part, index) => {
    assert.equal(part.partNumber, index + 1);
    if (index > 0) assert.equal(part.start, parts[index - 1].end);
    assert.ok(part.end > part.start);
  });
});
