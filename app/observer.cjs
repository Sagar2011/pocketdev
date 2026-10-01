const { spawn } = require('node:child_process');

// Provider-specific UI reading lives in the native helper. This layer only accepts
// normalized, content-free snapshots and owns transitions, freshness and dismissal.
class ObserverState {
  constructor() { this.reset(); }
  reset(status = 'disabled') { this.status = status; this.sessions = new Map(); this.seenAt = 0; }
  accept(snapshot, now = Date.now()) {
    if (now - this.seenAt > 8000) this.sessions.clear();
    if (snapshot?.status !== 'ok' || !Array.isArray(snapshot.sessions) || snapshot.sessions.length > 16) {
      this.reset(['permission-required', 'not-running', 'unavailable', 'unsupported'].includes(snapshot?.status) ? snapshot.status : 'unavailable');
      return;
    }
    const next = new Map();
    for (const session of snapshot.sessions) {
      if (!/^[a-f0-9]{64}$/.test(session?.id || '') || !['working', 'permission', 'waiting', 'done', 'idle'].includes(session?.signal)) continue;
      const previous = this.sessions.get(session.id);
      if (previous?.signal === session.signal) next.set(session.id, previous);
      else next.set(session.id, {
        signal: session.signal, at: now, dismissed: false,
        state: session.signal === 'done' && !['working', 'permission', 'waiting'].includes(previous?.signal) ? 'idle' : session.signal
      });
    }
    this.sessions = next;
    this.status = next.size ? 'ok' : 'unsupported';
    this.seenAt = now;
  }
  dismiss() { for (const session of this.sessions.values()) session.dismissed = true; }
  events(now = Date.now()) {
    if (now - this.seenAt > 8000) return [];
    return [...this.sessions].filter(([, s]) => !s.dismissed).map(([id, s]) => ({
      session: `desktop:claude:${id}`, agent: 'main', kind: 'boundary', boundary: true,
      state: s.state === 'done' && now - s.at > 6000 ? 'idle' : s.state,
      // Refresh active observations, but never refresh the done animation timer.
      at: ['working', 'permission', 'waiting'].includes(s.state) ? this.seenAt : s.at
    }));
  }
}

function createObserver(binary) {
  const state = new ObserverState();
  let child, watchdog, buffer = '', receivedAt = 0;
  function stop(status = 'disabled') {
    const old = child;
    child = null;
    clearInterval(watchdog);
    old?.kill();
    buffer = '';
    state.reset(status);
  }
  function start(requestPermission = false) {
    stop();
    if (process.platform !== 'darwin') { state.reset('unsupported'); return; }
    state.reset('starting');
    receivedAt = Date.now();
    const current = spawn(binary, requestPermission ? ['--watch', '--request-permission'] : ['--watch'], { stdio: ['ignore', 'pipe', 'ignore'] });
    child = current;
    current.stdout.setEncoding('utf8');
    current.stdout.on('data', data => {
      if (child !== current) return;
      buffer += data;
      if (Buffer.byteLength(buffer) > 32768) { stop('unavailable'); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { state.accept(JSON.parse(line)); receivedAt = Date.now(); }
        catch { stop('unavailable'); return; }
      }
    });
    current.on('error', () => { if (child === current) stop('unavailable'); });
    current.on('exit', () => { if (child === current) stop('unavailable'); });
    watchdog = setInterval(() => { if (Date.now() - receivedAt > 8000) stop('unavailable'); }, 1000);
    watchdog.unref();
  }
  return { state, start, stop };
}
module.exports = { ObserverState, createObserver };
