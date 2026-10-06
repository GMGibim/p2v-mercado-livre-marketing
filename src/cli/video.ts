// Usage: npm run video -- <produto> [--model wan|kling] [--dry-run]
// Generates the full multi-shot video from the reference photos. Billable unless --dry-run.
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { posix } from "node:path";
import { MODELS, estimateUsd, loadProduct, nextVersion, videoName, type ModelKey } from "../config.js";
import { generateVideo, uploadImage, videoInput, videoUrlOrThrow } from "../higgsfield.js";
import { contactSheet, duration, sceneCuts } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional, flags } = parseArgs();
  const ctx = await loadProduct(positional[0]);
  const spec = ctx.product.video;
  const model = (typeof flags.model === "string" ? flags.model : spec.model ?? "wan") as ModelKey;
  if (!(model in MODELS)) throw new Error(`--model deve ser ${Object.keys(MODELS).join(" ou ")}`);

  const refs = spec.refs.map((f) => posix.join(ctx.refsDir, f));
  const missing = refs.filter((r) => !existsSync(r));
  if (missing.length) throw new Error(`Referências ausentes: ${missing.join(", ")}. Rode \`npm run refs -- ${ctx.slug}\`.`);
  videoInput(model, spec.prompt, [], spec.duration); // validates duration before spending anything

  console.log(`${MODELS[model].label}, ${spec.duration} s, 9:16, ${refs.length} referências. Custo estimado: ${estimateUsd(model, spec.duration)}`);
  if (flags["dry-run"]) {
    console.log(JSON.stringify(videoInput(model, spec.prompt, refs, spec.duration), null, 2));
    return;
  }

  const urls: string[] = [];
  for (const r of refs) urls.push(await uploadImage(r));
  const result = await generateVideo(model, videoInput(model, spec.prompt, urls, spec.duration));

  const version = await nextVersion(ctx.outDir);
  const file = videoName(ctx.product, MODELS[model].label, version, "original");
  const stem = file.replace(/\.mp4$/, "");
  await writeFile(posix.join(ctx.workDir, `${stem}.json`), JSON.stringify(result, null, 2));
  const url = videoUrlOrThrow(result);

  const out = posix.join(ctx.outDir, file);
  await writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const sheet = posix.join(ctx.workDir, `${stem} (quadros).png`);
  contactSheet(out, sheet);
  const cuts = sceneCuts(out).map((c) => c.toFixed(2));
  console.log(`Vídeo: ${out} (${duration(out).toFixed(2)} s)`);
  console.log(`Cortes entre planos (s): ${cuts.join(", ") || "nenhum detectado"}`);
  console.log(`Quadros para revisão: ${sheet}`);
});
