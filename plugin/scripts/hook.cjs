// Deliberately silent and fail-open: the mascot must never interrupt Claude.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { home, fromHook } = require('./state.cjs');
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
    const raw = JSON.parse(input);
    const event = fromHook(raw);
    if (!event) return;
    const dir = path.join(home(), 'sessions');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const id = createHash('sha256').update(raw.session_id).digest('hex');
    const target = path.join(dir, `${id}.json`);
    const temp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(event), { mode: 0o600 });
    fs.renameSync(temp, target);
  } catch { /* Invalid input, permissions, or absent companion must not block Claude. */ }
});
