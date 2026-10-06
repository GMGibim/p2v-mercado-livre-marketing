// Usage: npm run refs -- <produto>
// Downloads/crops the listing photos in product.json into refs/ as PNGs the video models accept.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { posix } from "node:path";
import sharp from "sharp";
import { loadProduct } from "../config.js";
import { normalizeImage } from "../media.js";
import { parseArgs, run } from "./args.js";

run(async () => {
  const { positional } = parseArgs();
  const ctx = await loadProduct(positional[0]);
  for (const img of ctx.product.images) {
    const out = posix.join(ctx.refsDir, img.file);
    if (!img.source) {
      console.log(existsSync(out) ? `${img.file}: mantido (sem source)` : `${img.file}: AUSENTE — sem source; crie com \`npm run frame\` ou copie para refs/`);
      continue;
    }
    let input: Buffer;
    if (/^https?:\/\//.test(img.source)) {
      const res = await fetch(img.source);
      if (!res.ok) throw new Error(`Download de ${img.source} falhou: HTTP ${res.status}`);
      input = Buffer.from(await res.arrayBuffer());
    } else {
      input = await readFile(posix.join(ctx.dir, img.source));
    }
    await normalizeImage(input, img.crop, out);
    const m = await sharp(out).metadata();
    console.log(`${img.file}: ${m.width}x${m.height}`);
  }
});
