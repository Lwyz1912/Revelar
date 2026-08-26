import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createGallery,
  galleriesForOwner,
  galleryForOwner,
  serializeGallery,
} from "@/lib/server/gallery-repository";
import type { Currency } from "@/types/revelar";
import { professionalDisplayName } from "@/lib/server/professional-settings-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para acessar suas galerias." }, { status: 401 });
  const responderName = await professionalDisplayName(user.email, user.displayName);
  const workId = Number(new URL(request.url).searchParams.get("workId"));
  if (!new URL(request.url).searchParams.has("workId")) {
    const galleries = await galleriesForOwner(user.email);
    return Response.json({
      galleries: await Promise.all(galleries.map((gallery) => serializeGallery(gallery))),
      responderName,
    });
  }
  if (!Number.isInteger(workId)) {
    return Response.json({ error: "Trabalho inválido." }, { status: 400 });
  }
  const gallery = await galleryForOwner(user.email, workId);
  return Response.json({
    gallery: gallery ? await serializeGallery(gallery) : null,
    responderName,
  });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para criar uma galeria." }, { status: 401 });
  const input = (await request.json()) as {
    workId?: number;
    name?: string;
    description?: string;
    albumDate?: string;
    workTitle?: string;
    clientName?: string;
    currency?: Currency;
  };
  const workId = Number.isInteger(input.workId) ? input.workId : undefined;
  const fallbackName = `Envio de fotos ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`;
  const name = input.name?.trim() || input.workTitle?.trim() || fallbackName;
  const gallery = await createGallery({
    ownerEmail: user.email,
    workId,
    name,
    description: input.description || "",
    albumDate: input.albumDate,
    workTitle: input.workTitle?.trim() || name,
    clientName: input.clientName?.trim() || "",
    currency: input.currency === "EUR" ? "EUR" : "BRL",
  });
  return Response.json(
    {
      gallery: await serializeGallery(gallery),
      responderName: await professionalDisplayName(user.email, user.displayName),
    },
    { status: 201 },
  );
}
