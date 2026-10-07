// Usage: npm run reshoot -- <produto> <chave-do-plano> "<ajuste>" [--base <arquivo em out/>] [--model wan|kling] [--dry-run]
// Regenerates one shot of a video (detected by scene cuts) and splices it back in. Billable unless --dry-run.
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { posix } from "node:path";
import {
  MODELS, estimateUsd, latestVideo, loadProduct, modelKeyFromLabel, nextVersion, parseVideoName, videoName, type ModelKey,
} from "../config.js";
import { generateVideo, uploadImage, videoInput, videoUrlOrThrow } from "../higgsfield.js";
import { contactSheet, duration, sceneCuts, splice } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional, flags } = parseArgs();
  const [slug, key, adjustment] = positional;
  const ctx = await loadProduct(slug);
  const shot = ctx.product.reshoots?.[key];
  if (!shot) throw new Error(`Plano "${key}" não está em reshoots do product.json. Disponíveis: ${Object.keys(ctx.product.reshoots ?? {}).join(", ") || "nenhum"}`);
  if (!adjustment) throw new Error('Descreva o ajuste, ex.: "espelho sem luz verde". Ele vai no nome do arquivo.');

  // By default reshoot over the latest original generation, so earlier fixes don't stack artifacts.
  const base = typeof flags.base === "string" ? posix.join(ctx.outDir, flags.base) : await latestVideo(ctx.outDir, (a) => a === "original");
  if (!existsSync(base)) throw new Error(`Vídeo base não encontrado: ${base}`);
  const baseInfo = parseVideoName(posix.basename(base));
  if (!baseInfo) throw new Error(`Nome do vídeo base fora do padrão: ${base}`);

  // Cut detection misses transitions between similar-looking shots; --start/--end override it.
  const bounds = [0, ...sceneCuts(base), duration(base)];
  const planos = bounds.length - 1;
  const manual = typeof flags.start === "string";
  if (!manual && (shot.shot < 1 || shot.shot > planos)) {
    throw new Error(`O vídeo base tem ${planos} plano(s) detectado(s) (cortes: ${bounds.slice(1, -1).map((b) => b.toFixed(2)).join(", ")}); o plano pedido é ${shot.shot}. Use --start/--end em segundos.`);
  }
  const start = manual ? Number(flags.start) : bounds[shot.shot - 1];
  const end = typeof flags.end === "string" ? Number(flags.end) : manual ? duration(base) : bounds[shot.shot];

  const model = (typeof flags.model === "string" ? flags.model : shot.model ?? modelKeyFromLabel(baseInfo.modelLabel)) as ModelKey;
  if (!(model in MODELS)) throw new Error(`--model deve ser ${Object.keys(MODELS).join(" ou ")}`);
  const refs = shot.refs.map((f) => posix.join(ctx.refsDir, f));
  const missing = refs.filter((r) => !existsSync(r));
  if (missing.length) throw new Error(`Referências ausentes: ${missing.join(", ")}`);
  videoInput(model, shot.prompt, [], shot.duration);

  console.log(`Base: ${posix.basename(base)} — plano ${shot.shot} de ${planos} (${start.toFixed(2)}–${end.toFixed(2)} s)`);
  console.log(`${MODELS[model].label}, ${shot.duration} s. Custo estimado: ${estimateUsd(model, shot.duration)}`);
  if (flags["dry-run"]) {
    console.log(JSON.stringify(videoInput(model, shot.prompt, refs, shot.duration), null, 2));
    return;
  }

  const urls: string[] = [];
  for (const r of refs) urls.push(await uploadImage(r));
  const result = await generateVideo(model, videoInput(model, shot.prompt, urls, shot.duration));

  const version = await nextVersion(ctx.outDir);
  const label = baseInfo.modelLabel;
  const shotFile = posix.join(ctx.outDir, videoName(ctx.product, label, version, `so plano ${key}`));
  const fullFile = posix.join(ctx.outDir, videoName(ctx.product, label, version, adjustment));
  const stem = posix.basename(shotFile).replace(/\.mp4$/, "");
  await writeFile(posix.join(ctx.workDir, `${stem}.json`), JSON.stringify(result, null, 2));
  const url = videoUrlOrThrow(result);

  await writeFile(shotFile, Buffer.from(await (await fetch(url)).arrayBuffer()));
  splice(base, shotFile, start, end, fullFile);
  const sheet = posix.join(ctx.workDir, `${stem} (quadros).png`);
  contactSheet(shotFile, sheet);
  console.log(`Plano novo: ${shotFile}`);
  console.log(`Vídeo completo: ${fullFile} (${duration(fullFile).toFixed(2)} s)`);
  console.log(`Quadros do plano para revisão: ${sheet}`);
});
