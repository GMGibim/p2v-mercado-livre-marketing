// Usage: npm run join -- <produto> "<ajuste>" "<arquivo.mp4>[@inicio-fim]" "<arquivo.mp4>[@inicio-]" ...
// Joins clips from out/ in order (free). "@5.97-" keeps from 5.97 s on; "@0-5.97" keeps the first 5.97 s; "@0.1-" skips 0.1 s.
// Example: npm run join -- philips-walita-s7887 "porta giratoria" "<base tech>@0-5.97" "<transicao>" "<barbear>@0.1-" "<final>"
import { existsSync } from "node:fs";
import { posix } from "node:path";
import { loadProduct, nextVersion, parseVideoName, videoName } from "../config.js";
import { duration, joinClips, type Segment } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional } = parseArgs();
  const [slug, adjustment, ...specs] = positional;
  const ctx = await loadProduct(slug);
  if (!adjustment || specs.length < 2) throw new Error('Uso: npm run join -- <produto> "<ajuste>" "<arq1>[@ini-fim]" "<arq2>" ...');

  const segments: Segment[] = specs.map((spec) => {
    const at = spec.lastIndexOf(".mp4@");
    const name = at === -1 ? spec : spec.slice(0, at + 4);
    const range = at === -1 ? "" : spec.slice(at + 5);
    const file = posix.join(ctx.outDir, name);
    if (!existsSync(file)) throw new Error(`Vídeo não encontrado em out/: ${name}`);
    const [a, b] = range.split("-");
    return { file, start: a ? Number(a) : undefined, end: b ? Number(b) : undefined };
  });

  const label = parseVideoName(posix.basename(segments[0].file))?.modelLabel ?? "Wan Prime";
  const out = posix.join(ctx.outDir, videoName(ctx.product, label, await nextVersion(ctx.outDir), adjustment));
  joinClips(segments, out);
  console.log(`Vídeo: ${out} (${duration(out).toFixed(2)} s, ${segments.length} trechos)`);
});
