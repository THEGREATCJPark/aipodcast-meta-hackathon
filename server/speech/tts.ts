/** OpenAI only renders Meta's validated text; no text generation fallback. PCM16 mono 24 kHz. */
export async function synthesize(key: string, model: string, voice: string, text: string, signal: AbortSignal): Promise<Int16Array> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    body: JSON.stringify({ model, voice, input: text, response_format: "pcm" }),
  });
  if (!response.ok) throw new Error(`OpenAI TTS HTTP ${response.status}`);
  if (!response.body) throw new Error("TTS returned no audio");
  const chunks: Uint8Array[] = []; let length = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    signal.throwIfAborted(); length += chunk.length;
    if (length > 24000 * 2 * 30) { await response.body.cancel().catch(() => undefined); throw new Error("TTS exceeds 30 seconds"); }
    chunks.push(chunk);
  }
  if (length % 2) throw new Error("Invalid PCM16 length");
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Int16Array(bytes.buffer);
}
