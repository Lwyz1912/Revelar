import assert from "node:assert/strict";
import test from "node:test";

import { addDays, calendarDays, startOfWeek } from "../lib/dates";

test("soma dias sem depender do horário local", () => {
  assert.equal(addDays("2026-08-03", 14), "2026-08-17");
});

test("gera uma grade mensal completa com seis semanas", () => {
  const days = calendarDays("2026-08-03");

  assert.equal(days.length, 42);
  assert.equal(days[0], startOfWeek("2026-08-01"));
});
