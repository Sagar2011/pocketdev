const path = require('node:path');
const os = require('node:os');

const home = () => process.env.POCKETDEV_HOME || path.join(os.homedir(), '.pocketdev');
const states = new Set(['idle', 'waiting', 'working', 'permission', 'done', 'error', 'offline']);

function fromHook(input, now = Date.now()) {
  if (!input || typeof input.session_id !== 'string' || !input.session_id || input.session_id.length > 512) return null;
  const mapping = {
    SessionStart: 'idle', UserPromptSubmit: 'working', PreToolUse: 'working',
    PermissionRequest: 'permission', PostToolUse: 'working', PostToolUseFailure: 'error',
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
  const live = events.filter(e => e && states.has(e.state) && e.state !== 'offline' &&
    Number.isFinite(e.at) && e.at <= now + 5000 && now - e.at < 30 * 60 * 1000);
  live.sort((a, b) => (b.state === 'permission') - (a.state === 'permission') || b.at - a.at);
  const event = live[0];
  if (!event) return { state: 'idle', message: 'On a little break', connected: false };
  const state = event.state === 'done' && now - event.at > 6000 ? 'idle' : event.state;
  const messages = { idle: 'On a little break', waiting: 'Excuse me · Your input?', working: 'Working on it', permission: 'Excuse me · Permission?', done: 'Response finished', error: 'Needs attention' };
  return { state, message: messages[state], connected: true };
}

module.exports = { home, fromHook, displayState };
