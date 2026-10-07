// Usage: npm run clip -- <produto> <chave-do-clip> [--dry-run]
// Animates a clip with Kling O3 between FIXED frames (first and optional last), so pose, product and person
// are exactly the ones in your photos. Clips live in product.json under "clips". Billable unless --dry-run.
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { posix } from "node:path";
import { MODELS, estimateUsd, loadProduct, nextVersion, videoName } from "../config.js";
import { generateVideo, uploadImage, videoUrlOrThrow } from "../higgsfield.js";
import { contactSheet, duration } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional, flags } = parseArgs();
  const [slug, key] = positional;
  const ctx = await loadProduct(slug);
  const clip = ctx.product.clips?.[key];
  if (!clip) throw new Error(`Clip "${key}" não está em clips do product.json. Disponíveis: ${Object.keys(ctx.product.clips ?? {}).join(", ") || "nenhum"}`);

  const { min, max } = MODELS.kling;
  if (clip.duration < min || clip.duration > max) throw new Error(`Kling aceita ${min}–${max} s; pedido: ${clip.duration} s.`);
  const first = posix.join(ctx.dir, clip.first);
  const last = clip.last ? posix.join(ctx.dir, clip.last) : undefined;
  const missing = [first, last].filter((f): f is string => !!f && !existsSync(f));
  if (missing.length) throw new Error(`Quadros ausentes: ${missing.join(", ")}`);

  console.log(`Kling O3, ${clip.duration} s, 9:16, quadro inicial${last ? " + final" : ""}. Custo estimado: ${estimateUsd("kling", clip.duration)}`);
  const input = { prompt: clip.prompt, duration: clip.duration, aspect_ratio: "9:16", mode: "std", sound: "off" };
  if (flags["dry-run"]) {
    console.log(JSON.stringify({ ...input, first_frame_url: first, ...(last ? { last_frame_url: last } : {}) }, null, 2));
    return;
  }

  const result = await generateVideo("kling", {
    ...input,
    first_frame_url: await uploadImage(first),
    ...(last ? { last_frame_url: await uploadImage(last) } : {}),
  });

  const file = videoName(ctx.product, MODELS.kling.label, await nextVersion(ctx.outDir), `so plano ${key}`);
  const stem = file.replace(/\.mp4$/, "");
  await writeFile(posix.join(ctx.workDir, `${stem}.json`), JSON.stringify(result, null, 2));
  const url = videoUrlOrThrow(result);

  const out = posix.join(ctx.outDir, file);
  await writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const sheet = posix.join(ctx.workDir, `${stem} (quadros).png`);
  contactSheet(out, sheet);
  console.log(`Clipe: ${out} (${duration(out).toFixed(2)} s)`);
  console.log(`Quadros para revisão: ${sheet}`);
});
