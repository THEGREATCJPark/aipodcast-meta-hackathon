import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McAgent } from '../server/agent/mc-agent.js';
import type { AgentRoom } from '../server/agent/room.js';
import { MetaSession } from '../server/meta/session.js';
import { StudioBus } from '../server/bus.js';
import { defaultSettings } from '../shared/settings.js';
import { SessionRecorder } from '../server/recording/session-recorder.js';

class RoomFixture extends EventEmitter {
  connected = false;
  source = { captureFrame: async () => undefined, clearQueue: () => undefined };
  async join() { this.connected = true; }
  async leave() { this.connected = false; }
}
class SessionFixture extends MetaSession { appendParticipant() {} }
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'mc-lifecycle-'));
  const bus = new StudioBus(dir); const room = new RoomFixture();
  const session = new SessionFixture({ key: 'fixture', ttsKey: 'fixture', asr: 'fixture', director: 'fixture', tts: 'fixture', voice: 'fixture' });
  const agent = new McAgent({ bus, room: room as unknown as AgentRoom, metaKey: () => 'fixture', openaiKey: () => 'fixture', geminiKey: () => undefined, livekit: () => ({ url: 'fixture', agentToken: async () => 'fixture' }), engineFactory: () => session });
  return { dir, bus, room, session, agent, cleanup: async () => { await agent.leaveRoom(); agent.dispose(); rmSync(dir, { recursive: true, force: true }); } };
}
test('overlapping stop requests preserve recorder and export exactly once', async () => {
  const f = setup(); let release!: () => void;
  try {
    await f.agent.startSession(defaultSettings());
    f.room.emit('frame', { identity: 'host-fixture', name: 'Host', pcm: new Int16Array(480).fill(100) });
    const output = f.bus.currentSessionDir()!;
    const originalClose = f.session.close.bind(f.session);
    f.session.close = async () => { await new Promise<void>(r => { release = r; }); await originalClose(); };
    const first = f.agent.stopSession(); const second = f.agent.stopSession();
    release(); await Promise.all([first, second]);
    assert.ok(existsSync(join(output, 'summary.json')));
    assert.ok(existsSync(join(output, 'mix.wav')));
    assert.equal(f.bus.history().filter(e => e.text.startsWith('Recording, transcript')).length, 1);
    assert.equal(f.agent.status().recording, false);
  } finally { await f.cleanup(); }
});
test('failed model connection releases the joined LiveKit room', async () => {
  const f = setup();
  try {
    f.session.connect = async () => { throw new Error('fixture rejected'); };
    await assert.rejects(f.agent.startSession(defaultSettings()), /fixture rejected/);
    assert.equal(f.room.connected, false);
    assert.equal(f.agent.status().recording, false);
  } finally { await f.cleanup(); }
});
test('same display name and identity suffix retain distinct recording files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-recording-'));
  try {
    const recorder = new SessionRecorder(dir, 24000);
    recorder.human('guest-one-abcd', 'Guest', new Int16Array(480).fill(100));
    recorder.human('guest-two-abcd', 'Guest', new Int16Array(480).fill(200));
    recorder.stop();
    const files = readdirSync(dir).filter(f => f.startsWith('guest-'));
    assert.equal(files.length, 2);
    assert.deepEqual(files.map(f => readFileSync(join(dir, f)).readInt16LE(44)).sort(), [100, 200]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
