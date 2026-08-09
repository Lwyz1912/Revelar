import type { GalleryFolder, GalleryPhase, WorkCategory } from "@/types/revelar";

export type DemoGalleryPhoto = {
  id: string;
  filename: string;
  image: string;
  selected: boolean;
  approved: boolean;
  comment: string;
};

export type DemoGalleryFolder = {
  id: GalleryFolder;
  count: number;
  bytes: number;
  status: "ready" | "active" | "waiting";
};

export type DemoGallery = {
  id: string;
  workId: number;
  workTitle: string;
  clientName: string;
  category: WorkCategory;
  date: string;
  phase: GalleryPhase;
  statusLabel: string;
  cover: string;
  selectionLimit: number;
  selectionLocked: boolean;
  revisionRound: number;
  revisionLimit: number;
  folders: DemoGalleryFolder[];
  photos: DemoGalleryPhoto[];
};

function photos(
  prefix: string,
  image: string,
  selectedCount: number,
  approvedCount: number,
  commentAt?: number,
): DemoGalleryPhoto[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    filename: `${prefix.toUpperCase()}-${String(index + 1).padStart(3, "0")}.jpg`,
    image,
    selected: index < selectedCount,
    approved: index < approvedCount,
    comment:
      index === commentAt
        ? "Gostei muito desta. Só gostaria de uma versão um pouco mais clara."
        : "",
  }));
}

export const initialDemoGalleries: DemoGallery[] = [
  {
    id: "demo-casamento",
    workId: 1,
    workTitle: "Casamento Amanda e João",
    clientName: "Amanda e João",
    category: "Casamento",
    date: "2026-07-18",
    phase: "selection",
    statusLabel: "Seleção aberta",
    cover: "/demo/gallery/casamento.webp",
    selectionLimit: 5,
    selectionLocked: false,
    revisionRound: 1,
    revisionLimit: 2,
    folders: [
      { id: "preview", count: 286, bytes: 612_000_000, status: "ready" },
      { id: "selection", count: 3, bytes: 18_400_000, status: "active" },
      { id: "edited", count: 0, bytes: 0, status: "waiting" },
      { id: "delivered", count: 0, bytes: 0, status: "waiting" },
      { id: "originals", count: 1_240, bytes: 24_800_000_000, status: "ready" },
    ],
    photos: photos("casamento", "/demo/gallery/casamento.webp", 3, 0),
  },
  {
    id: "demo-pessoal",
    workId: 3,
    workTitle: "Ensaio pessoal de Camila",
    clientName: "Camila Almeida",
    category: "Ensaio pessoal",
    date: "2026-07-30",
    phase: "selection",
    statusLabel: "Seleção confirmada",
    cover: "/demo/gallery/ensaio-pessoal.webp",
    selectionLimit: 5,
    selectionLocked: true,
    revisionRound: 1,
    revisionLimit: 2,
    folders: [
      { id: "preview", count: 94, bytes: 210_000_000, status: "ready" },
      { id: "selection", count: 5, bytes: 29_000_000, status: "ready" },
      { id: "edited", count: 0, bytes: 0, status: "waiting" },
      { id: "delivered", count: 0, bytes: 0, status: "waiting" },
      { id: "originals", count: 312, bytes: 6_340_000_000, status: "ready" },
    ],
    photos: photos("camila", "/demo/gallery/ensaio-pessoal.webp", 5, 0),
  },
  {
    id: "demo-familia",
    workId: 4,
    workTitle: "Família Almeida",
    clientName: "Camila Almeida",
    category: "Família",
    date: "2026-07-12",
    phase: "approval",
    statusLabel: "Aguardando ajustes",
    cover: "/demo/gallery/familia.webp",
    selectionLimit: 6,
    selectionLocked: false,
    revisionRound: 2,
    revisionLimit: 2,
    folders: [
      { id: "preview", count: 118, bytes: 264_000_000, status: "ready" },
      { id: "selection", count: 6, bytes: 35_800_000, status: "ready" },
      { id: "edited", count: 6, bytes: 128_000_000, status: "active" },
      { id: "delivered", count: 0, bytes: 0, status: "waiting" },
      { id: "originals", count: 410, bytes: 8_210_000_000, status: "ready" },
    ],
    photos: photos("familia", "/demo/gallery/familia.webp", 6, 3, 3),
  },
  {
    id: "demo-editorial",
    workId: 2,
    workTitle: "Editorial coleção Aurora",
    clientName: "Loja Aurora",
    category: "Editorial para loja",
    date: "2026-07-22",
    phase: "delivery",
    statusLabel: "Entrega liberada",
    cover: "/demo/gallery/editorial.webp",
    selectionLimit: 8,
    selectionLocked: true,
    revisionRound: 1,
    revisionLimit: 1,
    folders: [
      { id: "preview", count: 146, bytes: 330_000_000, status: "ready" },
      { id: "selection", count: 8, bytes: 44_000_000, status: "ready" },
      { id: "edited", count: 8, bytes: 176_000_000, status: "ready" },
      { id: "delivered", count: 8, bytes: 228_000_000, status: "ready" },
      { id: "originals", count: 540, bytes: 10_920_000_000, status: "ready" },
    ],
    photos: photos("aurora", "/demo/gallery/editorial.webp", 8, 8),
  },
];

export const galleryFolderLabels: Record<GalleryFolder, string> = {
  preview: "Prévia",
  selection: "Seleção",
  edited: "Editadas",
  delivered: "Entregues",
  originals: "Originais",
};
