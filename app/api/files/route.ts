import { getChatGPTUser } from "@/app/chatgpt-auth";
import { saveAppFile } from "@/lib/server/app-file-repository";

export const dynamic = "force-dynamic";

const allowedScopes = new Set([
  "contract",
  "contract-template",
  "work",
  "work-stage",
  "moodboard",
  "product",
  "profile",
  "brand",
  "watermark",
]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Entre para enviar arquivos." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const scope = String(form.get("scope") || "");
  const relatedId = String(form.get("relatedId") || "");
  if (!(file instanceof File)) {
    return Response.json({ error: "Selecione um arquivo." }, { status: 400 });
  }
  if (!allowedScopes.has(scope)) {
    return Response.json({ error: "Destino de arquivo inválido." }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return Response.json({ error: "O arquivo individual excede 100 MB." }, { status: 413 });
  }
  const saved = await saveAppFile({ ownerEmail: user.email, file, scope, relatedId });
  return Response.json({ file: saved }, { status: 201 });
}
