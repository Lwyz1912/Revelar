import assert from "node:assert/strict";
import test from "node:test";

import { createStoredZipStream } from "../lib/server/stored-zip";

test("gera um ZIP armazenado com todas as entradas", async () => {
  const first = new TextEncoder().encode("foto um");
  const second = new TextEncoder().encode("foto dois");
  const stream = createStoredZipStream([
    {
      filename: "001-foto-um.jpg",
      size: first.length,
      open: async () => new Blob([first]).stream(),
    },
    {
      filename: "002-foto-dois.jpg",
      size: second.length,
      open: async () => new Blob([second]).stream(),
    },
  ]);
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoded = new TextDecoder().decode(bytes);

  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.match(decoded, /001-foto-um\.jpg/);
  assert.match(decoded, /002-foto-dois\.jpg/);
});
