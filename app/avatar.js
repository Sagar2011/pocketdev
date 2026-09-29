const mascot = document.querySelector('#mascot');
window.mountMascot(mascot);
let images = {}, current = 'idle', sound = true;
const knocks = window.createPermissionKnocks();
window.addEventListener('pagehide', () => knocks.stop());
function appearance(value) {
  images = value.images;
  sound = value.sound;
  knocks.update(current, sound);
  document.body.classList.toggle('reduced-motion', !value.motion);
  window.applyMascot(mascot, images, current);
}
function status(value) {
  current = value.state;
  knocks.update(current, sound);
  document.body.dataset.state = current;
  document.querySelector('#status').textContent = value.message;
  document.querySelector('#buddy').title = value.message;
  document.querySelector('#customize').title = `${value.message} · Customize`;
  document.querySelector('#customize').setAttribute('aria-label', `${value.message}. Customize PocketDev`);
  window.applyMascot(mascot, images, current);
}
window.pocketdev.onAppearance(appearance);
window.pocketdev.onStatus(status);
window.pocketdev.initial().then(value => { appearance(value.appearance); status(value.status); });
document.querySelector('#customize').addEventListener('click', () => window.pocketdev.settings());
document.addEventListener('contextmenu', event => { event.preventDefault(); window.pocketdev.menu(); });
