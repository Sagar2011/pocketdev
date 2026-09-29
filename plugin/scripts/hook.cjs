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
    writeEvent(home(), JSON.parse(input));
  } catch { /* Invalid input, permissions, or absent companion must not block Claude. */ }
});
