import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownerKey } from "@/lib/server/gallery-repository";
import { safeFilename, storeObject } from "@/lib/server/gallery-storage";
import { addEditingPhoto, editingAlbum, editingLibrary } from "@/lib/server/editing-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ albumId: string }> };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para importar fotos." }, { status: 401 });
  const { albumId } = await context.params;
  const album = await editingAlbum(albumId);
  if (!album || album.owner_email !== user.email) {
    return Response.json({ error: "Álbum não encontrado." }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  const preview = form.get("preview");
  if (!(file instanceof File) || !(preview instanceof File) || !allowedTypes.has(file.type)) {
    return Response.json(
      { error: "Envie uma foto JPG, PNG ou WebP com sua prévia." },
      { status: 400 },
    );
  }
  if (file.size > 250 * 1024 * 1024) {
    return Response.json({ error: "A foto excede 250 MB." }, { status: 413 });
  }
  if (preview.size > 5 * 1024 * 1024) {
    return Response.json({ error: "A prévia excede 5 MB." }, { status: 413 });
  }
  const keyOwner = await ownerKey(user.email);
  const base = `owners/${keyOwner}/editing/${albumId}/${crypto.randomUUID()}`;
  const originalKey = `${base}/original-${safeFilename(file.name)}`;
  const previewKey = `${base}/preview-${safeFilename(preview.name)}`;
  await storeObject(originalKey, file);
  await storeObject(previewKey, preview);
  await addEditingPhoto({
    albumId,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    width: Number(form.get("width") || 0),
    height: Number(form.get("height") || 0),
    originalKey,
    previewKey,
  });
  return Response.json(await editingLibrary(user.email));
}
