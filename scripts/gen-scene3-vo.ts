/** Generate Scene 3 (Architecture Showcase) and Scene 4 (Closing Title Tag) voiceover WAVs using OpenAI tts-1. */
import { env } from '../server/config.js';
import { synthesize } from '../server/speech/tts.js';
import { WavTrack } from '../server/recording/wav-track.js';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), '../video-workspace/source/v9-session-9735');
mkdirSync(outDir, { recursive: true });

const items = [
  {
    file: 'scene3-arch-vo.wav',
    text: 'Under the hood, LiveKit streams bidirectional audio into Meta muse-voice-transcribe-1.0. Meta muse-spark-1.3 separates rhetorical remarks from explicit lookups, grounds answers with live web citations, and gates delivery on floor clearance—backed by one hundred thirty-two automated tests.',
  },
  {
    file: 'scene4-title-tag.wav',
    text: 'Keep Talking. Powered by Meta AI.',
  },
];

for (const item of items) {
  const outWav = resolve(outDir, item.file);
  if (!existsSync(outWav)) {
    const pcm = await synthesize(env.OPENAI_API_KEY!, env.TTS_MODEL, 'onyx', item.text, AbortSignal.timeout(22000));
    const wav = new WavTrack(outWav, 24000);
    wav.writeAt(pcm, 0);
    wav.finalize();
    console.log(JSON.stringify({ ok: true, path: outWav, samples: pcm.length, durationSec: Number((pcm.length / 24000).toFixed(2)) }));
  } else {
    console.log(JSON.stringify({ cached: true, path: outWav }));
  }
}
