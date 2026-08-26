import assert from "node:assert/strict";
import test from "node:test";

import { publicPhotoMatchesPhase, publicPhotoWhere } from "../lib/server/gallery-public";
import type { GalleryRow } from "../lib/server/gallery-repository";

function gallery(phase: GalleryRow["phase"]) {
  return { phase } as GalleryRow;
}

test("cada etapa pública expõe somente sua pasta", () => {
  const proof = { folder: "preview", preview_key: "proof", deleted_at: null };
  const edited = { folder: "edited", preview_key: "edited", deleted_at: null };
  const delivered = {
    folder: "delivered",
    preview_key: "proof",
    high_key: "high",
    deleted_at: null,
  };

  assert.equal(publicPhotoMatchesPhase(gallery("selection"), proof), true);
  assert.equal(publicPhotoMatchesPhase(gallery("selection"), edited), false);
  assert.equal(publicPhotoMatchesPhase(gallery("approval"), edited), true);
  assert.equal(publicPhotoMatchesPhase(gallery("approval"), proof), false);
  assert.equal(publicPhotoMatchesPhase(gallery("delivery"), delivered), true);
  assert.equal(publicPhotoMatchesPhase(gallery("delivery"), proof), false);
  assert.match(publicPhotoWhere(gallery("delivery")), /folder = 'delivered'/);
});

test("uma foto na lixeira nunca fica pública", () => {
  assert.equal(
    publicPhotoMatchesPhase(gallery("delivery"), {
      folder: "delivered",
      high_key: "high",
      deleted_at: "2026-08-26T10:00:00.000Z",
    }),
    false,
  );
});
