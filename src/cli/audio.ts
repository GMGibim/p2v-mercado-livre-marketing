// Usage: npm run audio -- <produto> [--base <arquivo em out/>] [--music ../_shared/musica/<faixa>.mp3 | --no-music]
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
// House default track (Pixabay, free for commercial video); override with --music, disable with --no-music.
const DEFAULT_MUSIC = "../_shared/musica/kulakovka-pop-rock-278473.mp3";

run(async () => {
  const { positional, flags } = parseArgs();
  const ctx = await loadProduct(positional[0]);
  const cfg = ctx.product.audio;
  if (!cfg) throw new Error("Falta o bloco audio no product.json (voiceId, voiceName, script).");

  // Default base: latest full video that has no audio pass yet.
  const base = typeof flags.base === "string" ? posix.join(ctx.outDir, flags.base) : await latestVideo(ctx.outDir, (a) => !a.startsWith("voz"));
  const baseInfo = parseVideoName(posix.basename(base));
  if (!existsSync(base) || !baseInfo) throw new Error(`Vídeo base inválido: ${base}`);

  const music = flags["no-music"] ? null : posix.join(ctx.dir, typeof flags.music === "string" ? flags.music : DEFAULT_MUSIC);
  if (music && !existsSync(music)) throw new Error(`Música não encontrada: ${music}`);

  // The voice says the script with the pronunciations applied; captions keep the written words.
  const pronunciations = cfg.pronunciations ?? {};
  const display = cfg.script.split(/\s+/).filter(Boolean).map((token) => {
    const [, core, punct] = /^(.*?)([.,:;!?]*)$/.exec(token)!;
    const said = pronunciations[core];
    return { text: token, spoken: said ? said + punct : token, count: said ? said.split(/\s+/).length : 1 };
  });
  const spokenScript = display.map((d) => d.spoken).join(" ");

  // Cache by voice + spoken text so reruns keep the exact same take (and don't spend characters).
  const hash = createHash("sha1").update(`${cfg.voiceId}\n${spokenScript}`).digest("hex").slice(0, 10);
  const voiceFile = posix.join(ctx.cacheDir, `voice-${hash}.mp3`);
  const alignFile = posix.join(ctx.cacheDir, `voice-${hash}.json`);
  let alignment: Alignment;
  if (existsSync(voiceFile) && existsSync(alignFile)) {
    alignment = JSON.parse(await readFile(alignFile, "utf8"));
    console.log(`Voz reaproveitada do cache (${cfg.voiceName}).`);
  } else {
    const tts = await textToSpeech(cfg.voiceId, spokenScript);
    await writeFile(voiceFile, tts.audio);
    await writeFile(alignFile, JSON.stringify(tts.alignment));
    alignment = tts.alignment;
    console.log(`Voz gerada (${cfg.voiceName}).`);
  }

  const videoDur = duration(base);
  const speech = speechEnd(alignment) + VOICE_DELAY_S;
  if (speech > videoDur) throw new Error(`A fala (${speech.toFixed(2)} s) passa do vídeo (${videoDur.toFixed(2)} s). Encurte o script.`);

  const assFile = posix.join(ctx.workDir, "legenda.ass");
  await writeFile(assFile, captionsAss(alignment, VOICE_DELAY_S, display.map(({ text, count }) => ({ text, count }))));

  const musicLabel = music ? posix.basename(music, ".mp3").split("-")[0] : null;
  const adjustment = musicLabel ? `voz legenda e musica ${musicLabel}` : "voz e legenda";
  const out = posix.join(ctx.outDir, videoName(ctx.product, baseInfo.modelLabel, await nextVersion(ctx.outDir), adjustment));
  mixAudio({ video: base, voice: voiceFile, music, assFile, voiceDelay: VOICE_DELAY_S, musicVolume: cfg.musicVolume ?? 0.18, out });
  console.log(`Base: ${posix.basename(base)}`);
  console.log(`Fala: ${speech.toFixed(2)} s de ${videoDur.toFixed(2)} s${music ? ` · música: ${posix.basename(music)}` : " (sem música)"}`);
  console.log(`Vídeo final: ${out}`);
});
