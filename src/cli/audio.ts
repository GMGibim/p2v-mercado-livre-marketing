// Usage: npm run audio -- <produto> [--base <arquivo em out/>] [--music refs/<faixa>.mp3]
// Adds voice-over (ElevenLabs), synced captions and optional background music to a finished video.
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { latestVideo, loadProduct, nextVersion, parseVideoName, videoName } from "../config.js";
import { textToSpeech, type Alignment } from "../elevenlabs.js";
import { captionsAss, duration, mixAudio, speechEnd } from "../media.js";
import { parseArgs, run } from "./args.js";

const VOICE_DELAY_S = 0.3;

run(async () => {
  const { positional, flags } = parseArgs();
  const ctx = await loadProduct(positional[0]);
  const cfg = ctx.product.audio;
  if (!cfg) throw new Error("Falta o bloco audio no product.json (voiceId, voiceName, script).");

  // Default base: latest full video that has no audio pass yet.
  const base = typeof flags.base === "string" ? posix.join(ctx.outDir, flags.base) : await latestVideo(ctx.outDir, (a) => !a.startsWith("voz"));
  const baseInfo = parseVideoName(posix.basename(base));
  if (!existsSync(base) || !baseInfo) throw new Error(`Vídeo base inválido: ${base}`);

  const music = typeof flags.music === "string" ? posix.join(ctx.dir, flags.music) : null;
  if (music && !existsSync(music)) throw new Error(`Música não encontrada: ${music}`);

  // Cache by voice + script so reruns keep the exact same take (and don't spend characters).
  const hash = createHash("sha1").update(`${cfg.voiceId}\n${cfg.script}`).digest("hex").slice(0, 10);
  const voiceFile = posix.join(ctx.cacheDir, `voice-${hash}.mp3`);
  const alignFile = posix.join(ctx.cacheDir, `voice-${hash}.json`);
  let alignment: Alignment;
  if (existsSync(voiceFile) && existsSync(alignFile)) {
    alignment = JSON.parse(await readFile(alignFile, "utf8"));
    console.log(`Voz reaproveitada do cache (${cfg.voiceName}).`);
  } else {
    const tts = await textToSpeech(cfg.voiceId, cfg.script);
    await writeFile(voiceFile, tts.audio);
    await writeFile(alignFile, JSON.stringify(tts.alignment));
    alignment = tts.alignment;
    console.log(`Voz gerada (${cfg.voiceName}).`);
  }

  const videoDur = duration(base);
  const speech = speechEnd(alignment) + VOICE_DELAY_S;
  if (speech > videoDur) throw new Error(`A fala (${speech.toFixed(2)} s) passa do vídeo (${videoDur.toFixed(2)} s). Encurte o script.`);

  const assFile = posix.join(ctx.workDir, "legenda.ass");
  await writeFile(assFile, captionsAss(alignment, VOICE_DELAY_S));

  const musicLabel = music ? posix.basename(music, ".mp3").split("-")[0] : null;
  const adjustment = musicLabel ? `voz legenda e musica ${musicLabel}` : "voz e legenda";
  const out = posix.join(ctx.outDir, videoName(ctx.product, baseInfo.modelLabel, await nextVersion(ctx.outDir), adjustment));
  mixAudio({ video: base, voice: voiceFile, music, assFile, voiceDelay: VOICE_DELAY_S, musicVolume: cfg.musicVolume ?? 0.18, out });
  console.log(`Base: ${posix.basename(base)}`);
  console.log(`Fala: ${speech.toFixed(2)} s de ${videoDur.toFixed(2)} s${music ? "" : " (sem música: passe --music refs/<faixa>.mp3)"}`);
  console.log(`Vídeo final: ${out}`);
});
