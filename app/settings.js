const $ = selector => document.querySelector(selector);
const mascots = [...document.querySelectorAll('.mascot')];
for (const mascot of mascots) window.mountMascot(mascot);
let photoReady = false, busy = false;
function message(text, error = false) { $('#message').textContent = text; $('#message').classList.toggle('error', error); }
function appearance(value) {
  for (const mascot of mascots) window.applyMascot(mascot, value.images, mascot.dataset.state);
  $('#size').value = value.size; $('#size-value').value = `${value.size} px`;
  $('#motion').checked = value.motion;
  for (const key of ['sound', 'workingSound', 'doneSound']) $(`#${key}`).checked = value[key];
  document.body.classList.toggle('reduced-motion', !value.motion);
  $('#data-path').textContent = value.dataPath;
}
function status(value) {
  $('#connection-dot').classList.toggle('connected', value.connected);
  $('#connection').textContent = value.connected ? `Claude connected · ${value.message}` : 'Waiting for a Claude Code session';
}
function buttons() {
  $('#generate').disabled = busy || !photoReady || !$('#api-key').value.trim();
  for (const id of ['choose-photo', 'import', 'reset', 'api-key']) $(`#${id}`).disabled = busy;
  $('#cancel').hidden = !busy;
}
const attempt = fn => async () => { try { await fn(); } catch (error) { message(error.message.replace(/^Error invoking remote method '[^']+': Error: /, ''), true); } };
window.pocketdev.onAppearance(appearance); window.pocketdev.onStatus(status);
window.pocketdev.onProgress(pose => { $('#progress').textContent = `Creating ${pose}… (${['waiting', 'working', 'done', 'idle'].indexOf(pose) + 1}/4)`; });
window.pocketdev.initial().then(value => { appearance(value.appearance); status(value.status); }).catch(error => message(error.message, true));
for (const button of document.querySelectorAll('[data-preview]')) button.addEventListener('click', attempt(() => window.pocketdev.preview(button.dataset.preview)));
$('#permission-preview').addEventListener('click', attempt(() => window.pocketdev.preview('permission')));
$('#choose-photo').addEventListener('click', attempt(async () => {
  const data = await window.pocketdev.photo();
  if (!data) return;
  $('#photo-preview').src = data; $('#photo-preview').hidden = false;
  $('#photo-hint').textContent = 'Your reference photo is ready'; photoReady = true; buttons(); message('');
}));
$('#api-key').addEventListener('input', buttons);
$('#generate').addEventListener('click', attempt(async () => {
  busy = true; const key = $('#api-key').value; $('#api-key').value = ''; buttons(); message('');
  try { await window.pocketdev.generate(key); message('Your mini-self is ready and active.'); }
  finally { busy = false; buttons(); $('#progress').textContent = ''; }
}));
$('#cancel').addEventListener('click', attempt(() => window.pocketdev.cancel()));
$('#import').addEventListener('click', attempt(async () => { if (await window.pocketdev.import()) message('Your custom poses are active.'); }));
$('#reset').addEventListener('click', attempt(async () => { await window.pocketdev.reset(); message('Your default buddy is back. Saved custom poses are kept.'); }));
$('#size').addEventListener('input', () => { $('#size-value').value = `${$('#size').value} px`; });
$('#size').addEventListener('change', attempt(() => window.pocketdev.preferences({ size: Number($('#size').value) })));
$('#motion').addEventListener('change', attempt(() => window.pocketdev.preferences({ motion: $('#motion').checked })));

for (const key of ['sound', 'workingSound', 'doneSound']) $(`#${key}`).addEventListener('change', attempt(() => window.pocketdev.preferences({ [key]: $(`#${key}`).checked })));
