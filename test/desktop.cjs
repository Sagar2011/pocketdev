// Launches the real app with isolated data; no API requests or Claude installation.
const { app, BrowserWindow, dialog } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-desktop-'));
process.env.POCKETDEV_HOME = temp;
process.env.POCKETDEV_AUTOSTART = '0'; // Tests must never download or launch a released app.
app.setPath('userData', path.join(temp, 'electron'));
process.argv.push('--pocketdev-managed');
require('../app/main.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function expectState(window, expected) {
  const deadline = Date.now() + 4000;
  let actual;
  do {
    actual = await window.webContents.executeJavaScript('document.body.dataset.state');
    if (actual === expected) return;
    await pause(100);
  } while (Date.now() < deadline);
  const files = fs.readdirSync(path.join(temp, 'sessions')).filter(file => file.endsWith('.json'));
  const events = files.map(file => fs.readFileSync(path.join(temp, 'sessions', file), 'utf8'));
  assert.equal(actual, expected, `Status transition timed out; local events: ${events.join(', ')}`);
}
const errors = [];
const screenshotDir = process.env.POCKETDEV_SCREENSHOTS;
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  contents.on('preload-error', (_event, _file, error) => errors.push(error.message));
});
const deadline = setTimeout(() => { console.error('Desktop test timed out'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  try {
    let avatar, settings;
    for (let i = 0; i < 100; i++) {
      const windows = BrowserWindow.getAllWindows();
      avatar = windows.find(w => w.webContents.getURL().endsWith('/avatar.html'));
      if (avatar && !avatar.webContents.isLoading()) break;
      await pause(100);
    }
    assert.ok(avatar, 'Managed launch opens the avatar');
    assert.equal(BrowserWindow.getAllWindows().length, 1, 'Managed first launch does not open settings');
    const duplicate = spawn(process.execPath, [path.join(__dirname, '../app/main.cjs'), '--pocketdev-managed'], {
      env: process.env, stdio: 'ignore'
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { duplicate.kill(); reject(new Error('Duplicate app did not exit')); }, 5000);
      duplicate.once('error', error => { clearTimeout(timer); reject(error); });
      duplicate.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Duplicate exited ${code}`)); });
    });
    await pause(100);
    assert.equal(BrowserWindow.getAllWindows().length, 1, 'Another Claude session neither duplicates the avatar nor opens settings');
    await avatar.webContents.executeJavaScript('window.pocketdev.settings()');
    for (let i = 0; i < 100; i++) {
      settings = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/settings.html'));
      if (settings && !settings.webContents.isLoading()) break;
      await pause(100);
    }
    assert.ok(avatar && settings, 'Both windows load');
    assert.equal(avatar.getBounds().width, 120);
    assert.equal(avatar.getBounds().height, 120);
    assert.ok(await avatar.webContents.executeJavaScript('document.querySelector("#mascot").getBoundingClientRect().width <= 120'), 'Sprite strip cannot expand the desktop avatar beyond its window');
    await pause(300);
    assert.equal(await avatar.webContents.executeJavaScript('typeof require'), 'undefined', 'Node is unavailable to renderer');
    assert.equal(await settings.webContents.executeJavaScript('document.querySelectorAll(".pose-card").length'), 4);
    await settings.webContents.executeJavaScript('window.pocketdev.preferences({size: 80, motion: false, sound: false, workingSound: false, doneSound: false})');
    assert.equal(avatar.getBounds().width, 80);
    assert.equal(await avatar.webContents.executeJavaScript('document.body.classList.contains("reduced-motion")'), true);
    assert.equal(await settings.webContents.executeJavaScript('document.querySelector("#sound").checked'), false);
    await settings.webContents.executeJavaScript('window.pocketdev.preferences({size: 120, motion: true})');
    // Test both OS motion preferences explicitly, independent of the CI runner's settings.
    avatar.webContents.debugger.attach('1.3');
    const motionPreference = value => avatar.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value }]
    });
    await motionPreference('reduce');
    await settings.webContents.executeJavaScript('window.pocketdev.preview("working")');
    await expectState(avatar, 'working');
    assert.equal(await avatar.webContents.executeJavaScript('getComputedStyle(document.querySelector(".pose-working .film")).animationName'), 'none', 'OS reduced motion disables typing');
    await motionPreference('no-preference');
    const sizes = await avatar.webContents.executeJavaScript(`Promise.all([...new Set([...document.querySelectorAll('.sprite-frame image')].map(el => el.getAttribute('href')))].map(async src => { const img = new Image(); img.src = src; await img.decode(); return [img.naturalWidth, img.naturalHeight]; }))`);
    assert.equal(sizes.length, 4, 'All four bundled sprite sheets load');
    const audioDuration = await avatar.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const clip = new Audio('assets/sounds/party-popper.mp3');
      const timeout = setTimeout(() => reject(new Error('Completion audio timed out')), 5000);
      clip.onloadedmetadata = () => { clearTimeout(timeout); resolve(clip.duration); };
      clip.onerror = () => { clearTimeout(timeout); reject(new Error('Completion audio failed to load')); };
      clip.load();
    })`);
    assert.ok(audioDuration > 5 && audioDuration < 5.3, 'Bundled completion recording loads under the renderer CSP');
    const keyboardDuration = await avatar.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const clip = new Audio('assets/sounds/keyboard.mp3');
      const timeout = setTimeout(() => reject(new Error('Keyboard audio timed out')), 5000);
      clip.onloadedmetadata = () => { clearTimeout(timeout); resolve(clip.duration); };
      clip.onerror = () => { clearTimeout(timeout); reject(new Error('Keyboard audio failed to load')); };
      clip.load();
    })`);
    assert.ok(keyboardDuration > 53 && keyboardDuration < 54, 'Bundled keyboard recording loads under the renderer CSP');
    assert.ok(sizes.every(([w, h]) => w === h && w >= 1000), 'Sprite sheets are complete square assets');
    for (const state of ['waiting', 'working', 'done', 'permission', 'idle']) {
      await settings.webContents.executeJavaScript(`window.pocketdev.preview(${JSON.stringify(state)})`);
      await pause(250);
      const animation = { permission: ['.pose-waiting .film', 'knock-frames'], working: ['.pose-working .film', 'work-frames'], done: ['.pose-done .film', 'done-frames'], idle: ['.pose-idle .film', 'snack-frames'] }[state];
      if (animation) assert.equal(await avatar.webContents.executeJavaScript(`getComputedStyle(document.querySelector(${JSON.stringify(animation[0])})).animationName`), animation[1]);
      assert.equal(await avatar.webContents.executeJavaScript('document.body.dataset.state'), state);
      if (state === 'done') {
        const motion = await avatar.webContents.executeJavaScript(`(() => { const el = document.querySelector('.character'); const a = el.getAnimations().find(a => a.animationName === 'celebrate'); a.pause(); a.currentTime = 640; return {y: new DOMMatrix(getComputedStyle(el).transform).m42, iterations: a.effect.getTiming().iterations}; })()`);
        assert.ok(motion.y < -10, 'Done actually jumps above the ground');
        assert.equal(motion.iterations, Infinity, 'Done continues animating');
      }
      if (state === 'idle') {
        const motion = await avatar.webContents.executeJavaScript(`(() => {
          const el = document.querySelector('.character');
          const animation = el.getAnimations().find(a => a.animationName === 'idle-sway');
          animation.pause(); animation.currentTime = 2250;
          const result = {y: new DOMMatrix(getComputedStyle(el).transform).m42, iterations: animation.effect.getTiming().iterations,
            custom: getComputedStyle(document.querySelector('.custom')).animationName};
          document.body.classList.add('reduced-motion');
          result.reduced = getComputedStyle(el).animationName;
          document.body.classList.remove('reduced-motion');
          return result;
        })()`);
        assert.ok(motion.y <= -3, 'Idle visibly moves at button size');
        assert.equal(motion.iterations, Infinity);
        assert.equal(motion.custom, 'idle-sway');
        assert.equal(motion.reduced, 'none');
      }
      const capture = await avatar.webContents.capturePage();
      const bitmap = capture.toBitmap(), dimensions = capture.getSize();
      let painted = 0;
      for (let y = Math.floor(dimensions.height * .2); y < dimensions.height * .9; y++) {
        for (let x = Math.floor(dimensions.width * .2); x < dimensions.width * .8; x++) {
          if (bitmap[(y * dimensions.width + x) * 4 + 3] > 32) painted++;
        }
      }
      assert.ok(painted > dimensions.width * dimensions.height * .02, `${state} paints visible artwork in the floating window`);
      if (screenshotDir) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        fs.writeFileSync(path.join(screenshotDir, `${state}.png`), capture.toPNG());
      }
    }
    if (screenshotDir) fs.writeFileSync(path.join(screenshotDir, 'settings.png'), (await settings.webContents.capturePage()).toPNG());
    // Inspect the occasional head scratch, not just the fast typing phase.
    await settings.webContents.executeJavaScript('window.pocketdev.preview("working")');
    await expectState(avatar, 'working');
    const frames = await avatar.webContents.executeJavaScript(`(() => {
      const film = document.querySelector('.pose-working .film');
      const animation = film.getAnimations()[0];
      animation.pause();
      const frameAt = time => {
        animation.currentTime = time;
        return Math.round(-new DOMMatrix(getComputedStyle(film).transform).m41 / film.parentElement.clientWidth) + 0;
      };
      return [frameAt(0), frameAt(150), frameAt(5200)];
    })()`);
    assert.deepEqual(frames, [0, 1, 3], 'Typing alternates frames and switches to a real head-scratch pose');
    await pause(150);
    if (screenshotDir) fs.writeFileSync(path.join(screenshotDir, 'head-scratch.png'), (await avatar.webContents.capturePage()).toPNG());

    // Exercise photo selection → IPC → mocked provider → saved pack → renderer.
    // No real API calls; use the project's synthetic icon as the reference image.
    const fixture = path.join(__dirname, '../app/icon.png');
    const originalDialog = dialog.showOpenDialog;
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [fixture] });
    const originalFetch = global.fetch;
    let requests = 0;
    global.fetch = async url => {
      assert.equal(url, 'https://api.openai.com/v1/images/edits'); requests++;
      return { ok: true, json: async () => ({ data: [{ b64_json: fs.readFileSync(fixture).toString('base64') }] }) };
    };
    await settings.webContents.executeJavaScript('document.querySelector(".customization").open = true; document.querySelector("#choose-photo").click()');
    await pause(300);
    assert.equal(await settings.webContents.executeJavaScript('document.querySelector("#photo-preview").hidden'), false);
    await settings.webContents.executeJavaScript('document.querySelector("#api-key").value = "synthetic-test-key"; document.querySelector("#api-key").dispatchEvent(new Event("input")); document.querySelector("#generate").click()');
    for (let i = 0; i < 50 && await settings.webContents.executeJavaScript('document.querySelector("#cancel").hidden === false'); i++) await pause(100);
    assert.equal(requests, 4);
    assert.equal(await avatar.webContents.executeJavaScript('document.querySelector(".custom").hidden'), false);
    assert.equal(await settings.webContents.executeJavaScript('document.querySelector("#api-key").value'), '');
    await settings.webContents.executeJavaScript('window.pocketdev.reset()');
    assert.equal(await avatar.webContents.executeJavaScript('document.querySelector(".custom").hidden'), true);
    dialog.showOpenDialog = originalDialog; global.fetch = originalFetch;
    // Let the preview expire, then send the real CLI hook into the live companion.
    await pause(5100);
    const node = process.env.POCKETDEV_TEST_NODE;
    assert.ok(node, 'Set POCKETDEV_TEST_NODE to your Node executable');
    const send = (event, extra = {}) => {
      const result = spawnSync(node, [path.join(__dirname, '../plugin/scripts/hook.cjs')], {
        input: JSON.stringify({ session_id: 'desktop-test', hook_event_name: event, tool_name: 'Bash', ...extra }),
        env: process.env, encoding: 'utf8'
      });
      assert.equal(result.status, 0); assert.equal(result.stdout, '');
    };
    await settings.webContents.executeJavaScript('window.pocketdev.preview("idle")');
    send('PermissionRequest'); await expectState(avatar, 'permission');
    await settings.webContents.executeJavaScript('window.pocketdev.preview("idle")');
    assert.equal(await avatar.webContents.executeJavaScript('document.body.dataset.state'), 'permission', 'Preview cannot mask live permission');
    send('PostToolUse', {agent_id: 'unrelated-agent', tool_name: 'Read'});
    await pause(850); await expectState(avatar, 'permission');
    await avatar.webContents.executeJavaScript('document.querySelector("#dismiss").click()');
    await expectState(avatar, 'idle');
    send('Notification', {notification_type: 'permission_prompt'});
    await pause(850); await expectState(avatar, 'idle');
    send('PermissionRequest', {tool_input: {command: 'new request'}}); await expectState(avatar, 'permission');
    send('PostToolUse', {tool_input: {command: 'new request'}}); await expectState(avatar, 'working');
    await settings.webContents.executeJavaScript('window.pocketdev.preview("permission")');
    send('Stop'); await expectState(avatar, 'done');
    send('SessionEnd'); await expectState(avatar, 'idle');
    assert.equal(await avatar.webContents.executeJavaScript('document.querySelector("#status").textContent'), 'On a little break');
    assert.deepEqual(errors, []);
    console.log('PASS: quiet managed startup, duplicate-instance handling, real desktop windows, sandbox, all poses, preferences, photo → mocked generation → custom avatar, and hook → UI transitions');
    clearTimeout(deadline); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(deadline); app.exit(1); }
});
process.on('exit', () => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });
