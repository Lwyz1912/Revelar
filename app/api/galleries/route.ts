import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createGallery,
  galleriesForOwner,
  galleryForOwner,
  serializeGallery,
} from "@/lib/server/gallery-repository";
import type { Currency } from "@/types/revelar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para acessar suas galerias." }, { status: 401 });
  const workId = Number(new URL(request.url).searchParams.get("workId"));
  if (!new URL(request.url).searchParams.has("workId")) {
    const galleries = await galleriesForOwner(user.email);
    return Response.json({
      galleries: await Promise.all(galleries.map((gallery) => serializeGallery(gallery))),
    });
  }
  if (!Number.isInteger(workId)) {
    return Response.json({ error: "Trabalho inválido." }, { status: 400 });
  }
  const gallery = await galleryForOwner(user.email, workId);
  return Response.json({ gallery: gallery ? await serializeGallery(gallery) : null });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para criar uma galeria." }, { status: 401 });
  const input = (await request.json()) as {
    workId?: number;
    workTitle?: string;
    clientName?: string;
    currency?: Currency;
  };
  if (!Number.isInteger(input.workId) || !input.workTitle?.trim() || !input.clientName?.trim()) {
    return Response.json({ error: "Preencha trabalho e cliente." }, { status: 400 });
  }
  const gallery = await createGallery({
    ownerEmail: user.email,
    workId: input.workId!,
    workTitle: input.workTitle.trim(),
    clientName: input.clientName.trim(),
    currency: input.currency === "EUR" ? "EUR" : "BRL",
  });
  return Response.json({ gallery: await serializeGallery(gallery) }, { status: 201 });
}
