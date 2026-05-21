import { invoke } from "@tauri-apps/api/core";

let port: number | null = null;

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function startApi(): Promise<void> {
  port = await invoke<number>("start_sidecar");
}

export async function stopApi(): Promise<void> {
  try {
    await invoke("stop_sidecar");
  } catch {}
  port = null;
}

export function apiUrl(path: string): string {
  if (port !== null) {
    return `http://127.0.0.1:${port}${path}`;
  }
  throw new Error("Sidecar not started");
}

export function getPort(): number | null {
  return port;
}
