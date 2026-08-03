import type { Palette } from "@/types/revelar";

export const palettes: Array<{ id: Palette; name: string; colors: string[] }> = [
  { id: "essencia", name: "Essência", colors: ["#132b13", "#b89a65", "#f5f1e8"] },
  { id: "terracota", name: "Terracota", colors: ["#702f2b", "#c47047", "#f7eee6"] },
  { id: "rose", name: "Rosé", colors: ["#75414b", "#c7908f", "#f8eff0"] },
  { id: "mono", name: "Monocromático", colors: ["#171717", "#7a7a7a", "#f3f3f3"] },
  { id: "lune", name: "Lunê", colors: ["#294796", "#d3a349", "#f7f0df"] },
];
