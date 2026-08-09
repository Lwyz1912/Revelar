"use client";

import { useEffect } from "react";
import type { AchievementEvaluation } from "@/lib/achievements";

export type AchievementCelebrationState = {
  achievement: AchievementEvaluation;
  count: number;
  retroactive: boolean;
};

export function AchievementCelebration({
  celebration,
  onClose,
}: {
  celebration: AchievementCelebrationState;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4600);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <aside className="achievement-celebration" role="status" aria-live="polite">
      <div className="achievement-sparkles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar aviso de conquista">
        ×
      </button>
      <span>{celebration.retroactive ? "CONQUISTAS DO HISTÓRICO" : "NOVA CONQUISTA"}</span>
      <div
        className={`achievement-celebration-icon tier-${celebration.achievement.tier.toLocaleLowerCase("pt-BR")}`}
      >
        {celebration.achievement.icon}
      </div>
      <small>
        {celebration.achievement.tier} · {celebration.achievement.category}
      </small>
      <h2>{celebration.achievement.title}</h2>
      <p>
        {celebration.count > 1
          ? `Esta e mais ${celebration.count - 1} conquistas foram reconhecidas automaticamente.`
          : celebration.achievement.description}
      </p>
    </aside>
  );
}
