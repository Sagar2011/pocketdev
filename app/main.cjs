const { app, BrowserWindow, ipcMain, Menu, dialog, screen, nativeImage } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { home, displayState } = require('../plugin/scripts/state.cjs');
const { POSES, imageMime, generatePoses, savePose } = require('./generate.cjs');

app.setName('PocketDev');
let avatar, settings, photo, generation, timer, demo;
let prefs = { size: 120, motion: true, sound: true, workingSound: true, doneSound: true, avatarDir: null };
const root = home();
const prefsFile = path.join(root, 'preferences.json');
const page = name => pathToFileURL(path.join(__dirname, `${name}.html`)).href;

function savePrefs() {
  fs.writeFileSync(`${prefsFile}.tmp`, JSON.stringify(prefs), { mode: 0o600 });
  fs.renameSync(`${prefsFile}.tmp`, prefsFile);
}

function guard(event, window) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted request.');
}

function makeWindow(options, name) {
  const win = new BrowserWindow({ icon: path.join(__dirname, 'icon.png'), ...options, webPreferences: {
    preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true,
    nodeIntegration: false, sandbox: true, webSecurity: true
  } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  win.loadURL(page(name));
  return win;
}

function openSettings() {
  if (settings && !settings.isDestroyed()) { settings.show(); settings.focus(); return; }
  settings = makeWindow({ width: 740, height: 830, minWidth: 600, minHeight: 640, title: 'PocketDev · Your little work buddy', backgroundColor: '#f6f3ed', autoHideMenuBar: true }, 'settings');
  settings.on('closed', () => { generation?.abort(); photo = undefined; settings = null; });
}

function currentState() {
  if (demo && demo.until > Date.now()) return { state: demo.state, message: `Preview · ${demo.state}`, connected: false };
  const events = [];
  try {
    for (const file of fs.readdirSync(path.join(root, 'sessions')).filter(f => /^[a-f0-9]{64}\.json$/.test(f)).slice(0, 200)) {
      try {
        const target = path.join(root, 'sessions', file);
        const stat = fs.lstatSync(target);
        if (!stat.isFile() || stat.size > 4096) continue;
        if (Date.now() - stat.mtimeMs > 86400000) { fs.unlinkSync(target); continue; }
        events.push(JSON.parse(fs.readFileSync(target, 'utf8')));
      } catch { /* Ignore a malformed or concurrently removed event. */ }
    }
  } catch { /* No Claude session yet. */ }
  return displayState(events);
}

async function appearance() {
  const images = {};
  if (prefs.avatarDir) {
    for (const pose of POSES) {
      try {
        const bytes = await fsp.readFile(path.join(root, 'avatars', prefs.avatarDir, `${pose}.png`));
        if (imageMime(bytes) === 'image/png') images[pose] = `data:image/png;base64,${bytes.toString('base64')}`;
      } catch { /* Fall back to the original mascot if a pack is missing. */ }
    }
  }
  return { size: prefs.size, motion: prefs.motion, sound: prefs.sound, workingSound: prefs.workingSound, doneSound: prefs.doneSound, images: ['waiting', 'working', 'done'].every(pose => images[pose]) ? images : {}, dataPath: root };
}

async function broadcastAppearance() {
  const data = await appearance();
  for (const win of [avatar, settings]) if (win && !win.isDestroyed()) win.webContents.send('appearance', data);
}

function resizeAvatar() {
  if (!avatar) return;
  const bounds = avatar.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const width = prefs.size, height = prefs.size;
  avatar.setBounds({ width, height, x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)), y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) });
}

ipcMain.handle('initial', async event => {
  const win = event.sender === avatar?.webContents ? avatar : settings;
  guard(event, win);
  return { appearance: await appearance(), status: currentState() };
});
ipcMain.handle('settings', event => { guard(event, avatar); openSettings(); });
ipcMain.handle('menu', event => {
  guard(event, avatar);
  Menu.buildFromTemplate([{ label: 'Customize PocketDev…', click: openSettings }, { type: 'separator' }, { label: 'Quit PocketDev', click: () => app.quit() }]).popup({ window: avatar });
});
ipcMain.handle('preferences', async (event, update) => {
  guard(event, settings);
  if (Number.isInteger(update?.size) && update.size >= 48 && update.size <= 120) prefs.size = update.size;
  if (typeof update?.motion === 'boolean') prefs.motion = update.motion;
  for (const key of ['sound', 'workingSound', 'doneSound']) if (typeof update?.[key] === 'boolean') prefs[key] = update[key];
  savePrefs(); resizeAvatar(); await broadcastAppearance();
});
ipcMain.handle('preview', (event, state) => {
  guard(event, settings);
  if (!['idle', 'waiting', 'working', 'done', 'permission', 'error'].includes(state)) throw new Error('Unknown state.');
  demo = { state, until: Date.now() + (state === 'permission' ? 30000 : 5000) };
  avatar.webContents.send('status', currentState());
});
ipcMain.handle('photo', async event => {
  guard(event, settings);
  if (generation) throw new Error('Wait for generation to finish.');
  const result = await dialog.showOpenDialog(settings, { title: 'Choose one photo of yourself', properties: ['openFile'], filters: [{ name: 'Photos', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });
  if (result.canceled) return null;
  const file = result.filePaths[0];
  if ((await fsp.stat(file)).size > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
  const bytes = await fsp.readFile(file);
  const mime = imageMime(bytes);
  if (nativeImage.createFromBuffer(bytes).isEmpty()) throw new Error('This photo could not be opened.');
  photo = { bytes, mime };
  return `data:${mime};base64,${bytes.toString('base64')}`;
});
ipcMain.handle('generate', async (event, key) => {
  guard(event, settings);
  if (!photo) throw new Error('Choose a photo first.');
  if (generation) throw new Error('Generation is already running.');
  const controller = new AbortController();
  generation = controller;
  const photos = photo;
  const sender = event.sender;
  try {
    const parent = path.join(root, 'avatars');
    await fsp.mkdir(parent, { recursive: true, mode: 0o700 });
    const dir = await fsp.mkdtemp(path.join(parent, 'custom-'));
    await generatePoses({ photo: photos.bytes, mime: photos.mime, key,
      signal: controller.signal,
      save: (pose, bytes) => savePose(dir, pose, bytes),
      progress: pose => { if (!sender.isDestroyed()) sender.send('progress', pose); }
    });
    prefs.avatarDir = path.basename(dir); savePrefs(); await broadcastAppearance();
    return true;
  } catch (error) {
    if (controller.signal.aborted || error.name === 'AbortError') throw new Error('Generation stopped. Any completed images remain in your local avatar folder. An in-flight request may still be billed.');
    throw error;
  } finally { generation = null; }
});
ipcMain.handle('cancel', event => { guard(event, settings); generation?.abort(); });
ipcMain.handle('import', async event => {
  guard(event, settings);
  if (generation) throw new Error('Wait for generation to finish.');
  const result = await dialog.showOpenDialog(settings, { title: 'Select waiting.png, working.png, done.png, and optionally idle.png', properties: ['openFile', 'multiSelections'], filters: [{ name: 'PNG poses', extensions: ['png'] }] });
  if (result.canceled) return false;
  const names = result.filePaths.map(file => path.basename(file));
  if (names.length < 3 || names.length > 4 || new Set(names).size !== names.length || !names.every(name => POSES.some(pose => name === `${pose}.png`)) || !['waiting', 'working', 'done'].every(pose => names.includes(`${pose}.png`))) throw new Error('Select waiting.png, working.png, done.png, and optionally idle.png.');
  const parent = path.join(root, 'avatars');
  await fsp.mkdir(parent, { recursive: true, mode: 0o700 });
  const dir = await fsp.mkdtemp(path.join(parent, 'import-'));
  for (const pose of POSES) {
    const file = result.filePaths.find(file => path.basename(file) === `${pose}.png`);
    if (!file) continue;
    if ((await fsp.stat(file)).size > 10 * 1024 * 1024) throw new Error('Each image must be smaller than 10 MB.');
    const bytes = await fsp.readFile(file);
    if (imageMime(bytes) !== 'image/png' || nativeImage.createFromBuffer(bytes).isEmpty()) throw new Error('All poses must be valid PNG images.');
    await savePose(dir, pose, bytes);
  }
  prefs.avatarDir = path.basename(dir); savePrefs(); await broadcastAppearance();
  return true;
});
ipcMain.handle('reset', async event => {
  guard(event, settings);
  prefs.avatarDir = null; savePrefs(); await broadcastAppearance();
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => openSettings());
  app.whenReady().then(() => {
    fs.mkdirSync(path.join(root, 'sessions'), { recursive: true, mode: 0o700 });
    try {
      const saved = JSON.parse(fs.readFileSync(prefsFile, 'utf8'));
      if (Number.isInteger(saved.size) && saved.size >= 48 && saved.size <= 120) prefs.size = saved.size;
      if (typeof saved.motion === 'boolean') prefs.motion = saved.motion;
      for (const key of ['sound', 'workingSound', 'doneSound']) prefs[key] = typeof saved[key] === 'boolean' ? saved[key] : saved.sound !== false;
      if (typeof saved.avatarDir === 'string' && /^(custom|import)-[a-zA-Z0-9]+$/.test(saved.avatarDir)) prefs.avatarDir = saved.avatarDir;
    } catch { /* First launch. */ }
    const area = screen.getPrimaryDisplay().workArea;
    avatar = makeWindow({ width: prefs.size, height: prefs.size,
      x: area.x + area.width - prefs.size - 24, y: area.y + area.height - prefs.size - 24,
      frame: false, transparent: true, resizable: false, alwaysOnTop: true,
      hasShadow: false, title: 'PocketDev', skipTaskbar: true }, 'avatar');
    avatar.on('closed', () => app.quit());
    let previous = '';
    timer = setInterval(() => {
      const status = currentState(), json = JSON.stringify(status);
      if (json !== previous) {
        previous = json;
        for (const win of [avatar, settings]) if (win && !win.isDestroyed()) win.webContents.send('status', status);
      }
    }, 750);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'PocketDev', submenu: [{ label: 'Customize…', click: openSettings }, { role: 'quit' }] },
      { role: 'editMenu' }
    ]));
    if (!fs.existsSync(prefsFile)) { savePrefs(); openSettings(); }
    app.on('activate', openSettings);
  });
  app.on('before-quit', () => { clearInterval(timer); generation?.abort(); });
  app.on('window-all-closed', () => app.quit());
}
