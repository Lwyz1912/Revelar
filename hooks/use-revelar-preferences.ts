"use client";

import { useStoredTextState } from "@/hooks/use-persisted-state";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import { storageKeys } from "@/lib/storage";
import type { Currency, Palette, ThemeMode, ViewMode } from "@/types/revelar";

const themeModes: readonly ThemeMode[] = ["light", "dark", "system"];
const palettes: readonly Palette[] = ["essencia", "terracota", "rose", "mono", "lune"];
const currencies: readonly Currency[] = ["BRL", "EUR"];
const viewModes: readonly ViewMode[] = ["list", "cards"];

export function useRevelarPreferences() {
  const [themeMode, setThemeMode] = useStoredTextState(storageKeys.theme, "light", themeModes);
  const [palette, setPalette] = useStoredTextState(storageKeys.palette, "essencia", palettes);
  const [currency, setCurrency] = useStoredTextState(storageKeys.currency, "BRL", currencies);
  const [clientViewMode, setClientViewMode] = useStoredTextState(
    storageKeys.clientView,
    "list",
    viewModes,
  );
  const [workViewMode, setWorkViewMode] = useStoredTextState(
    storageKeys.workView,
    "list",
    viewModes,
  );

  return {
    themeMode,
    setThemeMode,
    palette,
    setPalette,
    currency,
    setCurrency,
    clientViewMode,
    setClientViewMode,
    workViewMode,
    setWorkViewMode,
    resolvedTheme: useResolvedTheme(themeMode),
  };
}
