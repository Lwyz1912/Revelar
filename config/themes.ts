import type { Palette } from "@/types/revelar";

export const palettes: Array<{ id: Palette; name: string; colors: string[] }> = [
  { id: "essencia", name: "Essência", colors: ["#132b13", "#ffed29", "#f7f8f4"] },
  { id: "terracota", name: "Terracota", colors: ["#6d2d29", "#984123", "#f6eee6"] },
  { id: "rose", name: "Rosé", colors: ["#704052", "#94435b", "#f8eef2"] },
  { id: "mono", name: "Monocromático", colors: ["#181818", "#656565", "#f1f1f1"] },
  { id: "lune", name: "Noite dourada", colors: ["#0b1026", "#fabb0d", "#fff8dc"] },
];
