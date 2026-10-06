// Usage:
//   npm run frame  -- <produto> "<arquivo em out/>" <segundos> <nome.png> [--crop w:h:x:y]   -> refs/<nome.png>
//   npm run sheet  -- <produto> "<arquivo em out/>"                                          -> out/_trabalho/<arquivo> (quadros).png
//   npm run voices                                                                            -> lists Portuguese female voices
import { existsSync } from "node:fs";
import { posix } from "node:path";
import { loadProduct } from "../config.js";
import { listFemalePtVoices } from "../elevenlabs.js";
import { contactSheet, extractFrame } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional, flags } = parseArgs();
  const [command, slug, file, ...rest] = positional;

  if (command === "voices") {
    for (const v of await listFemalePtVoices()) console.log(`${v.id} | ${v.name} | ${v.source} | ${v.info}`);
    return;
  }

  const ctx = await loadProduct(slug);
  const video = posix.join(ctx.outDir, file ?? "");
  if (!file || !existsSync(video)) throw new Error(`Vídeo não encontrado em out/: ${file}`);

  if (command === "frame") {
    const [seconds, name] = rest;
    if (!seconds || !name) throw new Error("Informe o tempo em segundos e o nome do PNG de saída.");
    const out = posix.join(ctx.refsDir, name);
    extractFrame(video, Number(seconds), out, typeof flags.crop === "string" ? flags.crop : undefined);
    console.log(`Quadro salvo: ${out}`);
  } else if (command === "sheet") {
    const out = posix.join(ctx.workDir, `${file.replace(/\.mp4$/, "")} (quadros).png`);
    contactSheet(video, out);
    console.log(`Quadros: ${out}`);
  } else {
    throw new Error(`Comando desconhecido: ${command}`);
  }
});
