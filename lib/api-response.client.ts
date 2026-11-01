"use client";

export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.text();
  const statusReason =
    response.status === 401
      ? "Sua sessão expirou. Entre novamente e repita o envio."
      : response.status === 413
        ? "O arquivo ultrapassou o limite aceito pelo servidor."
        : response.status === 415
          ? "O formato do arquivo não é compatível."
          : response.status >= 500
            ? "O armazenamento ficou indisponível durante o envio."
            : `O servidor respondeu com o erro ${response.status}.`;
  if (!body.trim()) {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} ${statusReason}`);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} ${statusReason}`);
  }
}
