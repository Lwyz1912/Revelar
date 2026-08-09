import type { Palette } from "@/types/revelar";

export const palettes: Array<{ id: Palette; name: string; colors: string[] }> = [
  { id: "essencia", name: "Essência", colors: ["#132b13", "#79561c", "#f3efe5"] },
  { id: "terracota", name: "Terracota", colors: ["#6d2d29", "#984123", "#f6eee6"] },
  { id: "rose", name: "Rosé", colors: ["#704052", "#94435b", "#f8eef2"] },
  { id: "mono", name: "Monocromático", colors: ["#181818", "#656565", "#f1f1f1"] },
  { id: "lune", name: "Lunê", colors: ["#263f8d", "#7f590d", "#f4f0e7"] },
];
