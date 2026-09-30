// Deliberately silent and fail-open: the mascot must never interrupt Claude.
const { home, writeEvent } = require('./state.cjs');
let input = '';
let oversized = false;
const timeout = setTimeout(() => process.exit(0), 1500);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (oversized) return;
  input += chunk;
  if (Buffer.byteLength(input) > 1024 * 1024) { oversized = true; input = ''; }
});
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  clearTimeout(timeout);
  try {
    if (oversized) return;
    const event = JSON.parse(input);
    writeEvent(home(), event);
    if (event.hook_event_name === 'SessionStart' && typeof event.session_id === 'string' && event.session_id.length > 0 && event.session_id.length <= 512) {
      require('./runtime.cjs').kickoff();
    }
  } catch { /* Invalid input, permissions, or absent companion must not block Claude. */ }
});
