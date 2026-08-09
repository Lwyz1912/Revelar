import assert from "node:assert/strict";
import test from "node:test";

import { initialDemoGalleries } from "../data/demo-galleries";
import { formatSize } from "../lib/format";

test("mantém quatro trabalhos demonstrativos separados por etapa", () => {
  assert.equal(initialDemoGalleries.length, 4);
  assert.deepEqual(
    new Set(initialDemoGalleries.map((gallery) => gallery.phase)),
    new Set(["selection", "approval", "delivery"]),
  );
  assert.equal(new Set(initialDemoGalleries.map((gallery) => gallery.clientName)).size, 3);
});

test("cada trabalho demonstrativo possui as cinco pastas automáticas", () => {
  for (const gallery of initialDemoGalleries)
    assert.deepEqual(
      gallery.folders.map((folder) => folder.id),
      ["preview", "selection", "edited", "delivered", "originals"],
    );
});

test("formata o espaço ocupado sem alterar os bytes", () => {
  assert.equal(formatSize(0), "0 B");
  assert.equal(formatSize(1024), "1 KB");
  assert.equal(formatSize(1024 ** 3), "1 GB");
});
