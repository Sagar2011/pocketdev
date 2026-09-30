// Plugin-managed companion. Only official, version-matched release assets are used.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { home } = require('./state.cjs');
const { version } = require('../.claude-plugin/plugin.json');
const run = promisify(execFile);

function assetFor(version, platform, arch) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('Invalid release version');
  if (platform === 'darwin' && ['arm64', 'x64'].includes(arch)) return {
    name: `PocketDev-${version}-mac-${arch}.zip`, executable: 'PocketDev.app/Contents/MacOS/PocketDev', platform
  };
  if (platform === 'win32' && arch === 'x64') return {
    name: `PocketDev-${version}-win-x64.zip`, executable: 'PocketDev.exe', platform
  };
  if (platform === 'linux' && arch === 'x64') return {
    name: `PocketDev-${version}-linux-x64.AppImage`, executable: 'PocketDev.AppImage', platform
  };
  throw new Error(`Unsupported desktop platform: ${platform}/${arch}`);
}

async function download(url, file, maxBytes, fetchImpl) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Release download failed (HTTP ${response.status}). The matching platform release must be published.`);
  if (!response.body) throw new Error('Empty release download');
  const hash = createHash('sha256');
  let size = 0;
  await pipeline(response.body, new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (size > maxBytes) return callback(new Error('Release download exceeds size limit'));
      hash.update(chunk); callback(null, chunk);
    }
  }), fs.createWriteStream(file, { flags: 'wx', mode: 0o600 }));
  return hash.digest('hex');
}

async function extractArchive(archive, dest, asset) {
  const options = { timeout: 120000, windowsHide: true, maxBuffer: 1024 * 1024 };
  if (asset.platform === 'darwin') await run('/usr/bin/ditto', ['-x', '-k', archive, dest], options);
  else if (asset.platform === 'win32') {
    // Paths are data, never interpolated into PowerShell source.
    const script = '$ErrorActionPreference = "Stop"; Expand-Archive -LiteralPath $env:POCKETDEV_ARCHIVE -DestinationPath $env:POCKETDEV_DEST';
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    await run(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      ...options, env: { ...process.env, POCKETDEV_ARCHIVE: archive, POCKETDEV_DEST: dest }
    });
  } else fs.copyFileSync(archive, path.join(dest, asset.executable));
}

// An exclusive directory serializes concurrent Claude session starts. A crashed
// installer can be retried after ten minutes; the worker has a five-minute limit.
function acquireLock(dir) {
  try { fs.mkdirSync(dir, { mode: 0o700 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (Date.now() - fs.statSync(dir).mtimeMs < 10 * 60 * 1000) return false;
    try { fs.rmdirSync(dir); } catch { return false; }
    try { fs.mkdirSync(dir, { mode: 0o700 }); } catch { return false; }
  }
  return true;
}

async function install({ root = home(), version: release = version, platform = process.platform,
  arch = process.arch, fetchImpl = fetch, extract = extractArchive } = {}) {
  const asset = assetFor(release, platform, arch);
  const cache = path.join(root, 'runtime');
  const dest = path.join(cache, `${release}-${platform}-${arch}`);
  const executable = path.join(dest, asset.executable);
  if (fs.existsSync(executable)) return executable;
  fs.mkdirSync(cache, { recursive: true, mode: 0o700 });
  const lock = path.join(cache, 'install.lock');
  if (!acquireLock(lock)) return null; // The active installer also launches the app.
  let staging;
  try {
    if (fs.existsSync(executable)) return executable;
    staging = fs.mkdtempSync(path.join(cache, '.download-'));
    const archive = path.join(staging, asset.name);
    const checksum = `${archive}.sha256`;
    const base = `https://github.com/Sagar2011/pocketdev/releases/download/v${release}/${asset.name}`;
    await download(`${base}.sha256`, checksum, 256, fetchImpl);
    const expected = fs.readFileSync(checksum, 'utf8').trim();
    if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Invalid release checksum');
    const actual = await download(base, archive, 512 * 1024 * 1024, fetchImpl);
    if (actual !== expected) throw new Error('Release checksum mismatch; refusing to run it');
    const unpacked = path.join(staging, 'app');
    fs.mkdirSync(unpacked);
    await extract(archive, unpacked, asset);
    const binary = path.join(unpacked, asset.executable);
    if (!fs.lstatSync(binary).isFile()) throw new Error('Release executable is missing or invalid');
    if (platform !== 'win32') fs.chmodSync(binary, 0o755);
    // Incomplete installs are never marked ready; preferences and avatars live elsewhere.
    fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(unpacked, dest);
    return executable;
  } finally {
    if (staging) fs.rmSync(staging, { recursive: true, force: true });
    fs.rmdirSync(lock);
  }
}

function enabled(root = home()) {
  return process.env.POCKETDEV_AUTOSTART !== '0' && !fs.existsSync(path.join(root, 'autostart-disabled'));
}

function localDesktop() {
  return !process.env.SSH_CONNECTION && !process.env.SSH_TTY && process.env.CLAUDE_CODE_REMOTE !== 'true' &&
    (process.platform !== 'linux' || Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY));
}

function kickoff() {
  if (!enabled() || !localDesktop()) return;
  const worker = spawn(process.execPath, [__filename, 'start'], { detached: true, stdio: 'ignore', windowsHide: true });
  worker.on('error', () => {}); // Fail open: startup must never interfere with Claude.
  worker.unref();
}

async function start() {
  const root = home();
  if (!enabled(root) || !localDesktop()) return;
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const report = (state, error) => fs.writeFileSync(path.join(root, 'runtime-status.json'),
    JSON.stringify({ version, state, at: new Date().toISOString(), ...(error ? { error: String(error.message).slice(0, 500) } : {}) }), { mode: 0o600 });
  const deadline = setTimeout(() => {
    report('error', new Error('Setup timed out. Start a new Claude session to retry after ten minutes.'));
    process.exit(0);
  }, 5 * 60 * 1000);
  try {
    report('starting');
    const executable = await install();
    if (!executable || !enabled(root)) return;
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.NODE_OPTIONS;
    if (process.platform === 'linux') env.APPIMAGE_EXTRACT_AND_RUN = '1';
    const child = spawn(executable, ['--pocketdev-managed'], {
      detached: true, stdio: 'ignore', windowsHide: true, cwd: path.dirname(executable), env
    });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.unref();
    report('launched');
  } catch (error) { report('error', error); }
  finally { clearTimeout(deadline); }
}

if (require.main === module) {
  const command = process.argv[2] || 'start';
  const root = home();
  if (command === 'start') start().catch(() => {});
  else if (command === 'status') {
    let last = null;
    try { last = JSON.parse(fs.readFileSync(path.join(root, 'runtime-status.json'), 'utf8')); } catch {}
    console.log(JSON.stringify({ enabled: enabled(root), dataPath: root, last }, null, 2));
  } else if (command === 'disable' || command === 'enable') {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    const flag = path.join(root, 'autostart-disabled');
    if (command === 'disable') fs.writeFileSync(flag, '', { mode: 0o600 });
    else { fs.rmSync(flag, { force: true }); kickoff(); }
    console.log(command === 'disable' ? 'Automatic startup paused. Right-click the avatar and choose Quit PocketDev to stop it now.' : 'Automatic startup enabled.');
  } else { console.error('Use start, status, disable, or enable.'); process.exitCode = 1; }
}

module.exports = { assetFor, install, kickoff, enabled };
