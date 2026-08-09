import assert from "node:assert/strict";
import test from "node:test";

import { equivalentEventTime, otherEventTimezone } from "../lib/agenda";

test("converte eventos de Recife para Lisboa respeitando o horário de verão", () => {
  assert.equal(equivalentEventTime("2026-08-09", "09:00", "America/Recife"), "13:00");
  assert.equal(equivalentEventTime("2026-01-09", "09:00", "America/Recife"), "12:00");
});

test("converte eventos de Lisboa para Recife", () => {
  assert.equal(equivalentEventTime("2026-08-09", "18:00", "Europe/Lisbon"), "14:00");
  assert.equal(otherEventTimezone("Europe/Lisbon"), "America/Recife");
});
