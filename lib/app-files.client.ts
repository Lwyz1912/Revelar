"use client";

import type { AppFileRef } from "@/types/revelar";

export function isAppFileRef(value: unknown): value is AppFileRef {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name" in value &&
      "type" in value &&
      "size" in value,
  );
}

export function fileViewUrl(file: AppFileRef) {
  return `/api/files/${encodeURIComponent(file.id)}`;
}

export function fileDownloadUrl(file: AppFileRef) {
  return `${fileViewUrl(file)}?download=1`;
}

export function fileExtension(file: Pick<AppFileRef, "name">) {
  return file.name.split(".").pop()?.toLocaleUpperCase("pt-BR") || "ARQUIVO";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function uploadAppFile(file: File, scope: string, relatedId?: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("scope", scope);
  if (relatedId) form.set("relatedId", relatedId);
  const response = await fetch("/api/files", { method: "POST", body: form });
  const result = (await response.json().catch(() => ({}))) as {
    file?: AppFileRef;
    error?: string;
  };
  if (!response.ok || !result.file) {
    throw new Error(result.error || "Não foi possível enviar o arquivo.");
  }
  return result.file;
}

export async function deleteAppFile(file: AppFileRef) {
  if (file.storage === "local") return;
  const response = await fetch(fileViewUrl(file), { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(result.error || "Não foi possível excluir o arquivo.");
  }
}
