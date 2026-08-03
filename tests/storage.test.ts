import assert from "node:assert/strict";
import test from "node:test";

import { readJson, readText, writeJson, writeText, type StorageLike } from "../lib/storage";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test("lê e grava objetos serializados", () => {
  const storage = new MemoryStorage();
  writeJson(storage, "clients", [{ id: 1, name: "Camila" }]);

  assert.deepEqual(readJson(storage, "clients", []), [{ id: 1, name: "Camila" }]);
});

test("usa fallback quando o JSON salvo está corrompido", () => {
  const storage = new MemoryStorage();
  storage.setItem("products", "{não-é-json");

  assert.deepEqual(readJson(storage, "products", [{ id: "fallback" }]), [{ id: "fallback" }]);
});

test("aceita apenas preferências textuais conhecidas", () => {
  const storage = new MemoryStorage();
  writeText(storage, "theme", "dark");

  assert.equal(readText(storage, "theme", "light", ["light", "dark", "system"]), "dark");

  storage.setItem("theme", "inexistente");
  assert.equal(readText(storage, "theme", "light", ["light", "dark", "system"]), "light");
});
