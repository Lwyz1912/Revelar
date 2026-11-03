import type { AppFileRef } from "@/types/revelar";

export function attachmentName(file: string | AppFileRef) {
  return typeof file === "string" ? file : file.name;
}

export function attachmentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "arquivo";
}
