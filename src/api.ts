import type { PipelinesResponse, StatusResponse } from "./types";

export class ApiError extends Error {
  constructor() {
    super("Une erreur est survenue. Veuillez réessayer.");
    this.name = "ApiError";
  }
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiError();
  }

  if (!response.ok) {
    throw new ApiError();
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError();
  }
}

export function fetchStatus(): Promise<StatusResponse> {
  return requestJson<StatusResponse>("/api/status");
}

export function fetchPipelines(): Promise<PipelinesResponse> {
  return requestJson<PipelinesResponse>("/api/pipelines");
}

export async function submitToken(token: string): Promise<void> {
  await requestJson<{ ok: true }>("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export async function deleteToken(): Promise<void> {
  await requestJson<{ ok: true }>("/api/token", { method: "DELETE" });
}
