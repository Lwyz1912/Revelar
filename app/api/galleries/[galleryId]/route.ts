import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  galleryById,
  recordGalleryEvent,
  serializeGallery,
  updateGallerySettings,
} from "@/lib/server/gallery-repository";
import type { Currency, GalleryPhase, GalleryStorageMode } from "@/types/revelar";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ galleryId: string }> };

async function ownedGallery(context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "Entre para continuar." }, { status: 401 }) };
  const { galleryId } = await context.params;
  const gallery = await galleryById(galleryId);
  if (!gallery || gallery.owner_email !== user.email) {
    return { error: Response.json({ error: "Galeria não encontrada." }, { status: 404 }) };
  }
  return { gallery };
}

export async function GET(_request: Request, context: RouteContext) {
  const result = await ownedGallery(context);
  if (result.error) return result.error;
  return Response.json({ gallery: await serializeGallery(result.gallery!) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const result = await ownedGallery(context);
  if (result.error) return result.error;
  const input = (await request.json()) as {
    phase?: GalleryPhase;
    selectionLimit?: number;
    extraPriceCents?: number;
    currency?: Currency;
    expiresAt?: string | null;
    pin?: string | null;
    revisionLimit?: number;
    revisionRound?: number;
    selectionLocked?: boolean;
    watermarkLabel?: string;
    storageMode?: GalleryStorageMode;
  };
  if (input.phase && !["selection", "approval", "delivery"].includes(input.phase)) {
    return Response.json({ error: "Etapa de galeria inválida." }, { status: 400 });
  }
  const updated = await updateGallerySettings(result.gallery!, input);
  await recordGalleryEvent(updated.id, "settings_updated", "Configurações da galeria atualizadas");
  return Response.json({ gallery: await serializeGallery(updated) });
}
