import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { config, higgsfield } from "@higgsfield/client/v2";
import { MODELS, type ModelKey } from "./config.js";

let credentials: { apiKey: string; apiSecret: string } | null = null;

function init() {
  if (credentials) return credentials;
  const raw = process.env.HF_CREDENTIALS;
  if (!raw || !raw.includes(":")) throw new Error("HF_CREDENTIALS ausente ou inválida no .env.local (formato key-id:key-secret).");
  const [apiKey, apiSecret] = raw.split(":");
  // Kling can take over 5 minutes, the SDK's default polling limit.
  config({ credentials: raw, maxPollTime: 20 * 60 * 1000 });
  credentials = { apiKey, apiSecret };
  return credentials;
}

// The SDK's uploadImage ignores the upload_headers the presigned URL is signed with, so S3 rejects it.
export async function uploadImage(path: string): Promise<string> {
  const { apiKey, apiSecret } = init();
  const contentType = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  const linkRes = await fetch("https://api.higgsfield.ai/files/generate-upload-url", {
    method: "POST",
    headers: { "hf-api-key": apiKey, "hf-secret": apiSecret, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!linkRes.ok) throw new Error(`Falha ao pedir link de upload: HTTP ${linkRes.status}`);
  const { upload_url, public_url, upload_headers } = (await linkRes.json()) as {
    upload_url: string;
    public_url: string;
    upload_headers: Record<string, string>;
  };
  const putRes = await fetch(upload_url, { method: "PUT", headers: upload_headers, body: await readFile(path) });
  if (!putRes.ok) throw new Error(`Falha no upload de ${path}: HTTP ${putRes.status}`);
  return public_url;
}

export function videoInput(model: ModelKey, prompt: string, imageUrls: string[], duration: number) {
  const { min, max } = MODELS[model];
  if (duration < min || duration > max) throw new Error(`${MODELS[model].label} aceita ${min}–${max} s; pedido: ${duration} s.`);
  const common = { prompt, image_urls: imageUrls, duration, aspect_ratio: "9:16" };
  return model === "wan"
    ? { ...common, resolution: "720p", generate_audio: false }
    : { ...common, mode: "std", sound: "off" };
}

// Returns the raw API result; callers persist it and check status themselves.
export async function generateVideo(model: ModelKey, input: object): Promise<any> {
  init();
  return higgsfield.subscribe(MODELS[model].endpoint, { input, withPolling: true });
}

export function videoUrlOrThrow(result: any): string {
  const url = result?.video?.url;
  if (result?.status !== "completed" || !url) {
    throw new Error(`Geração não concluída: status=${result?.status}${result?.error ? ` (${result.error})` : ""}`);
  }
  return url;
}
