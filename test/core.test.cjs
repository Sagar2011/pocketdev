const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('real hook writes only status metadata, safely handles session paths and malformed input', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-test-'));
  const run = input => spawnSync(process.execPath, [path.join(__dirname, '../plugin/scripts/hook.cjs')], {
    input, encoding: 'utf8', env: { ...process.env, POCKETDEV_HOME: home }
  });
  try {
    const result = run(JSON.stringify({ hook_event_name: 'PermissionRequest', session_id: '../../escape', tool_name: 'Bash', tool_input: { command: 'PRIVATE' }, transcript_path: 'PRIVATE' }));
    assert.equal(result.status, 0);
    assert.equal(result.stdout, ''); // Must never approve, deny, or inject text into Claude.
    const files = fs.readdirSync(path.join(home, 'sessions'));
    assert.equal(files.length, 1);
    assert.match(files[0], /^[a-f0-9]{64}\.json$/);
    const saved = fs.readFileSync(path.join(home, 'sessions', files[0]), 'utf8');
    assert.equal(JSON.parse(saved).state, 'permission');
    assert.ok(!saved.includes('PRIVATE'));
    assert.equal(run('not json').status, 0);
    assert.equal(run('x'.repeat(1024 * 1024 + 1)).status, 0);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('permission takes precedence, ended/stale sessions disappear, done returns to idle', () => {
  const { displayState } = require('../plugin/scripts/state.cjs');
  const now = Date.now();
  const working = { state: 'working', at: now, tool: 'Read' };
  assert.equal(displayState([working, { state: 'permission', at: now - 1000 }], now).state, 'permission');
  assert.equal(displayState([{ state: 'done', at: now - 7000 }], now).state, 'idle');
  assert.equal(displayState([{ state: 'offline', at: now }], now).connected, false);
  assert.equal(displayState([{ ...working, at: now - 31 * 60 * 1000 }], now).connected, false);
  assert.equal(displayState([{ state: 'evil', at: now }, { ...working, at: now + 100000 }], now).connected, false);
});

test('generation uses one photo for four sequential edits; failures stop further paid calls', async () => {
  const { generatePoses } = require('../app/generate.cjs');
  const photo = Buffer.from('89504e470d0a1a0a', 'hex');
  const calls = [];
  const saved = [];
  let inFlight = false;
  const fakeFetch = async (url, options) => {
    assert.equal(inFlight, false);
    inFlight = true;
    assert.equal(url, 'https://api.openai.com/v1/images/edits');
    const images = options.body.getAll('image[]');
    assert.equal(images.length, calls.length === 0 ? 1 : 2);
    assert.deepEqual(Buffer.from(await images[0].arrayBuffer()), photo);
    calls.push(options.body.get('prompt'));
    inFlight = false;
    return { ok: true, json: async () => ({ data: [{ b64_json: photo.toString('base64') }] }) };
  };
  await generatePoses({ photo, mime: 'image/png', key: 'test-key', fetchImpl: fakeFetch, save: async (pose, bytes) => saved.push([pose, bytes]) });
  assert.deepEqual(saved.map(x => x[0]), ['waiting', 'working', 'done', 'idle']);
  assert.match(calls[0], /notepad/i);
  assert.match(calls[1], /laptop/i);
  assert.match(calls[2], /thumbs.up/i);
  assert.match(calls[3], /chips/i);
  let count = 0;
  await assert.rejects(generatePoses({ photo, mime: 'image/png', key: 'test-key', fetchImpl: async () => { count++; return { ok: false, status: 429 }; }, save: async () => {} }), /429/);
  assert.equal(count, 1);
});

test('cancelled generation and invalid photo input never contact the image provider', async () => {
  const { generatePoses } = require('../app/generate.cjs');
  const options = { photo: Buffer.from('89504e470d0a1a0a', 'hex'), mime: 'image/png', key: 'test-key', save: async () => {}, fetchImpl: async () => assert.fail('Must not call provider') };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generatePoses({ ...options, signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(generatePoses({ ...options, photo: Buffer.from('<svg>not a photo</svg>') }), /PNG, JPEG, or WebP/);
  await assert.rejects(generatePoses({ ...options, key: 'key\nInjected: header' }), /valid OpenAI API key/);
});

test('question prompts wait for input, irrelevant notifications do not overwrite activity', () => {
  const { fromHook, displayState } = require('../plugin/scripts/state.cjs');
  assert.equal(fromHook({session_id: 'a', hook_event_name: 'SessionStart'}).state, 'idle');
  assert.equal(displayState([]).state, 'idle');
  assert.equal(fromHook({ session_id: 'a', hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion' }).state, 'waiting');
  assert.equal(fromHook({ session_id: 'a', hook_event_name: 'Notification', notification_type: 'auth_success' }), null);
  assert.equal(fromHook({ session_id: 'a', hook_event_name: 'StopFailure' }).state, 'error');
  assert.equal(fromHook({ hook_event_name: 'Stop' }), null);
});

test('activity sounds repeat, cap volume, chime once, mute, and cancel pending audio', async () => {
  const vm = require('node:vm');
  const timers = new Map(), gains = [], sources = [];
  let next = 0;
  class AudioContext {
    sampleRate = 48000; currentTime = 0; destination = {};
    async resume() {}
    createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    createBufferSource() { const source = { connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } }; sources.push(source); return source; }
    createBiquadFilter() { return { frequency: {}, connect() {}, disconnect() {} }; }
    createGain() { const gain = { gain: {}, connect() {}, disconnect() {} }; gains.push(gain); return gain; }
  }
  const sandbox = { window: {}, AudioContext, setTimeout(fn, delay) { timers.set(++next, {fn, delay}); return next; }, clearTimeout(id) { timers.delete(id); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/knock.js'), 'utf8'), sandbox);
  const sounds = sandbox.window.createActivitySounds();
  const prefs = {sound: true, workingSound: true, doneSound: true};
  const settle = () => new Promise(setImmediate);
  sounds.update('permission', {sound: false}); await settle(); assert.equal(sources.length, 0);
  sounds.update('permission', prefs); await settle();
  sounds.update('permission', prefs); assert.equal(timers.size, 1);
  for (let i = 0; i < 4; i++) {
    const [id, pending] = [...timers][0]; assert.equal(pending.delay, 6000);
    timers.delete(id); pending.fn(); await settle();
  }
  assert.deepEqual(gains.map(g => Number(g.gain.value.toFixed(2))), [0.4, 0.4, 0.6, 0.6, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]);
  const knockSamples = sources[0].buffer.getChannelData(0);
  const rms = Math.sqrt(knockSamples.reduce((sum, value) => sum + value * value, 0) / knockSamples.length);
  assert.ok(rms > 0.08, 'Knock has audible body instead of a faint noise tick');
  const energy = data => data.reduce((sum, value) => sum + value * value, 0) / data.length;
  assert.ok(energy(knockSamples.slice(0, 960)) > 20 * energy(knockSamples.slice(-960)), 'Wood knock decays quickly without a ringing tail');
  assert.ok(knockSamples.every(value => Number.isFinite(value) && Math.abs(value) <= 1), 'Knock samples remain bounded');
  sounds.update('idle', prefs); assert.equal(timers.size, 0); assert.ok(sources.every(s => s.stopped));
  sounds.update('working', prefs); await settle();
  assert.equal(gains.at(-1).gain.value, 0.18); assert.equal(timers.size, 1);
  sounds.update('done', prefs); await settle();
  const count = sources.length; sounds.update('done', prefs); await settle();
  assert.equal(sources.length, count); assert.equal(timers.size, 0);
  sounds.update('working', prefs); sounds.update('idle', prefs); await settle();
  assert.equal(sources.length, count, 'state clearing during resume prevents playback');
  sounds.update('working', prefs); await settle();
  sounds.update('working', {...prefs, workingSound: false}); assert.equal(timers.size, 0);
  sounds.update('done', {...prefs, doneSound: false}); await settle();
  assert.equal(sources.length, count + 1);
});
