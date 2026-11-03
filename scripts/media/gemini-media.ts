/** Opt-in editorial media generation. Never used as the Meta co-host's fallback.
 * Run from the app root with: npx tsx scripts/media/gemini-media.ts hosts|video
 * Keys are read only from server-side .env; provider payloads are never logged.
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const mode = process.argv[2];
const root = join('output', 'media-v6');
mkdirSync(root, { recursive: true });
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY in the local app .env. Never send the value in chat.');
const style = 'Two American friends recording a thoughtful but lively technology podcast. Natural US English, relaxed close-mic delivery, quick conversational responses, contractions and changing intonation. About 175 words per minute. No announcer voice, no exaggerated excitement, no long dramatic pauses. Keep the turn handovers short, roughly a quarter second. Read only the supplied words, never the speaker names or directions.';
export const hostTurns = [
  { speaker: 'Alex', text: "Okay, singularity. I keep hearing 'AI gets smarter, then everything changes.' But what actually changes first?" },
  { speaker: 'Sam', text: "The feedback loop, right? Better AI helps build the next AI." },
  { speaker: 'Alex', text: "Right. Who wrote that ninety-three essay? Co-host, check the author and title for us." },
  { speaker: 'Sam', text: "My question is, does that loop actually escape the real world? You still need chips. You need power." },
  { speaker: 'Alex', text: "And experiments. A model can pitch a thousand ideas. Somebody still has to find out which ones work." },
  { speaker: 'Sam', text: "Exactly. More ideas isn't automatically more discovery." },
  { speaker: 'Alex', text: "Though if the AI starts picking better experiments, that's a different story." },
  { speaker: 'Sam', text: "Yeah. That's where I'd start watching. Not just how fast it talks, but what it helps us test." },
];
const followupTurns = [
  { speaker: 'Sam', text: "There we go. Let's keep that source. The interesting part is still the feedback loop." },
  { speaker: 'Alex', text: "Yeah, and whether the experiments can keep up. That's the conversation I want to have." },
];

async function generate(body: any, name: string, type: 'audio' | 'video') {
  const signature = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const ext = type === 'audio' ? '.wav' : '.mp4';
  const path = join(root, name + ext), metaPath = join(root, name + '.json');
  if (existsSync(path) && existsSync(metaPath) && JSON.parse(readFileSync(metaPath, 'utf8')).requestSha256 === signature) {
    console.log(JSON.stringify({ cached: true, path })); return;
  }
  if (existsSync(path)) throw new Error(`Refusing to overwrite a different generated asset: ${name}`);
  const startedAt = new Date().toISOString();
  writeFileSync(join(root, name + '-request.json'), JSON.stringify(body, null, 2));
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': key!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(300000),
  });
  const result = await response.json() as any;
  const meta: any = { provider: 'Google Gemini', model: body.model, purpose: 'Editorial synthetic media; not co-host reasoning',
    startedAt, completedAt: new Date().toISOString(), httpStatus: response.status, requestSha256: signature,
    requestId: result.id ?? null, status: result.status ?? null, usage: result.usage ?? result.usage_metadata ?? null };
  if (!response.ok) {
    meta.errorStatus = /monthly spending cap/i.test(result.error?.message ?? '') ? 'monthly_spending_cap_exceeded' : result.error?.status ?? result.error?.code ?? 'provider_error';
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    throw new Error(`Gemini ${mode} HTTP ${response.status} (${meta.errorStatus}); no retry or provider fallback performed`);
  }
  const content = (result.steps ?? []).filter((s: any) => s.type === 'model_output').flatMap((s: any) => s.content ?? []);
  const media = content.findLast((c: any) => c.type === type && typeof c.data === 'string');
  if (!media) {
    meta.contentTypes = content.map((c: any) => c.type);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    throw new Error('Gemini returned no inline media; inspect the safe metadata, not provider payloads');
  }
  const bytes = Buffer.from(media.data, 'base64');
  if (bytes.length < 1000) throw new Error('Empty generated media');
  writeFileSync(path, bytes);
  Object.assign(meta, { mimeType: media.mime_type, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(JSON.stringify({ ok: true, path, ...meta }));
}

if (mode === 'hosts' || mode === 'followup') {
  const turns = mode === 'hosts' ? hostTurns : followupTurns;
  await generate({ model: 'gemini-3.8-flash-tts', input: [{ type: 'user_input', content: turns.map(turn => ({
    type: 'text', text: turn.text, annotations: [{ type: 'speech_metadata', speaker: turn.speaker, style }],
  })) }], response_format: { type: 'audio' }, generation_config: { speech_config: { speakers: [
    { speaker: 'Alex', voice: 'Puck' }, { speaker: 'Sam', voice: 'Charon' },
  ] } } }, mode === 'hosts' ? 'podcast-hosts' : 'podcast-followup', 'audio');
} else if (mode === 'video') {
  const prompt = `Create a complete 10-second landscape 16:9 opening for an independent technology podcast. It must feel like an ordinary popular American video podcast: two original men in their early thirties at a real walnut table, black broadcast microphones on boom arms, headphones, warm practical studio lighting, dark charcoal acoustic walls, natural skin texture, professional 50mm camera, subtle handheld feel. No recognizable people, brand logos, app interface, text, title cards, music or narrator. Room tone only. The two hosts are already midway through a casual conversation. Tight natural timing, not long theatrical pauses.
0.0-3.0 seconds: medium two-shot. Host on the left in a blue overshirt asks casually, with a small smile: "Would you let AI co-host your podcast?"
3.0-4.6 seconds: cut to the man on the right in a charcoal crewneck. He replies, dry and friendly, immediately: "You already have."
4.6-8.4 seconds: hold this close-up. In one continuous physically coherent transformation his face and visible neck become a sleek original ivory-and-brushed-metal humanoid robot, expressive eyes, a subtle smile. His shirt, seated position, headphones, microphone, voice, lighting and background remain unchanged. This is a fictional independent robot, not a character from any existing movie.
8.4-10.0 seconds: the robot naturally leans toward the microphone and maintains the amused expression. End on this clean robot close-up. Do not turn him human again. Lip-sync both spoken lines accurately. Keep both complete sentences audible and comfortably finished within the clip. Warm, confident and understated.`;
  await generate({ model: 'gemini-omni-1.1-flash', input: prompt,
    response_format: { type: 'video', aspect_ratio: '16:9', resolution: '720p' } }, 'podcast-reveal', 'video');
} else {
  throw new Error('Use hosts, followup or video. These commands make paid API calls on cache misses.');
}
