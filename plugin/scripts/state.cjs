const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const os = require('node:os');

const home = () => path.resolve(process.env.POCKETDEV_HOME || path.join(os.homedir(), '.pocketdev'));
const states = new Set(['idle', 'waiting', 'working', 'permission', 'done', 'error', 'offline']);

function fromHook(input, now = Date.now()) {
  if (!input || typeof input.session_id !== 'string' || !input.session_id || input.session_id.length > 512) return null;
  const mapping = {
    SessionStart: 'idle', UserPromptSubmit: 'working', PreToolUse: 'working',
    PermissionRequest: 'permission', PostToolUse: 'working', PostToolUseFailure: 'error', PermissionDenied: 'error',
    Stop: 'done', StopFailure: 'error', SessionEnd: 'offline'
  };
  let state = mapping[input.hook_event_name];
  if (input.hook_event_name === 'Notification') {
    if (input.notification_type === 'permission_prompt') state = 'permission';
    else if (input.notification_type === 'idle_prompt') state = 'idle';
    else if (input.notification_type === 'elicitation_dialog') state = 'waiting';
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'AskUserQuestion') state = 'waiting';
  if (!state) return null;
  const tool = typeof input.tool_name === 'string' ? input.tool_name.replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 64) : '';
  return { state, at: now, tool };
}

function displayState(events, now = Date.now()) {
  const live = resolvedEvents(events).filter(e => e && states.has(e.state) && e.state !== 'offline' &&
    Number.isFinite(e.at) && e.at <= now + 5000 && now - e.at < 30 * 60 * 1000);
  live.sort((a, b) => (b.state === 'permission') - (a.state === 'permission') || b.at - a.at);
  const event = live[0];
  if (!event) return { state: 'idle', message: 'On a little break', connected: false };
  const state = event.state === 'done' && now - event.at > 6000 ? 'idle' : event.state;
  const messages = { idle: 'On a little break', waiting: 'Excuse me · Your input?', working: 'Working on it', permission: 'Excuse me · Permission?', done: 'Response finished', error: 'Needs attention' };
  return { state, message: messages[state], connected: true };
}

// Separate tool completions from permission requests: another tool cannot clear one.
const hash = value => createHash('sha256').update(value).digest('hex');
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
  return value;
}
function writeEvent(root, input) {
  const event = fromHook(input);
  if (!event) return;
  const session = hash(input.session_id), agent = hash(input.agent_id || 'main');
  const scope = `${session}:${agent}`;
  const request = hash(`${scope}:${event.tool}:${JSON.stringify(sorted(input.tool_input || {}))}`);
  const hook = input.hook_event_name;
  const boundary = ['SessionStart', 'UserPromptSubmit', 'Stop', 'StopFailure', 'SessionEnd'].includes(hook);
  const kind = boundary ? 'boundary' : hook === 'PermissionRequest' ? 'permission' : hook === 'Notification' && event.state === 'permission' ? 'notification'
    : ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionDenied'].includes(hook) ? 'tool' : 'activity';
  const operation = typeof input.tool_use_id === 'string' ? hash(`${scope}:${input.tool_use_id}`) : request;
  const id = hash(`${scope}:${kind}:${kind === 'permission' ? request : kind === 'tool' ? operation : ''}`);
  const dir = path.join(root, 'sessions'), target = path.join(dir, `${id}.json`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  let original;
  if (kind === 'tool' && hook !== 'PreToolUse') {
    try { original = JSON.parse(fs.readFileSync(target, 'utf8')); } catch { /* No prior tool event. */ }
  }
  const record = { ...event, session, agent, kind, request: original?.request || request,
    completed: kind === 'tool' && hook !== 'PreToolUse',
    boundary };
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(record), { mode: 0o600 });
  fs.renameSync(temp, target);
}
function readEvents(root, now = Date.now()) {
  const events = [];
  try {
    // Scan all entries before filtering; old files must never crowd out live ones.
    for (const file of fs.readdirSync(path.join(root, 'sessions'))) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
      const target = path.join(root, 'sessions', file);
      try {
        const stat = fs.lstatSync(target);
        if (!stat.isFile() || stat.size > 4096) continue;
        if (now - stat.mtimeMs > 86400000) { fs.unlinkSync(target); continue; }
        const event = JSON.parse(fs.readFileSync(target, 'utf8'));
        if (event?.session !== undefined && (!['session', 'agent', 'request'].every(key => typeof event[key] === 'string' && /^[a-f0-9]{64}$/.test(event[key])) || !['boundary', 'permission', 'notification', 'tool', 'activity'].includes(event.kind) || typeof event.completed !== 'boolean' || typeof event.boundary !== 'boolean')) continue;
        if (event && states.has(event.state) && Number.isFinite(event.at) && event.at <= now + 5000 && now - event.at < 30 * 60 * 1000) events.push(event.session === undefined ? { state: event.state, at: event.at, tool: typeof event.tool === 'string' ? event.tool : '' } : event);
      } catch { /* Malformed or concurrently replaced event. */ }
    }
  } catch { /* No session yet. */ }
  return events;
}
function resolvedEvents(events) {
  events = events.filter(event => event && states.has(event.state) && Number.isFinite(event.at));
  const boundaries = new Map(), ended = new Map(), completed = new Map(), anyCompleted = new Map();
  const latest = (map, key, at) => map.set(key, Math.max(map.get(key) ?? -Infinity, at));
  for (const event of events) {
    const scope = `${event.session}:${event.agent}`;
    if (event.boundary) latest(boundaries, scope, event.at);
    if (event.state === 'offline') latest(ended, event.session, event.at);
    if (event.completed) { latest(completed, event.request, event.at); latest(anyCompleted, scope, event.at); }
  }
  const live = events.filter(event => {
    if (!event.session) return true;
    const scope = `${event.session}:${event.agent}`;
    if ((ended.get(event.session) ?? -Infinity) >= event.at && event.state !== 'offline') return false;
    if ((boundaries.get(scope) ?? -Infinity) >= event.at && !event.boundary) return false;
    if (event.state === 'permission' && (event.kind === 'notification' ? anyCompleted.get(scope) : completed.get(event.request)) >= event.at) return false;
    return true;
  });
  const specific = new Set(live.filter(e => e.kind === 'permission').map(e => `${e.session}:${e.agent}`));
  return live.filter(e => e.kind !== 'notification' || !specific.has(`${e.session}:${e.agent}`));
}

function visibleEvents(events, dismissed) {
  return resolvedEvents(events).filter(event => {
    const cutoff = dismissed.get(`${event.session}:${event.agent}`);
    if (cutoff === undefined) return true;
    if (event.at <= cutoff) return false;
    // Delayed permission notifications must not restart an acknowledged reminder.
    return event.kind !== 'notification' || events.some(other => other.session === event.session && other.agent === event.agent && other.kind !== 'notification' && other.at > cutoff);
  });
}
module.exports = { home, fromHook, displayState, writeEvent, readEvents, resolvedEvents, visibleEvents };
