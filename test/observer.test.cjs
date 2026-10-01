const test = require('node:test');
const assert = require('node:assert/strict');
const { ObserverState } = require('../app/observer.cjs');
const id = 'a'.repeat(64), other = 'b'.repeat(64);
const snapshot = (signal, session = id) => ({ status: 'ok', sessions: [{ id: session, signal, minimized: true }] });

test('observed completion only celebrates a tracked working turn, once', () => {
  const monitor = new ObserverState();
  monitor.accept(snapshot('done'), 100);
  assert.equal(monitor.events(100)[0].state, 'idle');
  monitor.accept(snapshot('working'), 200);
  monitor.accept(snapshot('done'), 300);
  assert.equal(monitor.events(300)[0].state, 'done');
  monitor.accept(snapshot('done'), 500);
  assert.equal(monitor.events(500)[0].at, 300);
  monitor.accept(snapshot('done'), 6400);
  assert.equal(monitor.events(6400)[0].state, 'idle');
});

test('dismissal persists during repeated permission snapshots but clears on a new request', () => {
  const monitor = new ObserverState();
  monitor.accept(snapshot('permission'), 100);
  monitor.dismiss();
  monitor.accept(snapshot('permission'), 200);
  assert.deepEqual(monitor.events(200), []);
  monitor.accept(snapshot('working'), 300);
  monitor.accept(snapshot('permission'), 400);
  assert.equal(monitor.events(400)[0].state, 'permission');
});

test('missing, stale, unsupported and malformed observations clear old reminders', () => {
  const monitor = new ObserverState();
  monitor.accept(snapshot('permission'), 100);
  assert.deepEqual(monitor.events(9000), []);
  monitor.accept({ status: 'permission-required' }, 9100);
  assert.deepEqual(monitor.events(9100), []);
  monitor.accept(snapshot('working'), 9200);
  monitor.accept({ status: 'ok', sessions: [] }, 9300);
  monitor.accept(snapshot('done'), 9400);
  assert.equal(monitor.events(9400)[0].state, 'idle', 'Reopening a conversation must not celebrate its old response');
  monitor.accept({ status: 'ok', sessions: [{ id: '../../path', signal: 'permission' }] }, 9500);
  assert.deepEqual(monitor.events(9500), []);
});

test('independent conversations do not share dismissal or completion state', () => {
  const monitor = new ObserverState();
  monitor.accept(snapshot('working'), 100);
  monitor.accept({ status: 'ok', sessions: [snapshot('permission').sessions[0], snapshot('done', other).sessions[0]] }, 200);
  const events = monitor.events(200);
  assert.equal(events[0].state, 'permission');
  assert.equal(events[1].state, 'idle');
  assert.notEqual(events[0].session, events[1].session);
});

test('a stale connection cannot celebrate completion after an unobserved gap', () => {
  const monitor = new ObserverState();
  monitor.accept(snapshot('working'), 100);
  monitor.accept(snapshot('done'), 10000);
  assert.equal(monitor.events(10000)[0].state, 'idle');
});

test('helper output drives events and stopping disconnects the source', { skip: process.platform !== 'darwin' }, async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const { createObserver } = require('../app/observer.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-observer-'));
  const binary = path.join(dir, 'fixture');
  fs.writeFileSync(binary, `#!${process.execPath}\nconsole.log(${JSON.stringify(JSON.stringify(snapshot('permission')))}); setInterval(() => {}, 1000);`, { mode: 0o700 });
  const monitor = createObserver(binary);
  try {
    monitor.start();
    const deadline = Date.now() + 3000;
    while (monitor.state.status === 'starting' && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(monitor.state.events()[0]?.state, 'permission');
    monitor.stop();
    assert.equal(monitor.state.status, 'disabled');
    assert.deepEqual(monitor.state.events(), []);
  } finally { monitor.stop(); fs.rmSync(dir, { recursive: true, force: true }); }
});
