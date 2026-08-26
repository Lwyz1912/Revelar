"use client";

export async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(response.ok ? fallbackMessage : `${fallbackMessage} (erro ${response.status})`);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      response.ok
        ? fallbackMessage
        : `${fallbackMessage} O servidor recusou o arquivo sem retornar detalhes.`,
    );
  }
}
