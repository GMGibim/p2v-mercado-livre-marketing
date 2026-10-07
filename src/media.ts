import { execFileSync, spawnSync } from "node:child_process";
import sharp from "sharp";
import type { Crop } from "./config.js";
import type { Alignment } from "./elevenlabs.js";

// Mercado Livre clips must be at least 10 s; keep a small margin.
export const MIN_CLIP_SECONDS = 10.2;

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
}

export function duration(path: string): number {
  return Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString().trim(),
  );
}

export function sceneCuts(path: string, threshold = 0.3): number[] {
  // showinfo logs to stderr.
  const res = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", path, "-vf", `select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  return [...String(res.stderr).matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
}

// Pads very narrow/wide images and upscales small ones: Kling rejects them otherwise.
export async function normalizeImage(input: Buffer, crop: Crop | undefined, outPath: string) {
  let img = sharp(input);
  if (crop) img = img.extract(crop);
  let buf = await img.png().toBuffer();
  const { width = 0, height = 0 } = await sharp(buf).metadata();
  const ratio = width / height;
  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  if (ratio < 0.5) {
    const pad = Math.ceil((height * 0.5 - width) / 2);
    buf = await sharp(buf).extend({ left: pad, right: pad, background: white }).png().toBuffer();
  } else if (ratio > 2) {
    const pad = Math.ceil((width / 2 - height) / 2);
    buf = await sharp(buf).extend({ top: pad, bottom: pad, background: white }).png().toBuffer();
  }
  const meta = await sharp(buf).metadata();
  const minSide = Math.min(meta.width ?? 0, meta.height ?? 0);
  if (minSide < 512) {
    const scale = 512 / minSide;
    buf = await sharp(buf).resize(Math.round((meta.width ?? 0) * scale)).png().toBuffer();
  }
  await sharp(buf).toFile(outPath);
}

export function contactSheet(video: string, outPng: string) {
  const fps = 10 / duration(video);
  ffmpeg(["-i", video, "-vf", `fps=${fps.toFixed(4)},scale=240:-1,tile=5x2`, "-frames:v", "1", outPng]);
}

export function extractFrame(video: string, time: number, outPng: string, crop?: string) {
  ffmpeg(["-ss", String(time), "-i", video, "-frames:v", "1", ...(crop ? ["-vf", `crop=${crop}`] : []), outPng]);
}

// Replaces [start, end) of base with shot, then holds the last frame up to the 10 s minimum.
export function splice(base: string, shot: string, start: number, end: number, out: string) {
  const baseDur = duration(base);
  const hasTail = end < baseDur - 0.05;
  const total = start + duration(shot) + (hasTail ? baseDur - end : 0);
  const hold = Math.max(0, MIN_CLIP_SECONDS - total);
  const parts = [
    `[0:v]trim=0:${start},setpts=PTS-STARTPTS[a]`,
    `[1:v]scale=720:1280,fps=30,setsar=1,setpts=PTS-STARTPTS[b]`,
    ...(hasTail ? [`[0:v]trim=${end},setpts=PTS-STARTPTS[c]`] : []),
  ];
  const concat = hasTail ? "[a][b][c]concat=n=3:v=1:a=0" : "[a][b]concat=n=2:v=1:a=0";
  const graph = `${parts.join(";")};${concat}${hold > 0 ? `,tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)}` : ""}[v]`;
  ffmpeg(["-i", base, "-i", shot, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out]);
}

export type Segment = { file: string; start?: number; end?: number };

// Concatenates segments (optionally trimmed) into one 720x1280 30 fps video, holding the last frame up to the 10 s minimum.
export function joinClips(segments: Segment[], out: string) {
  const inputs = segments.flatMap((s) => ["-i", s.file]);
  const parts = segments.map((s, i) => {
    const trim = s.start !== undefined || s.end !== undefined ? `trim=start=${s.start ?? 0}${s.end !== undefined ? `:end=${s.end}` : ""},` : "";
    return `[${i}:v]${trim}setpts=PTS-STARTPTS,scale=720:1280,fps=30,setsar=1[v${i}]`;
  });
  const total = segments.reduce((sum, s) => sum + ((s.end ?? duration(s.file)) - (s.start ?? 0)), 0);
  const hold = Math.max(0, MIN_CLIP_SECONDS - total);
  const labels = segments.map((_, i) => `[v${i}]`).join("");
  const graph = `${parts.join(";")};${labels}concat=n=${segments.length}:v=1:a=0${hold > 0 ? `,tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)}` : ""}[v]`;
  ffmpeg([...inputs, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", out]);
}

type Word = { text: string; start: number; end: number };

function words(a: Alignment): Word[] {
  const out: Word[] = [];
  let cur: Word | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) out.push(cur);
  return out;
}

export function speechEnd(a: Alignment): number {
  return a.character_end_times_seconds[a.character_end_times_seconds.length - 1] ?? 0;
}

// Short CapCut-style lines: break after punctuation or every 3 words.
function lines(ws: Word[]): Word[] {
  const res: Word[] = [];
  let group: Word[] = [];
  const flush = () => {
    if (group.length) res.push({ text: group.map((g) => g.text).join(" "), start: group[0].start, end: group[group.length - 1].end });
    group = [];
  };
  for (const w of ws) {
    group.push(w);
    if (/[.,:?!]$/.test(w.text) || group.length === 3) flush();
  }
  flush();
  return res;
}

function assTime(s: number): string {
  const cs = Math.round(s * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

export function captionsAss(a: Alignment, delay: number): string {
  const ls = lines(words(a));
  // Each line stays until the next one starts, so captions don't flicker between words.
  const events = ls.map((l, i) => {
    const end = (i + 1 < ls.length ? ls[i + 1].start : l.end + 0.4) + delay;
    return `Dialogue: 0,${assTime(l.start + delay)},${assTime(end)},Default,,0,0,0,,${l.text}`;
  });
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,4,2,2,60,60,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

// assFile must have no spaces or colons: it goes inside an ffmpeg filter expression.
export function mixAudio(opts: {
  video: string;
  voice: string;
  music: string | null;
  assFile: string;
  voiceDelay: number;
  musicVolume: number;
  out: string;
}) {
  const dur = duration(opts.video);
  const ms = Math.round(opts.voiceDelay * 1000);
  const voice = `[1:a]adelay=${ms}|${ms}`;
  const audio = opts.music
    ? `${voice}[vo];[2:a]volume=${opts.musicVolume},afade=t=out:st=${(dur - 1).toFixed(2)}:d=1[mu];[vo][mu]amix=inputs=2:duration=longest:normalize=0[a]`
    : `${voice},apad[a]`;
  ffmpeg([
    "-i", opts.video,
    "-i", opts.voice,
    ...(opts.music ? ["-stream_loop", "-1", "-i", opts.music] : []),
    "-filter_complex", `[0:v]subtitles=${opts.assFile}[v];${audio}`,
    "-map", "[v]", "-map", "[a]",
    "-t", dur.toFixed(3),
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    opts.out,
  ]);
}
