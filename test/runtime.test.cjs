const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { install, assetFor } = require('../plugin/scripts/runtime.cjs');
const { version } = require('../plugin/.claude-plugin/plugin.json');

test('release selection matches Mac architecture, Windows ZIP, and Linux AppImage', () => {
  assert.equal(assetFor('1.1.0', 'darwin', 'arm64').name, 'PocketDev-1.1.0-mac-arm64.zip');
  assert.equal(assetFor('1.1.0', 'darwin', 'x64').name, 'PocketDev-1.1.0-mac-x64.zip');
  assert.equal(assetFor('1.1.0', 'win32', 'x64').name, 'PocketDev-1.1.0-win-x64.zip');
  assert.equal(assetFor('1.1.0', 'linux', 'x64').name, 'PocketDev-1.1.0-linux-x64.AppImage');
  assert.throws(() => assetFor('../escape', 'darwin', 'arm64'));
  assert.throws(() => assetFor('1.1.0', 'win32', 'arm64'), /Unsupported/);
});

test('first install verifies bytes; later sessions reuse the cached executable offline', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-install-'));
  const bytes = Buffer.from('fake trusted archive');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const urls = [];
  let extracted = 0;
  const options = { root, version: '1.1.0', platform: 'darwin', arch: 'arm64',
    fetchImpl: async url => {
      urls.push(url);
      return new Response(url.endsWith('.sha256') ? digest : bytes);
    },
    extract: async (archive, dest, asset) => {
      extracted++;
      assert.deepEqual(fs.readFileSync(archive), bytes);
      fs.mkdirSync(path.dirname(path.join(dest, asset.executable)), { recursive: true });
      fs.writeFileSync(path.join(dest, asset.executable), 'fake app');
    }
  };
  try {
    const executable = await install(options);
    assert.ok(fs.existsSync(executable));
    assert.equal(urls.length, 2);
    assert.ok(urls.every(url => url.startsWith('https://github.com/Sagar2011/pocketdev/releases/download/v1.1.0/')));
    assert.equal(await install({ ...options, fetchImpl: () => { throw new Error('offline'); } }), executable);
    assert.equal(extracted, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('bad checksums, missing releases, and extraction errors leave no installed app and allow retry', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-failed-install-'));
  const bytes = Buffer.from('archive');
  const digest = createHash('sha256').update(bytes).digest('hex');
  let extracted = false;
  const options = { root, version: '1.1.0', platform: 'linux', arch: 'x64',
    fetchImpl: async url => new Response(url.endsWith('.sha256') ? '0'.repeat(64) : bytes),
    extract: async () => { extracted = true; }
  };
  try {
    await assert.rejects(install(options), /checksum/i);
    assert.equal(extracted, false);
    assert.deepEqual(fs.readdirSync(path.join(root, 'runtime')), []);
    await assert.rejects(install({ ...options, fetchImpl: async () => new Response('', { status: 404 }) }), /404/);
    await assert.rejects(install({ ...options,
      fetchImpl: async url => new Response(url.endsWith('.sha256') ? digest : bytes),
      extract: async () => { throw new Error('extract failed'); }
    }), /extract failed/);
    assert.deepEqual(fs.readdirSync(path.join(root, 'runtime')), []);
    const executable = await install({ ...options,
      fetchImpl: async url => new Response(url.endsWith('.sha256') ? digest : bytes),
      extract: async (_archive, dest, asset) => fs.writeFileSync(path.join(dest, asset.executable), bytes)
    });
    assert.ok(fs.existsSync(executable));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('concurrent installs share one download; an expired crash lock is recovered', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-concurrent-'));
  const bytes = Buffer.from('fake app');
  const digest = createHash('sha256').update(bytes).digest('hex');
  let releaseDownload;
  const gate = new Promise(resolve => { releaseDownload = resolve; });
  let calls = 0;
  const options = { root, version: '1.1.0', platform: 'linux', arch: 'x64',
    fetchImpl: async url => { calls++; await gate; return new Response(url.endsWith('.sha256') ? digest : bytes); }
  };
  try {
    fs.mkdirSync(path.join(root, 'runtime', 'install.lock'), { recursive: true });
    const old = new Date(Date.now() - 11 * 60 * 1000);
    fs.utimesSync(path.join(root, 'runtime', 'install.lock'), old, old);
    const first = install(options);
    assert.equal(await install(options), null);
    releaseDownload();
    const executable = await first;
    assert.deepEqual(fs.readFileSync(executable), bytes);
    assert.equal(calls, 2);
    assert.equal(fs.existsSync(path.join(root, 'runtime', 'install.lock')), false);
  } finally { releaseDownload(); fs.rmSync(root, { recursive: true, force: true }); }
});

test('real SessionStart hook launches the cached app detached; pause and disable prevent startup', { skip: process.platform === 'win32' }, async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-autostart-'));
  const asset = assetFor(version, process.platform, process.arch);
  const executable = path.join(root, 'runtime', `${version}-${process.platform}-${process.arch}`, asset.executable);
  const signal = path.join(root, 'launched.json');
  const hook = path.join(__dirname, '../plugin/scripts/hook.cjs');
  const env = { ...process.env, POCKETDEV_HOME: path.relative(process.cwd(), root), POCKETDEV_AUTOSTART: '1', DISPLAY: ':test',
    SSH_CONNECTION: '', SSH_TTY: '', CLAUDE_CODE_REMOTE: '', ELECTRON_RUN_AS_NODE: '1' };
  const send = (event = 'SessionStart', extraEnv = {}) => spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ session_id: 'autostart-test', hook_event_name: event }),
    env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 2000
  });
  try {
    fs.mkdirSync(path.dirname(executable), { recursive: true });
    fs.writeFileSync(executable, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(signal)}, JSON.stringify({args: process.argv, electronAsNode: process.env.ELECTRON_RUN_AS_NODE, home: process.env.POCKETDEV_HOME}));\n`, { mode: 0o755 });
    const result = send();
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
    for (let i = 0; i < 100 && !fs.existsSync(signal); i++) await new Promise(resolve => setTimeout(resolve, 50));
    const launched = JSON.parse(fs.readFileSync(signal, 'utf8'));
    assert.ok(launched.args.includes('--pocketdev-managed'));
    assert.equal(launched.electronAsNode, undefined);
    assert.equal(launched.home, root);
    // Let the short-lived worker finish writing its status before the next checks.
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.rmSync(signal);
    fs.writeFileSync(path.join(root, 'autostart-disabled'), '');
    assert.equal(send().status, 0);
    fs.rmSync(path.join(root, 'autostart-disabled'));
    assert.equal(send('SessionStart', { POCKETDEV_AUTOSTART: '0' }).status, 0);
    assert.equal(send('SessionStart', { SSH_CONNECTION: 'remote' }).status, 0);
    assert.equal(send('UserPromptSubmit').status, 0);
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(fs.existsSync(signal), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('relative data directory resolves before the companion changes working directory', () => {
  const { home } = require('../plugin/scripts/state.cjs');
  const previous = process.env.POCKETDEV_HOME;
  try {
    process.env.POCKETDEV_HOME = './relative-pocketdev';
    assert.equal(home(), path.resolve('relative-pocketdev'));
  } finally {
    if (previous === undefined) delete process.env.POCKETDEV_HOME;
    else process.env.POCKETDEV_HOME = previous;
  }
});
