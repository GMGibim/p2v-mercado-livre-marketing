import { readFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { posix } from "node:path";

// Forward slashes even on Windows: some paths end up inside ffmpeg filter expressions.
const { join } = posix;

export type Crop = { left: number; top: number; width: number; height: number };
export type ImageRef = { file: string; source?: string; crop?: Crop };
export type ModelKey = keyof typeof MODELS;
export type ShotSpec = { refs: string[]; prompt: string; duration: number; model?: ModelKey };

export type Product = {
  name: string;
  title: string;
  images: ImageRef[];
  video: ShotSpec;
  reshoots?: Record<string, ShotSpec & { shot: number }>;
  audio?: { voiceId: string; voiceName: string; script: string; musicVolume?: number };
};

export const MODELS = {
  wan: { label: "Wan Prime", endpoint: "alibaba/wan-3.0-prime/reference-to-video", usdPerSecond: 0.084, min: 2, max: 30 },
  kling: { label: "Kling O3", endpoint: "kling-video/o3/image-reference", usdPerSecond: 0.042, min: 3, max: 15 },
} as const;

export type ProductCtx = {
  slug: string;
  product: Product;
  dir: string;
  refsDir: string;
  outDir: string;
  workDir: string;
  cacheDir: string;
};

export async function loadProduct(slug: string | undefined): Promise<ProductCtx> {
  if (!slug) throw new Error("Informe o produto: a pasta em products/, ex. philips-mg3927");
  const dir = join("products", slug);
  const file = join(dir, "product.json");
  if (!existsSync(file)) throw new Error(`Não encontrei ${file}. Copie products/_template/product.json.`);
  const product = JSON.parse(await readFile(file, "utf8")) as Product;
  const ctx = {
    slug,
    product,
    dir,
    refsDir: join(dir, "refs"),
    outDir: join(dir, "out"),
    workDir: join(dir, "out", "_trabalho"),
    cacheDir: join(dir, "cache"),
  };
  for (const d of [ctx.refsDir, ctx.outDir, ctx.workDir, ctx.cacheDir]) await mkdir(d, { recursive: true });
  return ctx;
}

// File names follow "[Produto] - [Modelo] vN - [ajuste].mp4".
export function videoName(product: Product, modelLabel: string, version: number, adjustment: string): string {
  return `${product.name} - ${modelLabel} v${version} - ${adjustment}.mp4`;
}

const VERSION_RE = / - (.+?) v(\d+) - (.+)\.mp4$/;

export function parseVideoName(file: string): { modelLabel: string; version: number; adjustment: string } | null {
  const m = VERSION_RE.exec(file);
  return m ? { modelLabel: m[1], version: Number(m[2]), adjustment: m[3] } : null;
}

async function videos(outDir: string) {
  return (await readdir(outDir))
    .map((f) => ({ file: f, info: parseVideoName(f) }))
    .filter((v): v is { file: string; info: NonNullable<ReturnType<typeof parseVideoName>> } => v.info !== null);
}

export async function nextVersion(outDir: string): Promise<number> {
  return Math.max(0, ...(await videos(outDir)).map((v) => v.info.version)) + 1;
}

// Latest full video (never a single regenerated shot) whose adjustment passes the filter.
export async function latestVideo(outDir: string, filter: (adjustment: string) => boolean = () => true): Promise<string> {
  const candidates = (await videos(outDir))
    .filter((v) => !v.info.adjustment.startsWith("so plano") && filter(v.info.adjustment))
    .sort((a, b) => b.info.version - a.info.version);
  if (!candidates.length) throw new Error(`Nenhum vídeo adequado em ${outDir}. Rode \`npm run video\` primeiro ou passe --base.`);
  return join(outDir, candidates[0].file);
}

export function modelKeyFromLabel(label: string): ModelKey {
  const key = (Object.keys(MODELS) as ModelKey[]).find((k) => MODELS[k].label === label);
  if (!key) throw new Error(`Modelo desconhecido no nome do arquivo: ${label}`);
  return key;
}

export function estimateUsd(model: ModelKey, seconds: number): string {
  return `~US$ ${(MODELS[model].usdPerSecond * seconds).toFixed(2)} (preço de tabela; confira no console)`;
}
