export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY ausente no .env.local (a chave começa com sk_).");
  return k;
}

async function call(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://api.elevenlabs.io${path}`, {
    ...init,
    headers: { "xi-api-key": key(), "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function textToSpeech(voiceId: string, text: string): Promise<{ audio: Buffer; alignment: Alignment }> {
  const j = await call(`/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: "POST",
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", language_code: "pt" }),
  });
  return { audio: Buffer.from(j.audio_base64, "base64"), alignment: j.alignment };
}

export type VoiceRow = { id: string; name: string; source: "padrão (grátis)" | "biblioteca (plano pago)"; info: string };

// Free accounts can only use default voices via the API; library voices need a paid plan.
export async function listFemalePtVoices(): Promise<VoiceRow[]> {
  const defaults = await call("/v2/voices?page_size=100&voice_type=default");
  const shared = await call("/v1/shared-voices?page_size=40&language=pt&gender=female&accent=brazilian");
  return [
    ...defaults.voices
      .filter((v: any) => v.labels?.gender === "female")
      .map((v: any) => ({ id: v.voice_id, name: v.name, source: "padrão (grátis)" as const, info: v.labels?.accent ?? "" })),
    ...shared.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      source: "biblioteca (plano pago)" as const,
      info: [v.age, v.descriptive, v.use_case].filter(Boolean).join(", "),
    })),
  ];
}
