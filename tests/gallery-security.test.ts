import assert from "node:assert/strict";
import test from "node:test";

import { hashPin, isExpired, secureToken, verifyPin } from "../lib/server/gallery-security";

test("protege o PIN com salt e PBKDF2", async () => {
  const first = await hashPin("4826");
  const second = await hashPin("4826");

  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyPin("4826", first.salt, first.hash), true);
  assert.equal(await verifyPin("0000", first.salt, first.hash), false);
});

test("gera tokens privados sem caracteres inseguros para URL", () => {
  const token = secureToken(24);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= 30);
});

test("identifica links de galeria expirados", () => {
  assert.equal(isExpired("2020-01-01T00:00:00.000Z"), true);
  assert.equal(isExpired("2999-01-01T00:00:00.000Z"), false);
  assert.equal(isExpired(null), false);
});
