"use client";

import { useEffect, useState } from "react";

import type { ThemeMode } from "@/types/revelar";

export function useResolvedTheme(mode: ThemeMode) {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}
