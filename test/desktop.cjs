// Launches the real app with isolated data; no API requests or Claude installation.
const { app, BrowserWindow, dialog } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-desktop-'));
process.env.POCKETDEV_HOME = temp;
app.setPath('userData', path.join(temp, 'electron'));
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
      settings = windows.find(w => w.webContents.getURL().endsWith('/settings.html'));
      if (avatar && settings && !avatar.webContents.isLoading() && !settings.webContents.isLoading()) break;
      await pause(100);
    }
    assert.ok(avatar && settings, 'Both windows load');
    assert.equal(avatar.getBounds().width, 120);
    assert.equal(avatar.getBounds().height, 120);
    await pause(300);
    assert.equal(await avatar.webContents.executeJavaScript('typeof require'), 'undefined', 'Node is unavailable to renderer');
    assert.equal(await settings.webContents.executeJavaScript('document.querySelectorAll(".pose-card").length'), 4);
    await settings.webContents.executeJavaScript('window.pocketdev.preferences({size: 80, motion: false, sound: false, workingSound: false, doneSound: false})');
    assert.equal(avatar.getBounds().width, 80);
    assert.equal(await avatar.webContents.executeJavaScript('document.body.classList.contains("reduced-motion")'), true);
    assert.equal(await settings.webContents.executeJavaScript('document.querySelector("#sound").checked'), false);
    await settings.webContents.executeJavaScript('window.pocketdev.preferences({size: 120, motion: true})');
    for (const state of ['waiting', 'working', 'done', 'permission', 'idle']) {
      await settings.webContents.executeJavaScript(`window.pocketdev.preview(${JSON.stringify(state)})`);
      await pause(250);
      const animation = { permission: ['.knocking-arm', 'knock'], working: ['.typing-left', 'typing'], done: ['.thumb-arm', 'thumbs'], idle: ['.snacking-arm', 'snack'] }[state];
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
      if (screenshotDir) {
        fs.mkdirSync(screenshotDir, { recursive: true });
        fs.writeFileSync(path.join(screenshotDir, `${state}.png`), (await avatar.webContents.capturePage()).toPNG());
      }
    }
    if (screenshotDir) fs.writeFileSync(path.join(screenshotDir, 'settings.png'), (await settings.webContents.capturePage()).toPNG());
    // Inspect the occasional head scratch, not just the fast typing phase.
    await settings.webContents.executeJavaScript('window.pocketdev.preview("working")');
    await expectState(avatar, 'working');
    const scratch = await avatar.webContents.executeJavaScript(`(() => {
      const arm = document.querySelector('.scratch-arm');
      for (const animation of document.querySelector('.pose-working').getAnimations({subtree: true})) {
        if (animation.effect.getTiming().duration === 7000) { animation.pause(); animation.currentTime = 5200; }
      }
      return Number(getComputedStyle(arm).opacity);
    })()`);
    assert.ok(scratch > .9, 'Working animation raises the hand to scratch its head');
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
    console.log('PASS: real desktop windows, sandbox, all poses, preferences, photo → mocked generation → custom avatar, and hook → UI transitions');
    clearTimeout(deadline); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(deadline); app.exit(1); }
});
process.on('exit', () => { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} });
