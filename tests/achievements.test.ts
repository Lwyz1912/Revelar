import assert from "node:assert/strict";
import test from "node:test";

import {
  achievementCategories,
  achievementDefinitions,
  createMissingUnlocks,
  evaluateAchievements,
} from "../lib/achievements";
import {
  initialAgendaEvents,
  initialClients,
  initialContracts,
  initialFinanceTransactions,
  initialProducts,
  initialQuotes,
  initialWorks,
} from "../data/demo";
import { initialDiaryEntries, initialLocations } from "../data/story";

const context = {
  clients: initialClients,
  works: initialWorks,
  agendaEvents: initialAgendaEvents,
  transactions: initialFinanceTransactions,
  products: initialProducts,
  quotes: initialQuotes,
  contracts: initialContracts,
  locations: initialLocations,
  diaryEntries: initialDiaryEntries,
};

test("achievement catalog has 75 unique achievements and 10 secrets", () => {
  assert.equal(achievementDefinitions.length, 75);
  assert.equal(new Set(achievementDefinitions.map((achievement) => achievement.id)).size, 75);
  assert.equal(achievementDefinitions.filter((achievement) => achievement.secret).length, 10);
  assert.deepEqual(
    new Set(achievementDefinitions.map((achievement) => achievement.category)),
    new Set(achievementCategories),
  );
  for (const category of achievementCategories) {
    assert.equal(
      achievementDefinitions.filter(
        (achievement) => achievement.category === category && achievement.secret,
      ).length,
      1,
    );
  }
});

test("achievements are evaluated retroactively from current app data", () => {
  const evaluated = evaluateAchievements(context);
  const firstClient = evaluated.find((achievement) => achievement.id === "clients-1");
  const firstWork = evaluated.find((achievement) => achievement.id === "works-1");
  const firstLocation = evaluated.find((achievement) => achievement.id === "locations-1");
  assert.equal(firstClient?.unlocked, true);
  assert.equal(firstWork?.unlocked, true);
  assert.equal(firstLocation?.unlocked, true);

  const missing = createMissingUnlocks(evaluated, [], "2026-08-09T12:00:00.000Z", true);
  assert.ok(missing.length >= 3);
  assert.ok(missing.every((unlock) => unlock.retroactive));
  assert.equal(
    createMissingUnlocks(evaluated, missing, "2026-08-10T12:00:00.000Z", false).length,
    0,
  );
});

test("an unlocked achievement stays unlocked if the source record is later archived or removed", () => {
  const evaluated = evaluateAchievements(context, [
    { id: "clients-secret-50", unlockedAt: "2026-08-09T12:00:00.000Z", retroactive: false },
  ]);
  assert.equal(
    evaluated.find((achievement) => achievement.id === "clients-secret-50")?.unlocked,
    true,
  );
});
