import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeGeminiWav, synthesizeGemini } from '../server/speech/gemini-tts.js';

function wav(rate = 24000, channels = 1, frames = 480) {
  const bytes = Buffer.alloc(44 + frames * channels * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * channels * 2, 28); bytes.writeUInt16LE(channels * 2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(frames * channels * 2, 40);
  for (let i = 0; i < frames * channels; i++) bytes.writeInt16LE(1200, 44 + i * 2);
  return bytes;
}
test('Gemini 3.8 TTS sends only Meta-authored text and returns mono 24kHz PCM', async t => {
  let request: any, requests = 0;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    requests++; request = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: wav().toString('base64') }] }] }));
  });
  const text = 'According to the source, Vernor Vinge wrote the essay.';
  const pcm = await synthesizeGemini('fixture-key', 'gemini-3.8-flash-tts', 'Kore', text, new AbortController().signal);
  assert.equal(request.model, 'gemini-3.8-flash-tts');
  assert.equal(request.input[0].content[0].text, text); assert.equal(request.generation_config.speech_config[0].voice, 'Kore');
  assert.equal(pcm.length, 480); assert.equal(pcm[200], 1200); assert.equal(requests, 1);
});
test('unsupported Gemini audio formats and oversized speech are rejected', () => {
  assert.equal(decodeGeminiWav(wav()).length, 480);
  for (const input of [Buffer.from('not a WAV'), wav(16000), wav(24000, 2), wav(24000, 1, 0), wav(24000, 1, 24000 * 31)]) assert.throws(() => decodeGeminiWav(input));
});
test('Gemini rejection does not retry or use another speech provider', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return new Response('private provider error', { status: 429 }); });
  await assert.rejects(synthesizeGemini('fixture-key', 'gemini-3.8-flash-tts', 'Kore', 'Exact text.', new AbortController().signal), /^Error: Gemini TTS HTTP 429$/);
  assert.equal(requests, 1);
});
test('a late Gemini audio response cannot escape cancellation', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => { controller.abort(); return new Response(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: wav().toString('base64') }] }] })); });
  await assert.rejects(synthesizeGemini('fixture-key', 'gemini-3.8-flash-tts', 'Kore', 'Exact text.', controller.signal), { name: 'AbortError' });
});
