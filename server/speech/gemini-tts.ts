/** Gemini renders validated Meta text verbatim; it never chooses the co-host's reply. */
export const GEMINI_TTS_MODEL = 'gemini-3.8-flash-tts';

export function decodeGeminiWav(bytes: Uint8Array): Int16Array {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length < 44 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Invalid Gemini TTS WAV');
  let validFormat = false, data: Buffer | undefined;
  for (let at = 12; at + 8 <= b.length;) {
    const kind = b.toString('ascii', at, at + 4), size = b.readUInt32LE(at + 4), begin = at + 8, end = begin + size;
    if (end > b.length) throw new Error('Truncated Gemini TTS WAV');
    if (kind === 'fmt ') {
      if (size < 16) throw new Error('Invalid Gemini TTS format');
      validFormat = b.readUInt16LE(begin) === 1 && b.readUInt16LE(begin + 2) === 1 && b.readUInt32LE(begin + 4) === 24000 && b.readUInt16LE(begin + 14) === 16;
    }
    if (kind === 'data') { if (data) throw new Error('Multiple Gemini TTS data chunks'); data = b.subarray(begin, end); }
    at = end + size % 2;
  }
  if (!validFormat || !data?.length || data.length % 2 || data.length > 24000 * 2 * 30) throw new Error('Gemini TTS requires at most 30 seconds of PCM16 mono 24kHz');
  return new Int16Array(Uint8Array.from(data).buffer);
}

export async function synthesizeGemini(key: string, model: string, voice: string, text: string, signal: AbortSignal): Promise<Int16Array> {
  if (model !== GEMINI_TTS_MODEL) throw new Error('Only gemini-3.8-flash-tts is configured');
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(20000)]); bounded.throwIfAborted();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, signal: bounded,
    body: JSON.stringify({ model, input: [{ type: 'user_input', content: [{ type: 'text', text,
      annotations: [{ type: 'speech_metadata', style: 'Calm, concise US English. A helpful podcast research producer speaking naturally to the room. Read exactly the provided text; no introduction, added words or sound effects.' }] }] }],
    response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice }] } }),
  });
  bounded.throwIfAborted();
  if (!response.ok) throw new Error(`Gemini TTS HTTP ${response.status}`);
  if (!response.body) throw new Error('Gemini TTS returned no body');
  const chunks: Uint8Array[] = []; let length = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    bounded.throwIfAborted(); length += chunk.length;
    if (length > 4 * 1024 * 1024) { await response.body.cancel().catch(() => undefined); throw new Error('Gemini TTS response size exceeded'); }
    chunks.push(chunk);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { status?: string; steps?: { type?: string; content?: { type?: string; mime_type?: string; data?: string }[] }[] };
  const audio = body.steps?.filter(s => s.type === 'model_output').flatMap(s => s.content ?? []).findLast(c => c.type === 'audio');
  if (body.status !== 'completed' || audio?.mime_type !== 'audio/wav' || !audio.data || !/^[A-Za-z0-9+/]*={0,2}$/.test(audio.data)) throw new Error('Gemini TTS returned no complete WAV');
  bounded.throwIfAborted();
  return decodeGeminiWav(Buffer.from(audio.data, 'base64'));
}
